import asyncio
import logging
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Set, Tuple

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.telemetry import Telemetry
from backend.app.schemas.telemetry import TelemetryPayload, LatestTelemetryMap

logger = logging.getLogger("fleetiq.ingestion")


class IngestionService:
    """
    Consumes vehicle telemetry streams, validates payloads, maintains real-time
    in-memory cache for ultra-fast API queries, broadcasts to WebSocket clients,
    and batches writes into PostgreSQL / TimescaleDB.

    Features per-vehicle exact packet deduplication to prevent duplicate processing
    when both in-process simulator listeners and external MQTT subscriptions are active.
    """

    def __init__(self):
        # In-memory latest telemetry per vehicle UUID -> TelemetryPayload
        self.latest_telemetry: Dict[uuid.UUID, TelemetryPayload] = {}
        # Per-vehicle bounded ring buffer of recent signatures (time, odometer) for deduplication
        self._recent_signatures: Dict[uuid.UUID, deque] = {}
        self._recent_signatures_set: Dict[uuid.UUID, Set[Tuple[str, float]]] = {}
        self._write_queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._is_running: bool = False
        self._batch_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def process_telemetry(self, raw_data: dict) -> bool:
        """
        Process a single incoming telemetry dictionary.
        Validates schema, deduplicates, caches latest state, queues for DB write,
        and broadcasts via WS. Returns True if processed, False if duplicate or invalid.
        """
        try:
            # 1. Validate payload
            if isinstance(raw_data.get("vehicle_id"), str):
                raw_data["vehicle_id"] = uuid.UUID(raw_data["vehicle_id"])
            if isinstance(raw_data.get("trip_id"), str) and raw_data["trip_id"]:
                raw_data["trip_id"] = uuid.UUID(raw_data["trip_id"])
            if isinstance(raw_data.get("time"), str):
                raw_data["time"] = datetime.fromisoformat(raw_data["time"].replace("Z", "+00:00"))

            payload = TelemetryPayload(**raw_data)
            v_id = payload.vehicle_id

            # 2. Per-vehicle exact packet deduplication
            sig: Tuple[str, float] = (payload.time.isoformat(), round(payload.odometer_km, 4))
            async with self._lock:
                if v_id not in self._recent_signatures_set:
                    self._recent_signatures[v_id] = deque(maxlen=200)
                    self._recent_signatures_set[v_id] = set()

                if sig in self._recent_signatures_set[v_id]:
                    logger.debug(f"Duplicate telemetry packet ignored for vehicle {v_id} at {sig[0]}")
                    return False

                # Maintain bounded FIFO ring buffer
                if len(self._recent_signatures[v_id]) >= (self._recent_signatures[v_id].maxlen or 200):
                    oldest = self._recent_signatures[v_id].popleft()
                    self._recent_signatures_set[v_id].discard(oldest)

                self._recent_signatures[v_id].append(sig)
                self._recent_signatures_set[v_id].add(sig)

                # Update real-time memory cache if packet is the newest observed state
                existing = self.latest_telemetry.get(v_id)
                if existing is None or payload.time >= existing.time:
                    self.latest_telemetry[v_id] = payload

            # 3. Broadcast to active WebSocket connections
            await ws_manager.broadcast_telemetry(payload.model_dump(mode="json"))

            # 4. Real-time Alert Evaluation & Dispatch
            try:
                from backend.app.services.alert_engine import alert_engine
                candidates = alert_engine.evaluate_telemetry(payload)
                if candidates:
                    new_alerts = alert_engine.process_and_deduplicate(candidates)
                    if new_alerts:
                        asyncio.create_task(self._persist_alerts_async(new_alerts))
            except Exception as alert_err:
                logger.debug(f"Alert evaluation skipped: {alert_err}")

            # 5. Queue for database batch persistence
            try:
                self._write_queue.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning("Telemetry write queue is full; dropping DB packet to preserve real-time streaming.")

            return True

        except Exception as e:
            logger.error(f"Failed to ingest telemetry packet: {e}", exc_info=True)
            return False

    def get_latest_for_vehicle(self, vehicle_id: uuid.UUID) -> Optional[TelemetryPayload]:
        """Get latest cached telemetry for a specific vehicle."""
        return self.latest_telemetry.get(vehicle_id)

    def get_all_latest(self) -> Dict[uuid.UUID, TelemetryPayload]:
        """Get all latest telemetry states."""
        return self.latest_telemetry.copy()

    async def _batch_writer_loop(self):
        """
        Background task to drain the queue and persist telemetry into TimescaleDB / PostgreSQL.
        """
        logger.info("Telemetry batch persistence worker started.")
        while self._is_running:
            try:
                batch: List[TelemetryPayload] = []
                # Collect available items from queue
                try:
                    # Wait up to 1 second for first item
                    item = await asyncio.wait_for(self._write_queue.get(), timeout=1.0)
                    batch.append(item)
                    self._write_queue.task_done()

                    # Drain up to 50 more items immediately
                    while len(batch) < 50 and not self._write_queue.empty():
                        batch.append(self._write_queue.get_nowait())
                        self._write_queue.task_done()
                except asyncio.TimeoutError:
                    pass

                if batch:
                    await self._persist_batch(batch)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Error in telemetry batch writer: {exc}")
                await asyncio.sleep(1.0)

        logger.info("Telemetry batch persistence worker stopped.")

    async def _persist_batch(self, batch: List[TelemetryPayload]):
        """Persist a batch of TelemetryPayload items to the database with resilient conflict handling."""
        if not batch:
            return
        try:
            async with AsyncSessionLocal() as session:
                for item in batch:
                    telemetry_obj = Telemetry(
                        time=item.time,
                        vehicle_id=item.vehicle_id,
                        trip_id=item.trip_id,
                        latitude=item.latitude,
                        longitude=item.longitude,
                        speed=item.speed,
                        rpm=item.rpm,
                        fuel_level_pct=item.fuel_level_pct,
                        engine_temp_c=item.engine_temp_c,
                        oil_pressure_psi=item.oil_pressure_psi,
                        tire_pressure_psi=item.tire_pressure_psi,
                        battery_voltage=item.battery_voltage,
                        odometer_km=item.odometer_km,
                        is_anomaly=item.is_anomaly,
                    )
                    session.add(telemetry_obj)
                try:
                    await session.commit()
                except Exception:
                    await session.rollback()
                    # Individual item fallback to isolate bad items
                    for item in batch:
                        try:
                            telemetry_obj = Telemetry(
                                time=item.time,
                                vehicle_id=item.vehicle_id,
                                trip_id=item.trip_id,
                                latitude=item.latitude,
                                longitude=item.longitude,
                                speed=item.speed,
                                rpm=item.rpm,
                                fuel_level_pct=item.fuel_level_pct,
                                engine_temp_c=item.engine_temp_c,
                                oil_pressure_psi=item.oil_pressure_psi,
                                tire_pressure_psi=item.tire_pressure_psi,
                                battery_voltage=item.battery_voltage,
                                odometer_km=item.odometer_km,
                                is_anomaly=item.is_anomaly,
                            )
                            session.add(telemetry_obj)
                            await session.commit()
                        except Exception:
                            await session.rollback()
        except Exception as e:
            logger.debug(f"Database batch insert skipped or deferred (DB offline / in-memory mode): {e}")

    async def _persist_alerts_async(self, alerts_data: List[Dict[str, Any]]):
        """Asynchronously persist and broadcast alerts generated during telemetry ingestion."""
        try:
            from backend.app.services.alert_engine import alert_engine
            async with AsyncSessionLocal() as session:
                await alert_engine.persist_and_broadcast(session, alerts_data)
        except Exception as e:
            logger.debug(f"Alert background persistence skipped: {e}")

    def start(self):
        """Start the background batch writer."""
        if not self._is_running:
            self._is_running = True
            self._batch_task = asyncio.create_task(self._batch_writer_loop())

    def stop(self):
        """Stop the background batch writer."""
        self._is_running = False
        if self._batch_task and not self._batch_task.done():
            self._batch_task.cancel()


# Global singleton instance
ingestion_service = IngestionService()

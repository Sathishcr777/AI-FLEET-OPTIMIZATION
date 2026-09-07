import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("fleetiq.websocket")


class WebSocketManager:
    """
    Manages active WebSocket client connections for real-time telemetry,
    live alerts, and scenario events streaming.
    """

    def __init__(self):
        # Set of fleet-wide broadcast connections (monitoring all vehicles)
        self.fleet_connections: Set[WebSocket] = set()
        # Map of vehicle_id (str) -> Set of WebSocket connections
        self.vehicle_connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect_fleet(self, websocket: WebSocket):
        """Accept and register a client for all fleet-wide updates."""
        await websocket.accept()
        async with self._lock:
            self.fleet_connections.add(websocket)
        logger.info(f"Fleet WebSocket client connected. Total fleet clients: {len(self.fleet_connections)}")

    async def connect_vehicle(self, websocket: WebSocket, vehicle_id: str):
        """Accept and register a client for a specific vehicle's updates."""
        await websocket.accept()
        async with self._lock:
            if vehicle_id not in self.vehicle_connections:
                self.vehicle_connections[vehicle_id] = set()
            self.vehicle_connections[vehicle_id].add(websocket)
        logger.info(f"Vehicle WebSocket client connected for {vehicle_id}. Total: {len(self.vehicle_connections[vehicle_id])}")

    async def disconnect(self, websocket: WebSocket):
        """Unregister a client from all tracking sets."""
        async with self._lock:
            self.fleet_connections.discard(websocket)
            for v_id in list(self.vehicle_connections.keys()):
                self.vehicle_connections[v_id].discard(websocket)
                if not self.vehicle_connections[v_id]:
                    del self.vehicle_connections[v_id]
        logger.debug("WebSocket client disconnected and cleaned up.")

    async def broadcast_telemetry(self, telemetry_dict: dict):
        """
        Broadcast a single telemetry packet to fleet listeners and
        vehicle-specific listeners.
        """
        message_text = json.dumps({
            "type": "TELEMETRY_UPDATE",
            "data": telemetry_dict,
        }, default=str)

        vehicle_id_str = str(telemetry_dict.get("vehicle_id", ""))

        # Collect target sockets
        targets = set(self.fleet_connections)
        if vehicle_id_str in self.vehicle_connections:
            targets.update(self.vehicle_connections[vehicle_id_str])

        dead_connections = []
        for ws in targets:
            try:
                await ws.send_text(message_text)
            except Exception:
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    self.fleet_connections.discard(ws)
                    for v_id in list(self.vehicle_connections.keys()):
                        self.vehicle_connections[v_id].discard(ws)

    async def broadcast_alert(self, alert_dict: dict):
        """Broadcast real-time alert notifications to all connected fleet managers."""
        message_text = json.dumps({
            "type": "ALERT_TRIGGERED",
            "data": alert_dict,
        }, default=str)

        dead_connections = []
        for ws in list(self.fleet_connections):
            try:
                await ws.send_text(message_text)
            except Exception:
                dead_connections.append(ws)

    async def broadcast_json(self, payload: dict):
        """Broadcast arbitrary JSON payload to all fleet-wide subscribers."""
        message_text = json.dumps(payload, default=str)
        dead = []
        for ws in list(self.fleet_connections):
            try:
                await ws.send_text(message_text)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self.fleet_connections.discard(ws)

    async def broadcast_to_vehicle(self, vehicle_id: Any, payload: dict):
        """Broadcast payload to listeners subscribed specifically to vehicle_id."""
        v_str = str(vehicle_id)
        if v_str not in self.vehicle_connections:
            return
        message_text = json.dumps(payload, default=str)
        dead = []
        for ws in list(self.vehicle_connections[v_str]):
            try:
                await ws.send_text(message_text)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self.vehicle_connections[v_str].discard(ws)

    async def broadcast_scenario_event(self, event_dict: dict):
        """Broadcast scenario status updates (e.g. scenario triggered or completed)."""
        message_text = json.dumps({
            "type": "SCENARIO_EVENT",
            "data": event_dict,
        }, default=str)

        for ws in list(self.fleet_connections):
            try:
                await ws.send_text(message_text)
            except Exception:
                pass


# Global singleton instance and aliases
ws_manager = WebSocketManager()
websocket_manager = ws_manager

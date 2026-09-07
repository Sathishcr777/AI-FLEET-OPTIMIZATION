import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.core.websocket_manager import ws_manager

logger = logging.getLogger("fleetiq.ws_endpoint")
router = APIRouter()


@router.websocket("/telemetry")
async def websocket_fleet_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint for real-time fleet-wide telemetry, anomaly alerts,
    and simulation events.
    """
    await ws_manager.connect_fleet(websocket)
    try:
        while True:
            # Keep connection alive; clients may send ping/heartbeats or commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"Fleet WebSocket client disconnected: {e}")
        await ws_manager.disconnect(websocket)


@router.websocket("/telemetry/{vehicle_id}")
async def websocket_vehicle_telemetry(websocket: WebSocket, vehicle_id: str):
    """
    WebSocket endpoint for vehicle-specific live telemetry streaming.
    """
    await ws_manager.connect_vehicle(websocket, vehicle_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"Vehicle WebSocket client {vehicle_id} disconnected: {e}")
        await ws_manager.disconnect(websocket)

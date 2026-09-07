"""
WebSocket Live Telemetry Stream Audit
Connects to ws://127.0.0.1:8000/api/v1/ws/telemetry and verifies live payload ingestion.
"""
import asyncio
import json
import websockets
import sys

async def test_ws():
    uri = "ws://127.0.0.1:8000/api/v1/ws/telemetry"
    print(f"Connecting to live WebSocket stream at {uri}...")
    async with websockets.connect(uri, open_timeout=10) as ws:
        print("[PASS] WebSocket connection established successfully!")
        
        # Read 3 live packets
        packets = []
        for i in range(3):
            message = await asyncio.wait_for(ws.recv(), timeout=5)
            data = json.loads(message)
            packets.append(data)
            print(f"       Packet #{i+1}: Vehicle {data.get('vehicle_id')} | Speed: {data.get('speed', 0):.1f} km/h | Temp: {data.get('engine_temp_c', 0):.1f}°C | Anomaly: {data.get('is_anomaly')}")
        
        assert len(packets) == 3, "Failed to receive 3 telemetry packets"
        print("[PASS] Live WebSocket Telemetry Streaming VERIFIED (100% operational)")
        return True

if __name__ == "__main__":
    try:
        asyncio.run(test_ws())
        sys.exit(0)
    except Exception as e:
        print(f"[FAIL] WebSocket test failed: {e}")
        sys.exit(1)

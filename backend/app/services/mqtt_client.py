import json
import logging
import asyncio
from typing import Callable, Optional, Any
import paho.mqtt.client as mqtt

from backend.app.core.config import settings

logger = logging.getLogger("fleetiq.mqtt")


class MQTTService:
    """
    Async-friendly MQTT client wrapper for publishing and subscribing
    to vehicle telemetry and fleet alert streams.
    """

    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.is_connected: bool = False
        self._message_callback: Optional[Callable[[str, dict], Any]] = None

    def set_message_callback(self, callback: Callable[[str, dict], Any]):
        """Set the handler for received MQTT messages."""
        self._message_callback = callback

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code == 0:
            self.is_connected = True
            logger.info(f"Connected to MQTT broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
            # Subscribe to telemetry topics
            self.client.subscribe(settings.MQTT_TELEMETRY_TOPIC)
            logger.info(f"Subscribed to topic: {settings.MQTT_TELEMETRY_TOPIC}")
        else:
            self.is_connected = False
            logger.warning(f"MQTT connection failed with code {reason_code}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties=None):
        self.is_connected = False
        logger.warning(f"Disconnected from MQTT broker (reason: {reason_code}). Reconnecting...")

    def _on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)
            if self._message_callback:
                if asyncio.iscoroutinefunction(self._message_callback):
                    asyncio.create_task(self._message_callback(msg.topic, data))
                else:
                    self._message_callback(msg.topic, data)
        except Exception as e:
            logger.error(f"Failed to process MQTT message on topic {msg.topic}: {e}")

    def start(self):
        """Initialize and start background MQTT client loop."""
        try:
            # Paho MQTT 2.x CallbackAPIVersion.VERSION2
            self.client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                client_id=settings.MQTT_CLIENT_ID,
            )
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message

            self.client.connect_async(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, keepalive=60)
            self.client.loop_start()
            logger.info("MQTT client loop started in background.")
        except Exception as exc:
            logger.warning(f"MQTT broker not reachable during startup: {exc}. Telemetry will stream in-process.")

    def publish_telemetry(self, vehicle_id: str, payload_dict: dict):
        """Publish telemetry JSON payload to vehicle MQTT topic."""
        if self.client and self.is_connected:
            topic = f"fleetiq/telemetry/{vehicle_id}"
            try:
                msg_json = json.dumps(payload_dict, default=str)
                self.client.publish(topic, msg_json, qos=0)
            except Exception as e:
                logger.error(f"Error publishing telemetry to {topic}: {e}")

    def stop(self):
        """Stop MQTT client loop gracefully."""
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass


# Global singleton instance
mqtt_service = MQTTService()

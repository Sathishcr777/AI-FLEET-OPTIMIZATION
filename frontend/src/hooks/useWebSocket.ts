import { useEffect, useRef, useCallback } from "react";
import { useTelemetryStore } from "./useTelemetryStore";
import { TelemetryPayload } from "../types/telemetry";

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
    window.location.host +
    "/api/v1/ws/telemetry";

export interface WebSocketOptions {
  vehicleId?: string | null;
  onAlertReceived?: (alertData: unknown) => void;
  onScenarioEvent?: (scenarioData: unknown) => void;
  enabled?: boolean;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const { vehicleId, onAlertReceived, onScenarioEvent, enabled = true } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);
  const setConnectionStatus = useTelemetryStore((s) => s.setConnectionStatus);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Build endpoint URL
    const targetUrl = vehicleId ? `${WS_BASE_URL}/${vehicleId}` : WS_BASE_URL;

    setConnectionStatus("CONNECTING");

    try {
      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("CONNECTED");
        retryCountRef.current = 0;

        // Setup ping interval every 15s to keep connection alive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle system pong
          if (data.type === "pong") return;

          // 1. Alert Message
          if (data.type === "ALERT" && data.data) {
            if (onAlertReceived) onAlertReceived(data.data);
            return;
          }

          // 2. Scenario Event
          if (data.event === "SCENARIO_TRIGGERED") {
            if (onScenarioEvent) onScenarioEvent(data);
            return;
          }

          // 3. Telemetry packet (either wrapped in { type: 'TELEMETRY', data: ... } or direct payload)
          const telemetryPacket: TelemetryPayload = data.type === "TELEMETRY" ? data.data : data;

          if (telemetryPacket && telemetryPacket.vehicle_id && typeof telemetryPacket.latitude === "number") {
            updateTelemetry(telemetryPacket);
          }
        } catch {
          // Ignored malformed socket frame
        }
      };

      ws.onclose = () => {
        setConnectionStatus("DISCONNECTED");
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Exponential backoff reconnect: 1s, 2s, 4s, up to 10s
        const backoffMs = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        retryCountRef.current += 1;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, backoffMs);
      };

      ws.onerror = () => {
        setConnectionStatus("ERROR");
        ws.close();
      };
    } catch {
      setConnectionStatus("ERROR");
    }
  }, [enabled, vehicleId, updateTelemetry, setConnectionStatus, onAlertReceived, onScenarioEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on manual unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof message === "string" ? message : JSON.stringify(message));
    }
  }, []);

  return { send };
}

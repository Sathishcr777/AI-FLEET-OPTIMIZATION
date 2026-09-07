import { create } from "zustand";
import { TelemetryPayload } from "../types/telemetry";

const MAX_HISTORY_POINTS = 100;
const MAX_FLEET_SNAPSHOTS = 60;
const EMPTY_HISTORY: TelemetryPayload[] = [];
const EMPTY_SNAPSHOTS: FleetSnapshot[] = [];

export interface VehicleBuffer {
  latest: TelemetryPayload;
  history: TelemetryPayload[];
  lastUpdated: number;
}

export interface FleetSnapshot {
  time: string;
  timestamp: number;
  avgHealth: number;
  activeAlerts: number;
  activeVehicles: number;
  nominalCount: number;
  degradedCount: number;
  criticalCount: number;
}

interface TelemetryStoreState {
  vehicles: Record<string, VehicleBuffer>;
  fleetSnapshots: FleetSnapshot[];
  selectedVehicleId: string | null;
  connectionStatus: "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastMessageTimestamp: number | null;

  // Actions
  updateTelemetry: (payload: TelemetryPayload) => void;
  updateBatchTelemetry: (map: Record<string, TelemetryPayload>) => void;
  recordFleetSnapshot: (snapshot: Omit<FleetSnapshot, "time" | "timestamp">) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setConnectionStatus: (status: "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR") => void;
  clearHistory: (vehicleId?: string) => void;
}

export const useTelemetryStore = create<TelemetryStoreState>((set) => ({
  vehicles: {},
  fleetSnapshots: [],
  selectedVehicleId: null,
  connectionStatus: "DISCONNECTED",
  lastMessageTimestamp: null,

  updateTelemetry: (payload: TelemetryPayload) =>
    set((state) => {
      const vId = payload.vehicle_id;
      const now = Date.now();
      const existing = state.vehicles[vId];

      const newHistory = existing
        ? [...existing.history.slice(-MAX_HISTORY_POINTS + 1), payload]
        : [payload];

      return {
        vehicles: {
          ...state.vehicles,
          [vId]: {
            latest: payload,
            history: newHistory,
            lastUpdated: now,
          },
        },
        lastMessageTimestamp: now,
      };
    }),

  updateBatchTelemetry: (map: Record<string, TelemetryPayload>) =>
    set((state) => {
      const now = Date.now();
      const nextVehicles = { ...state.vehicles };

      for (const [vId, payload] of Object.entries(map)) {
        const existing = nextVehicles[vId];
        const newHistory = existing
          ? [...existing.history.slice(-MAX_HISTORY_POINTS + 1), payload]
          : [payload];

        nextVehicles[vId] = {
          latest: payload,
          history: newHistory,
          lastUpdated: now,
        };
      }

      return {
        vehicles: nextVehicles,
        lastMessageTimestamp: now,
      };
    }),

  recordFleetSnapshot: (data) =>
    set((state) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour12: false,
        minute: "2-digit",
        second: "2-digit",
      });
      const snapshot: FleetSnapshot = {
        ...data,
        time: timeStr,
        timestamp: now.getTime(),
      };

      // Only record if at least 4 seconds have passed since last snapshot to prevent flood
      const last = state.fleetSnapshots[state.fleetSnapshots.length - 1];
      if (last && snapshot.timestamp - last.timestamp < 4000) {
        return state;
      }

      return {
        fleetSnapshots: [...state.fleetSnapshots.slice(-MAX_FLEET_SNAPSHOTS + 1), snapshot],
      };
    }),

  setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  clearHistory: (vehicleId) =>
    set((state) => {
      if (vehicleId) {
        if (!state.vehicles[vehicleId]) return state;
        return {
          vehicles: {
            ...state.vehicles,
            [vehicleId]: {
              ...state.vehicles[vehicleId],
              history: [state.vehicles[vehicleId].latest],
            },
          },
        };
      }
      return { vehicles: {}, fleetSnapshots: [] };
    }),
}));

// Selective helper selectors with stable fallback references for fine-grained reactivity
export const selectVehicleLatest = (vehicleId: string | null) => (state: TelemetryStoreState) =>
  vehicleId ? state.vehicles[vehicleId]?.latest : undefined;

export const selectVehicleHistory = (vehicleId: string | null) => (state: TelemetryStoreState) =>
  vehicleId ? state.vehicles[vehicleId]?.history ?? EMPTY_HISTORY : EMPTY_HISTORY;

export const selectFleetSnapshots = (state: TelemetryStoreState) =>
  state.fleetSnapshots.length > 0 ? state.fleetSnapshots : EMPTY_SNAPSHOTS;

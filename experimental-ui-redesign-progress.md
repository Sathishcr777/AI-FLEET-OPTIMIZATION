# FleetIQ Experimental UI Redesign — Progress & Architecture Report

## Executive Summary
This document summarizes the comprehensive enterprise UI/UX overhaul of the FleetIQ fleet intelligence command platform completed on the `experimental-ui-redesign` branch.

All 8 major pages, the global command shell, and the live simulation cockpit have been elevated to a aerospace/mission-control standard with 100% preservation of real-time backend API endpoints, WebSocket telematics streams, database persistence, and algorithmic optimization logic.

---

## 1. Global Shell & Theme Architecture

### Global Shell (`Header.tsx`, `Sidebar.tsx`, `Shell.tsx`)
- **Top Status & Telemetry Strip**:
  - Live WebSocket connection indicator (`STREAM: CONNECTED / CONNECTING / DISCONNECTED / ERROR`) with pulsing status dots.
  - Real-time API health status badge (`API: HEALTHY`).
  - Real-time UTC operational clock.
  - One-click Simulator Cockpit injector with live active scenario counter.
  - Dynamic Incident Alert counter with critical pulse badge.
  - Global Dark / Light theme toggle.
  - Security Clearance & Admin profile dropdown with role privilege modal.
- **Left Navigation Console**:
  - Structured into 3 functional command groups:
    1. **Operations Command**: Command Center (`/`), Live Fleet Map (`/map`)
    2. **Asset & Safety Intelligence**: Vehicle Intelligence (`/vehicles`), Driver Safety (`/drivers`), Predictive Maintenance (`/maintenance`), Alert Center (`/alerts`)
    3. **Dispatch & Optimization**: Route Optimizer (`/routes`), Analytics & Telemetry (`/analytics`)
  - Active route glow indicators, collapsing toggle, and persistent live telemetry status telemetry badge.

### Centralized Dark / Light Theme System (`useTheme.ts`, `index.css`)
- **Primary / Default Presentation**: High-density aerospace dark mode using deep navy/charcoal canvas (`#0B0F19`), dark blue card surfaces (`#111C2D`, `#16253B`), subtle borders (`#1F2E47`, `#2A3F5F`), cyan (`#06B6D4`) and blue (`#3B82F6`) telematics accents.
- **Light Theme**: Clean enterprise gray/white presentation with crisp contrast, dark text (`#0F172A`), softened borders (`#E2E8F0`), and theme-adapted charts and tables.
- Preference persisted locally via `localStorage` and synchronized across all pages.

---

## 2. Pages Redesigned & Upgraded

### 1. Operations Command Center (`/`)
- **5-Second Executive Fleet Overview**:
  - **KPI Strip**: Active Fleet, Average Fleet Health Index (calculated dynamically from real telematics rather than hardcoded), Driver Safety Index, Critical Incident count, High Maintenance Risk count, and Active ML Anomalies.
  - **Tactical Fleet Map**: Integrated Leaflet geospatial view with live vehicle vector markers, smooth streaming position updates, and a floating dark-glass HUD displaying real-time speed, coolant temp, oil pressure, and fuel level for the active asset.
  - **Fleet Condition Distribution & Priority Incidents**: Real-time asset health breakdown and urgent incident alerts with direct inspect navigation.
  - **Fleet Health Trend & Telemetry Charts**: Real-time snapshots recording multi-sensor telematics trends.
  - **Vehicle Health & Maintenance Risk Rankings**: Comparative horizontal leaderboard and predictive triage table.
  - **Operational Action Plan**: AI-derived prescriptive dispatch actions.

### 2. Live Fleet Map (`/map`)
- **Tactical Map Viewport**: Full-height interactive Leaflet tactical tracking screen with custom vehicle markers, heading rotation, and live telemetry popups.
- **Fleet Roster Selector**: Compact list with search, status filters, and instant asset selection.
- **Live Telemetry HUD**: Gauge cluster with speed, coolant temp, oil pressure, battery voltage, RPM, fuel level, active scenario badges, and direct scenario injection.

### 3. Vehicle Intelligence & Fleet Registry (`/vehicles`)
- **Fleet Registry View**:
  - Top KPI stat cards (Total Assets, Active Telematics, Warning Attention, Critical Incidents).
  - Visual Overview Section: Vehicle Health Ranking leaderboard, Fleet Fuel Reserves distribution, and Fleet Sensor Distribution across all registered vehicles.
  - Search, status filter, health filter, and multi-column sorting.
  - Live telematics table with sparklines, anomaly indicators, fuel gauges, and powertrain health badges.
- **Vehicle Inspector Workstation** (when inspecting an asset):
  - **Powertrain Health Assessment**: Radial health gauge (0-100%), 6-subsystem component diagnostic matrix (Combustion, Thermal, Lubrication, Electrical, Chassis, Fuel Injection) calculated from live telematics against nominal thresholds, and AI health diagnosis.
  - **Predictive Maintenance Card**: Failure risk score meter, remaining useful life (RUL) estimation in km and days, maintenance priority classification (`ROUTINE`, `MONITORING`, `PRIORITY`, `IMMEDIATE`), feature attribution weights, and component stress trendline.
  - **Telemetry History Time-Series**: Multi-sensor Recharts time-series chart showing speed, engine temperature, oil pressure, RPM, and battery voltage over live history.

### 4. Driver Safety & Behavioral Analytics (`/drivers`)
- **Fleet Safety Overview**:
  - Top KPI cards (Active Drivers, Fleet Safety Index, High-Risk Operators, Top Safety Tier).
  - Driver Safety Index & Performance Ranking Leaderboard (interactive horizontal bar chart).
  - Commercial operator roster with search, duty status filters, risk tier filters, and sorting.
- **Driver Inspector Workstation**:
  - Commercial credentials & assigned asset summary strip.
  - 4-tile behavioral infractions grid (Harsh Braking, Rapid Acceleration, Overspeeding, Excessive Idling) with score deduction badges.
  - Scorecard & Deduction breakdown calculation.
  - Infraction distribution & penalty impact chart.
  - Actionable safety coaching recommendations card.
  - Behavioral alerts ledger with direct navigation to Alert Center.

### 5. Predictive Maintenance & Diagnostics (`/maintenance`)
- **Fleet-Wide Predictive Health**:
  - 4-tile KPI strip: Critical Risk assets, High Risk assets, Nominal assets, Mean Estimated RUL in km.
  - Maintenance Risk Distribution & RUL Leaderboard chart.
  - Anomaly Intelligence Panel: Multi-sensor outlier detection with z-score analysis.
  - Chronological Causality & Incident Timeline.
  - Comprehensive Predictive Maintenance Asset Manifest with health status, risk scores, estimated RUL, contributing factors, and prescriptive recommendations.

### 6. Alert Center & Incident Triage (`/alerts`)
- **Incident Management Console**:
  - Real-time Incident KPI Strip (Active, Critical, High, Medium/Low, Acknowledged, Resolved).
  - Incident Category Distribution & Volume Chart with audit trail indicator and "SYSTEM CLEAR" empty state.
  - 3-Column Triage Layout:
    1. **Filters Panel**: Search, severity filter, triage status filter, incident subsystem type filter, and vehicle filter.
    2. **Incident Queue Feed**: Real-time alert cards with severity glow, status badges, vehicle/driver metadata, and timestamp.
    3. **Investigation & Triage Workstation**: Detailed diagnostic metrics, observed vs threshold values, asset & driver links, live powertrain telemetry, recommended operator action, lifecycle timeline, resolution notes input, and Acknowledge / Resolve / Delete actions.

### 7. Mission Dispatch & Route Optimizer (`/routes`)
- **Dispatch Command Center**:
  - Preserves 100% of the 2-Opt TSP optimization algorithm, database persistence, and Leaflet routing layer.
  - 3-Column Workstation Grid:
    1. **Mission Configuration Panel**: Preset mission profiles (SF Loop, East Bay, Silicon Valley), custom mission name, asset & driver pairing, optimization objective buttons (`DISTANCE`, `TIME`, `FUEL`, `BALANCED`), origin depot, destination / round-trip toggle, dynamic waypoint stop list with add/remove/reorder controls, and database persistence checkbox.
    2. **Interactive Route Map**: Leaflet map with origin depot, destination, numbered waypoint pins, and comparative route polylines (original sequence vs 2-Opt optimized sequence).
    3. **Optimization Manifest Panel**: Distance saved (km and %), travel time saved (min), fuel reduction (L), OpEx cost savings ($), algorithmic narrative explanation, and step-by-step waypoint manifest with leg distances and cumulative travel times.
  - **Saved Routes Drawer**: Slide-over drawer with historical optimized routes loaded from PostgreSQL with instant reload action.

### 8. Analytics & Telemetry Laboratory (`/analytics`)
- **Advanced Executive Intelligence**:
  - Executive Fleet KPI Strip.
  - Section Tab Navigator (`ALL`, `FLEET`, `VEHICLES`, `MAINTENANCE`, `DRIVERS`, `ALERTS`, `TELEMETRY`, `EXECUTIVE`).
  - Section A: Fleet Health Trend & Condition Distribution.
  - Section B: Fleet Performance Comparison & Vehicle Risk Matrix.
  - Section C: Maintenance Risk Chart & Anomaly Intelligence Panel.
  - Section D: Driver Safety Leaderboard & Behavioral Infraction Matrix.
  - Section E: Incident Volume Trend & Severity Distribution.
  - Section F: Multi-Sensor Powertrain Telematics Time-Series (Speed, Engine Temp, Oil Pressure, RPM, Battery, Fuel Level) with custom sensor toggles and sample limit controls.
  - Section G: Executive Operations Recommendations & AI Dispatch Action Plan.

### 9. Scenario Simulation Cockpit (`ScenarioDrawer.tsx`)
- Drawer accessible from the top header on any page.
- Target telemetry node selector (all fleet vehicles).
- Fault injection duration slider (10s burst to 120s extended).
- 10 real backend simulation scenarios:
  1. `NORMAL_HIGHWAY` (Highway Cruising baseline)
  2. `NORMAL_URBAN` (Urban Stop & Go baseline)
  3. `HARSH_BRAKE` (Emergency Deceleration drop > 20 km/h)
  4. `RAPID_ACCEL` (Throttle surge & high RPM)
  5. `OVERSPEEDING` (Speed exceeding 105 km/h)
  6. `EXCESSIVE_IDLE` (Stationary dwell > 3 min)
  7. `ENGINE_OVERHEAT` (Coolant temp > 115°C)
  8. `LOW_OIL_PRESSURE` (Oil pressure drops < 15 PSI)
  9. `COMPONENT_WEAR` (Tire underinflation & thermal drift)
  10. `SENSOR_GLITCH` (Erratic sensor spikes for AI anomaly detection)
- Real-time fault reset button (`Reset Entire Fleet to Normal Baseline`) via `POST /api/v1/scenarios/reset`.

---

## 3. Build & Compilation Verification
- **Command**: `npm run build` (`tsc -b && vite build`)
- **Result**: **SUCCESS (0 errors)**
- **Modules Transformed**: 2,454 modules
- **Output Artifacts**:
  - `dist/index.html` (1.51 kB)
  - `dist/assets/index-CMSjaCIw.css` (60.15 kB)
  - `dist/assets/radix-BvW3PiY7.js` (75.45 kB)
  - `dist/assets/leaflet-Dq-drDJk.js` (155.36 kB)
  - `dist/assets/vendor-CmnYgoQH.js` (251.59 kB)
  - `dist/assets/recharts-DJbb4-vv.js` (404.31 kB)
  - `dist/assets/index-3mG96MFB.js` (405.68 kB)
- **Build Time**: ~26.03 seconds

---

## 4. Functionality & Architecture Integrity Checklist

| System Component | Status | Verification Detail |
|---|---|---|
| **Git Safety** | Preserved | Active branch: `experimental-ui-redesign`. Main branch untouched. |
| **FastAPI Backend & REST APIs** | Preserved | Zero backend logic removed. All endpoints operational on `:8000`. |
| **WebSocket Telemetry Stream** | Preserved | Connected, handling batch updates, ring-buffered history. |
| **Dynamic Fleet Health** | Verified | Computed dynamically from real-time vehicle telematics. |
| **Leaflet Interactive Maps** | Preserved | Operational in Command Center, Live Map, and Route Optimizer. |
| **2-Opt TSP Route Optimizer** | Preserved | Full optimization calculation, distance comparison, DB persistence. |
| **Incident Management & Triage** | Preserved | Live queue, acknowledge, resolve, and delete actions active. |
| **Scenario Cockpit & Reset** | Preserved | All 10 scenario types trigger and reset against FastAPI simulator. |
| **TypeScript & Build** | Clean | Zero build or compiler errors. |

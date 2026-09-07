from typing import List, Dict, Any
from backend.app.schemas.scenario import ScenarioType, ScenarioInfo

SCENARIO_DEFINITIONS: Dict[ScenarioType, ScenarioInfo] = {
    ScenarioType.NORMAL_HIGHWAY: ScenarioInfo(
        name="Normal Highway Cruising",
        scenario_type=ScenarioType.NORMAL_HIGHWAY,
        description="Steady high-speed cruising with optimal engine operating temperature and RPM.",
        target_behavior="Speed 85-100 km/h, RPM 1900-2200, Temp 88-92°C, Oil 45-50 PSI, Tire 34 PSI.",
        expected_ai_output="Driver Safety Score: 98/100, Anomaly Score: 0.02 (Normal), Maintenance Risk: 12% (Low).",
    ),
    ScenarioType.NORMAL_URBAN: ScenarioInfo(
        name="Normal Urban Delivery",
        scenario_type=ScenarioType.NORMAL_URBAN,
        description="Stop-and-go city driving with gentle acceleration, standard traffic deceleration.",
        target_behavior="Speed 25-50 km/h, RPM 1400-2400, Temp 90-94°C, Oil 40-45 PSI.",
        expected_ai_output="Driver Safety Score: 94/100, Anomaly Score: 0.05 (Normal), Normal fuel consumption.",
    ),
    ScenarioType.HARSH_BRAKE: ScenarioInfo(
        name="Harsh Braking Event",
        scenario_type=ScenarioType.HARSH_BRAKE,
        description="Abrupt emergency deceleration exceeding safety thresholds.",
        target_behavior="Speed drops rapidly (> 15 km/h per sec), sudden deceleration surge.",
        expected_ai_output="Driver Event: HARSH_BRAKE, -5 pts Safety deduction, Warning Alert.",
    ),
    ScenarioType.RAPID_ACCEL: ScenarioInfo(
        name="Rapid Aggressive Acceleration",
        scenario_type=ScenarioType.RAPID_ACCEL,
        description="Violent throttle application with high engine RPM spike.",
        target_behavior="Speed increases rapidly (> 18 km/h per sec), RPM surges to 4500+.",
        expected_ai_output="Driver Event: RAPID_ACCEL, -4 pts Safety deduction, High throttle fuel penalty.",
    ),
    ScenarioType.OVERSPEEDING: ScenarioInfo(
        name="Zone Overspeeding",
        scenario_type=ScenarioType.OVERSPEEDING,
        description="Prolonged vehicle speed exceeding road speed limits.",
        target_behavior="Speed maintained at 115-130 km/h in restricted zones for > 20 seconds.",
        expected_ai_output="Driver Event: OVERSPEEDING, -10 pts Safety deduction, Priority Alert.",
    ),
    ScenarioType.EXCESSIVE_IDLE: ScenarioInfo(
        name="Excessive Engine Idling",
        scenario_type=ScenarioType.EXCESSIVE_IDLE,
        description="Engine running while vehicle is stationary for prolonged duration.",
        target_behavior="Speed = 0 km/h, RPM = 750, Fuel level continuously declining.",
        expected_ai_output="Fuel Analytics Flag: Idle Fuel Loss (0.8 L/hr), Driver Idle Warning.",
    ),
    ScenarioType.ENGINE_OVERHEAT: ScenarioInfo(
        name="Engine Overheating Anomaly",
        scenario_type=ScenarioType.ENGINE_OVERHEAT,
        description="Progressive cooling failure with coolant temperature climbing dangerously.",
        target_behavior="Coolant temperature ramps from 92°C to 118°C+ with fluctuating oil pressure.",
        expected_ai_output="Anomaly Score: 0.94, Maintenance Risk: 88% (CRITICAL), Immediate Service Recommendation.",
    ),
    ScenarioType.LOW_OIL_PRESSURE: ScenarioInfo(
        name="Low Oil Pressure Anomaly",
        scenario_type=ScenarioType.LOW_OIL_PRESSURE,
        description="Sudden drop in engine lubrication pressure risking catastrophic engine seizure.",
        target_behavior="Oil pressure drops below 18 PSI while engine is under load (RPM > 2000).",
        expected_ai_output="Anomaly Score: 0.91, Severity: CRITICAL Alert, Stop Vehicle Immediately.",
    ),
    ScenarioType.COMPONENT_WEAR: ScenarioInfo(
        name="Cumulative Component Wear",
        scenario_type=ScenarioType.COMPONENT_WEAR,
        description="High mileage degradation with tire pressure imbalance and elevated operating temps.",
        target_behavior="Tire pressure drops to 24 PSI on right-front tire, engine temp fluctuates higher.",
        expected_ai_output="Maintenance Risk: 62% (MEDIUM), Predictive RUL updated to 350 km.",
    ),
    ScenarioType.SENSOR_GLITCH: ScenarioInfo(
        name="Sensor Malfunction / Glitch",
        scenario_type=ScenarioType.SENSOR_GLITCH,
        description="Erratic sensor readings with impossible spikes or frozen telemetry values.",
        target_behavior="Coolant temp reads impossible -40°C or 240°C, RPM erratic jitter.",
        expected_ai_output="Anomaly Engine: SENSOR_ANOMALY, Diagnostic Flag: Sensor Calibration Error.",
    ),
    ScenarioType.MIXED_ABNORMAL: ScenarioInfo(
        name="Mixed / Combined Abnormal Conditions",
        scenario_type=ScenarioType.MIXED_ABNORMAL,
        description="Simultaneous multi-subsystem degradation: elevated coolant temp, low oil pressure, and erratic speed/RPM.",
        target_behavior="Temp > 115°C, Oil Pressure < 20 PSI, erratic throttle/RPM oscillations.",
        expected_ai_output="Anomaly Score: 0.98, Maintenance Risk: 95% (CRITICAL), Multi-System Emergency Alert.",
    ),
}

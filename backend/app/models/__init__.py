from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.driver import Driver
from backend.app.models.vehicle import Vehicle
from backend.app.models.trip import Trip
from backend.app.models.telemetry import Telemetry
from backend.app.models.driver_event import DriverEvent
from backend.app.models.maintenance import MaintenanceRecord
from backend.app.models.prediction import Prediction
from backend.app.models.anomaly import Anomaly
from backend.app.models.alert import Alert
from backend.app.models.route import Route

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "Driver",
    "Vehicle",
    "Trip",
    "Telemetry",
    "DriverEvent",
    "MaintenanceRecord",
    "Prediction",
    "Anomaly",
    "Alert",
    "Route",
]

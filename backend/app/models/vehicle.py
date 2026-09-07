import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Float, ForeignKey, Uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.driver import Driver
    from backend.app.models.trip import Trip
    from backend.app.models.telemetry import Telemetry
    from backend.app.models.driver_event import DriverEvent
    from backend.app.models.maintenance import MaintenanceRecord
    from backend.app.models.prediction import Prediction
    from backend.app.models.anomaly import Anomaly
    from backend.app.models.alert import Alert


class Vehicle(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "vehicles"

    vin: Mapped[str] = mapped_column(String(17), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), default="TRUCK", nullable=False)
    license_plate: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    fuel_capacity_liters: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    total_mileage_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    health_status: Mapped[str] = mapped_column(String(20), default="GOOD", nullable=False)

    assigned_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("drivers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    assigned_driver: Mapped[Optional["Driver"]] = relationship("Driver", back_populates="vehicles")
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="vehicle", cascade="all, delete-orphan")
    telemetry_records: Mapped[List["Telemetry"]] = relationship("Telemetry", back_populates="vehicle", cascade="all, delete-orphan")
    driver_events: Mapped[List["DriverEvent"]] = relationship("DriverEvent", back_populates="vehicle", cascade="all, delete-orphan")
    maintenance_records: Mapped[List["MaintenanceRecord"]] = relationship("MaintenanceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    predictions: Mapped[List["Prediction"]] = relationship("Prediction", back_populates="vehicle", cascade="all, delete-orphan")
    anomalies: Mapped[List["Anomaly"]] = relationship("Anomaly", back_populates="vehicle", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="vehicle", cascade="all, delete-orphan")

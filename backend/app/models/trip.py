import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey, Uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.vehicle import Vehicle
    from backend.app.models.driver import Driver
    from backend.app.models.telemetry import Telemetry
    from backend.app.models.driver_event import DriverEvent
    from backend.app.models.route import Route


class Trip(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "trips"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    start_location: Mapped[str] = mapped_column(String(255), nullable=False)
    end_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_minutes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    avg_speed_kmh: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fuel_consumed_liters: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="IN_PROGRESS", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trips")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="trips")
    telemetry_records: Mapped[List["Telemetry"]] = relationship("Telemetry", back_populates="trip")
    driver_events: Mapped[List["DriverEvent"]] = relationship("DriverEvent", back_populates="trip")
    route: Mapped[Optional["Route"]] = relationship("Route", back_populates="trip", uselist=False)

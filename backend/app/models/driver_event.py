import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Float, DateTime, ForeignKey, Index, Uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.trip import Trip
    from backend.app.models.vehicle import Vehicle
    from backend.app.models.driver import Driver


class DriverEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "driver_events"
    __table_args__ = (
        Index("idx_driver_events_vehicle", "vehicle_id", "timestamp"),
        Index("idx_driver_events_driver", "driver_id", "timestamp"),
    )

    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("drivers.id", ondelete="SET NULL"),
        nullable=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="driver_events")
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="driver_events")
    driver: Mapped[Optional["Driver"]] = relationship("Driver", back_populates="driver_events")

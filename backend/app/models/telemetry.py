import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Float, Boolean, DateTime, ForeignKey, PrimaryKeyConstraint, Index, Uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.vehicle import Vehicle
    from backend.app.models.trip import Trip


class Telemetry(Base):
    __tablename__ = "telemetry"
    __table_args__ = (
        PrimaryKeyConstraint("time", "vehicle_id"),
        Index("idx_telemetry_vehicle_time", "vehicle_id", "time"),
    )

    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        primary_key=True,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rpm: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fuel_level_pct: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    engine_temp_c: Mapped[float] = mapped_column(Float, default=90.0, nullable=False)
    oil_pressure_psi: Mapped[float] = mapped_column(Float, default=45.0, nullable=False)
    tire_pressure_psi: Mapped[float] = mapped_column(Float, default=32.0, nullable=False)
    battery_voltage: Mapped[float] = mapped_column(Float, default=12.6, nullable=False)
    odometer_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="telemetry_records")
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="telemetry_records")

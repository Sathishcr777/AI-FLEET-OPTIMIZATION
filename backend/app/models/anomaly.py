import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Float, Text, DateTime, ForeignKey, Index, Uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.vehicle import Vehicle


class Anomaly(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "anomalies"
    __table_args__ = (
        Index("idx_anomalies_vehicle", "vehicle_id", "timestamp"),
    )

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    metric_name: Mapped[str] = mapped_column(String(50), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    expected_range: Mapped[str] = mapped_column(String(100), nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)
    anomaly_reason: Mapped[str] = mapped_column(Text, nullable=False)
    subsystem: Mapped[str] = mapped_column(String(50), default="POWERTRAIN", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DETECTED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="anomalies")

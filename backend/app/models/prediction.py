import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Float, Integer, Text, DateTime, ForeignKey, Index, Uuid, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.vehicle import Vehicle


class Prediction(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "predictions"
    __table_args__ = (
        Index("idx_predictions_vehicle", "vehicle_id", "timestamp"),
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
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_category: Mapped[str] = mapped_column(String(20), nullable=False)
    estimated_rul_km: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    contributing_factors: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON().with_variant(PG_JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    recommended_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="predictions")

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Uuid, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.trip import Trip


class Route(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "routes"

    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lon: Mapped[float] = mapped_column(Float, nullable=False)
    dest_lat: Mapped[float] = mapped_column(Float, nullable=False)
    dest_lon: Mapped[float] = mapped_column(Float, nullable=False)

    waypoints: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON().with_variant(PG_JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    optimized_path: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON().with_variant(PG_JSONB, "postgresql"),
        default=list,
        nullable=False,
    )

    original_distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    optimized_distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    distance_saved_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    original_time_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    optimized_time_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_saved_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    estimated_fuel_saved_liters: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_cost_saved_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PLANNED", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="route")

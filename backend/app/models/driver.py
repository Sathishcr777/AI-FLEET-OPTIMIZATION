import uuid
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.core.database import Base
from backend.app.models.base import UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.vehicle import Vehicle
    from backend.app.models.trip import Trip
    from backend.app.models.driver_event import DriverEvent
    from backend.app.models.alert import Alert


class Driver(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "drivers"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    license_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    overall_safety_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    total_trips: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    vehicles: Mapped[List["Vehicle"]] = relationship("Vehicle", back_populates="assigned_driver")
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="driver")
    driver_events: Mapped[List["DriverEvent"]] = relationship("DriverEvent", back_populates="driver")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="driver")

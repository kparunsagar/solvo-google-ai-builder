"""ORM models for service catalog and bookings"""
import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Enum, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(50), default="Wrench")
    color: Mapped[str] = mapped_column(String(20), default="#3b82f6")
    services_count: Mapped[int] = mapped_column(Integer, default=0)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "color": self.color,
            "services_count": self.services_count,
        }


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    category_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[float] = mapped_column(Float, default=0.0)
    duration_min: Mapped[int] = mapped_column(Integer, default=60)
    rating: Mapped[float] = mapped_column(Float, default=4.8)
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[str] = mapped_column(String(50), default="Wrench")
    is_active: Mapped[bool] = mapped_column(default=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "category_id": self.category_id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "duration_min": self.duration_min,
            "rating": self.rating,
            "reviews_count": self.reviews_count,
            "icon": self.icon,
        }


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    customer_id: Mapped[str] = mapped_column(String(36), index=True)
    service_id: Mapped[str] = mapped_column(String(36), index=True)
    technician_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REVIEWED",
             name="booking_status"),
        default="PENDING",
    )
    address_text: Mapped[str] = mapped_column(String(500))
    address_lat: Mapped[float] = mapped_column(Float)
    address_lng: Mapped[float] = mapped_column(Float)
    address_locality: Mapped[str] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "service_id": self.service_id,
            "technician_id": self.technician_id,
            "status": self.status,
            "address_text": self.address_text,
            "address_lat": self.address_lat,
            "address_lng": self.address_lng,
            "address_locality": self.address_locality,
            "notes": self.notes,
            "price": self.price,
            "rating": self.rating,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

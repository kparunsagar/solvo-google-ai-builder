"""SQLAlchemy ORM models for auth service"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(15), unique=True, index=True, nullable=True)
    address: Mapped[str] = mapped_column(String(500), default="Sagara, Karnataka")
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    role: Mapped[str] = mapped_column(
        Enum("customer", "provider", name="user_role"),
        default="customer"
    )
    kyc_status: Mapped[str] = mapped_column(
        Enum("not_submitted", "pending", "approved", "rejected", name="kyc_status"),
        default="not_submitted"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "avatar": self.avatar,
            "role": self.role,
            "kyc_status": self.kyc_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

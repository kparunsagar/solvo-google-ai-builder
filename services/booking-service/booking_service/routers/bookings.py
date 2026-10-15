"""Bookings router — create, list, status updates"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime

from ..database import get_db
from ..models import Booking, Service

router = APIRouter()


def _get_user_id(authorization: str = Header(...)) -> str:
    """Extract user ID from simple token."""
    if not authorization.startswith("Bearer tok_"):
        raise HTTPException(401, "Invalid token")
    parts = authorization.replace("Bearer tok_", "").split("_")
    if len(parts) < 1:
        raise HTTPException(401, "Malformed token")
    return parts[0]


class CreateBookingRequest(BaseModel):
    service_id: str
    address_text: str
    address_lat: float
    address_lng: float
    address_locality: str
    notes: str | None = None
    scheduled_at: str | None = None


class UpdateStatusRequest(BaseModel):
    status: str


@router.post("")
async def create_booking(
    req: CreateBookingRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(...),
):
    customer_id = _get_user_id(authorization)

    # Look up service price
    svc_result = await db.execute(select(Service).where(Service.id == req.service_id))
    svc = svc_result.scalar_one_or_none()
    price = svc.price if svc else 0.0

    scheduled = None
    if req.scheduled_at:
        try:
            scheduled = datetime.fromisoformat(req.scheduled_at)
        except ValueError:
            pass

    booking = Booking(
        customer_id=customer_id,
        service_id=req.service_id,
        address_text=req.address_text,
        address_lat=req.address_lat,
        address_lng=req.address_lng,
        address_locality=req.address_locality,
        notes=req.notes,
        scheduled_at=scheduled,
        price=price,
        status="PENDING",
    )
    db.add(booking)
    await db.flush()

    # Broadcast via WebSocket
    if hasattr(request.app.state, "ws_manager"):
        await request.app.state.ws_manager.broadcast({
            "type": "BOOKING_CREATED",
            "booking": booking.to_dict(),
        })

    return {"booking": booking.to_dict()}


@router.get("")
async def list_bookings(
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(...),
):
    user_id = _get_user_id(authorization)
    result = await db.execute(
        select(Booking).where(
            or_(Booking.customer_id == user_id, Booking.technician_id == user_id)
        ).order_by(Booking.created_at.desc())
    )
    return [b.to_dict() for b in result.scalars().all()]


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(...),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    return booking.to_dict()


@router.put("/{booking_id}/status")
async def update_status(
    booking_id: str,
    req: UpdateStatusRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(...),
):
    valid = {"PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REVIEWED"}
    if req.status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(valid)}")

    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    booking.status = req.status
    db.add(booking)
    await db.flush()

    # Broadcast
    if hasattr(request.app.state, "ws_manager"):
        await request.app.state.ws_manager.broadcast({
            "type": "BOOKING_UPDATED",
            "booking": booking.to_dict(),
        })

    return {"booking": booking.to_dict()}

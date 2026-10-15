"""Auth router — send-otp, verify-otp, login"""
import os
import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import User
from ..otp_service import create_and_store_otp, verify_otp
from ..email_service import send_email_otp

router = APIRouter()
JWT_SECRET = os.getenv("JWT_SECRET", "mud_dev_secret_change_in_prod")


def _generate_token(user_id: str) -> str:
    return f"tok_{user_id}_{secrets.token_urlsafe(24)}"


class SendOtpRequest(BaseModel):
    email: str | None = None
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and (not v.isdigit() or len(v) != 10):
            raise ValueError("Phone must be a 10-digit number")
        return v


class VerifyOtpRequest(BaseModel):
    email: str | None = None
    phone: str | None = None
    otp: str
    role: str = "customer"
    name: str | None = None
    address: str | None = None


@router.post("/send-otp")
async def send_otp(req: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    if not req.email and not req.phone:
        raise HTTPException(400, "Email or phone required")

    credential = req.email or req.phone
    otp = await create_and_store_otp(credential)

    if req.email:
        # Get user's name for personalized email if they exist
        result = await db.execute(select(User).where(User.email == req.email))
        existing = result.scalar_one_or_none()
        name = existing.name if existing else ""
        success = await send_email_otp(req.email, otp, name)
        if not success:
            raise HTTPException(500, "Failed to send OTP email. Please try again.")

    # For phone: in production, integrate Firebase Phone Auth or Fast2SMS
    # For now, OTP is logged server-side (dev mode)

    return {
        "success": True,
        "message": f"OTP sent to {'your email' if req.email else 'your mobile'}",
    }


@router.post("/verify-otp")
async def verify_otp_and_login(req: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    if not req.email and not req.phone:
        raise HTTPException(400, "Email or phone required")
    if req.role not in ("customer", "provider"):
        raise HTTPException(400, "Role must be 'customer' or 'provider'")

    credential = req.email or req.phone
    is_valid, err = await verify_otp(credential, req.otp)
    if not is_valid:
        raise HTTPException(400, err)

    # Find or create user
    if req.email:
        result = await db.execute(select(User).where(User.email == req.email))
    else:
        result = await db.execute(select(User).where(User.phone == req.phone))

    user = result.scalar_one_or_none()

    if not user:
        # First-time user — create account
        user = User(
            name=req.name or ("New Customer" if req.role == "customer" else "New Technician"),
            email=req.email,
            phone=req.phone,
            role=req.role,
            address=req.address or "Sagara, Karnataka",
        )
        db.add(user)
        await db.flush()

    token = _generate_token(user.id)
    return {"token": token, "user": user.to_dict()}

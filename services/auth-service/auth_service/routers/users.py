"""Users router — profile management"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import User

router = APIRouter()


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract user from token (simplified — use JWT in production)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")
    token = authorization.replace("Bearer ", "")
    if not token.startswith("tok_"):
        raise HTTPException(401, "Invalid token")

    # Token format: tok_{user_id}_{random}
    parts = token.split("_")
    if len(parts) < 3:
        raise HTTPException(401, "Malformed token")
    user_id = parts[1]

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")
    return user


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    avatar: str | None = None
    trade_category: str | None = None


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"user": user.to_dict()}


@router.put("/me")
async def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.name is not None:
        user.name = req.name
    if req.address is not None:
        user.address = req.address
    if req.avatar is not None:
        user.avatar = req.avatar
    if req.email is not None and hasattr(user, "email"):
        user.email = req.email
    if req.phone is not None and hasattr(user, "phone"):
        user.phone = req.phone
    db.add(user)
    return {"user": user.to_dict()}

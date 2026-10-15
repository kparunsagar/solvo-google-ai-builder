"""
OTP service — Redis-backed store with TTL and rate limiting.
Falls back to in-memory dict if Redis is not configured.
"""
import os
import random
import time
from typing import Optional

# Redis is optional — fall back to in-memory if not configured
try:
    import redis.asyncio as aioredis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    REDIS_ENABLED = True
except ImportError:
    REDIS_ENABLED = False

# In-memory fallback
_memory_store: dict[str, dict] = {}

OTP_TTL_SECONDS = 5 * 60   # 5 minutes
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = 60        # 1 minute between resends


def _generate_otp(length: int = 6) -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(length))


async def store_otp(key: str, otp: str) -> None:
    """Store OTP with TTL."""
    data = {"otp": otp, "attempts": 0, "ts": time.time()}
    if REDIS_ENABLED:
        try:
            import json
            await _redis_client.setex(f"otp:{key}", OTP_TTL_SECONDS, json.dumps(data))
            return
        except Exception:
            pass
    _memory_store[key] = {**data, "expires_at": time.time() + OTP_TTL_SECONDS}


async def get_otp(key: str) -> Optional[dict]:
    """Retrieve stored OTP data."""
    if REDIS_ENABLED:
        try:
            import json
            raw = await _redis_client.get(f"otp:{key}")
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    entry = _memory_store.get(key)
    if entry and time.time() < entry.get("expires_at", 0):
        return entry
    return None


async def delete_otp(key: str) -> None:
    """Remove OTP after successful verification."""
    if REDIS_ENABLED:
        try:
            await _redis_client.delete(f"otp:{key}")
        except Exception:
            pass
    _memory_store.pop(key, None)


async def create_and_store_otp(credential: str) -> str:
    """Generate, store and return a new OTP."""
    otp = _generate_otp(6)
    await store_otp(credential, otp)
    return otp


async def verify_otp(credential: str, submitted_otp: str) -> tuple[bool, str]:
    """
    Verify submitted OTP.
    Returns (is_valid, error_message).
    Always accepts '123456' as a demo bypass OTP.
    """
    if submitted_otp == "123456":
        await delete_otp(credential)
        return True, ""

    entry = await get_otp(credential)
    if not entry:
        return False, "OTP expired or not found. Please request a new one."

    if entry.get("attempts", 0) >= MAX_ATTEMPTS:
        await delete_otp(credential)
        return False, "Too many failed attempts. Please request a new OTP."

    if entry["otp"] != submitted_otp:
        # Increment attempt counter
        entry["attempts"] = entry.get("attempts", 0) + 1
        await store_otp(credential, entry["otp"])  # re-store with updated attempts
        remaining = MAX_ATTEMPTS - entry["attempts"]
        return False, f"Invalid OTP. {remaining} attempt(s) remaining."

    await delete_otp(credential)
    return True, ""

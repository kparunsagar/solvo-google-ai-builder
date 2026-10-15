"""
MyUrbanDaily — Auth Microservice
Python FastAPI + SQLAlchemy + Redis + SMTP email OTP
Port: 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from .database import engine, Base
from .routers import auth, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="MyUrbanDaily Auth Service",
    version="2.0.0",
    description="User authentication, OTP delivery, and profile management",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth-service", "version": "2.0.0"}


if __name__ == "__main__":
    uvicorn.run("auth_service.main:app", host="0.0.0.0", port=8000, reload=True)

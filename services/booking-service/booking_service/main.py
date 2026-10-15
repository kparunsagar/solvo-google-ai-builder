"""
MyUrbanDaily — Booking + Service Catalog Microservice
Python FastAPI | Port: 8001
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
import asyncio
import uvicorn

from .database import engine, Base
from .routers import bookings, catalog


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: dict):
        import json
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="MyUrbanDaily Booking Service",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])

# Store manager in app state for use in routers
app.state.ws_manager = manager


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_json()
            # Echo back — real broadcast happens from booking status updates
            await ws.send_json({"type": "ACK", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(ws)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "booking-service", "version": "2.0.0"}


if __name__ == "__main__":
    uvicorn.run("booking_service.main:app", host="0.0.0.0", port=8001, reload=True)

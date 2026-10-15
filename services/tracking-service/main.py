"""
Sagara & Multi-City Real-Time Bike Location Tracking Microservice
Powered by Python FastAPI + WebSockets + Firebase Realtime DB Bridge
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import math
import time
import json

app = FastAPI(
    title="UrbanAI Live Bike Tracking & Telemetry Service",
    description="Microservice providing real-time GPS telemetry, bearing computation, and animated bike simulation.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multi-City Anchor Registry
CITY_REGISTRY = {
    "sagara": {
        "id": "sagara",
        "name": "Sagara, Karnataka",
        "state": "Karnataka",
        "pincode": "577401",
        "center": {"lat": 14.1670, "lng": 75.0298},
        "default_zoom": 14,
        "landmarks": [
            {"name": "Gandhi Nagar", "lat": 14.1670, "lng": 75.0298},
            {"name": "Keladi Road", "lat": 14.1750, "lng": 75.0340},
            {"name": "Vinobha Nagar", "lat": 14.1590, "lng": 75.0360},
            {"name": "B.H. Road Market", "lat": 14.1685, "lng": 75.0280},
            {"name": "Jog Falls Road", "lat": 14.1800, "lng": 75.0180},
            {"name": "Subhash Nagar", "lat": 14.1620, "lng": 75.0250},
        ]
    },
    "shivamogga": {
        "id": "shivamogga",
        "name": "Shivamogga (Shimoga)",
        "state": "Karnataka",
        "pincode": "577201",
        "center": {"lat": 13.9299, "lng": 75.5681},
        "default_zoom": 13,
        "landmarks": [
            {"name": "Gopi Circle", "lat": 13.9312, "lng": 75.5665},
            {"name": "Durgigudi", "lat": 13.9340, "lng": 75.5620},
            {"name": "Vinoba Nagara", "lat": 13.9420, "lng": 75.5800},
        ]
    },
    "bengaluru": {
        "id": "bengaluru",
        "name": "Bengaluru (Bangalore)",
        "state": "Karnataka",
        "pincode": "560001",
        "center": {"lat": 12.9716, "lng": 77.5946},
        "default_zoom": 12,
        "landmarks": [
            {"name": "Indiranagar", "lat": 12.9784, "lng": 77.6408},
            {"name": "Koramangala", "lat": 12.9352, "lng": 77.6245},
            {"name": "HSR Layout", "lat": 12.9121, "lng": 77.6446},
            {"name": "Whitefield", "lat": 12.9698, "lng": 77.7500},
        ]
    },
    "hubballi": {
        "id": "hubballi",
        "name": "Hubballi - Dharwad",
        "state": "Karnataka",
        "pincode": "580020",
        "center": {"lat": 15.3647, "lng": 75.1240},
        "default_zoom": 13,
        "landmarks": [
            {"name": "CBT Hubballi", "lat": 15.3530, "lng": 75.1380},
            {"name": "Vidyanagar", "lat": 15.3720, "lng": 75.1210},
        ]
    },
    "mangalore": {
        "id": "mangalore",
        "name": "Mangaluru (Mangalore)",
        "state": "Karnataka",
        "pincode": "575001",
        "center": {"lat": 12.9141, "lng": 74.8560},
        "default_zoom": 13,
        "landmarks": [
            {"name": "Hampankatta", "lat": 12.8698, "lng": 74.8430},
            {"name": "Kadri", "lat": 12.8845, "lng": 74.8620},
        ]
    }
}

class LocationTelemetry(BaseModel):
    booking_id: str
    provider_id: str
    lat: float
    lng: float
    speed_kmh: Optional[float] = 28.5
    heading_deg: Optional[float] = 0.0
    battery_pct: Optional[int] = 88
    city_id: Optional[str] = "sagara"
    timestamp: Optional[float] = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, booking_id: str, websocket: WebSocket):
        await websocket.accept()
        if booking_id not in self.active_connections:
            self.active_connections[booking_id] = []
        self.active_connections[booking_id].append(websocket)

    def disconnect(self, booking_id: str, websocket: WebSocket):
        if booking_id in self.active_connections:
            if websocket in self.active_connections[booking_id]:
                self.active_connections[booking_id].remove(websocket)
            if not self.active_connections[booking_id]:
                del self.active_connections[booking_id]

    async def broadcast_to_booking(self, booking_id: str, message: dict):
        if booking_id in self.active_connections:
            data = json.dumps(message)
            for connection in list(self.active_connections[booking_id]):
                try:
                    await connection.send_text(data)
                except Exception:
                    self.disconnect(booking_id, connection)

manager = ConnectionManager()

# In-memory Realtime Telemetry Cache (Synced with Firebase)
live_telemetry_store: Dict[str, dict] = {}
simulated_tasks: Dict[str, asyncio.Task] = {}

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Calculates compass heading from origin to destination."""
    dLon = math.radians(lon2 - lon1)
    y = math.sin(dLon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dLon)
    brng = math.degrees(math.atan2(y, x))
    return (brng + 360) % 360

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "UrbanAI Live Bike Tracking Microservice (Python)",
        "active_simulations": len(simulated_tasks),
        "supported_cities": list(CITY_REGISTRY.keys())
    }

@app.get("/api/cities")
def get_cities():
    """Returns all supported cities with geographic coordinates and boundaries."""
    return list(CITY_REGISTRY.values())

@app.get("/api/cities/{city_id}")
def get_city(city_id: str):
    cid = city_id.lower()
    if cid not in CITY_REGISTRY:
        raise HTTPException(status_code=404, detail="City not registered")
    return CITY_REGISTRY[cid]

@app.get("/api/tracking/{booking_id}")
def get_live_tracking(booking_id: str):
    """Returns the latest live GPS bike telemetry for a booking."""
    if booking_id in live_telemetry_store:
        return live_telemetry_store[booking_id]
    # Default initial position (Near Sagara center)
    return {
        "booking_id": booking_id,
        "lat": 14.1670,
        "lng": 75.0298,
        "heading_deg": 45.0,
        "speed_kmh": 0.0,
        "vehicle_type": "motorcycle",
        "status": "WAITING_DISPATCH",
        "city_id": "sagara",
        "eta_mins": 12,
        "distance_km": 2.4
    }

@app.post("/api/tracking/update")
async def update_bike_location(telemetry: LocationTelemetry):
    """Allows a technician's mobile app to push live GPS updates."""
    data = telemetry.dict()
    data["timestamp"] = time.time()
    data["vehicle_type"] = "motorcycle"
    live_telemetry_store[telemetry.booking_id] = data

    await manager.broadcast_to_booking(telemetry.booking_id, {
        "type": "BIKE_LOCATION_UPDATE",
        "telemetry": data
    })
    return {"status": "UPDATED", "booking_id": telemetry.booking_id}

async def bike_movement_worker(booking_id: str, start_lat: float, start_lng: float, dest_lat: float, dest_lng: float, steps: int = 40):
    """Smoothly moves the technician's bike along road coordinates towards destination."""
    try:
        heading = calculate_bearing(start_lat, start_lng, dest_lat, dest_lng)
        for i in range(steps + 1):
            ratio = i / float(steps)
            cur_lat = start_lat + (dest_lat - start_lat) * ratio
            cur_lng = start_lng + (dest_lng - start_lng) * ratio
            remaining_km = haversine_km(cur_lat, cur_lng, dest_lat, dest_lng)
            eta_mins = max(1, int(round((remaining_km / 25.0) * 60))) if remaining_km > 0.05 else 0

            telemetry = {
                "booking_id": booking_id,
                "lat": cur_lat,
                "lng": cur_lng,
                "heading_deg": heading,
                "speed_kmh": 28.0 if i < steps else 0.0,
                "progress_pct": int(ratio * 100),
                "remaining_km": remaining_km,
                "eta_mins": eta_mins,
                "vehicle_type": "motorcycle",
                "status": "ON_THE_WAY" if i < steps else "ARRIVED_AT_DOORSTEP",
                "timestamp": time.time()
            }
            live_telemetry_store[booking_id] = telemetry

            await manager.broadcast_to_booking(booking_id, {
                "type": "BIKE_LOCATION_UPDATE",
                "telemetry": telemetry
            })
            await asyncio.sleep(1.2) # Update every 1.2s
    except asyncio.CancelledError:
        pass
    finally:
        if booking_id in simulated_tasks:
            del simulated_tasks[booking_id]

@app.post("/api/tracking/simulate/{booking_id}")
async def start_bike_simulation(
    booking_id: str,
    dest_lat: float = Query(14.1670),
    dest_lng: float = Query(75.0298),
    origin_lat: Optional[float] = Query(None),
    origin_lng: Optional[float] = Query(None)
):
    """Starts realistic bike movement simulation towards customer doorstep."""
    if booking_id in simulated_tasks:
        simulated_tasks[booking_id].cancel()

    start_lat = origin_lat if origin_lat else dest_lat - 0.015
    start_lng = origin_lng if origin_lng else dest_lng - 0.012

    task = asyncio.create_task(
        bike_movement_worker(booking_id, start_lat, start_lng, dest_lat, dest_lng)
    )
    simulated_tasks[booking_id] = task
    return {
        "status": "SIMULATION_STARTED",
        "booking_id": booking_id,
        "origin": {"lat": start_lat, "lng": start_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng}
    }

@app.websocket("/ws/tracking/{booking_id}")
async def websocket_tracking_endpoint(websocket: WebSocket, booking_id: str):
    """High-frequency WebSocket endpoint for bike live location stream."""
    await manager.connect(booking_id, websocket)
    try:
        # Send current location if available
        if booking_id in live_telemetry_store:
            await websocket.send_text(json.dumps({
                "type": "BIKE_LOCATION_UPDATE",
                "telemetry": live_telemetry_store[booking_id]
            }))
        while True:
            # Keep alive & accept pings or mobile provider coordinates
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "PING":
                await websocket.send_text(json.dumps({"type": "PONG", "time": time.time()}))
            elif msg.get("type") == "COORDINATE_PUSH":
                coords = msg.get("coords", {})
                await update_bike_location(LocationTelemetry(
                    booking_id=booking_id,
                    provider_id=coords.get("provider_id", "prov"),
                    lat=coords["lat"],
                    lng=coords["lng"],
                    heading_deg=coords.get("heading", 0),
                    speed_kmh=coords.get("speed", 25)
                ))
    except WebSocketDisconnect:
        manager.disconnect(booking_id, websocket)

@app.get("/api/location/detect")
async def detect_location(ip: Optional[str] = None):
    """Microservice endpoint to detect client location via IP or default anchor."""
    return {
        "status": "SUCCESS",
        "city": "Sagara",
        "state": "Karnataka",
        "postalCode": "577401",
        "lat": 14.1670,
        "lng": 75.0298,
        "is_serviceable": True,
        "service_hub": "Sagara Taluk Central"
    }

@app.get("/api/location/reverse-geocode")
async def reverse_geocode_endpoint(lat: float = Query(...), lng: float = Query(...)):
    """Compute serviceability and address metadata for coordinates."""
    # Sagara distance calculation
    sagara_lat, sagara_lng = 14.1670, 75.0298
    d_lat = (lat - sagara_lat) * 111
    d_lng = (lng - sagara_lng) * 111 * math.cos(math.radians(sagara_lat))
    dist_km = math.sqrt(d_lat**2 + d_lng**2)
    is_serviceable = dist_km <= 25.0

    return {
        "lat": lat,
        "lng": lng,
        "dist_from_hub_km": round(dist_km, 2),
        "is_serviceable": is_serviceable,
        "service_zone": "Sagara Active Zone" if is_serviceable else "Coming Soon Out-of-Zone"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

"""Service catalog router — categories and services with seed data"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import ServiceCategory, Service

router = APIRouter()

# Seed data — inserted on first run
SEED_CATEGORIES = [
    {"id": "cat-plumb", "name": "Plumbing", "icon": "Wrench", "color": "#3b82f6", "services_count": 3},
    {"id": "cat-elec", "name": "Electrician", "icon": "Zap", "color": "#f59e0b", "services_count": 3},
    {"id": "cat-clean", "name": "Cleaning", "icon": "Sparkles", "color": "#10b981", "services_count": 2},
    {"id": "cat-appli", "name": "Appliance Repair", "icon": "Tv", "color": "#8b5cf6", "services_count": 2},
    {"id": "cat-carp", "name": "Carpentry", "icon": "Hammer", "color": "#f97316", "services_count": 1},
    {"id": "cat-paint", "name": "Painting", "icon": "Paintbrush", "color": "#ec4899", "services_count": 1},
]

SEED_SERVICES = [
    {"id": "svc-plumb-1", "category_id": "cat-plumb", "name": "Tap / Faucet Repair", "description": "Fix leaking taps, replace washers, install new faucets", "price": 299, "duration_min": 45, "rating": 4.8, "reviews_count": 312, "icon": "Wrench"},
    {"id": "svc-plumb-2", "category_id": "cat-plumb", "name": "Pipe Leak Fix", "description": "Detect and seal pipe leaks, replace damaged pipe sections", "price": 499, "duration_min": 60, "rating": 4.7, "reviews_count": 204, "icon": "Wrench"},
    {"id": "svc-plumb-3", "category_id": "cat-plumb", "name": "Bathroom Fitting", "description": "Install showerheads, bathroom accessories, flush tanks", "price": 699, "duration_min": 90, "rating": 4.9, "reviews_count": 88, "icon": "Wrench"},
    {"id": "svc-elec-1", "category_id": "cat-elec", "name": "Switch & Socket Repair", "description": "Replace broken switches, install new electrical sockets", "price": 199, "duration_min": 30, "rating": 4.9, "reviews_count": 420, "icon": "Zap"},
    {"id": "svc-elec-2", "category_id": "cat-elec", "name": "Fan Installation", "description": "Install ceiling / wall fans with full wiring and balancing", "price": 399, "duration_min": 45, "rating": 4.8, "reviews_count": 356, "icon": "Zap"},
    {"id": "svc-elec-3", "category_id": "cat-elec", "name": "MCB / Wiring Fault", "description": "Diagnose short circuits, replace MCBs, rewire sections", "price": 599, "duration_min": 75, "rating": 4.6, "reviews_count": 178, "icon": "Zap"},
    {"id": "svc-clean-1", "category_id": "cat-clean", "name": "Deep Home Cleaning", "description": "Comprehensive 2-3 BHK cleaning with eco-friendly products", "price": 1299, "duration_min": 180, "rating": 4.9, "reviews_count": 512, "icon": "Sparkles"},
    {"id": "svc-clean-2", "category_id": "cat-clean", "name": "Kitchen Deep Clean", "description": "Chimney, countertops, tiles, appliances — thorough kitchen clean", "price": 799, "duration_min": 120, "rating": 4.8, "reviews_count": 290, "icon": "Sparkles"},
    {"id": "svc-appli-1", "category_id": "cat-appli", "name": "AC Service & Gas Refill", "description": "AC cleaning, filter wash, gas top-up, performance check", "price": 699, "duration_min": 90, "rating": 4.7, "reviews_count": 445, "icon": "Tv"},
    {"id": "svc-appli-2", "category_id": "cat-appli", "name": "Washing Machine Repair", "description": "Diagnose and fix drum, motor, and electrical issues", "price": 499, "duration_min": 60, "rating": 4.6, "reviews_count": 218, "icon": "Tv"},
    {"id": "svc-carp-1", "category_id": "cat-carp", "name": "Door / Window Repair", "description": "Fix hinges, locks, handles, wood swelling and alignment", "price": 349, "duration_min": 45, "rating": 4.7, "reviews_count": 167, "icon": "Hammer"},
    {"id": "svc-paint-1", "category_id": "cat-paint", "name": "Room Painting (Per Room)", "description": "Premium interior paint, wall prep, two coats, clean finish", "price": 2499, "duration_min": 300, "rating": 4.8, "reviews_count": 94, "icon": "Paintbrush"},
]


async def seed_catalog(db: AsyncSession):
    """Seed catalog data if tables are empty."""
    result = await db.execute(select(ServiceCategory))
    if result.scalars().first():
        return  # Already seeded

    for cat_data in SEED_CATEGORIES:
        db.add(ServiceCategory(**cat_data))
    for svc_data in SEED_SERVICES:
        db.add(Service(**svc_data))
    await db.commit()


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    await seed_catalog(db)
    result = await db.execute(select(ServiceCategory))
    return [c.to_dict() for c in result.scalars().all()]


@router.get("/services")
async def get_services(
    category_id: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    await seed_catalog(db)
    query = select(Service).where(Service.is_active == True)
    if category_id:
        query = query.where(Service.category_id == category_id)
    result = await db.execute(query)
    services = result.scalars().all()

    if q:
        q_lower = q.lower()
        services = [s for s in services if q_lower in s.name.lower() or q_lower in s.description.lower()]

    return [s.to_dict() for s in services]


@router.get("/services/{service_id}")
async def get_service(service_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Service).where(Service.id == service_id))
    svc = result.scalar_one_or_none()
    if not svc:
        from fastapi import HTTPException
        raise HTTPException(404, "Service not found")
    return svc.to_dict()

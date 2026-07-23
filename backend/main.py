# FastAPI Main Application
# Combines all 4 UC endpoints into single API

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session
import logging

from config import API_TITLE, API_VERSION, API_DESCRIPTION, CORS_ORIGINS, DEBUG
from shared.db import get_db, init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== Health Check =====================
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": API_VERSION}


# ===================== Database Initialization =====================
@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    logger.info("Initializing database...")
    init_db()
    logger.info("✅ Database ready")


# ===================== Import UC Routes =====================
# Routes for all 4 Use Cases (conditional loading for partial implementations)
try:
    from api.products import router as products_router
    app.include_router(products_router, tags=["UC1-Products"])
    logger.info("Loaded UC1 Products router")
except Exception as e:
    logger.info(f"UC1 Products router not available: {e}")

try:
    from api.orders import router as orders_router
    app.include_router(orders_router, tags=["UC1-Orders", "UC4-Tracking"])
    logger.info("Loaded UC1 Orders router")
except Exception as e:
    logger.info(f"UC1 Orders router not available: {e}")

try:
    from uc2_promotions.api.coupons import router as coupons_router
    app.include_router(coupons_router, tags=["UC2-Promotions"])
    logger.info("Loaded UC2 Promotions router")
except Exception as e:
    logger.info(f"UC2 Promotions router not available: {e}")

try:
    # Try uc3_inventory with underscore
    from uc3_inventory.api.inventory import router as inventory_router
    app.include_router(inventory_router, tags=["UC3-Inventory"])
    logger.info("Loaded UC3 Inventory router")
except Exception as e:
    logger.info(f"UC3 Inventory router not available (tried underscore): {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
        log_level="info",
    )

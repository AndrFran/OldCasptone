# Inventory API Router - UC3 + Ops Dashboard
# Endpoints for viewing inventory levels and low-stock alerts

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from shared.db import get_db
from shared.models import Product, User
from shared.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/")
async def get_inventory(
    low_stock_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Get all products with inventory levels (ops dashboard)"""
    query = db.query(Product)

    if low_stock_only:
        query = query.filter(Product.stock < Product.low_stock_threshold)

    total = query.count()
    products = query.offset(skip).limit(limit).all()

    return {
        "items": [
            {
                "id": p.id,
                "name": p.name,
                "price": float(p.price),
                "stock": p.stock,
                "low_stock_threshold": p.low_stock_threshold,
                "is_low_stock": p.is_low_stock()
            }
            for p in products
        ],
        "total": total
    }

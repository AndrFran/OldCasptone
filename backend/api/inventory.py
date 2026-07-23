# Inventory API Router - UC3 + Ops Dashboard
# Endpoints for viewing inventory levels and low-stock alerts

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import logging
from typing import Optional

from shared.db import get_db
from shared.models import Product, User
from shared.auth import get_user_from_token, decode_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Extract user from Bearer token in Authorization header"""
    if not authorization:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return get_user_from_token(token, db)
    except (ValueError, AttributeError):
        return None


def require_ops_manager(
    user: Optional[User] = Depends(get_current_user_from_header)
):
    """Dependency to ensure only ops managers can access inventory endpoints"""
    if not user or user.user_type != 'ops_manager':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ops manager access required"
        )
    return user


@router.get("/", response_model=None)
async def get_inventory(
    low_stock_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_ops_manager),
):
    """Get all products with inventory levels (ops manager only)"""
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

# UC3 Inventory API Endpoints
# FastAPI routes for inventory management
# - GET /inventory — all inventory levels
# - GET /inventory/low-stock — low-stock alerts
# - PATCH /inventory/{product_id} — restock

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
import logging

# Import shared dependencies
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from shared.db import get_db
from uc3_inventory.services.inventory_service import (
    InventoryService,
    OutOfStockException,
    RaceConditionException
)

logger = logging.getLogger(__name__)

# ===================== Pydantic Schemas =====================

class InventoryResponse(BaseModel):
    """Inventory level for a product"""
    product_id: int
    product_name: str
    stock: int
    low_stock_threshold: int
    price: float
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryListResponse(BaseModel):
    """List of inventory levels"""
    items: List[InventoryResponse]
    total: int


class LowStockAlertResponse(BaseModel):
    """Low-stock alert for a product"""
    product_id: int
    product_name: str
    current_stock: int
    low_stock_threshold: int
    urgency: str  # "critical" or "warning"
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class LowStockAlertListResponse(BaseModel):
    """List of low-stock alerts"""
    items: List[LowStockAlertResponse]
    total: int


class RestockRequest(BaseModel):
    """Request to restock a product"""
    quantity: int = Field(..., gt=0, description="Quantity to add (must be > 0)")

    class Config:
        json_schema_extra = {
            "example": {"quantity": 50}
        }


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    details: Optional[str] = None
    code: Optional[str] = None


# ===================== FastAPI Router =====================

router = APIRouter()


@router.get(
    "/inventory",
    response_model=InventoryListResponse,
    tags=["UC3-Inventory"],
    summary="Get all inventory levels",
    description="Returns current stock levels for all products. Ops access only."
)
async def get_inventory(db: Session = Depends(get_db)):
    """
    Retrieve all product inventory levels.

    **Access Control:** Ops manager only (may require auth in production)

    **Returns:**
    - `items`: List of inventory objects
    - `total`: Total number of products

    **Example Response:**
    ```json
    {
      "items": [
        {
          "product_id": 1,
          "product_name": "Widget A",
          "stock": 50,
          "low_stock_threshold": 10,
          "price": 29.99,
          "updated_at": "2026-07-23T10:05:00Z"
        }
      ],
      "total": 1
    }
    ```
    """
    try:
        inventory = InventoryService.get_inventory_levels(db)
        return InventoryListResponse(items=inventory, total=len(inventory))
    except Exception as e:
        logger.error(f"Error retrieving inventory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inventory"
        )


@router.get(
    "/inventory/low-stock",
    response_model=LowStockAlertListResponse,
    tags=["UC3-Inventory"],
    summary="Get low-stock alerts",
    description="Returns products below low_stock_threshold, sorted by urgency. Ops access only."
)
async def get_low_stock_alerts(db: Session = Depends(get_db)):
    """
    Retrieve low-stock alerts (products below threshold).

    **Urgency Levels:**
    - `critical`: stock <= threshold / 2 (immediate action needed)
    - `warning`: stock < threshold (monitor closely)

    **Access Control:** Ops manager only

    **Returns:**
    - `items`: List of low-stock alerts, sorted by urgency
    - `total`: Number of low-stock products

    **Example Response:**
    ```json
    {
      "items": [
        {
          "product_id": 2,
          "product_name": "Widget B",
          "current_stock": 3,
          "low_stock_threshold": 10,
          "urgency": "critical",
          "updated_at": "2026-07-23T10:05:00Z"
        }
      ],
      "total": 1
    }
    ```
    """
    try:
        alerts = InventoryService.get_low_stock_alerts(db)
        return LowStockAlertListResponse(items=alerts, total=len(alerts))
    except Exception as e:
        logger.error(f"Error retrieving low-stock alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve low-stock alerts"
        )


@router.patch(
    "/inventory/{product_id}",
    response_model=InventoryResponse,
    tags=["UC3-Inventory"],
    summary="Restock a product",
    description="Add inventory to a product. Ops access only."
)
async def restock_product(
    product_id: int,
    request: RestockRequest,
    db: Session = Depends(get_db)
):
    """
    Restock a product by adding inventory.

    **Parameters:**
    - `product_id`: Product to restock
    - `quantity`: Quantity to add (must be > 0)

    **Access Control:** Ops manager only

    **Responses:**
    - `200`: Product restocked successfully
    - `404`: Product not found
    - `422`: Invalid request (quantity not positive)

    **Example Request:**
    ```json
    {"quantity": 50}
    ```

    **Example Response:**
    ```json
    {
      "product_id": 1,
      "product_name": "Widget A",
      "stock": 100,
      "low_stock_threshold": 10,
      "price": 29.99,
      "updated_at": "2026-07-23T10:10:00Z"
    }
    ```
    """
    try:
        # Validate quantity (pydantic already enforces > 0)
        if request.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Quantity must be positive"
            )

        # Perform restock
        inventory = InventoryService.restock_product(db, product_id, request.quantity)

        # Commit transaction
        db.commit()

        logger.info(f"Product {product_id} restocked: +{request.quantity} units")
        return InventoryResponse(**inventory)

    except ValueError as e:
        db.rollback()
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error restocking product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restock product"
        )


# ===================== Internal Endpoints (for UC1 integration) =====================

@router.post(
    "/inventory/_check-stock",
    response_model=dict,
    tags=["UC3-Inventory"],
    include_in_schema=False  # Hidden from OpenAPI docs (internal only)
)
async def check_stock_internal(
    product_id: int,
    quantity: int,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint for UC1 to check stock before order placement.
    Not exposed in public API.

    Returns: {product_id, available_stock, requested_qty, in_stock}
    """
    try:
        result = InventoryService.check_stock(db, product_id, quantity)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error checking stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check stock"
        )


@router.post(
    "/inventory/_reserve-stock",
    response_model=dict,
    tags=["UC3-Inventory"],
    include_in_schema=False  # Hidden from OpenAPI docs (internal only)
)
async def reserve_stock_internal(
    product_id: int,
    quantity: int,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint for UC1 to atomically reserve stock during order placement.
    Uses FOR UPDATE lock to prevent race conditions.

    CRITICAL: Must be called within UC1's transaction.

    Returns: {product_id, reserved_qty, remaining_stock, updated_at}

    Raises:
    - OutOfStockException (400): Insufficient stock
    - RaceConditionException (409): Conflict during transaction
    """
    try:
        result = InventoryService.reserve_stock(db, product_id, quantity)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except OutOfStockException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Out of stock",
                "details": str(e),
                "code": "OUT_OF_STOCK"
            }
        )
    except RaceConditionException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Race condition",
                "details": str(e),
                "code": "RACE_CONDITION"
            }
        )
    except Exception as e:
        logger.error(f"Error reserving stock: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reserve stock"
        )

# UC3 Inventory API Endpoints
# FastAPI routes for inventory management
# - GET /inventory — filtered inventory with search, sorting, pagination
# - GET /inventory/low-stock — low-stock alerts
# - GET /inventory/filters — available filter options (brands, teams, colors, silhouettes)
# - PATCH /inventory/{product_id} — restock (add quantity)
# - PUT /inventory/{product_id}/quantity — set quantity to absolute value

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
from shared.models import User
from shared.auth import get_current_user
from uc3_inventory.services.inventory_service import (
    InventoryService,
    OutOfStockException,
    RaceConditionException
)

logger = logging.getLogger(__name__)


# ===================== Auth Dependencies =====================
def require_ops_manager(user: User = Depends(get_current_user)):
    """Ensure only ops managers can access inventory endpoints"""
    if not user or user.user_type != 'ops_manager':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ops manager access required"
        )
    return user


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


class SetQuantityRequest(BaseModel):
    """Request to set product quantity to absolute value"""
    new_quantity: int = Field(..., ge=0, description="Target quantity (0 or more)")
    operation_type: Optional[str] = Field(
        default="set",
        description="Operation type for audit logging ('set', 'restock', 'adjust')"
    )

    class Config:
        json_schema_extra = {
            "example": {"new_quantity": 100, "operation_type": "set"}
        }


class SetQuantityResponse(BaseModel):
    """Response after setting product quantity"""
    product_id: int
    product_name: str
    old_quantity: int
    new_quantity: int
    delta: int
    stock: int
    low_stock_threshold: int
    urgency: str  # 'critical', 'warning', 'ok'
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class FilterOption(BaseModel):
    """Filter option with count"""
    name: str
    count: int


class AvailableFiltersResponse(BaseModel):
    """Available filter options"""
    brands: List[FilterOption]
    teams: List[FilterOption]
    colors: List[FilterOption]
    silhouettes: List[FilterOption]
    stock_range: dict

    class Config:
        json_schema_extra = {
            "example": {
                "brands": [
                    {"name": "Nike", "count": 5},
                    {"name": "Adidas", "count": 3}
                ],
                "teams": [
                    {"name": "Design", "count": 4},
                    {"name": "Operations", "count": 4}
                ],
                "colors": [
                    {"name": "Red", "count": 3},
                    {"name": "Blue", "count": 5}
                ],
                "silhouettes": [
                    {"name": "9FORTY", "count": 4},
                    {"name": "39THIRTY", "count": 4}
                ],
                "stock_range": {"min": 0, "max": 150}
            }
        }


class ProductInventoryResponse(BaseModel):
    """Product inventory with categorical data"""
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    low_stock_threshold: int
    image_url: Optional[str] = None
    brand: Optional[str] = None
    team: Optional[str] = None
    color: Optional[str] = None
    silhouette: Optional[str] = None
    sale_price: Optional[float] = None
    urgency: str  # 'critical', 'warning', 'ok'
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class FilteredInventoryResponse(BaseModel):
    """Filtered inventory list with pagination"""
    total: int
    page: int
    per_page: int
    items: List[ProductInventoryResponse]

    class Config:
        json_schema_extra = {
            "example": {
                "total": 50,
                "page": 1,
                "per_page": 20,
                "items": [
                    {
                        "id": 1,
                        "name": "Nike 9FORTY Red",
                        "description": "Red Nike 9FORTY cap",
                        "price": 29.99,
                        "stock": 5,
                        "low_stock_threshold": 10,
                        "image_url": "https://example.com/image.jpg",
                        "brand": "Nike",
                        "team": "Design",
                        "color": "Red",
                        "silhouette": "9FORTY",
                        "sale_price": None,
                        "urgency": "critical",
                        "updated_at": "2026-07-23T10:05:00Z"
                    }
                ]
            }
        }


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    details: Optional[str] = None
    code: Optional[str] = None


# ===================== FastAPI Router =====================

router = APIRouter()




@router.get(
    "/inventory/low-stock",
    response_model=LowStockAlertListResponse,
    tags=["UC3-Inventory"],
    summary="Get low-stock alerts",
    description="Returns products below low_stock_threshold, sorted by urgency. Ops manager access only."
)
async def get_low_stock_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(require_ops_manager),
):
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
    description="Add inventory to a product. Ops manager access only."
)
async def restock_product(
    product_id: int,
    request: RestockRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_ops_manager),
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


@router.get(
    "/inventory/filters",
    response_model=AvailableFiltersResponse,
    tags=["UC3-Inventory"],
    summary="Get available filter options",
    description="Returns distinct values and counts for all categorical fields (brand, team, color, silhouette). Ops manager access only."
)
async def get_filters(
    db: Session = Depends(get_db),
    user: User = Depends(require_ops_manager),
):
    """
    Retrieve available filter options for inventory dashboard.

    **Returns:**
    - `brands`: List of {name, count} for each brand
    - `teams`: List of {name, count} for each team
    - `colors`: List of {name, count} for each color
    - `silhouettes`: List of {name, count} for each silhouette
    - `stock_range`: {min, max} stock levels across all products

    **Access Control:** Ops manager only

    **Example Response:**
    ```json
    {
      "brands": [
        {"name": "Nike", "count": 15},
        {"name": "Adidas", "count": 12}
      ],
      "teams": [
        {"name": "Design", "count": 10},
        {"name": "Operations", "count": 17}
      ],
      "colors": [
        {"name": "Red", "count": 8},
        {"name": "Blue", "count": 9},
        {"name": "Black", "count": 10}
      ],
      "silhouettes": [
        {"name": "9FORTY", "count": 9},
        {"name": "39THIRTY", "count": 18}
      ],
      "stock_range": {"min": 0, "max": 150}
    }
    ```
    """
    try:
        filters = InventoryService.get_available_filters(db)
        return AvailableFiltersResponse(**filters)
    except Exception as e:
        logger.error(f"Error retrieving filter options: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve filter options"
        )


@router.get(
    "/inventory",
    response_model=FilteredInventoryResponse,
    tags=["UC3-Inventory"],
    summary="Get filtered inventory with search, sort, pagination",
    description="Returns inventory with advanced filtering, full-text search, sorting, and pagination. Ops manager access only."
)
async def get_inventory_filtered(
    db: Session = Depends(get_db),
    user: User = Depends(require_ops_manager),
    search: Optional[str] = None,
    brand: Optional[List[str]] = None,
    team: Optional[List[str]] = None,
    color: Optional[List[str]] = None,
    silhouette: Optional[List[str]] = None,
    status: Optional[str] = None,
    sort_by: str = "status_urgent",
    page: int = 1,
    per_page: int = 50,
):
    """
    Retrieve inventory with advanced filtering, search, sorting, and pagination.

    **Query Parameters:**

    **Search & Filter:**
    - `search`: Full-text search across name, brand, team, color, silhouette
    - `brand`: Filter by brand(s) (comma-separated or multiple params)
    - `team`: Filter by team(s)
    - `color`: Filter by color(s)
    - `silhouette`: Filter by silhouette(s)
    - `status`: Filter by stock status ('critical', 'warning', 'ok')

    **Sorting:**
    - `sort_by`: Sort order (default: 'status_urgent')
      - `status_urgent`: Critical → Warning → OK (then by stock level)
      - `stock_asc`: Lowest stock first
      - `stock_desc`: Highest stock first
      - `price_asc`: Price low → high
      - `price_desc`: Price high → low
      - `name_asc`: Name A → Z
      - `name_desc`: Name Z → A
      - `updated_at_desc`: Most recently updated

    **Pagination:**
    - `page`: Page number (1-indexed, default: 1)
    - `per_page`: Items per page (default: 50, max: 200)

    **Returns:**
    - `total`: Total number of matching products (across all pages)
    - `page`: Current page number
    - `per_page`: Items per page
    - `items`: List of products with urgency status

    **Access Control:** Ops manager only

    **Example Request:**
    ```
    GET /inventory?search=nike&brand=Nike&status=critical&sort_by=stock_asc&page=1&per_page=20
    ```

    **Example Response:**
    ```json
    {
      "total": 5,
      "page": 1,
      "per_page": 20,
      "items": [
        {
          "id": 1,
          "name": "Nike 9FORTY Red",
          "description": "Red Nike cap",
          "price": 29.99,
          "stock": 3,
          "low_stock_threshold": 10,
          "image_url": "https://example.com/image.jpg",
          "brand": "Nike",
          "team": "Design",
          "color": "Red",
          "silhouette": "9FORTY",
          "sale_price": null,
          "urgency": "critical",
          "updated_at": "2026-07-23T10:05:00Z"
        }
      ]
    }
    ```
    """
    try:
        # Validate pagination params
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page must be >= 1"
            )
        if per_page < 1 or per_page > 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="per_page must be between 1 and 200"
            )

        # Validate status filter
        if status and status not in ["critical", "warning", "ok"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="status must be 'critical', 'warning', or 'ok'"
            )

        # Perform filtered query
        products, total = InventoryService.get_inventory_filtered(
            db,
            search=search,
            brands=brand,
            teams=team,
            colors=color,
            silhouettes=silhouette,
            status_filter=status,
            sort_by=sort_by,
            page=page,
            per_page=per_page
        )

        return FilteredInventoryResponse(
            total=total,
            page=page,
            per_page=per_page,
            items=products
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving filtered inventory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inventory"
        )


@router.put(
    "/inventory/{product_id}/quantity",
    response_model=SetQuantityResponse,
    tags=["UC3-Inventory"],
    summary="Set product quantity to absolute value",
    description="Set product stock to exact quantity (not incremental). Ops manager access only."
)
async def set_inventory_quantity(
    product_id: int,
    request: SetQuantityRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_ops_manager),
):
    """
    Set product inventory to an absolute quantity value.

    This endpoint replaces the current stock with the specified quantity.
    Use this for in-place quantity editing in the dashboard.

    **Parameters:**
    - `product_id`: Product to update
    - `new_quantity`: Target quantity (must be >= 0)
    - `operation_type`: Type of operation for logging ('set', 'restock', 'adjust')

    **Access Control:** Ops manager only

    **Responses:**
    - `200`: Quantity set successfully
    - `400`: Bad request (negative quantity)
    - `404`: Product not found
    - `500`: Server error

    **Example Request:**
    ```json
    {
      "new_quantity": 100,
      "operation_type": "set"
    }
    ```

    **Example Response:**
    ```json
    {
      "product_id": 1,
      "product_name": "Nike 9FORTY Red",
      "old_quantity": 5,
      "new_quantity": 100,
      "delta": 95,
      "stock": 100,
      "low_stock_threshold": 10,
      "urgency": "ok",
      "updated_at": "2026-07-23T10:15:00Z"
    }
    ```
    """
    try:
        # Perform quantity update
        result = InventoryService.set_inventory_quantity(
            db,
            product_id,
            request.new_quantity,
            request.operation_type or "set"
        )

        # Commit transaction
        db.commit()

        logger.info(
            f"Product {product_id} quantity set: "
            f"old={result['old_quantity']}, new={result['new_quantity']}"
        )
        return SetQuantityResponse(**result)

    except ValueError as e:
        db.rollback()
        error_str = str(e).lower()
        if "not found" in error_str:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        elif "negative" in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )
    except Exception as e:
        db.rollback()
        logger.error(f"Error setting inventory quantity for product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set inventory quantity"
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

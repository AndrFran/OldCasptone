# Order API Router - UC1 & UC4
# Endpoints for order placement, status tracking, and order history
# Integrates with: UC2 (coupon validation), UC3 (stock decrement)

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
import logging

from shared.db import get_db
from shared.schemas import (
    CreateOrderRequest,
    OrderResponse,
    OrderList,
    OrderCreatedResponse,
    UpdateOrderStatusRequest,
)
from shared.exceptions import (
    OutOfStockError,
    ProductNotFoundError,
    CustomerNotFoundError,
    InvalidOrderError,
    InvalidStatusTransitionError,
    CouponValidationError,
)
from services.order_service import OrderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["Orders"])


# ===================== UC1: Order Creation =====================


@router.post(
    "",
    response_model=OrderCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Order (Atomic)",
    description="Create a new order with real-time stock check and atomic placement.\n\n"
    "Key Feature: Uses database-level SERIALIZABLE isolation + FOR UPDATE locks to "
    "prevent race conditions on last-unit inventory without distributed locks.\n\n"
    "Integration: Validates coupons (UC2), decrements stock (UC3), "
    "creates order record (UC4).",
)
async def create_order(
    request: CreateOrderRequest,
    db: Session = Depends(get_db),
) -> OrderResponse:
    """
    Create a new order atomically.

    **Request Body:**
    ```json
    {
        "customer_id": 1,
        "items": [
            {"product_id": 10, "quantity": 2},
            {"product_id": 15, "quantity": 1}
        ],
        "coupon_code": "SUMMER20"  // optional
    }
    ```

    **Response (201 Created):**
    ```json
    {
        "id": 42,
        "customer_id": 1,
        "status": "pending",
        "items": [...],
        "subtotal": 150.00,
        "discount_amount": 30.00,
        "total": 120.00,
        "coupon_code": "SUMMER20",
        "created_at": "2025-07-23T10:30:00Z",
        "updated_at": "2025-07-23T10:30:00Z",
        "message": "Order created successfully"
    }
    ```

    **Error Scenarios:**
    - **400 Bad Request:** Invalid customer_id, missing items, invalid coupon
    - **404 Not Found:** Product or customer not found
    - **409 Conflict:** Out of stock (race condition safety)

    **Race Condition Prevention:**
    With 2 concurrent requests for 1 unit of Product X:
    1. Both requests BEGIN TRANSACTION (SERIALIZABLE)
    2. Both request Product X FOR UPDATE
    3. First request acquires lock, passes stock check
    4. Second request waits for lock (blocked)
    5. First request decrements stock to 0 and COMMITS (lock released)
    6. Second request acquires lock, fails stock check, ROLLBACK with OutOfStockError
    Result: Only one succeeds, no overselling, no race conditions.
    """

    try:
        # Use OrderService to create order atomically
        order = OrderService.create_order(
            db,
            customer_id=request.customer_id,
            items=[{"product_id": item.product_id, "quantity": item.quantity}
                   for item in request.items],
            coupon_code=request.coupon_code,
        )

        logger.info(f"Order {order.id} created successfully")
        return OrderCreatedResponse.from_orm(order)

    except CustomerNotFoundError as e:
        logger.warning(f"Order creation failed: {str(e)}")
        raise

    except ProductNotFoundError as e:
        logger.warning(f"Order creation failed: {str(e)}")
        raise

    except OutOfStockError as e:
        logger.warning(f"Order creation failed: {str(e)}")
        raise

    except CouponValidationError as e:
        logger.warning(f"Order creation failed: {str(e)}")
        raise

    except InvalidOrderError as e:
        logger.warning(f"Order creation failed: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error creating order: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        )


# ===================== UC4: Order Retrieval =====================


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get Order Status",
    description="Retrieve order details including status, items, and pricing.",
)
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
) -> OrderResponse:
    """
    Get order by ID with full details.

    **Response (200 OK):**
    ```json
    {
        "id": 42,
        "customer_id": 1,
        "status": "pending",
        "items": [
            {
                "id": 101,
                "product_id": 10,
                "quantity": 2,
                "price": 50.00,
                "subtotal": 100.00,
                "created_at": "2025-07-23T10:30:00Z"
            }
        ],
        "subtotal": 100.00,
        "discount_amount": 0.00,
        "total": 100.00,
        "coupon_code": null,
        "created_at": "2025-07-23T10:30:00Z",
        "updated_at": "2025-07-23T10:30:00Z"
    }
    ```

    **Error:**
    - **404 Not Found:** Order doesn't exist
    """

    try:
        order = OrderService.get_order(db, order_id)
        return OrderResponse.from_orm(order)

    except InvalidOrderError as e:
        logger.warning(f"Order retrieval failed: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error retrieving order: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order",
        )


# ===================== UC4: Customer Order History =====================


@router.get(
    "/customers/{customer_id}",
    response_model=OrderList,
    summary="Get Customer Order History",
    description="Retrieve paginated order history for a customer.",
)
async def get_customer_orders(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> OrderList:
    """
    Get all orders for a customer (order history).

    **Query Parameters:**
    - `skip`: Pagination offset (default: 0)
    - `limit`: Pagination limit (default: 100, max: 1000)

    **Response (200 OK):**
    ```json
    {
        "items": [
            {
                "id": 42,
                "customer_id": 1,
                "status": "delivered",
                "items": [...],
                "subtotal": 100.00,
                "discount_amount": 10.00,
                "total": 90.00,
                "coupon_code": "WELCOME10",
                "created_at": "2025-07-23T10:30:00Z",
                "updated_at": "2025-07-23T14:00:00Z"
            }
        ],
        "total": 5
    }
    ```

    **Error:**
    - **404 Not Found:** Customer doesn't exist
    """

    try:
        orders, total = OrderService.get_customer_orders(
            db, customer_id, skip=skip, limit=limit
        )
        return OrderList(items=[OrderResponse.from_orm(o) for o in orders], total=total)

    except CustomerNotFoundError as e:
        logger.warning(f"Customer order history retrieval failed: {str(e)}")
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error retrieving customer orders: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve customer orders",
        )


# ===================== UC4: Order Status Update (Ops Only) =====================


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Update Order Status (Ops Only)",
    description="Update order status with validation of state transitions.\n\n"
    "Valid transitions:\n"
    "- pending → confirmed\n"
    "- confirmed → shipped\n"
    "- shipped → delivered\n"
    "- delivered → (terminal, no changes)\n\n"
    "Access: Operations manager only (auth check via middleware).",
)
async def update_order_status(
    order_id: int,
    request: UpdateOrderStatusRequest,
    db: Session = Depends(get_db),
) -> OrderResponse:
    """
    Update order status with validation.

    **Request Body:**
    ```json
    {
        "status": "confirmed"
    }
    ```

    **Response (200 OK):**
    ```json
    {
        "id": 42,
        "customer_id": 1,
        "status": "confirmed",
        "items": [...],
        "subtotal": 100.00,
        "discount_amount": 0.00,
        "total": 100.00,
        "coupon_code": null,
        "created_at": "2025-07-23T10:30:00Z",
        "updated_at": "2025-07-23T10:35:00Z"
    }
    ```

    **Valid Status Transitions:**
    - `pending` → `confirmed` → `shipped` → `delivered`
    - Once at `delivered`, no further transitions allowed

    **Error Scenarios:**
    - **400 Bad Request:** Invalid status or invalid transition
    - **404 Not Found:** Order not found
    - **403 Forbidden:** Insufficient permissions (not ops manager)
    """

    try:
        order = OrderService.update_order_status(
            db, order_id, request.status.value
        )
        return OrderResponse.from_orm(order)

    except InvalidOrderError as e:
        logger.warning(f"Order status update failed: {str(e)}")
        raise

    except InvalidStatusTransitionError as e:
        logger.warning(f"Order status update failed: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error updating order status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status",
        )


# ===================== Ops Dashboard Support =====================


@router.get(
    "/status/{status}",
    response_model=OrderList,
    summary="Get Orders by Status (Ops Dashboard)",
    description="Retrieve orders filtered by status (useful for ops queue).",
)
async def get_orders_by_status(
    status: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> OrderList:
    """
    Get orders filtered by status.

    **Query Parameters:**
    - `status`: Order status (pending, confirmed, shipped, delivered)
    - `skip`: Pagination offset (default: 0)
    - `limit`: Pagination limit (default: 50)

    **Response (200 OK):**
    ```json
    {
        "items": [
            {
                "id": 42,
                "customer_id": 1,
                "status": "pending",
                "items": [...],
                "subtotal": 100.00,
                "discount_amount": 0.00,
                "total": 100.00,
                "coupon_code": null,
                "created_at": "2025-07-23T10:30:00Z",
                "updated_at": "2025-07-23T10:30:00Z"
            }
        ],
        "total": 3
    }
    ```
    """

    try:
        orders, total = OrderService.get_orders_by_status(
            db, status, skip=skip, limit=limit
        )
        return OrderList(items=[OrderResponse.from_orm(o) for o in orders], total=total)

    except InvalidStatusTransitionError as e:
        logger.warning(f"Status filter failed: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error filtering orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to filter orders by status",
        )

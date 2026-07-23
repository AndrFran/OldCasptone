# Order Service - UC1 & UC4 Shared Service
# Handles order placement, status tracking, and order history
# Integrates with: UC2 (Promotions), UC3 (Inventory), UC4 (Tracking)

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from decimal import Decimal
from datetime import datetime
from typing import List, Optional, Tuple
import logging

from shared.models import Order, OrderItem, Product, Customer, Coupon
from shared.exceptions import (
    OutOfStockError,
    ProductNotFoundError,
    CustomerNotFoundError,
    InvalidOrderError,
    InvalidStatusTransitionError,
    CouponValidationError,
)

logger = logging.getLogger(__name__)


class OrderService:
    """
    Service for order operations: placement, status updates, and retrieval.

    Key Features:
    - Atomic order placement with SERIALIZABLE isolation (race condition prevention)
    - Coupon/discount integration with UC2
    - Real-time stock verification and atomic decrement
    - Order status tracking with valid state transitions
    """

    # Valid order status transitions
    VALID_TRANSITIONS = {
        "pending": ["confirmed"],
        "confirmed": ["shipped"],
        "shipped": ["delivered"],
        "delivered": [],  # Terminal state
    }

    @staticmethod
    def create_order(
        db: Session,
        customer_id: int,
        items: List[dict],
        coupon_code: Optional[str] = None,
    ) -> Order:
        """
        Create a new order atomically with SERIALIZABLE isolation.

        This is the CRITICAL path for UC1. The entire operation is wrapped in a transaction
        with SERIALIZABLE isolation to prevent race conditions on stock.

        Args:
            db: Database session
            customer_id: ID of customer placing order
            items: List of {product_id: int, quantity: int} dictionaries
            coupon_code: Optional coupon code for discount

        Returns:
            Order: Created order with all items and pricing

        Raises:
            CustomerNotFoundError: Customer doesn't exist
            ProductNotFoundError: Product doesn't exist
            OutOfStockError: Insufficient stock for any item
            InvalidOrderError: Order validation failed
            CouponValidationError: Coupon is invalid/expired

        Algorithm (SERIALIZABLE + FOR UPDATE prevents race conditions):
        1. BEGIN TRANSACTION (SERIALIZABLE isolation level)
        2. Verify customer exists
        3. SELECT all products FOR UPDATE (exclusive row locks acquired)
        4. Validate all products exist and quantities in stock
        5. Atomically UPDATE all products (decrement stock)
        6. INSERT order master record
        7. INSERT order_items line items with price snapshots
        8. Validate and apply coupon (if provided)
        9. UPDATE order with totals
        10. COMMIT (all-or-nothing atomicity)
        """

        # Validate customer exists
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise CustomerNotFoundError(f"Customer {customer_id} not found")

        # Validate items list
        if not items or len(items) == 0:
            raise InvalidOrderError("Order must contain at least one item")

        # Extract product IDs for batch query
        product_ids = [item["product_id"] for item in items]

        # CRITICAL: Select all products WITH LOCK (FOR UPDATE)
        # This acquires exclusive row locks on all products
        # Prevents concurrent modifications and ensures stock snapshot consistency
        try:
            products_dict = {}
            for product_id in product_ids:
                # FOR UPDATE ensures exclusive lock is held until transaction commit
                product = (
                    db.query(Product)
                    .with_for_update()
                    .filter(Product.id == product_id)
                    .first()
                )
                if not product:
                    raise ProductNotFoundError(f"Product {product_id} not found")
                products_dict[product_id] = product

            # Validate stock for ALL items (all-or-nothing check)
            for item in items:
                product = products_dict[item["product_id"]]
                if product.stock < item["quantity"]:
                    raise OutOfStockError(
                        f"Product '{product.name}' only has {product.stock} in stock, "
                        f"requested {item['quantity']}"
                    )

            # ATOMIC: Decrement stock for all products
            # This happens INSIDE the transaction with locks held
            for product_id, product in products_dict.items():
                quantity_ordered = next(
                    item["quantity"]
                    for item in items
                    if item["product_id"] == product_id
                )
                product.stock -= quantity_ordered
                product.updated_at = datetime.utcnow()

            # Create order master record
            order = Order(
                customer_id=customer_id,
                status="pending",
                subtotal=Decimal("0"),
                discount_amount=Decimal("0"),
                total=Decimal("0"),
                coupon_code=coupon_code,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(order)
            db.flush()  # Flush to get order.id without committing

            # Calculate subtotal and create order items
            subtotal = Decimal("0")
            for item in items:
                product = products_dict[item["product_id"]]
                item_subtotal = product.price * Decimal(item["quantity"])

                order_item = OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=item["quantity"],
                    price=product.price,
                    subtotal=item_subtotal,
                    created_at=datetime.utcnow(),
                )
                order.items.append(order_item)
                db.add(order_item)
                subtotal += item_subtotal

            order.subtotal = subtotal

            # Apply coupon discount if provided
            discount_amount = Decimal("0")
            if coupon_code:
                discount_amount = OrderService._apply_coupon(
                    db, order, coupon_code, subtotal
                )
                order.discount_amount = discount_amount

            # Calculate total
            order.total = max(Decimal("0"), subtotal - discount_amount)
            order.updated_at = datetime.utcnow()

            db.commit()
            logger.info(
                f"Order {order.id} created: customer={customer_id}, items={len(items)}, "
                f"total={order.total}, coupon={coupon_code}"
            )
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Order creation failed: {str(e)}")
            raise

    @staticmethod
    def _apply_coupon(
        db: Session, order: Order, coupon_code: str, subtotal: Decimal
    ) -> Decimal:
        """
        Apply coupon code and return discount amount.

        Validates coupon existence, expiry, and usage limits before applying.
        Increments coupon usage counter atomically.

        Args:
            db: Database session
            order: Order object to apply coupon to
            coupon_code: Coupon code string
            subtotal: Order subtotal (before discount)

        Returns:
            Decimal: Discount amount (clamped to [0, subtotal])

        Raises:
            CouponValidationError: Coupon invalid, expired, or limit exceeded
        """
        coupon = db.query(Coupon).filter(Coupon.code == coupon_code).first()

        if not coupon:
            raise CouponValidationError(f"Coupon code '{coupon_code}' not found")

        if not coupon.is_valid():
            if coupon.expires_at < datetime.utcnow():
                raise CouponValidationError(f"Coupon '{coupon_code}' has expired")
            if coupon.max_uses and coupon.used_count >= coupon.max_uses:
                raise CouponValidationError(
                    f"Coupon '{coupon_code}' usage limit exceeded"
                )

        # Calculate discount
        if coupon.discount_type == "percent":
            discount = (subtotal * coupon.value) / Decimal("100")
        elif coupon.discount_type == "fixed":
            discount = coupon.value
        else:
            raise CouponValidationError(
                f"Unknown discount type: {coupon.discount_type}"
            )

        # Clamp discount to subtotal (don't allow negative totals)
        discount = min(discount, subtotal)

        # Increment coupon usage
        coupon.used_count += 1

        return discount

    @staticmethod
    def get_order(db: Session, order_id: int) -> Order:
        """
        Retrieve a single order by ID with all items and customer details.

        Args:
            db: Database session
            order_id: Order ID

        Returns:
            Order: Order object with relationships loaded

        Raises:
            InvalidOrderError: Order not found
        """
        order = (
            db.query(Order)
            .filter(Order.id == order_id)
            .first()
        )
        if not order:
            raise InvalidOrderError(f"Order {order_id} not found")
        return order

    @staticmethod
    def get_customer_orders(
        db: Session, customer_id: int, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Order], int]:
        """
        Retrieve all orders for a customer (order history).

        Args:
            db: Database session
            customer_id: Customer ID
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple[List[Order], int]: (orders list, total count)

        Raises:
            CustomerNotFoundError: Customer not found
        """
        # Verify customer exists
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise CustomerNotFoundError(f"Customer {customer_id} not found")

        # Get total count
        total = db.query(func.count(Order.id)).filter(
            Order.customer_id == customer_id
        ).scalar()

        # Get paginated orders
        orders = (
            db.query(Order)
            .filter(Order.customer_id == customer_id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return orders, total

    @staticmethod
    def update_order_status(
        db: Session, order_id: int, new_status: str
    ) -> Order:
        """
        Update order status with validation of state transitions.

        Valid transitions:
        - pending → confirmed
        - confirmed → shipped
        - shipped → delivered
        - delivered → (terminal, no further changes)

        Args:
            db: Database session
            order_id: Order ID
            new_status: New status string

        Returns:
            Order: Updated order

        Raises:
            InvalidOrderError: Order not found
            InvalidStatusTransitionError: Invalid state transition
        """
        order = OrderService.get_order(db, order_id)

        # Validate new status
        if new_status not in OrderService.VALID_TRANSITIONS:
            raise InvalidStatusTransitionError(
                f"Invalid status: {new_status}. Must be one of: "
                f"{', '.join(OrderService.VALID_TRANSITIONS.keys())}"
            )

        # Validate transition is allowed
        allowed_transitions = OrderService.VALID_TRANSITIONS.get(order.status, [])
        if new_status not in allowed_transitions:
            raise InvalidStatusTransitionError(
                f"Cannot transition from '{order.status}' to '{new_status}'. "
                f"Allowed transitions from '{order.status}': {allowed_transitions}"
            )

        order.status = new_status
        order.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Order {order_id} status updated: {order.status}")
        return order

    @staticmethod
    def get_orders_by_status(
        db: Session, status: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Order], int]:
        """
        Retrieve orders filtered by status (useful for ops dashboard).

        Args:
            db: Database session
            status: Order status to filter by
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple[List[Order], int]: (orders list, total count)

        Raises:
            InvalidStatusTransitionError: Invalid status
        """
        if status not in OrderService.VALID_TRANSITIONS:
            raise InvalidStatusTransitionError(
                f"Invalid status: {status}. Must be one of: "
                f"{', '.join(OrderService.VALID_TRANSITIONS.keys())}"
            )

        total = db.query(func.count(Order.id)).filter(
            Order.status == status
        ).scalar()

        orders = (
            db.query(Order)
            .filter(Order.status == status)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return orders, total

    @staticmethod
    def get_recent_orders(db: Session, limit: int = 50) -> List[Order]:
        """
        Get most recent orders across all customers (for ops monitoring).

        Args:
            db: Database session
            limit: Number of orders to return

        Returns:
            List[Order]: Recent orders ordered by creation time (newest first)
        """
        return (
            db.query(Order)
            .order_by(Order.created_at.desc())
            .limit(limit)
            .all()
        )

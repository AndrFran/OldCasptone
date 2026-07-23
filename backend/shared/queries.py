# Database Query Helpers
# Specialized queries for each UC with atomic transaction support

from sqlalchemy import select, text, func
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import datetime
import logging

from shared.models import Product, Customer, Order, OrderItem, Coupon
from shared.db import AtomicTransaction, OutOfStockError, RecordNotFoundError

logger = logging.getLogger(__name__)


# ==================== UC1: Browse Products & Place Order ====================
class ProductQueries:
    """Product catalog queries"""

    @staticmethod
    def list_products(session: Session, skip: int = 0, limit: int = 100) -> Tuple[List[Product], int]:
        """List all products with pagination"""
        query = session.query(Product)
        total = query.count()
        products = query.offset(skip).limit(limit).all()
        return products, total

    @staticmethod
    def get_product(session: Session, product_id: int) -> Optional[Product]:
        """Get single product by ID"""
        return session.query(Product).filter(Product.id == product_id).first()

    @staticmethod
    def get_products_by_ids(session: Session, product_ids: List[int]) -> List[Product]:
        """Get multiple products by IDs"""
        return session.query(Product).filter(Product.id.in_(product_ids)).all()

    @staticmethod
    def check_stock(session: Session, product_id: int, quantity: int) -> bool:
        """Check if product has sufficient stock"""
        product = session.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise RecordNotFoundError(f"Product {product_id} not found")
        return product.stock >= quantity

    @staticmethod
    def check_all_stock(session: Session, items: List[Tuple[int, int]]) -> bool:
        """
        Check if all items in list have sufficient stock
        items: List of (product_id, quantity) tuples
        """
        for product_id, quantity in items:
            if not ProductQueries.check_stock(session, product_id, quantity):
                product = ProductQueries.get_product(session, product_id)
                raise OutOfStockError(product_id, quantity, product.stock)
        return True


class OrderQueries:
    """Order creation and retrieval queries"""

    @staticmethod
    def create_order_atomic(
        session: Session,
        customer_id: int,
        items: List[Tuple[int, int]],
        coupon_code: Optional[str] = None,
    ) -> Order:
        """
        Create order with ATOMIC stock check and decrement.
        Uses SERIALIZABLE isolation to prevent race conditions.

        Args:
            session: Database session
            customer_id: Customer ID
            items: List of (product_id, quantity) tuples
            coupon_code: Optional coupon code

        Returns:
            Created Order object

        Raises:
            OutOfStockError: If any item is out of stock
            RecordNotFoundError: If customer or product not found
        """
        with AtomicTransaction(session, isolation_level="SERIALIZABLE"):
            # 1. Verify customer exists
            customer = session.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                raise RecordNotFoundError(f"Customer {customer_id} not found")

            # 2. Get all products with FOR UPDATE lock (exclusive lock)
            product_ids = [item[0] for item in items]
            products = (
                session.query(Product)
                .filter(Product.id.in_(product_ids))
                .with_for_update()  # Exclusive lock to prevent concurrent modifications
                .all()
            )

            # 3. Check stock and calculate totals
            product_map = {p.id: p for p in products}
            subtotal = Decimal(0)
            order_items = []

            for product_id, quantity in items:
                if product_id not in product_map:
                    raise RecordNotFoundError(f"Product {product_id} not found")

                product = product_map[product_id]

                # Check stock
                if product.stock < quantity:
                    raise OutOfStockError(product_id, quantity, product.stock)

                # Calculate item subtotal
                item_subtotal = product.price * Decimal(quantity)
                subtotal += item_subtotal

                # Decrement stock atomically
                product.stock -= quantity

                # Create order item (price snapshot)
                order_items.append(
                    OrderItem(
                        product_id=product_id,
                        quantity=quantity,
                        price=product.price,
                        subtotal=item_subtotal,
                    )
                )

            # 4. Create order
            order = Order(
                customer_id=customer_id,
                status="pending",
                subtotal=subtotal,
                discount_amount=Decimal(0),
                total=subtotal,
                coupon_code=coupon_code,
            )

            # 5. Add items and save
            for item in order_items:
                order.items.append(item)

            session.add(order)
            session.flush()  # Get order.id without committing

            # 6. If coupon provided, apply discount
            if coupon_code:
                coupon = session.query(Coupon).filter(Coupon.code == coupon_code).first()
                if coupon and coupon.is_valid():
                    discount = Decimal(0)
                    if coupon.discount_type == "percent":
                        discount = subtotal * (coupon.value / Decimal(100))
                    elif coupon.discount_type == "fixed":
                        discount = coupon.value

                    order.discount_amount = discount
                    order.total = subtotal - discount

                    # Increment coupon usage
                    coupon.used_count += 1

            session.commit()
            logger.info(f"✅ Order #{order.id} created atomically (customer={customer_id})")

        return order

    @staticmethod
    def get_order(session: Session, order_id: int) -> Optional[Order]:
        """Get order by ID with items"""
        return session.query(Order).filter(Order.id == order_id).first()

    @staticmethod
    def get_customer_orders(
        session: Session, customer_id: int, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Order], int]:
        """Get customer order history"""
        query = session.query(Order).filter(Order.customer_id == customer_id)
        total = query.count()
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        return orders, total

    @staticmethod
    def update_order_status(session: Session, order_id: int, new_status: str) -> Optional[Order]:
        """Update order status with validation"""
        order = session.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise RecordNotFoundError(f"Order {order_id} not found")

        if not order.can_transition_to(new_status):
            raise ValueError(
                f"Invalid status transition: {order.status} -> {new_status}"
            )

        order.status = new_status
        order.updated_at = datetime.utcnow()
        session.commit()
        logger.info(f"✅ Order #{order_id} status updated to {new_status}")

        return order


# ==================== UC2: Promotions & Discounts ====================
class CouponQueries:
    """Coupon validation and management queries"""

    @staticmethod
    def validate_coupon(session: Session, code: str) -> Optional[Coupon]:
        """
        Validate coupon code.
        Returns coupon if valid, None if invalid/expired/exhausted
        """
        coupon = session.query(Coupon).filter(Coupon.code == code).first()

        if not coupon:
            logger.warning(f"Coupon not found: {code}")
            return None

        if not coupon.is_valid():
            reason = (
                "expired"
                if coupon.is_expired()
                else "usage limit exceeded"
            )
            logger.warning(f"Coupon invalid ({reason}): {code}")
            return None

        return coupon

    @staticmethod
    def get_active_promotions(session: Session, skip: int = 0, limit: int = 100) -> Tuple[List[Coupon], int]:
        """Get all active (non-expired) coupons"""
        now = datetime.utcnow()
        query = session.query(Coupon).filter(Coupon.expires_at > now)
        total = query.count()
        coupons = query.offset(skip).limit(limit).all()
        return coupons, total

    @staticmethod
    def calculate_discount(coupon: Coupon, subtotal: Decimal) -> Decimal:
        """Calculate discount amount for a coupon"""
        if coupon.discount_type == "percent":
            return subtotal * (coupon.value / Decimal(100))
        elif coupon.discount_type == "fixed":
            return min(coupon.value, subtotal)  # Don't discount more than subtotal
        return Decimal(0)


# ==================== UC3: Inventory Management ====================
class InventoryQueries:
    """Inventory level queries and low-stock alerts"""

    @staticmethod
    def get_all_inventory(session: Session, skip: int = 0, limit: int = 100) -> Tuple[List[Product], int]:
        """Get all inventory levels"""
        query = session.query(Product)
        total = query.count()
        products = query.offset(skip).limit(limit).all()
        return products, total

    @staticmethod
    def get_low_stock_alerts(session: Session) -> List[Product]:
        """Get products below low stock threshold"""
        products = (
            session.query(Product)
            .filter(Product.stock < Product.low_stock_threshold)
            .order_by(Product.stock.asc())
            .all()
        )
        logger.info(f"Low stock alerts: {len(products)} products")
        return products

    @staticmethod
    def get_out_of_stock(session: Session) -> List[Product]:
        """Get out-of-stock products"""
        products = (
            session.query(Product)
            .filter(Product.stock == 0)
            .all()
        )
        return products

    @staticmethod
    def restock(session: Session, product_id: int, quantity: int) -> Optional[Product]:
        """Restock a product (add inventory)"""
        product = session.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise RecordNotFoundError(f"Product {product_id} not found")

        product.stock += quantity
        product.updated_at = datetime.utcnow()
        session.commit()
        logger.info(f"✅ Product #{product_id} restocked: +{quantity} units (new stock: {product.stock})")

        return product

    @staticmethod
    def get_urgency(product: Product) -> str:
        """
        Classify inventory urgency.
        critical: stock <= threshold / 5
        warning: stock < threshold
        """
        if product.stock <= product.low_stock_threshold / 5:
            return "critical"
        return "warning"


# ==================== UC4: Order Status Tracking ====================
class TrackingQueries:
    """Order tracking and status queries"""

    @staticmethod
    def get_order_status(session: Session, order_id: int) -> Optional[Order]:
        """Get order with full details for tracking"""
        return session.query(Order).filter(Order.id == order_id).first()

    @staticmethod
    def get_orders_by_status(
        session: Session, status: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Order], int]:
        """Get all orders with specific status (for ops dashboard)"""
        query = session.query(Order).filter(Order.status == status)
        total = query.count()
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        return orders, total

    @staticmethod
    def get_pending_orders(session: Session, limit: int = 50) -> List[Order]:
        """Get all pending orders (ops queue)"""
        return (
            session.query(Order)
            .filter(Order.status == "pending")
            .order_by(Order.created_at.asc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_orders_by_date_range(
        session: Session,
        start_date: datetime,
        end_date: datetime,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Order], int]:
        """Get orders within date range"""
        query = session.query(Order).filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
        )
        total = query.count()
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        return orders, total


# ==================== Analytics & Reporting ====================
class AnalyticsQueries:
    """Analytics and reporting queries"""

    @staticmethod
    def get_order_stats(session: Session) -> dict:
        """Get order statistics"""
        total_orders = session.query(func.count(Order.id)).scalar() or 0
        total_revenue = session.query(func.sum(Order.total)).scalar() or Decimal(0)

        status_counts = (
            session.query(Order.status, func.count(Order.id))
            .group_by(Order.status)
            .all()
        )

        return {
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "by_status": {status: count for status, count in status_counts},
        }

    @staticmethod
    def get_inventory_stats(session: Session) -> dict:
        """Get inventory statistics"""
        total_products = session.query(func.count(Product.id)).scalar() or 0
        total_inventory_value = (
            session.query(func.sum(Product.price * Product.stock)).scalar() or Decimal(0)
        )
        low_stock_count = (
            session.query(func.count(Product.id))
            .filter(Product.stock < Product.low_stock_threshold)
            .scalar() or 0
        )
        out_of_stock_count = (
            session.query(func.count(Product.id))
            .filter(Product.stock == 0)
            .scalar() or 0
        )

        return {
            "total_products": total_products,
            "inventory_value": float(total_inventory_value),
            "low_stock": low_stock_count,
            "out_of_stock": out_of_stock_count,
        }


logger.info("✅ Query helpers module loaded")

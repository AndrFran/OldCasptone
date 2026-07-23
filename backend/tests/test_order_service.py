# Unit Tests for Order Service
# Tests atomic order creation, coupon integration, status transitions

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from shared.models import Product, Customer, Order, OrderItem, Coupon
from shared.db import SessionLocal, engine
from shared.models import Base
from services.order_service import OrderService
from shared.exceptions import (
    OutOfStockError,
    ProductNotFoundError,
    CustomerNotFoundError,
    InvalidOrderError,
    InvalidStatusTransitionError,
    CouponValidationError,
)


# ===================== Fixtures =====================


@pytest.fixture(scope="session")
def db_setup():
    """Create all tables before tests"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(db_setup):
    """Get fresh database session for each test"""
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def customer(db: Session):
    """Create test customer"""
    customer = Customer(email="test@example.com", name="Test Customer")
    db.add(customer)
    db.commit()
    return customer


@pytest.fixture
def product_in_stock(db: Session):
    """Create product with sufficient stock"""
    product = Product(
        name="Elite Shoes",
        description="High-quality running shoes",
        price=Decimal("100.00"),
        stock=10,
        low_stock_threshold=3,
    )
    db.add(product)
    db.commit()
    return product


@pytest.fixture
def product_limited_stock(db: Session):
    """Create product with limited stock (for race condition testing)"""
    product = Product(
        name="Rare Item",
        description="Only 1 in stock",
        price=Decimal("50.00"),
        stock=1,
        low_stock_threshold=5,
    )
    db.add(product)
    db.commit()
    return product


@pytest.fixture
def coupon_valid(db: Session):
    """Create valid coupon (20% off)"""
    coupon = Coupon(
        code="SUMMER20",
        description="20% off summer sale",
        discount_type="percent",
        value=Decimal("20"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=100,
        used_count=0,
    )
    db.add(coupon)
    db.commit()
    return coupon


@pytest.fixture
def coupon_expired(db: Session):
    """Create expired coupon"""
    coupon = Coupon(
        code="OLDCODE",
        description="Expired coupon",
        discount_type="percent",
        value=Decimal("10"),
        expires_at=datetime.utcnow() - timedelta(days=1),
        max_uses=None,
        used_count=0,
    )
    db.add(coupon)
    db.commit()
    return coupon


@pytest.fixture
def coupon_limit_exceeded(db: Session):
    """Create coupon with usage limit exceeded"""
    coupon = Coupon(
        code="LIMITED",
        description="Limited uses",
        discount_type="fixed",
        value=Decimal("10.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=5,
        used_count=5,  # Already used max times
    )
    db.add(coupon)
    db.commit()
    return coupon


# ===================== Order Creation Tests =====================


def test_create_order_success(db: Session, customer: Customer, product_in_stock: Product):
    """Test successful order creation with valid items and stock"""
    items = [{"product_id": product_in_stock.id, "quantity": 2}]

    order = OrderService.create_order(db, customer.id, items)

    assert order.id is not None
    assert order.customer_id == customer.id
    assert order.status == "pending"
    assert len(order.items) == 1
    assert order.items[0].quantity == 2
    assert order.items[0].price == Decimal("100.00")
    assert order.items[0].subtotal == Decimal("200.00")
    assert order.subtotal == Decimal("200.00")
    assert order.discount_amount == Decimal("0.00")
    assert order.total == Decimal("200.00")
    assert order.coupon_code is None

    # Verify stock decremented
    db.refresh(product_in_stock)
    assert product_in_stock.stock == 8  # 10 - 2


def test_create_order_multiple_items(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test order creation with multiple items"""
    product2 = Product(name="Socks", price=Decimal("15.00"), stock=20)
    db.add(product2)
    db.commit()

    items = [
        {"product_id": product_in_stock.id, "quantity": 1},
        {"product_id": product2.id, "quantity": 3},
    ]

    order = OrderService.create_order(db, customer.id, items)

    assert len(order.items) == 2
    assert order.subtotal == Decimal("145.00")  # 100 + (15*3)
    assert order.total == Decimal("145.00")

    # Verify stock decremented for both products
    db.refresh(product_in_stock)
    db.refresh(product2)
    assert product_in_stock.stock == 9  # 10 - 1
    assert product2.stock == 17  # 20 - 3


def test_create_order_out_of_stock(
    db: Session, customer: Customer, product_limited_stock: Product
):
    """Test OutOfStockError when stock insufficient"""
    items = [{"product_id": product_limited_stock.id, "quantity": 2}]

    with pytest.raises(OutOfStockError) as exc_info:
        OrderService.create_order(db, customer.id, items)

    assert "only has 1 in stock" in str(exc_info.value.detail)
    assert "requested 2" in str(exc_info.value.detail)

    # Verify stock unchanged
    db.refresh(product_limited_stock)
    assert product_limited_stock.stock == 1


def test_create_order_exact_stock(
    db: Session, customer: Customer, product_limited_stock: Product
):
    """Test order creation with exact stock match"""
    items = [{"product_id": product_limited_stock.id, "quantity": 1}]

    order = OrderService.create_order(db, customer.id, items)

    assert order.id is not None
    assert order.items[0].quantity == 1

    # Stock should be 0
    db.refresh(product_limited_stock)
    assert product_limited_stock.stock == 0


def test_create_order_product_not_found(db: Session, customer: Customer):
    """Test ProductNotFoundError when product doesn't exist"""
    items = [{"product_id": 9999, "quantity": 1}]

    with pytest.raises(ProductNotFoundError) as exc_info:
        OrderService.create_order(db, customer.id, items)

    assert "9999" in str(exc_info.value.detail)


def test_create_order_customer_not_found(db: Session, product_in_stock: Product):
    """Test CustomerNotFoundError when customer doesn't exist"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]

    with pytest.raises(CustomerNotFoundError) as exc_info:
        OrderService.create_order(db, 9999, items)

    assert "9999" in str(exc_info.value.detail)


def test_create_order_empty_items(db: Session, customer: Customer):
    """Test InvalidOrderError when items list is empty"""
    with pytest.raises(InvalidOrderError) as exc_info:
        OrderService.create_order(db, customer.id, [])

    assert "at least one item" in str(exc_info.value.detail).lower()


# ===================== Coupon Integration Tests =====================


def test_create_order_with_percent_coupon(
    db: Session,
    customer: Customer,
    product_in_stock: Product,
    coupon_valid: Coupon,
):
    """Test order with percentage discount coupon"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]

    order = OrderService.create_order(db, customer.id, items, coupon_code="SUMMER20")

    assert order.subtotal == Decimal("100.00")
    assert order.discount_amount == Decimal("20.00")  # 20% of 100
    assert order.total == Decimal("80.00")
    assert order.coupon_code == "SUMMER20"

    # Verify coupon usage incremented
    db.refresh(coupon_valid)
    assert coupon_valid.used_count == 1


def test_create_order_with_fixed_coupon(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test order with fixed discount coupon"""
    coupon = Coupon(
        code="FIXED10",
        description="$10 off",
        discount_type="fixed",
        value=Decimal("10.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=None,
        used_count=0,
    )
    db.add(coupon)
    db.commit()

    items = [{"product_id": product_in_stock.id, "quantity": 1}]

    order = OrderService.create_order(db, customer.id, items, coupon_code="FIXED10")

    assert order.subtotal == Decimal("100.00")
    assert order.discount_amount == Decimal("10.00")
    assert order.total == Decimal("90.00")


def test_create_order_discount_clamps_to_subtotal(
    db: Session, customer: Customer, product_limited_stock: Product
):
    """Test that discount doesn't exceed subtotal"""
    # Create coupon with high fixed value
    coupon = Coupon(
        code="TOOLARGE",
        description="$100 off",
        discount_type="fixed",
        value=Decimal("100.00"),  # More than product price ($50)
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=None,
        used_count=0,
    )
    db.add(coupon)
    db.commit()

    items = [{"product_id": product_limited_stock.id, "quantity": 1}]

    order = OrderService.create_order(db, customer.id, items, coupon_code="TOOLARGE")

    # Discount should clamp to subtotal (no negative total)
    assert order.subtotal == Decimal("50.00")
    assert order.discount_amount == Decimal("50.00")  # Clamped
    assert order.total == Decimal("0.00")  # Minimum 0


def test_create_order_coupon_not_found(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test CouponValidationError when coupon doesn't exist"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]

    with pytest.raises(CouponValidationError) as exc_info:
        OrderService.create_order(db, customer.id, items, coupon_code="INVALID")

    assert "not found" in str(exc_info.value.detail).lower()


def test_create_order_coupon_expired(
    db: Session,
    customer: Customer,
    product_in_stock: Product,
    coupon_expired: Coupon,
):
    """Test CouponValidationError when coupon is expired"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]

    with pytest.raises(CouponValidationError) as exc_info:
        OrderService.create_order(db, customer.id, items, coupon_code="OLDCODE")

    assert "expired" in str(exc_info.value.detail).lower()


def test_create_order_coupon_limit_exceeded(
    db: Session,
    customer: Customer,
    product_in_stock: Product,
    coupon_limit_exceeded: Coupon,
):
    """Test CouponValidationError when coupon usage limit exceeded"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]

    with pytest.raises(CouponValidationError) as exc_info:
        OrderService.create_order(db, customer.id, items, coupon_code="LIMITED")

    assert "usage limit" in str(exc_info.value.detail).lower()


# ===================== Order Retrieval Tests =====================


def test_get_order(db: Session, customer: Customer, product_in_stock: Product):
    """Test retrieving order by ID"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]
    order = OrderService.create_order(db, customer.id, items)

    retrieved = OrderService.get_order(db, order.id)

    assert retrieved.id == order.id
    assert retrieved.customer_id == customer.id
    assert len(retrieved.items) == 1


def test_get_order_not_found(db: Session):
    """Test InvalidOrderError when order doesn't exist"""
    with pytest.raises(InvalidOrderError) as exc_info:
        OrderService.get_order(db, 9999)

    assert "not found" in str(exc_info.value.detail).lower()


def test_get_customer_orders(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test retrieving all orders for a customer"""
    # Create 3 orders
    for i in range(3):
        items = [{"product_id": product_in_stock.id, "quantity": i + 1}]
        OrderService.create_order(db, customer.id, items)

    orders, total = OrderService.get_customer_orders(db, customer.id)

    assert total == 3
    assert len(orders) == 3
    # Should be ordered by created_at DESC (newest first)
    assert orders[0].created_at >= orders[1].created_at


def test_get_customer_orders_pagination(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test pagination of customer orders"""
    # Create 5 orders
    for i in range(5):
        items = [{"product_id": product_in_stock.id, "quantity": 1}]
        OrderService.create_order(db, customer.id, items)

    # Get page 1 (skip=0, limit=2)
    orders1, total1 = OrderService.get_customer_orders(db, customer.id, skip=0, limit=2)
    assert len(orders1) == 2
    assert total1 == 5

    # Get page 2 (skip=2, limit=2)
    orders2, total2 = OrderService.get_customer_orders(db, customer.id, skip=2, limit=2)
    assert len(orders2) == 2
    assert total2 == 5

    # Should be different orders
    assert orders1[0].id != orders2[0].id


def test_get_customer_orders_not_found(db: Session):
    """Test CustomerNotFoundError when customer doesn't exist"""
    with pytest.raises(CustomerNotFoundError) as exc_info:
        OrderService.get_customer_orders(db, 9999)

    assert "not found" in str(exc_info.value.detail).lower()


# ===================== Order Status Tests =====================


def test_update_order_status_pending_to_confirmed(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test valid status transition: pending → confirmed"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]
    order = OrderService.create_order(db, customer.id, items)

    assert order.status == "pending"

    updated = OrderService.update_order_status(db, order.id, "confirmed")

    assert updated.status == "confirmed"
    assert updated.updated_at > order.updated_at


def test_update_order_status_all_transitions(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test all valid status transitions"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]
    order = OrderService.create_order(db, customer.id, items)

    # pending → confirmed
    order = OrderService.update_order_status(db, order.id, "confirmed")
    assert order.status == "confirmed"

    # confirmed → shipped
    order = OrderService.update_order_status(db, order.id, "shipped")
    assert order.status == "shipped"

    # shipped → delivered
    order = OrderService.update_order_status(db, order.id, "delivered")
    assert order.status == "delivered"


def test_update_order_status_invalid_transition_pending_to_shipped(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test invalid transition: pending → shipped (skips confirmed)"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]
    order = OrderService.create_order(db, customer.id, items)

    with pytest.raises(InvalidStatusTransitionError) as exc_info:
        OrderService.update_order_status(db, order.id, "shipped")

    assert "Cannot transition" in str(exc_info.value.detail)


def test_update_order_status_delivered_is_terminal(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test delivered status is terminal (no further transitions)"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]
    order = OrderService.create_order(db, customer.id, items)

    # Advance to delivered
    OrderService.update_order_status(db, order.id, "confirmed")
    OrderService.update_order_status(db, order.id, "shipped")
    OrderService.update_order_status(db, order.id, "delivered")

    # Try to transition from delivered (should fail)
    with pytest.raises(InvalidStatusTransitionError):
        OrderService.update_order_status(db, order.id, "shipped")


def test_update_order_status_invalid_status_value(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test InvalidStatusTransitionError with invalid status string"""
    items = [{"product_id": product_in_stock.id, "quantity": 1}]
    order = OrderService.create_order(db, customer.id, items)

    with pytest.raises(InvalidStatusTransitionError) as exc_info:
        OrderService.update_order_status(db, order.id, "invalid_status")

    assert "Invalid status" in str(exc_info.value.detail)


def test_update_order_status_not_found(db: Session):
    """Test InvalidOrderError when updating non-existent order"""
    with pytest.raises(InvalidOrderError):
        OrderService.update_order_status(db, 9999, "confirmed")


def test_get_orders_by_status(db: Session, customer: Customer, product_in_stock: Product):
    """Test filtering orders by status"""
    # Create 2 pending, 1 confirmed
    for i in range(2):
        items = [{"product_id": product_in_stock.id, "quantity": 1}]
        OrderService.create_order(db, customer.id, items)

    # Confirm one order
    orders, _ = OrderService.get_orders_by_status(db, "pending")
    OrderService.update_order_status(db, orders[0].id, "confirmed")

    # Query by status
    pending, pending_total = OrderService.get_orders_by_status(db, "pending")
    confirmed, confirmed_total = OrderService.get_orders_by_status(db, "confirmed")

    assert pending_total == 1
    assert confirmed_total == 1
    assert pending[0].status == "pending"
    assert confirmed[0].status == "confirmed"


# ===================== Race Condition Tests =====================


def test_concurrent_orders_same_product(
    db: Session, customer: Customer, product_limited_stock: Product
):
    """
    Simulate race condition:
    - Two concurrent orders on product with 1 unit
    - One should succeed, one should fail with OutOfStockError
    """
    items = [{"product_id": product_limited_stock.id, "quantity": 1}]

    # First order succeeds
    order1 = OrderService.create_order(db, customer.id, items)
    assert order1.id is not None

    # Verify stock is now 0
    db.refresh(product_limited_stock)
    assert product_limited_stock.stock == 0

    # Second order fails (stock now 0)
    with pytest.raises(OutOfStockError):
        OrderService.create_order(db, customer.id, items)


def test_concurrent_orders_different_products(
    db: Session, customer: Customer, product_in_stock: Product
):
    """Test that concurrent orders on different products both succeed"""
    product2 = Product(name="Item 2", price=Decimal("25.00"), stock=10)
    db.add(product2)
    db.commit()

    items1 = [{"product_id": product_in_stock.id, "quantity": 1}]
    items2 = [{"product_id": product2.id, "quantity": 1}]

    order1 = OrderService.create_order(db, customer.id, items1)
    order2 = OrderService.create_order(db, customer.id, items2)

    assert order1.id is not None
    assert order2.id is not None

    db.refresh(product_in_stock)
    db.refresh(product2)
    assert product_in_stock.stock == 9
    assert product2.stock == 9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

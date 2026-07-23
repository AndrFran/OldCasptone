# Comprehensive Integration Test Suite for Vibe Strike
# Tests all 8 integration scenarios end-to-end
# Run: pytest tests/integration_test_suite.py -v

import pytest
import sys
import os
from decimal import Decimal
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.shared.db import SessionLocal, drop_db, init_db
from backend.shared.models import (
    Product, Customer, Order, OrderItem, Coupon, Base
)
from backend.shared.exceptions import OutOfStockError
from backend.services.order_service import OrderService
from backend.uc2_promotions.services.coupon_service import CouponService
from backend.uc3_inventory.services.inventory_service import InventoryService


class TestData:
    """Shared test data setup"""

    @staticmethod
    def setup_database():
        """Initialize test database with seed data"""
        drop_db()
        init_db()
        db = SessionLocal()

        try:
            # Create test customers
            customer1 = Customer(
                email="alice@example.com",
                name="Alice Customer",
                created_at=datetime.utcnow()
            )
            customer2 = Customer(
                email="bob@example.com",
                name="Bob Customer",
                created_at=datetime.utcnow()
            )
            db.add(customer1)
            db.add(customer2)
            db.flush()

            # Create test products
            product1 = Product(
                name="Widget A",
                description="Premium widget",
                price=Decimal("29.99"),
                stock=100,
                low_stock_threshold=10,
                created_at=datetime.utcnow()
            )
            product2 = Product(
                name="Widget B",
                description="Standard widget",
                price=Decimal("49.99"),
                stock=1,  # Only 1 unit for race condition test
                low_stock_threshold=10,
                created_at=datetime.utcnow()
            )
            product3 = Product(
                name="Widget C",
                description="Budget widget",
                price=Decimal("15.99"),
                stock=5,
                low_stock_threshold=10,
                created_at=datetime.utcnow()
            )
            db.add(product1)
            db.add(product2)
            db.add(product3)
            db.flush()

            # Create test coupons
            coupon_summer = Coupon(
                code="SUMMER10",
                description="Summer Sale: 10% off",
                discount_type="percent",
                value=Decimal("10"),
                expires_at=datetime.utcnow() + timedelta(days=30),
                max_uses=100,
                used_count=0,
                created_at=datetime.utcnow()
            )
            coupon_fixed = Coupon(
                code="FIXED5",
                description="Fixed $5 off",
                discount_type="fixed",
                value=Decimal("5"),
                expires_at=datetime.utcnow() + timedelta(days=30),
                max_uses=50,
                used_count=0,
                created_at=datetime.utcnow()
            )
            coupon_expired = Coupon(
                code="EXPIRED",
                description="Expired coupon",
                discount_type="percent",
                value=Decimal("10"),
                expires_at=datetime.utcnow() - timedelta(days=1),
                max_uses=100,
                used_count=0,
                created_at=datetime.utcnow()
            )
            coupon_exhausted = Coupon(
                code="EXHAUSTED",
                description="Exhausted coupon",
                discount_type="percent",
                value=Decimal("10"),
                expires_at=datetime.utcnow() + timedelta(days=30),
                max_uses=1,
                used_count=1,
                created_at=datetime.utcnow()
            )
            db.add_all([coupon_summer, coupon_fixed, coupon_expired, coupon_exhausted])
            db.commit()

            return {
                "customers": {"alice": customer1.id, "bob": customer2.id},
                "products": {
                    "widget_a": product1.id,
                    "widget_b": product2.id,
                    "widget_c": product3.id
                },
                "coupons": {
                    "summer10": coupon_summer.code,
                    "fixed5": coupon_fixed.code,
                    "expired": coupon_expired.code,
                    "exhausted": coupon_exhausted.code
                }
            }
        finally:
            db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database once per test session"""
    test_data = TestData.setup_database()
    return test_data


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def db():
    """Database session for tests"""
    session = SessionLocal()
    yield session
    session.close()


# ============================================
# TEST 1: Browse Products
# ============================================

def test_browse_products_lists_all_products(client):
    """UC1: Customer can browse products with stock levels"""
    response = client.get("/products")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 3

    # Verify product data structure
    product = data["items"][0]
    assert "id" in product
    assert "name" in product
    assert "price" in product
    assert "stock" in product
    assert "low_stock_threshold" in product


def test_get_single_product(client, setup_test_db):
    """UC1: Customer can view single product details"""
    product_id = setup_test_db["products"]["widget_a"]
    response = client.get(f"/products/{product_id}")
    assert response.status_code == 200

    product = response.json()
    assert product["id"] == product_id
    assert product["name"] == "Widget A"
    assert product["price"] == 29.99
    assert product["stock"] == 100


def test_product_not_found(client):
    """UC1: Non-existent product returns 404"""
    response = client.get("/products/99999")
    assert response.status_code == 404


# ============================================
# TEST 2: Place Order (Simple Case)
# ============================================

def test_place_order_success(client, db, setup_test_db):
    """UC1: Customer places order successfully"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    request_body = {
        "customer_id": customer_id,
        "items": [
            {"product_id": product_id, "quantity": 2}
        ]
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 201

    order = response.json()
    assert order["id"] is not None
    assert order["customer_id"] == customer_id
    assert order["status"] == "pending"
    assert len(order["items"]) == 1
    assert order["items"][0]["quantity"] == 2
    assert order["items"][0]["price"] == 29.99
    assert order["total"] == Decimal("59.98")


def test_place_order_multiple_items(client, setup_test_db):
    """UC1: Customer places order with multiple items"""
    customer_id = setup_test_db["customers"]["alice"]
    product1_id = setup_test_db["products"]["widget_a"]
    product3_id = setup_test_db["products"]["widget_c"]

    request_body = {
        "customer_id": customer_id,
        "items": [
            {"product_id": product1_id, "quantity": 1},
            {"product_id": product3_id, "quantity": 2}
        ]
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 201

    order = response.json()
    assert len(order["items"]) == 2
    # Total: 29.99 + (15.99 * 2) = 61.97
    assert order["total"] == Decimal("61.97")


def test_place_order_invalid_customer(client, setup_test_db):
    """UC1: Order with non-existent customer fails"""
    product_id = setup_test_db["products"]["widget_a"]

    request_body = {
        "customer_id": 99999,
        "items": [{"product_id": product_id, "quantity": 1}]
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 404


def test_place_order_invalid_product(client, setup_test_db):
    """UC1: Order with non-existent product fails"""
    customer_id = setup_test_db["customers"]["alice"]

    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": 99999, "quantity": 1}]
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 404


# ============================================
# TEST 3: Inventory Decrement on Order
# ============================================

def test_inventory_decrements_on_order(client, db, setup_test_db):
    """UC3: Stock decreases when order placed"""
    product_id = setup_test_db["products"]["widget_a"]
    customer_id = setup_test_db["customers"]["alice"]

    # Get initial stock
    product = db.query(Product).filter(Product.id == product_id).first()
    initial_stock = product.stock
    assert initial_stock == 100

    # Place order for 5 units
    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 5}]
    }
    response = client.post("/orders", json=request_body)
    assert response.status_code == 201

    # Verify stock decreased
    db.refresh(product)
    assert product.stock == initial_stock - 5
    assert product.stock == 95


def test_inventory_decrements_multiple_items(client, db, setup_test_db):
    """UC3: Stock decreases for all items in order"""
    product1_id = setup_test_db["products"]["widget_a"]
    product3_id = setup_test_db["products"]["widget_c"]
    customer_id = setup_test_db["customers"]["alice"]

    # Get initial stocks
    product1 = db.query(Product).filter(Product.id == product1_id).first()
    product3 = db.query(Product).filter(Product.id == product3_id).first()
    stock1_initial = product1.stock
    stock3_initial = product3.stock

    # Place order
    request_body = {
        "customer_id": customer_id,
        "items": [
            {"product_id": product1_id, "quantity": 3},
            {"product_id": product3_id, "quantity": 2}
        ]
    }
    response = client.post("/orders", json=request_body)
    assert response.status_code == 201

    # Verify stocks decreased
    db.refresh(product1)
    db.refresh(product3)
    assert product1.stock == stock1_initial - 3
    assert product3.stock == stock3_initial - 2


# ============================================
# TEST 4: Out of Stock Error
# ============================================

def test_order_out_of_stock(client, setup_test_db):
    """UC1/UC3: Order fails when not enough stock"""
    product_id = setup_test_db["products"]["widget_b"]  # Only 1 unit
    customer_id = setup_test_db["customers"]["alice"]

    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 5}]
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 400
    assert "out of stock" in response.json()["detail"].lower() or \
           "stock" in response.json()["detail"].lower()


# ============================================
# TEST 5: Race Condition - Two Simultaneous Orders
# ============================================

def test_race_condition_last_unit(db, setup_test_db):
    """
    CRITICAL: Test race condition prevention on last unit.
    Two concurrent orders for last unit → only one succeeds.
    """
    product_id = setup_test_db["products"]["widget_b"]  # Exactly 1 unit
    customer1_id = setup_test_db["customers"]["alice"]
    customer2_id = setup_test_db["customers"]["bob"]

    results = {"success": [], "failed": []}

    def place_order(customer_id, order_num):
        """Place order and track result"""
        try:
            order = OrderService.create_order(
                db=SessionLocal(),
                customer_id=customer_id,
                items=[{"product_id": product_id, "quantity": 1}],
                coupon_code=None
            )
            results["success"].append(order.id)
            print(f"Order {order_num} succeeded: Order ID {order.id}")
        except OutOfStockError as e:
            results["failed"].append(str(e))
            print(f"Order {order_num} failed: {e}")
        except Exception as e:
            results["failed"].append(str(e))
            print(f"Order {order_num} error: {e}")

    # Execute two concurrent orders
    with ThreadPoolExecutor(max_workers=2) as executor:
        future1 = executor.submit(place_order, customer1_id, 1)
        future2 = executor.submit(place_order, customer2_id, 2)
        future1.result()
        future2.result()

    # Verify race condition prevented: only 1 succeeds, 1 fails
    assert len(results["success"]) == 1, f"Expected 1 success, got {len(results['success'])}"
    assert len(results["failed"]) == 1, f"Expected 1 failure, got {len(results['failed'])}"

    # Verify no overselling: stock should be 0
    db.refresh(db.query(Product).filter(Product.id == product_id).first())
    product = db.query(Product).filter(Product.id == product_id).first()
    assert product.stock == 0


# ============================================
# TEST 6: Coupon Validation
# ============================================

def test_validate_coupon_valid(client, setup_test_db):
    """UC2: Valid coupon returns discount details"""
    response = client.post(
        "/coupons/validate",
        json={"code": "SUMMER10"}
    )
    assert response.status_code == 200

    coupon = response.json()
    assert coupon["valid"] == True
    assert coupon["code"] == "SUMMER10"
    assert coupon["discount_type"] == "percent"
    assert coupon["value"] == 10


def test_validate_coupon_invalid(client):
    """UC2: Non-existent coupon returns 400"""
    response = client.post(
        "/coupons/validate",
        json={"code": "NONEXISTENT"}
    )
    assert response.status_code == 400


def test_validate_coupon_expired(client):
    """UC2: Expired coupon returns 400"""
    response = client.post(
        "/coupons/validate",
        json={"code": "EXPIRED"}
    )
    assert response.status_code == 400
    assert "expir" in response.json()["detail"].get("error", "").lower()


def test_validate_coupon_exhausted(client):
    """UC2: Exhausted coupon returns 400"""
    response = client.post(
        "/coupons/validate",
        json={"code": "EXHAUSTED"}
    )
    assert response.status_code == 400
    assert "usage" in response.json()["detail"].get("error", "").lower()


# ============================================
# TEST 7: Coupon Discount Application
# ============================================

def test_place_order_with_percent_coupon(client, setup_test_db):
    """UC2+UC1: Order with percent coupon applies discount"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}],
        "coupon_code": "SUMMER10"  # 10% off
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 201

    order = response.json()
    assert order["coupon_code"] == "SUMMER10"
    assert order["subtotal"] == Decimal("29.99")
    assert order["discount_amount"] == Decimal("3.00")  # 10% of 29.99
    assert order["total"] == Decimal("26.99")


def test_place_order_with_fixed_coupon(client, setup_test_db):
    """UC2+UC1: Order with fixed coupon applies discount"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}],
        "coupon_code": "FIXED5"  # $5 off
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 201

    order = response.json()
    assert order["coupon_code"] == "FIXED5"
    assert order["subtotal"] == Decimal("29.99")
    assert order["discount_amount"] == Decimal("5.00")
    assert order["total"] == Decimal("24.99")


def test_place_order_with_invalid_coupon(client, setup_test_db):
    """UC2+UC1: Order with invalid coupon fails"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}],
        "coupon_code": "NONEXISTENT"
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 400


# ============================================
# TEST 8: Order Tracking
# ============================================

def test_retrieve_order(client, setup_test_db):
    """UC4: Customer retrieves order details"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    # Create order
    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}]
    }
    create_response = client.post("/orders", json=request_body)
    order_id = create_response.json()["id"]

    # Retrieve order
    response = client.get(f"/orders/{order_id}")
    assert response.status_code == 200

    order = response.json()
    assert order["id"] == order_id
    assert order["customer_id"] == customer_id
    assert order["status"] == "pending"


def test_get_customer_order_history(client, setup_test_db):
    """UC4: Customer views order history"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    # Create 2 orders
    for i in range(2):
        request_body = {
            "customer_id": customer_id,
            "items": [{"product_id": product_id, "quantity": 1}]
        }
        client.post("/orders", json=request_body)

    # Get order history
    response = client.get(f"/orders/customers/{customer_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2


def test_update_order_status(client, setup_test_db):
    """UC4: Ops manager updates order status"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    # Create order
    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}]
    }
    create_response = client.post("/orders", json=request_body)
    order_id = create_response.json()["id"]

    # Update status
    response = client.patch(
        f"/orders/{order_id}/status",
        json={"status": "confirmed"}
    )
    assert response.status_code == 200

    order = response.json()
    assert order["status"] == "confirmed"


def test_order_status_workflow(client, setup_test_db):
    """UC4: Full order status workflow"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    # Create order (pending)
    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}]
    }
    create_response = client.post("/orders", json=request_body)
    order_id = create_response.json()["id"]

    # pending → confirmed
    response = client.patch(
        f"/orders/{order_id}/status",
        json={"status": "confirmed"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    # confirmed → shipped
    response = client.patch(
        f"/orders/{order_id}/status",
        json={"status": "shipped"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "shipped"

    # shipped → delivered
    response = client.patch(
        f"/orders/{order_id}/status",
        json={"status": "delivered"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "delivered"


def test_invalid_status_transition(client, setup_test_db):
    """UC4: Invalid status transition fails"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    # Create order
    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}]
    }
    create_response = client.post("/orders", json=request_body)
    order_id = create_response.json()["id"]

    # Try pending → shipped (skip confirmed)
    response = client.patch(
        f"/orders/{order_id}/status",
        json={"status": "shipped"}
    )
    assert response.status_code == 400


# ============================================
# TEST 9: Low Stock Alerts
# ============================================

def test_get_low_stock_alerts(client, setup_test_db):
    """UC3: Low-stock alert endpoint returns products below threshold"""
    response = client.get("/inventory/low-stock")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert "total" in data
    # Widget C has stock=5, threshold=10, so should be in alerts
    alert_ids = [alert["product_id"] for alert in data["items"]]
    assert setup_test_db["products"]["widget_c"] in alert_ids


def test_get_inventory_levels(client):
    """UC3: Inventory endpoint returns all products"""
    response = client.get("/inventory")
    assert response.status_code == 200

    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 3


def test_restock_product(client, setup_test_db, db):
    """UC3: Ops manager restocks product"""
    product_id = setup_test_db["products"]["widget_c"]

    # Get initial stock
    product = db.query(Product).filter(Product.id == product_id).first()
    initial_stock = product.stock

    # Restock
    response = client.patch(
        f"/inventory/{product_id}",
        json={"quantity": 20}
    )
    assert response.status_code == 200

    inventory = response.json()
    assert inventory["stock"] == initial_stock + 20


# ============================================
# TEST 10: API Error Codes
# ============================================

def test_error_code_404_product_not_found(client):
    """Verify 404 error code for product not found"""
    response = client.get("/products/99999")
    assert response.status_code == 404


def test_error_code_400_out_of_stock(client, setup_test_db):
    """Verify 400 error code for out of stock"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_b"]  # 1 unit

    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 10}]
    }

    response = client.post("/orders", json=request_body)
    assert response.status_code == 400


def test_error_code_400_invalid_coupon(client, setup_test_db):
    """Verify 400 error code for invalid coupon"""
    response = client.post(
        "/coupons/validate",
        json={"code": "INVALID"}
    )
    assert response.status_code == 400


def test_get_orders_by_status(client, setup_test_db):
    """UC4: Get orders filtered by status (ops dashboard)"""
    customer_id = setup_test_db["customers"]["alice"]
    product_id = setup_test_db["products"]["widget_a"]

    # Create order
    request_body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": 1}]
    }
    client.post("/orders", json=request_body)

    # Get pending orders
    response = client.get("/orders/status/pending")
    assert response.status_code == 200

    data = response.json()
    assert data["total"] >= 1
    assert all(order["status"] == "pending" for order in data["items"])


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

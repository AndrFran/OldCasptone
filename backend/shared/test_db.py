# Database Testing & Verification
# Test connection, schema, transactions, and query helpers

import logging
import sys
import os
from decimal import Decimal
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.db import engine, SessionLocal, DatabaseManager, AtomicTransaction, OutOfStockError
from shared.models import Product, Customer, Order, OrderItem, Coupon
from shared.queries import (
    ProductQueries,
    OrderQueries,
    CouponQueries,
    InventoryQueries,
    TrackingQueries,
)
from shared.migrations import init_schema, seed_products, seed_customers, seed_coupons

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_connection():
    """Test database connection"""
    logger.info("\n=== Testing Database Connection ===")
    try:
        with engine.connect() as conn:
            logger.info("✅ Database connection successful")
            return True
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False


def test_schema():
    """Test schema creation"""
    logger.info("\n=== Testing Schema Creation ===")
    try:
        init_schema()
        logger.info("✅ Schema created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Schema creation failed: {e}")
        return False


def test_seed_data():
    """Test data seeding"""
    logger.info("\n=== Testing Data Seeding ===")
    session = SessionLocal()
    try:
        seed_products(session)
        seed_customers(session)
        seed_coupons(session)
        logger.info("✅ Data seeding successful")
        return True
    except Exception as e:
        logger.error(f"❌ Data seeding failed: {e}")
        return False
    finally:
        session.close()


def test_basic_crud():
    """Test basic CRUD operations"""
    logger.info("\n=== Testing Basic CRUD ===")
    session = SessionLocal()
    try:
        # CREATE
        product = Product(
            name="Test Product",
            description="Test",
            price=Decimal("99.99"),
            stock=10,
        )
        session.add(product)
        session.commit()
        product_id = product.id
        logger.info(f"✅ CREATE: Product #{product_id}")

        # READ
        product = session.query(Product).filter(Product.id == product_id).first()
        assert product is not None
        logger.info(f"✅ READ: {product.name} (stock={product.stock})")

        # UPDATE
        product.stock = 5
        session.commit()
        logger.info(f"✅ UPDATE: Stock updated to {product.stock}")

        # DELETE
        session.delete(product)
        session.commit()
        product = session.query(Product).filter(Product.id == product_id).first()
        assert product is None
        logger.info(f"✅ DELETE: Product removed")

        return True
    except Exception as e:
        session.rollback()
        logger.error(f"❌ CRUD test failed: {e}")
        return False
    finally:
        session.close()


def test_atomic_transaction():
    """Test atomic transaction with FOR UPDATE locks"""
    logger.info("\n=== Testing Atomic Transactions ===")
    session = SessionLocal()
    try:
        # Create test product
        product = Product(name="Test Stock", price=Decimal("50.00"), stock=1)
        session.add(product)
        session.commit()
        product_id = product.id

        # Create test customer
        customer = Customer(email="test@example.com", name="Test Customer")
        session.add(customer)
        session.commit()
        customer_id = customer.id

        # Test 1: Successful order (stock available)
        logger.info("  Test 1: Successful order with available stock")
        with AtomicTransaction(session, isolation_level="SERIALIZABLE"):
            products = (
                session.query(Product)
                .filter(Product.id == product_id)
                .with_for_update()
                .all()
            )
            assert len(products) == 1
            assert products[0].stock == 1
            products[0].stock -= 1
            session.commit()
        logger.info("  ✅ Order succeeded, stock decremented")

        # Test 2: Failed order (out of stock)
        logger.info("  Test 2: Failed order with insufficient stock")
        try:
            with AtomicTransaction(session, isolation_level="SERIALIZABLE"):
                products = (
                    session.query(Product)
                    .filter(Product.id == product_id)
                    .with_for_update()
                    .all()
                )
                assert products[0].stock == 0
                if products[0].stock < 1:
                    raise OutOfStockError(product_id, 1, products[0].stock)
                products[0].stock -= 1
                session.commit()
        except OutOfStockError as e:
            logger.info(f"  ✅ OutOfStockError caught as expected: {e}")
            session.rollback()

        return True
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Atomic transaction test failed: {e}")
        return False
    finally:
        session.close()


def test_queries():
    """Test query helpers"""
    logger.info("\n=== Testing Query Helpers ===")
    session = SessionLocal()
    try:
        # Test product queries
        logger.info("  Testing ProductQueries...")
        products, total = ProductQueries.list_products(session, skip=0, limit=10)
        logger.info(f"  ✅ Listed {len(products)}/{total} products")

        if products:
            product = ProductQueries.get_product(session, products[0].id)
            logger.info(f"  ✅ Retrieved product: {product.name}")

        # Test coupon queries
        logger.info("  Testing CouponQueries...")
        coupons, total = CouponQueries.get_active_promotions(session)
        logger.info(f"  ✅ Retrieved {len(coupons)}/{total} active coupons")

        if coupons:
            coupon = coupons[0]
            discount = CouponQueries.calculate_discount(coupon, Decimal("100.00"))
            logger.info(f"  ✅ Discount calculation: {discount}")

        # Test inventory queries
        logger.info("  Testing InventoryQueries...")
        low_stock = InventoryQueries.get_low_stock_alerts(session)
        logger.info(f"  ✅ Found {len(low_stock)} low-stock products")

        for product in low_stock:
            urgency = InventoryQueries.get_urgency(product)
            logger.info(f"    - {product.name}: {urgency}")

        # Test tracking queries
        logger.info("  Testing TrackingQueries...")
        pending, total = TrackingQueries.get_orders_by_status(session, "pending")
        logger.info(f"  ✅ Found {len(pending)}/{total} pending orders")

        return True
    except Exception as e:
        logger.error(f"❌ Query test failed: {e}")
        return False
    finally:
        session.close()


def test_relationships():
    """Test ORM relationships"""
    logger.info("\n=== Testing ORM Relationships ===")
    session = SessionLocal()
    try:
        # Create test data
        customer = Customer(email="rel@example.com", name="Relationship Test")
        session.add(customer)
        session.flush()

        product = Product(name="Rel Test Product", price=Decimal("29.99"), stock=5)
        session.add(product)
        session.flush()

        order = Order(
            customer_id=customer.id,
            status="pending",
            subtotal=Decimal("29.99"),
            total=Decimal("29.99"),
        )
        session.add(order)
        session.flush()

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=1,
            price=product.price,
            subtotal=product.price,
        )
        session.add(order_item)
        session.commit()

        # Test navigation
        retrieved_order = session.query(Order).filter(Order.id == order.id).first()
        logger.info(f"✅ Order retrieved: #{retrieved_order.id}")
        logger.info(f"✅ Customer name: {retrieved_order.customer.name}")
        logger.info(f"✅ Order items count: {len(retrieved_order.items)}")

        if retrieved_order.items:
            item = retrieved_order.items[0]
            logger.info(f"✅ Item product: {item.product.name}")

        return True
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Relationship test failed: {e}")
        return False
    finally:
        session.close()


def run_all_tests():
    """Run all database tests"""
    logger.info("=" * 60)
    logger.info("VIBE STRIKE DATABASE TEST SUITE")
    logger.info("=" * 60)

    tests = [
        ("Connection", test_connection),
        ("Schema", test_schema),
        ("Seed Data", test_seed_data),
        ("CRUD Operations", test_basic_crud),
        ("Atomic Transactions", test_atomic_transaction),
        ("Query Helpers", test_queries),
        ("ORM Relationships", test_relationships),
    ]

    results = {}
    for name, test_func in tests:
        try:
            results[name] = test_func()
        except Exception as e:
            logger.error(f"❌ {name} test crashed: {e}")
            results[name] = False

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    passed = sum(1 for r in results.values() if r)
    total = len(results)

    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status}: {name}")

    logger.info("=" * 60)
    logger.info(f"Results: {passed}/{total} tests passed")
    logger.info("=" * 60)

    return all(results.values())


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

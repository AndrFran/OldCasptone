# Database Schema Initialization & Seed Data
# Handles initial setup and test data loading

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from shared.models import Product, Customer, Order, OrderItem, Coupon
from shared.db import engine, SessionLocal

logger = logging.getLogger(__name__)


def init_schema():
    """Initialize database schema (create all tables)"""
    from shared.models import Base

    logger.info("🔧 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Schema initialization complete")


def seed_products(session: Session):
    """Seed sample products"""
    logger.info("🌱 Seeding products...")

    products_data = [
        {
            "name": "Wireless Headphones",
            "description": "Premium noise-cancelling wireless headphones",
            "price": Decimal("149.99"),
            "stock": 50,
            "low_stock_threshold": 10,
        },
        {
            "name": "USB-C Cable",
            "description": "High-speed USB-C charging and data cable",
            "price": Decimal("19.99"),
            "stock": 200,
            "low_stock_threshold": 50,
        },
        {
            "name": "Laptop Stand",
            "description": "Adjustable aluminum laptop stand",
            "price": Decimal("49.99"),
            "stock": 35,
            "low_stock_threshold": 10,
        },
        {
            "name": "Wireless Mouse",
            "description": "Ergonomic wireless mouse with precision tracking",
            "price": Decimal("29.99"),
            "stock": 5,
            "low_stock_threshold": 15,  # This product is low stock
        },
        {
            "name": "Mechanical Keyboard",
            "description": "RGB mechanical keyboard with custom switches",
            "price": Decimal("129.99"),
            "stock": 20,
            "low_stock_threshold": 8,
        },
        {
            "name": "Monitor Arm",
            "description": "Dual monitor arm, gas spring supported",
            "price": Decimal("89.99"),
            "stock": 0,
            "low_stock_threshold": 5,  # Out of stock
        },
    ]

    for data in products_data:
        existing = session.query(Product).filter(Product.name == data["name"]).first()
        if not existing:
            product = Product(**data)
            session.add(product)
            logger.info(f"  ✓ {data['name']}")

    session.commit()
    logger.info(f"✅ Seeded {len(products_data)} products")


def seed_customers(session: Session):
    """Seed sample customers"""
    logger.info("🌱 Seeding customers...")

    customers_data = [
        {"email": "alice@example.com", "name": "Alice Johnson"},
        {"email": "bob@example.com", "name": "Bob Smith"},
        {"email": "charlie@example.com", "name": "Charlie Brown"},
        {"email": "diana@example.com", "name": "Diana Prince"},
    ]

    for data in customers_data:
        existing = session.query(Customer).filter(Customer.email == data["email"]).first()
        if not existing:
            customer = Customer(**data)
            session.add(customer)
            logger.info(f"  ✓ {data['name']}")

    session.commit()
    logger.info(f"✅ Seeded {len(customers_data)} customers")


def seed_coupons(session: Session):
    """Seed sample coupons"""
    logger.info("🌱 Seeding coupons...")

    now = datetime.utcnow()
    coupons_data = [
        {
            "code": "WELCOME10",
            "description": "10% off for new customers",
            "discount_type": "percent",
            "value": Decimal("10"),
            "expires_at": now + timedelta(days=30),
            "max_uses": 100,
            "used_count": 0,
        },
        {
            "code": "SAVE5",
            "description": "$5 off any order",
            "discount_type": "fixed",
            "value": Decimal("5"),
            "expires_at": now + timedelta(days=60),
            "max_uses": None,  # Unlimited
            "used_count": 0,
        },
        {
            "code": "SUMMER20",
            "description": "20% off summer sale",
            "discount_type": "percent",
            "value": Decimal("20"),
            "expires_at": now + timedelta(days=7),
            "max_uses": 50,
            "used_count": 25,
        },
        {
            "code": "EXPIRED",
            "description": "This coupon is expired",
            "discount_type": "percent",
            "value": Decimal("15"),
            "expires_at": now - timedelta(days=1),
            "max_uses": None,
            "used_count": 0,
        },
    ]

    for data in coupons_data:
        existing = session.query(Coupon).filter(Coupon.code == data["code"]).first()
        if not existing:
            coupon = Coupon(**data)
            session.add(coupon)
            logger.info(f"  ✓ {data['code']} - {data['description']}")

    session.commit()
    logger.info(f"✅ Seeded {len(coupons_data)} coupons")


def seed_sample_order(session: Session):
    """Seed a sample order for testing"""
    logger.info("🌱 Seeding sample order...")

    # Get first customer and products
    customer = session.query(Customer).first()
    products = session.query(Product).filter(Product.stock > 0).limit(2).all()

    if not customer or len(products) < 2:
        logger.warning("⚠️  Cannot seed order: need at least 1 customer and 2 products in stock")
        return

    order = Order(
        customer_id=customer.id,
        status="pending",
        coupon_code="WELCOME10",
    )

    subtotal = Decimal(0)
    for idx, product in enumerate(products[:2]):
        item = OrderItem(
            product_id=product.id,
            quantity=1,
            price=product.price,
            subtotal=product.price,
        )
        order.items.append(item)
        subtotal += product.price

    order.subtotal = subtotal
    order.discount_amount = subtotal * Decimal("0.10")  # 10% discount
    order.total = subtotal - order.discount_amount

    session.add(order)
    session.commit()
    logger.info(f"  ✓ Order #{order.id} for {customer.name}")
    logger.info(f"✅ Seeded sample order")


def reset_and_seed():
    """Reset database and seed all data"""
    logger.info("🔄 Resetting and seeding database...")

    # Drop and recreate schema
    from shared.models import Base

    Base.metadata.drop_all(bind=engine)
    init_schema()

    session = SessionLocal()
    try:
        seed_products(session)
        seed_customers(session)
        seed_coupons(session)
        seed_sample_order(session)
        logger.info("✅ Database reset and seeding complete!")
    finally:
        session.close()


def verify_schema():
    """Verify schema integrity"""
    logger.info("🔍 Verifying database schema...")

    inspector = __import__("sqlalchemy.inspect", fromlist=["inspect"]).inspect(engine)
    tables = inspector.get_table_names()

    expected_tables = ["products", "customers", "orders", "order_items", "coupons"]
    missing = set(expected_tables) - set(tables)

    if missing:
        logger.error(f"❌ Missing tables: {missing}")
        return False

    logger.info(f"✅ All tables present: {tables}")

    # Log column info
    for table_name in expected_tables:
        columns = inspector.get_columns(table_name)
        logger.debug(f"  {table_name}: {[c['name'] for c in columns]}")

    return True


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    reset_and_seed()

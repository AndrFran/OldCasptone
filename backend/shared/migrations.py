# Database Schema Initialization & Seed Data
# Handles initial setup and test data loading

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from shared.models import Product, Customer, Order, OrderItem, Coupon, User
from shared.db import engine, SessionLocal
from shared.auth import hash_password

logger = logging.getLogger(__name__)


def init_schema():
    """Initialize database schema (create all tables)"""
    from shared.models import Base

    logger.info("🔧 Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Schema initialization complete")


def seed_users(session: Session):
    """Seed test users"""
    logger.info("🌱 Seeding users...")

    users_data = [
        {"email": "alice@example.com", "password": "password123", "user_type": "customer"},
        {"email": "bob@example.com", "password": "password123", "user_type": "customer"},
        {"email": "ops@example.com", "password": "password123", "user_type": "ops_manager"},
    ]

    for data in users_data:
        existing = session.query(User).filter(User.email == data["email"]).first()
        if not existing:
            user = User(
                email=data["email"],
                password_hash=hash_password(data["password"]),
                user_type=data["user_type"]
            )
            session.add(user)
            logger.info(f"  ✓ {data['email']} ({data['user_type']})")

    session.commit()
    logger.info(f"✅ Seeded {len(users_data)} users")


def seed_products(session: Session):
    """Seed sample trucker cap products"""
    logger.info("🌱 Seeding trucker caps...")

    products_data = [
        {
            "name": "New York Yankees 9FORTY",
            "description": "Classic trucker style with embroidered Yankees logo",
            "price": Decimal("34.99"),
            "stock": 25,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "New York Yankees",
            "color": "Navy",
            "silhouette": "9FORTY",
            "sale_price": Decimal("29.99"),
        },
        {
            "name": "Los Angeles Dodgers 9FIFTY",
            "description": "Snapback trucker with blue embroidered Dodgers patch",
            "price": Decimal("39.99"),
            "stock": 18,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "Los Angeles Dodgers",
            "color": "Royal Blue",
            "silhouette": "9FIFTY",
            "sale_price": Decimal("34.99"),
        },
        {
            "name": "Ducati Motor 9FORTY",
            "description": "Red trucker with embroidered Ducati crest",
            "price": Decimal("42.99"),
            "stock": 12,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "Ducati Motor",
            "color": "Red",
            "silhouette": "9FORTY",
        },
        {
            "name": "Boston Red Sox 9FIFTY",
            "description": "Vintage style trucker with Red Sox logo",
            "price": Decimal("39.99"),
            "stock": 22,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "Boston Red Sox",
            "color": "Dark Red",
            "silhouette": "9FIFTY",
        },
        {
            "name": "NFL League 9FORTY",
            "description": "Black trucker with NFL embroidered logo",
            "price": Decimal("34.99"),
            "stock": 30,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Black",
            "silhouette": "9FORTY",
            "sale_price": Decimal("29.99"),
        },
        {
            "name": "San Francisco Giants 9FORTY",
            "description": "Orange and black trucker cap",
            "price": Decimal("34.99"),
            "stock": 8,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "San Francisco Giants",
            "color": "Orange",
            "silhouette": "9FORTY",
        },
        {
            "name": "Chicago Cubs 9FIFTY",
            "description": "Snapback style with Cubs logo embroidery",
            "price": Decimal("39.99"),
            "stock": 15,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "Chicago Cubs",
            "color": "Navy",
            "silhouette": "9FIFTY",
        },
        {
            "name": "Miami Heat 9FORTY",
            "description": "Sleek trucker with Heat logo",
            "price": Decimal("34.99"),
            "stock": 20,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "team": "Miami Heat",
            "color": "Black",
            "silhouette": "9FORTY",
            "sale_price": Decimal("29.99"),
        },
        {
            "name": "Vintage Trucker Grey",
            "description": "Classic mesh trucker cap in grey",
            "price": Decimal("29.99"),
            "stock": 35,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Grey",
            "silhouette": "9FORTY",
        },
        {
            "name": "Retro Mesh 9FORTY",
            "description": "Breathable mesh trucker cap",
            "price": Decimal("29.99"),
            "stock": 5,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Khaki",
            "silhouette": "9FORTY",
        },
        {
            "name": "Premium Leather Trucker",
            "description": "Leather-accented trucker with embroidery",
            "price": Decimal("49.99"),
            "stock": 10,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Black",
            "silhouette": "9FIFTY",
            "sale_price": Decimal("44.99"),
        },
        {
            "name": "Canvas Trucker Green",
            "description": "Heavy-duty canvas construction trucker",
            "price": Decimal("39.99"),
            "stock": 18,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Olive Green",
            "silhouette": "9FORTY",
        },
        {
            "name": "Metallic Logo Trucker",
            "description": "Shiny metallic logo trucker cap",
            "price": Decimal("44.99"),
            "stock": 7,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Silver",
            "silhouette": "9FIFTY",
            "sale_price": Decimal("39.99"),
        },
        {
            "name": "Heritage Trucker Navy",
            "description": "Classic heritage-inspired trucker design",
            "price": Decimal("34.99"),
            "stock": 28,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Navy",
            "silhouette": "9FORTY",
        },
        {
            "name": "Snapback Neon Trucker",
            "description": "Bright neon snapback trucker cap",
            "price": Decimal("32.99"),
            "stock": 0,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Neon Yellow",
            "silhouette": "9FIFTY",
        },
        {
            "name": "Premium Wool Trucker",
            "description": "Luxury wool blend trucker cap",
            "price": Decimal("54.99"),
            "stock": 6,
            "low_stock_threshold": 10,
            "image_url": "https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400",
            "brand": "New Era",
            "color": "Burgundy",
            "silhouette": "9FORTY",
            "sale_price": Decimal("49.99"),
        },
    ]

    for data in products_data:
        existing = session.query(Product).filter(Product.name == data["name"]).first()
        if not existing:
            product = Product(**data)
            session.add(product)
            logger.info(f"  ✓ {data['name']}")

    session.commit()
    logger.info(f"✅ Seeded {len(products_data)} trucker caps")


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
    """Seed multiple test orders with different statuses"""
    logger.info("🌱 Seeding test orders...")

    customers = session.query(Customer).all()
    products = session.query(Product).filter(Product.stock > 0).all()

    if not customers or not products:
        logger.warning("⚠️  Cannot seed orders: need at least 1 customer and 1 product in stock")
        return

    # Create 10 test orders with different statuses
    order_configs = [
        # Pending orders
        {"status": "pending", "customer_idx": 0, "product_qty": [(0, 2), (1, 1)]},
        {"status": "pending", "customer_idx": 1, "product_qty": [(2, 1)]},
        {"status": "pending", "customer_idx": 0, "product_qty": [(3, 3)]},
        # Confirmed orders
        {"status": "confirmed", "customer_idx": 1, "product_qty": [(0, 1), (2, 1)]},
        {"status": "confirmed", "customer_idx": 0, "product_qty": [(4, 2)]},
        {"status": "confirmed", "customer_idx": 1, "product_qty": [(1, 1)]},
        # Shipped orders
        {"status": "shipped", "customer_idx": 0, "product_qty": [(3, 1), (4, 1)]},
        {"status": "shipped", "customer_idx": 1, "product_qty": [(0, 2)]},
        # Delivered orders
        {"status": "delivered", "customer_idx": 0, "product_qty": [(2, 1), (3, 1)]},
        {"status": "delivered", "customer_idx": 1, "product_qty": [(1, 3)]},
    ]

    order_count = 0
    for config in order_configs:
        if config["customer_idx"] >= len(customers):
            continue

        customer = customers[config["customer_idx"]]
        order = Order(
            customer_id=customer.id,
            status=config["status"],
        )

        subtotal = Decimal(0)
        for product_idx, qty in config["product_qty"]:
            if product_idx < len(products):
                product = products[product_idx]
                item_total = product.price * Decimal(qty)
                item = OrderItem(
                    product_id=product.id,
                    quantity=qty,
                    price=product.price,
                    subtotal=item_total,
                )
                order.items.append(item)
                subtotal += item_total

        order.subtotal = subtotal
        order.discount_amount = Decimal(0)
        order.total = subtotal

        session.add(order)
        session.flush()
        order_count += 1
        logger.info(f"  ✓ Order #{order.id}: {customer.name} - {config['status']} - ${order.total}")

    session.commit()
    logger.info(f"✅ Seeded {order_count} test orders")


def reset_and_seed():
    """Reset database and seed all data"""
    logger.info("🔄 Resetting and seeding database...")

    # Drop and recreate schema
    from shared.models import Base

    Base.metadata.drop_all(bind=engine)
    init_schema()

    session = SessionLocal()
    try:
        seed_users(session)
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

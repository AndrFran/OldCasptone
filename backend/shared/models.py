# Shared SQLAlchemy ORM Models
# All UC teams import models from here
# DO NOT add models without team consensus

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, CheckConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from decimal import Decimal

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(50), nullable=False, index=True)  # 'customer' or 'ops_manager'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", uselist=False, back_populates="user")

    __table_args__ = (
        CheckConstraint("user_type IN ('customer', 'ops_manager')", name="ck_user_type"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', type='{self.user_type}')>"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, default=10)
    image_url = Column(Text, nullable=True)
    brand = Column(String(100), nullable=True)
    team = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    silhouette = Column(String(50), nullable=True)
    sale_price = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order_items = relationship("OrderItem", back_populates="product", cascade="all")

    # Indexes for common queries and FOR UPDATE locks
    __table_args__ = (
        Index("idx_products_stock", "id", "stock"),  # For stock check queries + FOR UPDATE
        Index("idx_products_low_stock", "stock", "low_stock_threshold"),  # For low-stock alerts
        CheckConstraint("price > 0", name="ck_product_price_positive"),
        CheckConstraint("stock >= 0", name="ck_product_stock_non_negative"),
    )

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', stock={self.stock}, price={self.price})>"

    def is_low_stock(self) -> bool:
        """Check if product is below low stock threshold"""
        return self.stock < self.low_stock_threshold

    def can_fulfill(self, quantity: int) -> bool:
        """Check if we can fulfill requested quantity"""
        return self.stock >= quantity


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="customer")
    orders = relationship("Order", back_populates="customer")

    def __repr__(self):
        return f"<Customer(id={self.id}, email='{self.email}', name='{self.name}')>"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending", index=True)
    # Status enum: pending, confirmed, shipped, delivered
    subtotal = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), default=0)
    coupon_code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    # Indexes for common queries
    __table_args__ = (
        Index("idx_orders_customer_id", "customer_id"),
        Index("idx_orders_status", "status"),
        Index("idx_orders_created_at", "created_at"),
        CheckConstraint("subtotal >= 0", name="ck_order_subtotal_non_negative"),
        CheckConstraint("discount_amount >= 0", name="ck_order_discount_non_negative"),
        CheckConstraint("total >= 0", name="ck_order_total_non_negative"),
    )

    def __repr__(self):
        return f"<Order(id={self.id}, customer_id={self.customer_id}, status='{self.status}', total={self.total})>"

    def calculate_total(self):
        """Calculate order total from items"""
        self.subtotal = sum(Decimal(item.subtotal) for item in self.items)
        self.total = self.subtotal - (self.discount_amount or Decimal(0))

    @staticmethod
    def get_valid_statuses():
        """Get valid order status transitions"""
        return ["pending", "confirmed", "shipped", "delivered"]

    def can_transition_to(self, new_status: str) -> bool:
        """Check if status transition is valid"""
        valid_transitions = {
            "pending": ["confirmed", "cancelled"],
            "confirmed": ["shipped", "cancelled"],
            "shipped": ["delivered"],
            "delivered": [],
        }
        return new_status in valid_transitions.get(self.status, [])


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    # Indexes for common queries
    __table_args__ = (
        Index("idx_order_items_order_id", "order_id"),
        Index("idx_order_items_product_id", "product_id"),
        CheckConstraint("quantity > 0", name="ck_orderitem_quantity_positive"),
        CheckConstraint("price > 0", name="ck_orderitem_price_positive"),
        CheckConstraint("subtotal > 0", name="ck_orderitem_subtotal_positive"),
    )

    def __repr__(self):
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, product_id={self.product_id}, qty={self.quantity})>"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    discount_type = Column(String(20), nullable=False)  # 'percent' or 'fixed'
    value = Column(Numeric(10, 2), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    max_uses = Column(Integer, nullable=True)  # NULL = unlimited
    used_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Indexes for common queries
    __table_args__ = (
        Index("idx_coupons_code", "code"),
        Index("idx_coupons_expires_at", "expires_at"),
        CheckConstraint("discount_type IN ('percent', 'fixed')", name="ck_coupon_discount_type"),
        CheckConstraint("value > 0", name="ck_coupon_value_positive"),
        CheckConstraint("used_count >= 0", name="ck_coupon_used_count_non_negative"),
    )

    def __repr__(self):
        return f"<Coupon(code='{self.code}', discount_type='{self.discount_type}', value={self.value}, expires_at={self.expires_at})>"

    def is_valid(self) -> bool:
        """Check if coupon is valid (not expired, within usage limits)"""
        now = datetime.utcnow()
        if self.expires_at < now:
            return False
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False
        return True

    def is_expired(self) -> bool:
        """Check if coupon is expired"""
        return self.expires_at < datetime.utcnow()

    def is_exhausted(self) -> bool:
        """Check if coupon has exceeded max uses"""
        return self.max_uses is not None and self.used_count >= self.max_uses

    def get_remaining_uses(self) -> int:
        """Get remaining uses count (-1 if unlimited)"""
        if self.max_uses is None:
            return -1
        return max(0, self.max_uses - self.used_count)


class UserConsent(Base):
    """
    Track user GDPR consent for cookies and data processing
    GDPR requires explicit opt-in consent before non-essential tracking
    """
    __tablename__ = "user_consent"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String(255), nullable=False, index=True)

    # Consent flags
    essential = Column(Integer, default=1, nullable=False)  # Always true
    analytics = Column(Integer, default=0, nullable=False)
    marketing = Column(Integer, default=0, nullable=False)
    preferences = Column(Integer, default=0, nullable=False)

    # Metadata
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    consent_source = Column(String(50), default='banner')  # 'banner', 'form', 'email'
    request_id = Column(String(100), nullable=True, index=True)  # GDPR request ID

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Consent validity (365 days)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        Index("idx_user_consent_user_id", "user_id"),
        Index("idx_user_consent_email", "email"),
        Index("idx_user_consent_created_at", "created_at"),
        CheckConstraint("essential IN (0, 1)", name="ck_consent_essential"),
        CheckConstraint("analytics IN (0, 1)", name="ck_consent_analytics"),
        CheckConstraint("marketing IN (0, 1)", name="ck_consent_marketing"),
        CheckConstraint("preferences IN (0, 1)", name="ck_consent_preferences"),
    )

    def __repr__(self):
        return f"<UserConsent(user_id={self.user_id}, email='{self.email}', analytics={self.analytics}, marketing={self.marketing})>"

    def is_valid(self) -> bool:
        """Check if consent is still valid"""
        if self.expires_at is None:
            return True
        return datetime.utcnow() < self.expires_at

    def has_consent(self, category: str) -> bool:
        """Check if user has consented to a category"""
        category_attr = getattr(self, category, None)
        return category_attr == 1 if category_attr is not None else False

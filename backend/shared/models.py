# Shared SQLAlchemy ORM Models
# All UC teams import models from here
# DO NOT add models without team consensus

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', stock={self.stock})>"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
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

    def __repr__(self):
        return f"<Order(id={self.id}, customer_id={self.customer_id}, status='{self.status}', total={self.total})>"


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

    def __repr__(self):
        return f"<Coupon(code='{self.code}', discount_type='{self.discount_type}', value={self.value})>"

    def is_valid(self) -> bool:
        """Check if coupon is valid (not expired, within usage limits)"""
        now = datetime.utcnow()
        if self.expires_at < now:
            return False
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False
        return True

    def get_remaining_uses(self) -> int:
        """Get remaining uses count (-1 if unlimited)"""
        if self.max_uses is None:
            return -1
        return max(0, self.max_uses - self.used_count)

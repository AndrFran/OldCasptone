# Pydantic Schemas - API Request/Response Models
# All UC teams use these for validation and OpenAPI documentation

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from enum import Enum


# ===================== Enums =====================


class OrderStatusEnum(str, Enum):
    """Valid order statuses"""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"


class DiscountTypeEnum(str, Enum):
    """Coupon discount types"""

    PERCENT = "percent"
    FIXED = "fixed"


# ===================== Product Schemas =====================


class ProductBase(BaseModel):
    """Base product data"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    price: Decimal = Field(..., gt=0, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)


class Product(ProductBase):
    """Product response model"""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductResponse(Product):
    """Product response model (alias for API compatibility)"""

    pass


class ProductList(BaseModel):
    """Paginated product list"""

    items: List[Product]
    total: int


# ===================== Customer Schemas =====================


class CustomerBase(BaseModel):
    """Base customer data"""

    email: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=255)


class Customer(CustomerBase):
    """Customer response model"""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== Coupon Schemas =====================


class CouponBase(BaseModel):
    """Base coupon data"""

    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    discount_type: DiscountTypeEnum
    value: Decimal = Field(..., gt=0, decimal_places=2)
    expires_at: datetime
    max_uses: Optional[int] = Field(None, ge=1)


class Coupon(CouponBase):
    """Coupon response model"""

    id: int
    used_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ValidCouponRequest(BaseModel):
    """Request to validate coupon"""

    code: str = Field(..., min_length=1, max_length=50)


class ValidCouponResponse(BaseModel):
    """Response from coupon validation"""

    code: str
    valid: bool
    discount_type: Optional[DiscountTypeEnum] = None
    value: Optional[Decimal] = None
    expires_at: Optional[datetime] = None
    remaining_uses: Optional[int] = None
    error: Optional[str] = None


# ===================== Order Item Schemas =====================


class OrderItemRequest(BaseModel):
    """Request item for order creation"""

    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItemResponse(BaseModel):
    """Order item response"""

    id: int
    product_id: int
    quantity: int
    price: Decimal
    subtotal: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== Order Schemas =====================


class CreateOrderRequest(BaseModel):
    """Request to create order"""

    customer_id: int = Field(..., gt=0)
    items: List[OrderItemRequest] = Field(..., min_items=1)
    coupon_code: Optional[str] = Field(None, max_length=50)

    @validator("items")
    def validate_items(cls, items):
        if not items or len(items) == 0:
            raise ValueError("Order must contain at least one item")
        # Check for duplicate products
        product_ids = [item.product_id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Cannot order same product twice in one order")
        return items


class UpdateOrderStatusRequest(BaseModel):
    """Request to update order status"""

    status: OrderStatusEnum = Field(...)


class OrderResponse(BaseModel):
    """Order response model"""

    id: int
    customer_id: int
    status: OrderStatusEnum
    items: List[OrderItemResponse]
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
    coupon_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderList(BaseModel):
    """Paginated order list"""

    items: List[OrderResponse]
    total: int


class OrderCreatedResponse(OrderResponse):
    """Response after successful order creation (status=201)"""

    message: str = "Order created successfully"


# ===================== Inventory Schemas =====================


class InventoryResponse(BaseModel):
    """Inventory level response"""

    product_id: int
    product_name: str
    stock: int
    price: Decimal
    low_stock_threshold: int
    is_low_stock: bool


class InventoryList(BaseModel):
    """Paginated inventory list"""

    items: List[InventoryResponse]
    total: int


class LowStockAlert(BaseModel):
    """Low stock alert for ops dashboard"""

    product_id: int
    product_name: str
    stock: int
    low_stock_threshold: int
    urgency: str  # 'critical' if stock <= threshold/5, else 'warning'


class LowStockAlertList(BaseModel):
    """List of low stock alerts"""

    items: List[LowStockAlert]
    total: int
    critical_count: int
    warning_count: int


class RestockRequest(BaseModel):
    """Request to restock a product"""

    quantity: int = Field(..., gt=0)


# ===================== Error Response Schemas =====================


class ErrorResponse(BaseModel):
    """Generic error response"""

    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class OutOfStockResponse(ErrorResponse):
    """Out of stock error response"""

    detail: str = "Product out of stock or insufficient quantity"
    status_code: int = 409


class ValidationErrorResponse(BaseModel):
    """Validation error response"""

    detail: str
    status_code: int = 400

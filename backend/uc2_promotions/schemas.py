# UC2: Promotions & Coupons - Pydantic Request/Response Schemas
# Used for API validation and OpenAPI documentation

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from decimal import Decimal
from datetime import datetime


# ===================== Request Schemas =====================

class ValidateCouponRequest(BaseModel):
    """Request to validate a coupon code"""
    code: str = Field(..., min_length=1, max_length=50, example="SUMMER10")

    class Config:
        json_schema_extra = {
            "example": {
                "code": "SUMMER10"
            }
        }


class CreateCouponRequest(BaseModel):
    """Request to create a new coupon (ops manager only)"""
    code: str = Field(..., min_length=1, max_length=50, example="SUMMER10")
    description: Optional[str] = Field(None, max_length=500, example="Summer Sale: 10% off all orders")
    discount_type: str = Field(..., pattern="^(percent|fixed)$", example="percent")
    value: Decimal = Field(..., gt=0, decimal_places=2, example=10.00)
    expires_at: datetime = Field(..., example="2026-12-31T23:59:59")
    max_uses: Optional[int] = Field(None, ge=1, example=100)

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v):
        if v not in ("percent", "fixed"):
            raise ValueError("discount_type must be 'percent' or 'fixed'")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "code": "SUMMER10",
                "description": "Summer Sale: 10% off all orders",
                "discount_type": "percent",
                "value": 10.00,
                "expires_at": "2026-12-31T23:59:59",
                "max_uses": None
            }
        }


class UpdateCouponRequest(BaseModel):
    """Request to update a coupon (ops manager only)"""
    description: Optional[str] = Field(None, max_length=500)
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(None, ge=1)

    class Config:
        json_schema_extra = {
            "example": {
                "description": "Updated description",
                "expires_at": "2026-12-31T23:59:59",
                "max_uses": 100
            }
        }


# ===================== Response Schemas =====================

class ValidCoupon(BaseModel):
    """Response when coupon is valid"""
    code: str
    valid: bool
    discount_type: str
    value: Decimal
    expires_at: datetime
    remaining_uses: int

    class Config:
        json_schema_extra = {
            "example": {
                "code": "SUMMER10",
                "valid": True,
                "discount_type": "percent",
                "value": 10.00,
                "expires_at": "2026-12-31T23:59:59",
                "remaining_uses": 50
            }
        }


class Promotion(BaseModel):
    """Active promotional coupon"""
    id: int
    code: str
    description: Optional[str]
    discount_type: str
    value: Decimal
    expires_at: datetime
    remaining_uses: int
    max_uses: Optional[int]

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "code": "SUMMER10",
                "description": "Summer Sale: 10% off all orders",
                "discount_type": "percent",
                "value": 10.00,
                "expires_at": "2026-12-31T23:59:59",
                "remaining_uses": 50,
                "max_uses": None
            }
        }


class PromotionList(BaseModel):
    """List of active promotions"""
    items: list[Promotion]
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "id": 1,
                        "code": "SUMMER10",
                        "description": "Summer Sale: 10% off all orders",
                        "discount_type": "percent",
                        "value": 10.00,
                        "expires_at": "2026-12-31T23:59:59",
                        "remaining_uses": 50,
                        "max_uses": None
                    }
                ],
                "total": 1
            }
        }


class CouponDetail(BaseModel):
    """Full coupon detail (for manager operations)"""
    id: int
    code: str
    description: Optional[str]
    discount_type: str
    value: Decimal
    expires_at: datetime
    max_uses: Optional[int]
    used_count: int
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "code": "SUMMER10",
                "description": "Summer Sale: 10% off all orders",
                "discount_type": "percent",
                "value": 10.00,
                "expires_at": "2026-12-31T23:59:59",
                "max_uses": None,
                "used_count": 25,
                "created_at": "2026-07-01T10:00:00"
            }
        }


class DiscountResult(BaseModel):
    """Result of discount calculation"""
    discount_amount: Decimal
    final_total: Decimal
    discount_type: str
    value: Decimal

    class Config:
        json_schema_extra = {
            "example": {
                "discount_amount": 10.00,
                "final_total": 90.00,
                "discount_type": "percent",
                "value": 10.00
            }
        }


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    details: Optional[str] = None
    code: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Invalid coupon",
                "details": "Coupon expired on 2026-07-01",
                "code": "INVALID_COUPON"
            }
        }

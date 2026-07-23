# UC2: Promotions & Coupons Service
# Coupon validation, discount calculation, and promotion management

from .services import CouponService, CouponValidationError
from .api import router
from .schemas import (
    ValidateCouponRequest,
    ValidCoupon,
    Promotion,
    PromotionList,
    CreateCouponRequest,
    UpdateCouponRequest,
    CouponDetail,
    DiscountResult,
)

__all__ = [
    "CouponService",
    "CouponValidationError",
    "router",
    "ValidateCouponRequest",
    "ValidCoupon",
    "Promotion",
    "PromotionList",
    "CreateCouponRequest",
    "UpdateCouponRequest",
    "CouponDetail",
    "DiscountResult",
]

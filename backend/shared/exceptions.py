# Shared Exception Classes
# All UC teams use these for consistent error handling

from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for all API errors"""

    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)


# ===================== Order-Related Exceptions =====================


class OutOfStockError(BaseAPIException):
    """Raised when insufficient stock available for order"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_409_CONFLICT)


class ProductNotFoundError(BaseAPIException):
    """Raised when product doesn't exist"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_404_NOT_FOUND)


class CustomerNotFoundError(BaseAPIException):
    """Raised when customer doesn't exist"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_404_NOT_FOUND)


class InvalidOrderError(BaseAPIException):
    """Raised for invalid order data or state"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


class InvalidStatusTransitionError(BaseAPIException):
    """Raised when order status transition is invalid"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


class CouponValidationError(BaseAPIException):
    """Raised when coupon is invalid, expired, or usage limit exceeded"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


# ===================== Promotion-Related Exceptions =====================


class InvalidCouponError(BaseAPIException):
    """Raised when coupon code is invalid"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_404_NOT_FOUND)


class CouponExpiredError(BaseAPIException):
    """Raised when coupon has expired"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


class CouponLimitExceededError(BaseAPIException):
    """Raised when coupon usage limit reached"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


# ===================== Inventory-Related Exceptions =====================


class LowStockError(BaseAPIException):
    """Raised when product is low in stock"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


class InvalidQuantityError(BaseAPIException):
    """Raised when quantity is invalid"""

    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)

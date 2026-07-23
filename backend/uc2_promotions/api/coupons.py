# UC2: Coupon API Routes
# Endpoints for coupon validation, promotion listing, and coupon management

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
import logging

# Import shared dependencies
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from shared.db import get_db
from shared.models import Coupon

# Import UC2 modules
from ..schemas import (
    ValidateCouponRequest,
    ValidCoupon,
    Promotion,
    PromotionList,
    CreateCouponRequest,
    UpdateCouponRequest,
    CouponDetail,
    DiscountResult,
    ErrorResponse,
)
from ..services import CouponService, CouponValidationError

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/coupons", tags=["UC2-Promotions"])


# ===================== Customer-Facing Endpoints =====================

@router.post("/validate", response_model=ValidCoupon)
async def validate_coupon(
    request: ValidateCouponRequest,
    db: Session = Depends(get_db)
):
    """
    Validate a coupon code and return discount details.

    Checks:
    - Coupon exists
    - Not expired (expires_at > now)
    - Within usage limits (used_count < max_uses)

    Returns:
    - Discount type and value if valid

    Errors:
    - 400: Invalid, expired, or usage limit exceeded
    - 500: Server error
    """
    try:
        coupon = CouponService.validate_coupon_code(request.code, db)

        return ValidCoupon(
            code=coupon.code,
            valid=True,
            discount_type=coupon.discount_type,
            value=coupon.value,
            expires_at=coupon.expires_at,
            remaining_uses=coupon.get_remaining_uses()
        )
    except CouponValidationError as e:
        logger.warning(f"Coupon validation failed: {request.code} - {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": e.message,
                "code": e.code
            }
        )
    except Exception as e:
        logger.error(f"Error validating coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


@router.post("/calculate-discount", response_model=DiscountResult)
async def calculate_discount(
    request: ValidateCouponRequest,
    subtotal: Decimal = Decimal("0.00"),
    db: Session = Depends(get_db)
):
    """
    Calculate discount for a coupon and order subtotal.

    Used for displaying discount preview before checkout.

    Returns:
    - discount_amount: Dollar amount to deduct
    - final_total: Subtotal minus discount
    - discount_type: 'percent' or 'fixed'
    - value: Discount value

    Errors:
    - 400: Invalid coupon or subtotal
    - 500: Server error
    """
    try:
        coupon = CouponService.validate_coupon_code(request.code, db)
        discount_amount, final_total = CouponService.calculate_discount(coupon, subtotal)

        return DiscountResult(
            discount_amount=discount_amount,
            final_total=final_total,
            discount_type=coupon.discount_type,
            value=coupon.value
        )
    except CouponValidationError as e:
        logger.warning(f"Discount calculation failed: {request.code} - {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": e.message}
        )
    except Exception as e:
        logger.error(f"Error calculating discount: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


# ===================== Promotions Listing =====================

@router.get("/", response_model=PromotionList)
async def list_promotions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all active (non-expired) promotions.

    Returns:
    - List of current promotional coupons
    - Sorted by expiration date (nearest first)

    Query params:
    - skip: Number of records to skip (pagination)
    - limit: Maximum records to return (default: 100)

    Errors:
    - 500: Server error
    """
    try:
        # Validate pagination
        if skip < 0 or limit <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": "Invalid pagination parameters"}
            )

        coupons, total = CouponService.get_active_promotions(db, skip=skip, limit=limit)

        promotions = [
            Promotion(
                id=coupon.id,
                code=coupon.code,
                description=coupon.description,
                discount_type=coupon.discount_type,
                value=coupon.value,
                expires_at=coupon.expires_at,
                remaining_uses=coupon.get_remaining_uses(),
                max_uses=coupon.max_uses
            )
            for coupon in coupons
        ]

        return PromotionList(items=promotions, total=total)
    except Exception as e:
        logger.error(f"Error listing promotions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


# ===================== Ops Manager Endpoints (CRUD) =====================

@router.post("/manage/create", response_model=CouponDetail, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    request: CreateCouponRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new coupon (ops manager only).

    Note: In production, add authentication/authorization check.

    Request:
    - code: Unique coupon code (e.g., 'SUMMER10')
    - discount_type: 'percent' or 'fixed'
    - value: Discount value
    - expires_at: Expiration datetime
    - description: Optional description
    - max_uses: Optional usage limit (None = unlimited)

    Returns:
    - Created coupon details

    Errors:
    - 400: Code already exists or validation error
    - 422: Invalid request data
    - 500: Server error
    """
    try:
        coupon = CouponService.create_coupon(
            code=request.code,
            discount_type=request.discount_type,
            value=request.value,
            expires_at=request.expires_at,
            description=request.description,
            max_uses=request.max_uses,
            db=db
        )

        return CouponDetail.from_orm(coupon)
    except ValueError as e:
        logger.warning(f"Coupon creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"Error creating coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


@router.get("/manage/{code}", response_model=CouponDetail)
async def get_coupon(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Get coupon details by code (ops manager only).

    Note: In production, add authentication/authorization check.

    Returns:
    - Full coupon details including usage stats

    Errors:
    - 404: Coupon not found
    - 500: Server error
    """
    try:
        coupon = CouponService.get_coupon_by_code(code, db)

        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": f"Coupon '{code}' not found"}
            )

        return CouponDetail.from_orm(coupon)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


@router.patch("/manage/{code}", response_model=CouponDetail)
async def update_coupon(
    code: str,
    request: UpdateCouponRequest,
    db: Session = Depends(get_db)
):
    """
    Update an existing coupon (ops manager only).

    Note: In production, add authentication/authorization check.

    Request:
    - description: New description (optional)
    - expires_at: New expiration date (optional)
    - max_uses: New usage limit (optional)

    Returns:
    - Updated coupon details

    Errors:
    - 404: Coupon not found
    - 422: Invalid request data
    - 500: Server error
    """
    try:
        coupon = CouponService.update_coupon(
            code=code,
            description=request.description,
            expires_at=request.expires_at,
            max_uses=request.max_uses,
            db=db
        )

        return CouponDetail.from_orm(coupon)
    except ValueError as e:
        logger.warning(f"Coupon update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"Error updating coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


@router.delete("/manage/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    code: str,
    db: Session = Depends(get_db)
):
    """
    Delete a coupon (ops manager only).

    Note: In production, add authentication/authorization check.

    Errors:
    - 404: Coupon not found
    - 500: Server error
    """
    try:
        CouponService.delete_coupon(code, db)
        return None
    except ValueError as e:
        logger.warning(f"Coupon deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"Error deleting coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )


@router.get("/manage", response_model=PromotionList)
async def list_all_coupons(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all coupons (including expired ones) - ops manager only.

    Note: In production, add authentication/authorization check.

    Returns:
    - List of all coupons with usage stats

    Errors:
    - 500: Server error
    """
    try:
        # Validate pagination
        if skip < 0 or limit <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": "Invalid pagination parameters"}
            )

        query = db.query(Coupon)
        total = query.count()

        coupons = query.offset(skip).limit(limit).all()

        promotions = [
            Promotion(
                id=coupon.id,
                code=coupon.code,
                description=coupon.description,
                discount_type=coupon.discount_type,
                value=coupon.value,
                expires_at=coupon.expires_at,
                remaining_uses=coupon.get_remaining_uses(),
                max_uses=coupon.max_uses
            )
            for coupon in coupons
        ]

        return PromotionList(items=promotions, total=total)
    except Exception as e:
        logger.error(f"Error listing all coupons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error"}
        )

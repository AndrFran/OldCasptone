# UC2: Coupon Service - Core business logic for promotions
# Handles coupon validation, discount calculation, and coupon management

from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

# Import shared models
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from shared.models import Coupon

logger = logging.getLogger(__name__)


class CouponValidationError(Exception):
    """Raised when coupon validation fails"""
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code or "INVALID_COUPON"
        super().__init__(self.message)


class CouponService:
    """Service for coupon validation and discount calculation"""

    @staticmethod
    def validate_coupon_code(code: str, db: Session) -> Coupon:
        """
        Validate coupon code and return coupon if valid.

        Checks:
        1. Coupon exists
        2. Not expired
        3. Within usage limits

        Args:
            code: Coupon code to validate
            db: Database session

        Returns:
            Coupon object if valid

        Raises:
            CouponValidationError: If coupon is invalid, expired, or limit exceeded
        """
        # Query coupon by code
        coupon = db.query(Coupon).filter(Coupon.code == code).first()

        if not coupon:
            logger.warning(f"Coupon not found: {code}")
            raise CouponValidationError(
                f"Coupon code '{code}' does not exist",
                code="COUPON_NOT_FOUND"
            )

        # Check expiry
        now = datetime.utcnow()
        if coupon.expires_at < now:
            logger.warning(f"Coupon expired: {code} (expired at {coupon.expires_at})")
            raise CouponValidationError(
                f"Coupon expired on {coupon.expires_at.strftime('%Y-%m-%d')}",
                code="COUPON_EXPIRED"
            )

        # Check usage limits
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            logger.warning(f"Coupon usage limit exceeded: {code} ({coupon.used_count}/{coupon.max_uses})")
            raise CouponValidationError(
                f"Coupon usage limit exceeded ({coupon.used_count}/{coupon.max_uses})",
                code="COUPON_LIMIT_EXCEEDED"
            )

        logger.info(f"Coupon validated: {code}")
        return coupon

    @staticmethod
    def calculate_discount(
        coupon: Coupon,
        subtotal: Decimal,
        min_order_amount: Decimal = Decimal("0.00")
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate discount amount and final total.

        Discount types:
        - 'percent': discount_amount = subtotal * (value / 100)
        - 'fixed': discount_amount = value (fixed dollar amount)

        Args:
            coupon: Coupon object
            subtotal: Order subtotal before discount
            min_order_amount: Minimum order amount for coupon to apply (default: $0)

        Returns:
            Tuple of (discount_amount, final_total)

        Raises:
            ValueError: If subtotal is negative or coupon type is invalid
        """
        if subtotal < 0:
            raise ValueError("Subtotal cannot be negative")

        # Check minimum order amount
        if subtotal < min_order_amount:
            logger.info(f"Subtotal {subtotal} below minimum {min_order_amount}")
            return Decimal("0.00"), subtotal

        discount_amount = Decimal("0.00")

        if coupon.discount_type == "percent":
            # Percentage discount: apply percentage to subtotal
            discount_amount = subtotal * (coupon.value / Decimal("100"))
        elif coupon.discount_type == "fixed":
            # Fixed discount: use fixed amount, but don't exceed subtotal
            discount_amount = min(coupon.value, subtotal)
        else:
            raise ValueError(f"Unknown discount type: {coupon.discount_type}")

        # Round to 2 decimal places
        discount_amount = discount_amount.quantize(Decimal("0.01"))

        # Calculate final total (ensure non-negative)
        final_total = max(Decimal("0.00"), subtotal - discount_amount)

        logger.info(
            f"Discount calculated: {coupon.code} | "
            f"Subtotal: {subtotal} | "
            f"Type: {coupon.discount_type} | "
            f"Value: {coupon.value} | "
            f"Discount: {discount_amount} | "
            f"Final: {final_total}"
        )

        return discount_amount, final_total

    @staticmethod
    def increment_coupon_usage(code: str, db: Session) -> bool:
        """
        Increment coupon usage count after successful application.
        Should be called during order creation after discount is applied.

        Args:
            code: Coupon code
            db: Database session

        Returns:
            True if successful

        Raises:
            CouponValidationError: If coupon not found or usage limit exceeded
        """
        coupon = db.query(Coupon).filter(Coupon.code == code).first()

        if not coupon:
            logger.error(f"Attempted to increment non-existent coupon: {code}")
            raise CouponValidationError(
                f"Coupon '{code}' not found",
                code="COUPON_NOT_FOUND"
            )

        # Check if we can increment (fail-safe)
        if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
            logger.error(f"Cannot increment coupon at limit: {code}")
            raise CouponValidationError(
                f"Coupon usage limit exceeded",
                code="COUPON_LIMIT_EXCEEDED"
            )

        # Increment usage
        coupon.used_count += 1
        db.commit()

        logger.info(f"Coupon usage incremented: {code} (now {coupon.used_count})")
        return True

    @staticmethod
    def get_active_promotions(db: Session, skip: int = 0, limit: int = 100) -> tuple[list[Coupon], int]:
        """
        Get all active (non-expired) promotions.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            Tuple of (list of Coupon objects, total count)
        """
        now = datetime.utcnow()

        # Query active coupons (not expired)
        query = db.query(Coupon).filter(Coupon.expires_at > now)
        total = query.count()

        # Apply pagination
        coupons = query.offset(skip).limit(limit).all()

        logger.info(f"Retrieved {len(coupons)} active promotions (total: {total})")
        return coupons, total

    @staticmethod
    def create_coupon(
        code: str,
        discount_type: str,
        value: Decimal,
        expires_at: datetime,
        description: str = None,
        max_uses: int = None,
        db: Session = None
    ) -> Coupon:
        """
        Create a new coupon (ops manager only).

        Args:
            code: Coupon code (unique)
            discount_type: 'percent' or 'fixed'
            value: Discount value
            expires_at: Expiration datetime
            description: Optional coupon description
            max_uses: Optional max usage count (None = unlimited)
            db: Database session

        Returns:
            Created Coupon object

        Raises:
            ValueError: If code already exists or validation fails
        """
        if not db:
            raise ValueError("Database session required")

        # Check if code already exists
        existing = db.query(Coupon).filter(Coupon.code == code).first()
        if existing:
            logger.error(f"Coupon code already exists: {code}")
            raise ValueError(f"Coupon code '{code}' already exists")

        # Validate discount type
        if discount_type not in ("percent", "fixed"):
            raise ValueError("discount_type must be 'percent' or 'fixed'")

        # Validate value
        if value <= 0:
            raise ValueError("value must be positive")

        # Validate expiration
        if expires_at <= datetime.utcnow():
            raise ValueError("expires_at must be in the future")

        # Create coupon
        coupon = Coupon(
            code=code,
            description=description,
            discount_type=discount_type,
            value=value,
            expires_at=expires_at,
            max_uses=max_uses,
            used_count=0
        )

        db.add(coupon)
        db.commit()
        db.refresh(coupon)

        logger.info(f"Coupon created: {code}")
        return coupon

    @staticmethod
    def get_coupon_by_code(code: str, db: Session) -> Coupon:
        """Get coupon by code without validation"""
        return db.query(Coupon).filter(Coupon.code == code).first()

    @staticmethod
    def update_coupon(
        code: str,
        description: str = None,
        expires_at: datetime = None,
        max_uses: int = None,
        db: Session = None
    ) -> Coupon:
        """
        Update an existing coupon (ops manager only).

        Args:
            code: Coupon code
            description: New description (if provided)
            expires_at: New expiration (if provided)
            max_uses: New max uses (if provided)
            db: Database session

        Returns:
            Updated Coupon object

        Raises:
            ValueError: If coupon not found
        """
        if not db:
            raise ValueError("Database session required")

        coupon = db.query(Coupon).filter(Coupon.code == code).first()
        if not coupon:
            raise ValueError(f"Coupon '{code}' not found")

        if description is not None:
            coupon.description = description
        if expires_at is not None:
            coupon.expires_at = expires_at
        if max_uses is not None:
            coupon.max_uses = max_uses

        db.commit()
        db.refresh(coupon)

        logger.info(f"Coupon updated: {code}")
        return coupon

    @staticmethod
    def delete_coupon(code: str, db: Session) -> bool:
        """
        Delete a coupon (ops manager only).

        Args:
            code: Coupon code
            db: Database session

        Returns:
            True if deleted

        Raises:
            ValueError: If coupon not found
        """
        if not db:
            raise ValueError("Database session required")

        coupon = db.query(Coupon).filter(Coupon.code == code).first()
        if not coupon:
            raise ValueError(f"Coupon '{code}' not found")

        db.delete(coupon)
        db.commit()

        logger.info(f"Coupon deleted: {code}")
        return True

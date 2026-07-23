# UC2: Coupon Service Tests
# Tests for coupon validation, discount calculation, and coupon management

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from shared.models import Base, Coupon
from ..services import CouponService, CouponValidationError


# ===================== Fixtures =====================

@pytest.fixture
def db():
    """Create in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def sample_coupons(db):
    """Create sample coupons for testing"""
    # Active percent coupon
    coupon1 = Coupon(
        code="PERCENT10",
        description="10% off",
        discount_type="percent",
        value=Decimal("10.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=None,
        used_count=0
    )

    # Active fixed coupon with usage limit
    coupon2 = Coupon(
        code="FIXED5",
        description="$5 off",
        discount_type="fixed",
        value=Decimal("5.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=100,
        used_count=50
    )

    # Expired coupon
    coupon3 = Coupon(
        code="EXPIRED",
        description="Expired coupon",
        discount_type="percent",
        value=Decimal("20.00"),
        expires_at=datetime.utcnow() - timedelta(days=1),
        max_uses=None,
        used_count=0
    )

    # Coupon at usage limit
    coupon4 = Coupon(
        code="LIMITREACHED",
        description="Usage limit reached",
        discount_type="percent",
        value=Decimal("15.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=10,
        used_count=10
    )

    db.add_all([coupon1, coupon2, coupon3, coupon4])
    db.commit()

    return {
        "active_percent": coupon1,
        "active_fixed": coupon2,
        "expired": coupon3,
        "limit_reached": coupon4
    }


# ===================== Validation Tests =====================

class TestValidateCouponCode:
    """Test coupon validation"""

    def test_valid_percent_coupon(self, db, sample_coupons):
        """Test validating active percent coupon"""
        coupon = CouponService.validate_coupon_code("PERCENT10", db)
        assert coupon.code == "PERCENT10"
        assert coupon.discount_type == "percent"
        assert coupon.value == Decimal("10.00")

    def test_valid_fixed_coupon(self, db, sample_coupons):
        """Test validating active fixed coupon"""
        coupon = CouponService.validate_coupon_code("FIXED5", db)
        assert coupon.code == "FIXED5"
        assert coupon.discount_type == "fixed"
        assert coupon.value == Decimal("5.00")

    def test_coupon_not_found(self, db, sample_coupons):
        """Test validation fails for non-existent coupon"""
        with pytest.raises(CouponValidationError) as exc_info:
            CouponService.validate_coupon_code("NONEXISTENT", db)
        assert exc_info.value.code == "COUPON_NOT_FOUND"

    def test_expired_coupon(self, db, sample_coupons):
        """Test validation fails for expired coupon"""
        with pytest.raises(CouponValidationError) as exc_info:
            CouponService.validate_coupon_code("EXPIRED", db)
        assert exc_info.value.code == "COUPON_EXPIRED"

    def test_coupon_limit_exceeded(self, db, sample_coupons):
        """Test validation fails when usage limit reached"""
        with pytest.raises(CouponValidationError) as exc_info:
            CouponService.validate_coupon_code("LIMITREACHED", db)
        assert exc_info.value.code == "COUPON_LIMIT_EXCEEDED"

    def test_coupon_with_remaining_uses(self, db, sample_coupons):
        """Test coupon with remaining uses validates successfully"""
        coupon = CouponService.validate_coupon_code("FIXED5", db)
        assert coupon.get_remaining_uses() == 50


# ===================== Discount Calculation Tests =====================

class TestCalculateDiscount:
    """Test discount calculation"""

    def test_percent_discount(self, db, sample_coupons):
        """Test percentage discount calculation"""
        coupon = sample_coupons["active_percent"]  # 10% off
        subtotal = Decimal("100.00")

        discount, total = CouponService.calculate_discount(coupon, subtotal)

        assert discount == Decimal("10.00")
        assert total == Decimal("90.00")

    def test_fixed_discount(self, db, sample_coupons):
        """Test fixed amount discount calculation"""
        coupon = sample_coupons["active_fixed"]  # $5 off
        subtotal = Decimal("100.00")

        discount, total = CouponService.calculate_discount(coupon, subtotal)

        assert discount == Decimal("5.00")
        assert total == Decimal("95.00")

    def test_fixed_discount_exceeds_subtotal(self, db, sample_coupons):
        """Test fixed discount capped at subtotal"""
        coupon = sample_coupons["active_fixed"]  # $5 off
        subtotal = Decimal("3.00")  # Subtotal less than discount

        discount, total = CouponService.calculate_discount(coupon, subtotal)

        assert discount == Decimal("3.00")  # Capped at subtotal
        assert total == Decimal("0.00")

    def test_percent_discount_rounding(self, db, sample_coupons):
        """Test percentage discount rounds to 2 decimal places"""
        coupon = sample_coupons["active_percent"]  # 10%
        subtotal = Decimal("33.33")

        discount, total = CouponService.calculate_discount(coupon, subtotal)

        assert discount == Decimal("3.33")
        assert total == Decimal("30.00")

    def test_zero_subtotal(self, db, sample_coupons):
        """Test discount on zero subtotal"""
        coupon = sample_coupons["active_percent"]
        discount, total = CouponService.calculate_discount(coupon, Decimal("0.00"))

        assert discount == Decimal("0.00")
        assert total == Decimal("0.00")

    def test_large_discount_value(self, db):
        """Test discount with large percentage"""
        coupon = Coupon(
            code="TEST90",
            discount_type="percent",
            value=Decimal("90.00"),
            expires_at=datetime.utcnow() + timedelta(days=1),
            used_count=0
        )

        discount, total = CouponService.calculate_discount(coupon, Decimal("100.00"))

        assert discount == Decimal("90.00")
        assert total == Decimal("10.00")

    def test_minimum_order_amount(self, db, sample_coupons):
        """Test coupon not applied when order below minimum"""
        coupon = sample_coupons["active_percent"]
        subtotal = Decimal("5.00")
        min_order = Decimal("50.00")

        discount, total = CouponService.calculate_discount(
            coupon, subtotal, min_order_amount=min_order
        )

        assert discount == Decimal("0.00")
        assert total == Decimal("5.00")


# ===================== Coupon Management Tests =====================

class TestCreateCoupon:
    """Test coupon creation"""

    def test_create_valid_coupon(self, db):
        """Test creating a valid coupon"""
        coupon = CouponService.create_coupon(
            code="NEWCODE",
            discount_type="percent",
            value=Decimal("15.00"),
            expires_at=datetime.utcnow() + timedelta(days=30),
            description="New test coupon",
            db=db
        )

        assert coupon.code == "NEWCODE"
        assert coupon.discount_type == "percent"
        assert coupon.value == Decimal("15.00")
        assert coupon.used_count == 0

    def test_create_fixed_discount_coupon(self, db):
        """Test creating fixed discount coupon"""
        coupon = CouponService.create_coupon(
            code="FIXED10",
            discount_type="fixed",
            value=Decimal("10.00"),
            expires_at=datetime.utcnow() + timedelta(days=30),
            max_uses=50,
            db=db
        )

        assert coupon.discount_type == "fixed"
        assert coupon.max_uses == 50

    def test_create_duplicate_code(self, db, sample_coupons):
        """Test creating coupon with duplicate code fails"""
        with pytest.raises(ValueError):
            CouponService.create_coupon(
                code="PERCENT10",  # Already exists
                discount_type="percent",
                value=Decimal("10.00"),
                expires_at=datetime.utcnow() + timedelta(days=30),
                db=db
            )

    def test_create_invalid_discount_type(self, db):
        """Test invalid discount type fails"""
        with pytest.raises(ValueError):
            CouponService.create_coupon(
                code="INVALID",
                discount_type="invalid",  # Invalid type
                value=Decimal("10.00"),
                expires_at=datetime.utcnow() + timedelta(days=30),
                db=db
            )

    def test_create_negative_value(self, db):
        """Test negative discount value fails"""
        with pytest.raises(ValueError):
            CouponService.create_coupon(
                code="NEGATIVE",
                discount_type="percent",
                value=Decimal("-10.00"),  # Negative
                expires_at=datetime.utcnow() + timedelta(days=30),
                db=db
            )

    def test_create_past_expiration(self, db):
        """Test coupon with past expiration fails"""
        with pytest.raises(ValueError):
            CouponService.create_coupon(
                code="PASTEXP",
                discount_type="percent",
                value=Decimal("10.00"),
                expires_at=datetime.utcnow() - timedelta(days=1),  # Past
                db=db
            )


class TestUpdateCoupon:
    """Test coupon updates"""

    def test_update_description(self, db, sample_coupons):
        """Test updating coupon description"""
        coupon = CouponService.update_coupon(
            code="PERCENT10",
            description="Updated description",
            db=db
        )

        assert coupon.description == "Updated description"

    def test_update_expiration(self, db, sample_coupons):
        """Test updating coupon expiration"""
        new_expiry = datetime.utcnow() + timedelta(days=60)
        coupon = CouponService.update_coupon(
            code="PERCENT10",
            expires_at=new_expiry,
            db=db
        )

        assert coupon.expires_at == new_expiry

    def test_update_max_uses(self, db, sample_coupons):
        """Test updating max uses"""
        coupon = CouponService.update_coupon(
            code="PERCENT10",
            max_uses=200,
            db=db
        )

        assert coupon.max_uses == 200

    def test_update_nonexistent_coupon(self, db):
        """Test updating non-existent coupon fails"""
        with pytest.raises(ValueError):
            CouponService.update_coupon(
                code="NOTEXIST",
                description="New desc",
                db=db
            )


class TestDeleteCoupon:
    """Test coupon deletion"""

    def test_delete_coupon(self, db, sample_coupons):
        """Test deleting a coupon"""
        result = CouponService.delete_coupon("PERCENT10", db)
        assert result is True

        # Verify deletion
        coupon = db.query(Coupon).filter(Coupon.code == "PERCENT10").first()
        assert coupon is None

    def test_delete_nonexistent_coupon(self, db):
        """Test deleting non-existent coupon fails"""
        with pytest.raises(ValueError):
            CouponService.delete_coupon("NOTEXIST", db)


# ===================== Remaining Uses Tests =====================

class TestRemainingUses:
    """Test remaining uses calculation"""

    def test_unlimited_uses(self, db, sample_coupons):
        """Test unlimited coupon shows -1 remaining"""
        coupon = sample_coupons["active_percent"]  # max_uses=None
        assert coupon.get_remaining_uses() == -1

    def test_limited_uses_remaining(self, db, sample_coupons):
        """Test limited coupon with remaining uses"""
        coupon = sample_coupons["active_fixed"]  # max_uses=100, used_count=50
        assert coupon.get_remaining_uses() == 50

    def test_no_uses_remaining(self, db, sample_coupons):
        """Test coupon with no remaining uses"""
        coupon = sample_coupons["limit_reached"]  # max_uses=10, used_count=10
        assert coupon.get_remaining_uses() == 0


# ===================== Active Promotions Tests =====================

class TestGetActivePromotions:
    """Test fetching active promotions"""

    def test_get_active_promotions(self, db, sample_coupons):
        """Test getting active promotions excludes expired"""
        coupons, total = CouponService.get_active_promotions(db)

        codes = [c.code for c in coupons]
        assert "PERCENT10" in codes
        assert "FIXED5" in codes
        assert "LIMITREACHED" in codes
        assert "EXPIRED" not in codes
        assert total == 3

    def test_get_active_promotions_pagination(self, db, sample_coupons):
        """Test pagination of active promotions"""
        coupons, total = CouponService.get_active_promotions(db, skip=0, limit=2)

        assert len(coupons) == 2
        assert total == 3

    def test_get_active_promotions_empty(self, db):
        """Test getting active promotions when none exist"""
        coupons, total = CouponService.get_active_promotions(db)

        assert len(coupons) == 0
        assert total == 0

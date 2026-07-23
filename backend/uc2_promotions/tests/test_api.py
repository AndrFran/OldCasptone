# UC2: Coupon API Endpoint Tests
# Tests for FastAPI routes and HTTP responses

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from fastapi import FastAPI
from shared.models import Base, Coupon
from shared.db import get_db
from ..api.coupons import router


# ===================== Test Setup =====================

@pytest.fixture
def test_db():
    """Create in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def app(test_db):
    """Create FastAPI test app"""
    app = FastAPI()
    app.include_router(router)

    # Override get_db dependency
    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def sample_coupons(test_db):
    """Create sample coupons for testing"""
    coupon1 = Coupon(
        code="SUMMER10",
        description="Summer Sale: 10% off",
        discount_type="percent",
        value=Decimal("10.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=None,
        used_count=0
    )

    coupon2 = Coupon(
        code="WELCOME20",
        description="Welcome discount: 20% off",
        discount_type="percent",
        value=Decimal("20.00"),
        expires_at=datetime.utcnow() + timedelta(days=30),
        max_uses=100,
        used_count=0
    )

    coupon3 = Coupon(
        code="EXPIRED",
        description="Expired coupon",
        discount_type="percent",
        value=Decimal("15.00"),
        expires_at=datetime.utcnow() - timedelta(days=1),
        max_uses=None,
        used_count=0
    )

    test_db.add_all([coupon1, coupon2, coupon3])
    test_db.commit()

    return {"summer": coupon1, "welcome": coupon2, "expired": coupon3}


# ===================== Coupon Validation Tests =====================

class TestValidateCoupon:
    """Test coupon validation endpoint"""

    def test_validate_valid_coupon(self, client, sample_coupons):
        """Test validating a valid coupon"""
        response = client.post(
            "/coupons/validate",
            json={"code": "SUMMER10"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "SUMMER10"
        assert data["valid"] is True
        assert data["discount_type"] == "percent"
        assert data["value"] == 10.0

    def test_validate_expired_coupon(self, client, sample_coupons):
        """Test validating an expired coupon"""
        response = client.post(
            "/coupons/validate",
            json={"code": "EXPIRED"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data["detail"]

    def test_validate_nonexistent_coupon(self, client):
        """Test validating non-existent coupon"""
        response = client.post(
            "/coupons/validate",
            json={"code": "NOTEXIST"}
        )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data["detail"]

    def test_validate_empty_code(self, client):
        """Test validation with empty code"""
        response = client.post(
            "/coupons/validate",
            json={"code": ""}
        )

        assert response.status_code == 422  # Validation error


# ===================== Discount Calculation Tests =====================

class TestCalculateDiscount:
    """Test discount calculation endpoint"""

    def test_calculate_discount_valid(self, client, sample_coupons):
        """Test calculating discount for valid coupon"""
        response = client.post(
            "/coupons/calculate-discount",
            json={"code": "SUMMER10"},
            params={"subtotal": 100.00}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["discount_amount"] == 10.0
        assert data["final_total"] == 90.0
        assert data["discount_type"] == "percent"

    def test_calculate_discount_expired(self, client, sample_coupons):
        """Test discount calculation fails for expired coupon"""
        response = client.post(
            "/coupons/calculate-discount",
            json={"code": "EXPIRED"},
            params={"subtotal": 100.00}
        )

        assert response.status_code == 400

    def test_calculate_discount_zero_subtotal(self, client, sample_coupons):
        """Test discount calculation with zero subtotal"""
        response = client.post(
            "/coupons/calculate-discount",
            json={"code": "SUMMER10"},
            params={"subtotal": 0.00}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["discount_amount"] == 0.0
        assert data["final_total"] == 0.0


# ===================== List Promotions Tests =====================

class TestListPromotions:
    """Test list active promotions endpoint"""

    def test_list_active_promotions(self, client, sample_coupons):
        """Test listing active promotions"""
        response = client.get("/coupons/")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2  # SUMMER10, WELCOME20 (not EXPIRED)

        codes = [promo["code"] for promo in data["items"]]
        assert "SUMMER10" in codes
        assert "WELCOME20" in codes
        assert "EXPIRED" not in codes

    def test_list_promotions_pagination(self, client, sample_coupons):
        """Test pagination of promotions"""
        response = client.get("/coupons/?skip=0&limit=1")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 2

    def test_list_promotions_invalid_pagination(self, client):
        """Test invalid pagination parameters"""
        response = client.get("/coupons/?skip=-1&limit=10")

        assert response.status_code == 422

    def test_list_promotions_empty(self, client):
        """Test listing when no promotions exist"""
        response = client.get("/coupons/")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0


# ===================== Create Coupon Tests =====================

class TestCreateCoupon:
    """Test create coupon endpoint (ops manager)"""

    def test_create_valid_coupon(self, client):
        """Test creating a valid coupon"""
        expires = datetime.utcnow() + timedelta(days=30)

        response = client.post(
            "/coupons/manage/create",
            json={
                "code": "NEWCODE",
                "discount_type": "percent",
                "value": 15.0,
                "expires_at": expires.isoformat(),
                "description": "New test coupon"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "NEWCODE"
        assert data["discount_type"] == "percent"
        assert data["value"] == 15.0

    def test_create_fixed_discount_coupon(self, client):
        """Test creating fixed discount coupon"""
        expires = datetime.utcnow() + timedelta(days=30)

        response = client.post(
            "/coupons/manage/create",
            json={
                "code": "FIXED10",
                "discount_type": "fixed",
                "value": 10.0,
                "expires_at": expires.isoformat(),
                "max_uses": 50
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["discount_type"] == "fixed"

    def test_create_duplicate_code(self, client, sample_coupons):
        """Test creating coupon with duplicate code"""
        expires = datetime.utcnow() + timedelta(days=30)

        response = client.post(
            "/coupons/manage/create",
            json={
                "code": "SUMMER10",  # Already exists
                "discount_type": "percent",
                "value": 10.0,
                "expires_at": expires.isoformat()
            }
        )

        assert response.status_code == 400

    def test_create_invalid_discount_type(self, client):
        """Test creating coupon with invalid discount type"""
        expires = datetime.utcnow() + timedelta(days=30)

        response = client.post(
            "/coupons/manage/create",
            json={
                "code": "INVALID",
                "discount_type": "invalid",
                "value": 10.0,
                "expires_at": expires.isoformat()
            }
        )

        assert response.status_code == 422


# ===================== Get Coupon Tests =====================

class TestGetCoupon:
    """Test get coupon endpoint (ops manager)"""

    def test_get_existing_coupon(self, client, sample_coupons):
        """Test getting an existing coupon"""
        response = client.get("/coupons/manage/SUMMER10")

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "SUMMER10"
        assert data["used_count"] == 0

    def test_get_nonexistent_coupon(self, client):
        """Test getting non-existent coupon"""
        response = client.get("/coupons/manage/NOTEXIST")

        assert response.status_code == 404


# ===================== Update Coupon Tests =====================

class TestUpdateCoupon:
    """Test update coupon endpoint (ops manager)"""

    def test_update_description(self, client, sample_coupons):
        """Test updating coupon description"""
        response = client.patch(
            "/coupons/manage/SUMMER10",
            json={"description": "Updated description"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"

    def test_update_max_uses(self, client, sample_coupons):
        """Test updating max uses"""
        response = client.patch(
            "/coupons/manage/SUMMER10",
            json={"max_uses": 500}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["max_uses"] == 500

    def test_update_nonexistent_coupon(self, client):
        """Test updating non-existent coupon"""
        response = client.patch(
            "/coupons/manage/NOTEXIST",
            json={"description": "Updated"}
        )

        assert response.status_code == 404


# ===================== Delete Coupon Tests =====================

class TestDeleteCoupon:
    """Test delete coupon endpoint (ops manager)"""

    def test_delete_coupon(self, client, sample_coupons):
        """Test deleting a coupon"""
        response = client.delete("/coupons/manage/SUMMER10")

        assert response.status_code == 204

        # Verify deletion
        get_response = client.get("/coupons/manage/SUMMER10")
        assert get_response.status_code == 404

    def test_delete_nonexistent_coupon(self, client):
        """Test deleting non-existent coupon"""
        response = client.delete("/coupons/manage/NOTEXIST")

        assert response.status_code == 404


# ===================== List All Coupons Tests =====================

class TestListAllCoupons:
    """Test list all coupons endpoint (ops manager, includes expired)"""

    def test_list_all_coupons(self, client, sample_coupons):
        """Test listing all coupons including expired"""
        response = client.get("/coupons/manage")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3  # All including expired

        codes = [coupon["code"] for coupon in data["items"]]
        assert "SUMMER10" in codes
        assert "WELCOME20" in codes
        assert "EXPIRED" in codes

    def test_list_all_coupons_pagination(self, client, sample_coupons):
        """Test pagination of all coupons"""
        response = client.get("/coupons/manage?skip=0&limit=1")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 3

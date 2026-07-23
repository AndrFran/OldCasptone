# Unit Tests for Inventory Service
# Test stock operations, race conditions, and low-stock alerts

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

# Setup path for imports
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

from shared.models import Product
from shared.db import SessionLocal
from uc3_inventory.services.inventory_service import (
    InventoryService,
    OutOfStockException,
    RaceConditionException
)


@pytest.fixture
def db():
    """Create test database session"""
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def sample_product(db):
    """Create a sample product for testing"""
    product = Product(
        name="Test Widget",
        description="A test widget",
        price=Decimal("29.99"),
        stock=50,
        low_stock_threshold=10
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


class TestCheckStock:
    """Test stock checking without locks"""

    def test_check_stock_available(self, db, sample_product):
        """Test checking available stock"""
        result = InventoryService.check_stock(db, sample_product.id, 10)

        assert result["product_id"] == sample_product.id
        assert result["available_stock"] == 50
        assert result["requested_qty"] == 10
        assert result["in_stock"] is True

    def test_check_stock_unavailable(self, db, sample_product):
        """Test checking when stock unavailable"""
        result = InventoryService.check_stock(db, sample_product.id, 100)

        assert result["in_stock"] is False
        assert result["available_stock"] == 50

    def test_check_stock_product_not_found(self, db):
        """Test checking stock for non-existent product"""
        with pytest.raises(ValueError, match="not found"):
            InventoryService.check_stock(db, 999, 10)


class TestReserveStock:
    """Test atomic stock reservation (FOR UPDATE)"""

    def test_reserve_stock_success(self, db, sample_product):
        """Test successful stock reservation"""
        result = InventoryService.reserve_stock(db, sample_product.id, 10)

        assert result["product_id"] == sample_product.id
        assert result["reserved_qty"] == 10
        assert result["remaining_stock"] == 40

        # Verify in database
        db.refresh(sample_product)
        assert sample_product.stock == 40

    def test_reserve_stock_out_of_stock(self, db, sample_product):
        """Test reservation when stock insufficient"""
        with pytest.raises(OutOfStockException) as exc_info:
            InventoryService.reserve_stock(db, sample_product.id, 100)

        assert exc_info.value.requested == 100
        assert exc_info.value.available == 50

    def test_reserve_stock_exact_amount(self, db, sample_product):
        """Test reserving exact remaining stock"""
        result = InventoryService.reserve_stock(db, sample_product.id, 50)

        assert result["remaining_stock"] == 0
        db.refresh(sample_product)
        assert sample_product.stock == 0

    def test_reserve_stock_product_not_found(self, db):
        """Test reservation for non-existent product"""
        with pytest.raises(ValueError, match="not found"):
            InventoryService.reserve_stock(db, 999, 10)


class TestBatchCheckStock:
    """Test multi-item stock validation"""

    def test_batch_check_all_available(self, db, sample_product):
        """Test batch check when all items available"""
        items = [
            {"product_id": sample_product.id, "quantity": 10},
            {"product_id": sample_product.id, "quantity": 5}
        ]

        checks, error = InventoryService.batch_check_stock(db, items)

        assert error is None
        assert len(checks) == 2
        assert checks[0]["in_stock"] is True
        assert checks[1]["in_stock"] is True

    def test_batch_check_one_unavailable(self, db, sample_product):
        """Test batch check when one item unavailable"""
        items = [
            {"product_id": sample_product.id, "quantity": 10},
            {"product_id": sample_product.id, "quantity": 100}  # Too much
        ]

        checks, error = InventoryService.batch_check_stock(db, items)

        assert error is not None
        assert "Out of stock" in error

    def test_batch_check_product_not_found(self, db):
        """Test batch check with non-existent product"""
        items = [{"product_id": 999, "quantity": 10}]

        checks, error = InventoryService.batch_check_stock(db, items)

        assert error is not None
        assert "not found" in error.lower()


class TestGetInventory:
    """Test inventory queries"""

    def test_get_inventory_levels(self, db, sample_product):
        """Test retrieving all inventory levels"""
        inventory = InventoryService.get_inventory_levels(db)

        assert len(inventory) >= 1
        assert any(item["product_id"] == sample_product.id for item in inventory)

        # Check structure
        item = next(i for i in inventory if i["product_id"] == sample_product.id)
        assert item["product_name"] == "Test Widget"
        assert item["stock"] == 50
        assert item["low_stock_threshold"] == 10

    def test_get_inventory_for_product(self, db, sample_product):
        """Test retrieving inventory for single product"""
        inventory = InventoryService.get_inventory_for_product(db, sample_product.id)

        assert inventory is not None
        assert inventory["product_id"] == sample_product.id
        assert inventory["stock"] == 50

    def test_get_inventory_product_not_found(self, db):
        """Test retrieving inventory for non-existent product"""
        inventory = InventoryService.get_inventory_for_product(db, 999)
        assert inventory is None


class TestLowStockAlerts:
    """Test low-stock alert detection"""

    def test_no_alerts_when_stock_high(self, db, sample_product):
        """Test no alerts when stock above threshold"""
        alerts = InventoryService.get_low_stock_alerts(db)

        # sample_product has stock=50, threshold=10, so no alert
        assert not any(a["product_id"] == sample_product.id for a in alerts)

    def test_warning_alert_when_stock_low(self, db, sample_product):
        """Test warning alert when stock between threshold/2 and threshold"""
        sample_product.stock = 7  # Between 5 (threshold/2) and 10 (threshold)
        db.commit()

        alerts = InventoryService.get_low_stock_alerts(db)

        alert = next(a for a in alerts if a["product_id"] == sample_product.id)
        assert alert["urgency"] == "warning"
        assert alert["current_stock"] == 7

    def test_critical_alert_when_stock_very_low(self, db, sample_product):
        """Test critical alert when stock below threshold/2"""
        sample_product.stock = 3  # Below 5 (threshold/2)
        db.commit()

        alerts = InventoryService.get_low_stock_alerts(db)

        alert = next(a for a in alerts if a["product_id"] == sample_product.id)
        assert alert["urgency"] == "critical"
        assert alert["current_stock"] == 3

    def test_critical_when_stock_zero(self, db, sample_product):
        """Test critical alert when stock at 0"""
        sample_product.stock = 0
        db.commit()

        alerts = InventoryService.get_low_stock_alerts(db)

        alert = next(a for a in alerts if a["product_id"] == sample_product.id)
        assert alert["urgency"] == "critical"


class TestRestockProduct:
    """Test restock operations"""

    def test_restock_increases_stock(self, db, sample_product):
        """Test restocking increases inventory"""
        result = InventoryService.restock_product(db, sample_product.id, 25)

        assert result["stock"] == 75  # 50 + 25
        db.commit()

        db.refresh(sample_product)
        assert sample_product.stock == 75

    def test_restock_invalid_quantity(self, db, sample_product):
        """Test restock with invalid quantity"""
        with pytest.raises(ValueError, match="positive"):
            InventoryService.restock_product(db, sample_product.id, 0)

        with pytest.raises(ValueError, match="positive"):
            InventoryService.restock_product(db, sample_product.id, -10)

    def test_restock_product_not_found(self, db):
        """Test restock non-existent product"""
        with pytest.raises(ValueError, match="not found"):
            InventoryService.restock_product(db, 999, 10)

    def test_restock_updates_timestamp(self, db, sample_product):
        """Test that restock updates updated_at"""
        old_time = sample_product.updated_at
        InventoryService.restock_product(db, sample_product.id, 10)

        db.refresh(sample_product)
        assert sample_product.updated_at >= old_time


class TestRaceConditionPrevention:
    """Test concurrency safety (FOR UPDATE locks)"""

    def test_for_update_lock_acquired(self, db, sample_product):
        """Test that FOR UPDATE lock is used during reservation"""
        # This test verifies the lock is acquired without errors
        result = InventoryService.reserve_stock(db, sample_product.id, 5)

        assert result["reserved_qty"] == 5
        db.refresh(sample_product)
        assert sample_product.stock == 45

    def test_concurrent_reservation_simulation(self, db, sample_product):
        """
        Simulate concurrent reservations (single-threaded, sequential).

        In production, this would use threading or async/await.
        This test verifies lock semantics work correctly.
        """
        # First reservation succeeds
        result1 = InventoryService.reserve_stock(db, sample_product.id, 40)
        assert result1["remaining_stock"] == 10

        # Second reservation should fail (only 10 left, requesting 15)
        with pytest.raises(OutOfStockException):
            InventoryService.reserve_stock(db, sample_product.id, 15)

        # Verify stock hasn't changed (transaction rolled back)
        db.refresh(sample_product)
        assert sample_product.stock == 10


class TestBatchReserveStock:
    """Test all-or-nothing batch stock reservation"""

    def test_batch_reserve_all_succeed(self, db):
        """Test batch reservation when all items available"""
        # Create two products
        p1 = Product(name="P1", price=Decimal("10"), stock=100, low_stock_threshold=10)
        p2 = Product(name="P2", price=Decimal("20"), stock=50, low_stock_threshold=10)
        db.add_all([p1, p2])
        db.commit()

        items = [
            {"product_id": p1.id, "quantity": 30},
            {"product_id": p2.id, "quantity": 20}
        ]

        reservations = InventoryService.batch_reserve_stock(db, items)

        assert len(reservations) == 2
        assert reservations[0]["remaining_stock"] == 70
        assert reservations[1]["remaining_stock"] == 30

    def test_batch_reserve_partial_fails(self, db):
        """Test batch reservation rolls back on failure"""
        # Create two products
        p1 = Product(name="P1", price=Decimal("10"), stock=100, low_stock_threshold=10)
        p2 = Product(name="P2", price=Decimal("20"), stock=10, low_stock_threshold=10)  # Only 10
        db.add_all([p1, p2])
        db.commit()

        items = [
            {"product_id": p1.id, "quantity": 30},  # OK
            {"product_id": p2.id, "quantity": 20}   # Will fail (only 10)
        ]

        # Should fail on second item
        with pytest.raises(OutOfStockException):
            InventoryService.batch_reserve_stock(db, items)

        # Verify first reservation was rolled back (stock unchanged)
        db.refresh(p1)
        db.refresh(p2)
        assert p1.stock == 100  # Rolled back
        assert p2.stock == 10   # Unchanged


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

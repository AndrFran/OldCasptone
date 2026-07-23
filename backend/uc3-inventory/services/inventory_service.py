# UC3 Inventory Service
# Core business logic for inventory management with atomic operations
# Handles stock checks, reservations, and restocking with concurrency safety

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from typing import Optional, List, Dict, Tuple
from decimal import Decimal
from datetime import datetime
import logging

# Import shared models
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from shared.models import Product

logger = logging.getLogger(__name__)


class OutOfStockException(Exception):
    """Raised when stock is insufficient"""
    def __init__(self, product_id: int, requested: int, available: int):
        self.product_id = product_id
        self.requested = requested
        self.available = available
        super().__init__(
            f"Product {product_id} has only {available} units, requested {requested}"
        )


class RaceConditionException(Exception):
    """Raised when stock becomes unavailable during transaction"""
    def __init__(self, message: str):
        super().__init__(message)


class InventoryService:
    """
    Inventory management service with atomic operations.

    Key patterns:
    1. Check stock with FOR UPDATE lock to prevent race conditions
    2. Atomic decrement via single UPDATE statement (stock >= 0 guaranteed by DB)
    3. SERIALIZABLE isolation prevents concurrent stock conflicts
    """

    @staticmethod
    def check_stock(
        db: Session,
        product_id: int,
        requested_qty: int
    ) -> Dict:
        """
        Check if sufficient stock exists (without locking).

        Returns:
            Dict with: product_id, available_stock, requested_qty, in_stock (bool)

        Use case: Frontend checks before showing "Add to Cart" button
        """
        product = db.query(Product).filter(
            Product.id == product_id
        ).first()

        if not product:
            raise ValueError(f"Product {product_id} not found")

        in_stock = product.stock >= requested_qty

        logger.info(
            f"Stock check: Product {product_id}, requested {requested_qty}, "
            f"available {product.stock}, in_stock={in_stock}"
        )

        return {
            "product_id": product_id,
            "available_stock": product.stock,
            "requested_qty": requested_qty,
            "in_stock": in_stock
        }

    @staticmethod
    def reserve_stock(
        db: Session,
        product_id: int,
        quantity: int
    ) -> Dict:
        """
        Atomically reserve (decrement) stock during order placement.

        CRITICAL: Uses FOR UPDATE lock to prevent overselling in concurrent scenarios.

        Algorithm:
        1. BEGIN TRANSACTION (SERIALIZABLE isolation)
        2. SELECT product FOR UPDATE (exclusive lock acquired)
        3. Check if stock >= quantity
        4. If YES: UPDATE stock = stock - quantity, COMMIT
        5. If NO: ROLLBACK with OutOfStockException

        Args:
            db: Database session (must have SERIALIZABLE isolation)
            product_id: Product to decrement
            quantity: Quantity to reserve

        Returns:
            Dict with updated stock level

        Raises:
            OutOfStockException: if stock unavailable
            RaceConditionException: if conflict during transaction
        """
        try:
            # Step 1: Lock product row (FOR UPDATE prevents concurrent modifications)
            product = db.query(Product).filter(
                Product.id == product_id
            ).with_for_update().first()  # FOR UPDATE lock

            if not product:
                raise ValueError(f"Product {product_id} not found")

            # Step 2: Check stock while locked
            if product.stock < quantity:
                logger.warning(
                    f"Stock unavailable: Product {product_id}, "
                    f"requested {quantity}, available {product.stock}"
                )
                raise OutOfStockException(product_id, quantity, product.stock)

            # Step 3: Atomic decrement (single UPDATE statement)
            product.stock -= quantity
            product.updated_at = datetime.utcnow()

            db.flush()  # Flush but don't commit yet (caller commits)

            logger.info(
                f"Stock reserved: Product {product_id}, qty {quantity}, "
                f"new stock {product.stock}"
            )

            return {
                "product_id": product_id,
                "reserved_qty": quantity,
                "remaining_stock": product.stock,
                "updated_at": product.updated_at.isoformat()
            }

        except OutOfStockException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error reserving stock: {str(e)}")
            raise RaceConditionException(f"Race condition during stock reserve: {str(e)}")

    @staticmethod
    def batch_check_stock(
        db: Session,
        items: List[Dict]
    ) -> Tuple[List[Dict], Optional[str]]:
        """
        Check stock for multiple items before order placement.
        All-or-nothing validation: all items must be in stock.

        Args:
            db: Database session
            items: List of {product_id, quantity} dicts

        Returns:
            Tuple of (checks, error_message)
            - checks: List of check results
            - error_message: First error encountered, or None if all OK
        """
        checks = []

        for item in items:
            product_id = item["product_id"]
            qty = item["quantity"]

            try:
                check = InventoryService.check_stock(db, product_id, qty)
                checks.append(check)

                if not check["in_stock"]:
                    return checks, (
                        f"Out of stock: Product {product_id} has only "
                        f"{check['available_stock']} units, requested {qty}"
                    )
            except ValueError as e:
                return checks, str(e)

        return checks, None

    @staticmethod
    def batch_reserve_stock(
        db: Session,
        items: List[Dict]
    ) -> List[Dict]:
        """
        Atomically reserve stock for multiple items (all-or-nothing).

        CRITICAL: Must be called within a single transaction.
        If ANY item fails, entire transaction rolls back.

        Args:
            db: Database session (in transaction)
            items: List of {product_id, quantity} dicts

        Returns:
            List of reservations

        Raises:
            OutOfStockException: if any item unavailable
            RaceConditionException: if conflict
        """
        reservations = []

        try:
            for item in items:
                reservation = InventoryService.reserve_stock(
                    db,
                    item["product_id"],
                    item["quantity"]
                )
                reservations.append(reservation)

            logger.info(
                f"Batch stock reserved: {len(reservations)} items, "
                f"total quantity {sum(r['reserved_qty'] for r in reservations)}"
            )
            return reservations

        except (OutOfStockException, RaceConditionException):
            db.rollback()
            raise

    @staticmethod
    def get_inventory_levels(db: Session) -> List[Dict]:
        """
        Get current stock levels for all products.

        Returns list of inventory status objects with:
        - product_id, product_name, stock, price, low_stock_threshold, updated_at
        """
        products = db.query(Product).order_by(Product.id).all()

        inventory = []
        for product in products:
            inventory.append({
                "product_id": product.id,
                "product_name": product.name,
                "stock": product.stock,
                "low_stock_threshold": product.low_stock_threshold,
                "price": float(product.price) if product.price else 0,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None
            })

        logger.info(f"Retrieved inventory levels for {len(inventory)} products")
        return inventory

    @staticmethod
    def get_inventory_for_product(db: Session, product_id: int) -> Optional[Dict]:
        """
        Get inventory status for a single product.

        Returns: Dict with inventory details or None if product not found
        """
        product = db.query(Product).filter(Product.id == product_id).first()

        if not product:
            return None

        return {
            "product_id": product.id,
            "product_name": product.name,
            "stock": product.stock,
            "low_stock_threshold": product.low_stock_threshold,
            "price": float(product.price) if product.price else 0,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None
        }

    @staticmethod
    def get_low_stock_alerts(db: Session) -> List[Dict]:
        """
        Get products below low_stock_threshold.

        Returns list of low-stock alerts sorted by urgency:
        - critical: stock < threshold/2 (or stock = 0)
        - warning: stock < threshold

        Example:
            Product with stock=3, threshold=10 → urgency="critical" (3 < 5)
            Product with stock=7, threshold=10 → urgency="warning" (7 < 10)
        """
        # Query products where stock < low_stock_threshold
        low_stock_products = db.query(Product).filter(
            Product.stock < Product.low_stock_threshold
        ).order_by(Product.stock.asc()).all()  # Sort by urgency (lowest first)

        alerts = []
        for product in low_stock_products:
            # Classify urgency
            half_threshold = product.low_stock_threshold / 2
            urgency = "critical" if product.stock <= half_threshold else "warning"

            alerts.append({
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": product.stock,
                "low_stock_threshold": product.low_stock_threshold,
                "urgency": urgency,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None
            })

        logger.info(f"Retrieved {len(alerts)} low-stock alerts")
        return alerts

    @staticmethod
    def restock_product(
        db: Session,
        product_id: int,
        quantity: int
    ) -> Dict:
        """
        Add inventory to a product (restock operation).

        Args:
            db: Database session
            product_id: Product to restock
            quantity: Quantity to add (must be > 0)

        Returns:
            Updated inventory dict

        Raises:
            ValueError: if product not found or quantity invalid
        """
        if quantity <= 0:
            raise ValueError("Restock quantity must be positive")

        product = db.query(Product).filter(Product.id == product_id).first()

        if not product:
            raise ValueError(f"Product {product_id} not found")

        # Atomic increment
        product.stock += quantity
        product.updated_at = datetime.utcnow()
        db.flush()  # Flush but don't commit yet (caller commits)

        logger.info(
            f"Product restocked: Product {product_id}, added {quantity}, "
            f"new stock {product.stock}"
        )

        return {
            "product_id": product.id,
            "product_name": product.name,
            "stock": product.stock,
            "low_stock_threshold": product.low_stock_threshold,
            "price": float(product.price) if product.price else 0,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None
        }

    @staticmethod
    def get_inventory_by_ids(
        db: Session,
        product_ids: List[int]
    ) -> Dict[int, Dict]:
        """
        Fetch inventory for multiple products in a single query.

        Returns: Dict mapping product_id to inventory dict
        """
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()

        inventory_map = {}
        for product in products:
            inventory_map[product.id] = {
                "product_id": product.id,
                "product_name": product.name,
                "stock": product.stock,
                "low_stock_threshold": product.low_stock_threshold,
                "price": float(product.price) if product.price else 0
            }

        return inventory_map

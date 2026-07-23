# UC3 Inventory Service
# Core business logic for inventory management with atomic operations
# Handles stock checks, reservations, and restocking with concurrency safety

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, case
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

    @staticmethod
    def get_stock_status(stock: int, threshold: int) -> str:
        """
        Determine urgency status based on stock level and threshold.

        Returns:
            'critical' if stock <= threshold/2
            'warning' if stock < threshold
            'ok' if stock >= threshold
        """
        if stock <= threshold / 2:
            return "critical"
        elif stock < threshold:
            return "warning"
        else:
            return "ok"

    @staticmethod
    def get_inventory_filtered(
        db: Session,
        search: Optional[str] = None,
        brands: Optional[List[str]] = None,
        teams: Optional[List[str]] = None,
        colors: Optional[List[str]] = None,
        silhouettes: Optional[List[str]] = None,
        status_filter: Optional[str] = None,
        sort_by: str = "status_urgent",
        page: int = 1,
        per_page: int = 50
    ) -> Tuple[List[Dict], int]:
        """
        Fetch inventory with filtering, search, sorting, and pagination.

        Args:
            db: Database session
            search: Full-text search term (searches name, brand, team, color, silhouette)
            brands: List of brands to filter by (OR logic)
            teams: List of teams to filter by (OR logic)
            colors: List of colors to filter by (OR logic)
            silhouettes: List of silhouettes to filter by (OR logic)
            status_filter: Filter by urgency ('critical', 'warning', 'ok')
            sort_by: Sort column/direction
            page: Page number (1-indexed)
            per_page: Items per page

        Returns:
            Tuple of (products_list, total_count)
        """
        query = db.query(Product)

        # Text search (multi-field)
        if search:
            search_term = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Product.name).like(search_term),
                    func.lower(Product.brand).like(search_term),
                    func.lower(Product.team).like(search_term),
                    func.lower(Product.color).like(search_term),
                    func.lower(Product.silhouette).like(search_term)
                )
            )

        # Categorical filters (OR within category, AND between categories)
        if brands:
            query = query.filter(Product.brand.in_(brands))
        if teams:
            query = query.filter(Product.team.in_(teams))
        if colors:
            query = query.filter(Product.color.in_(colors))
        if silhouettes:
            query = query.filter(Product.silhouette.in_(silhouettes))

        # Status filter
        if status_filter == "critical":
            query = query.filter(Product.stock <= Product.low_stock_threshold / 2)
        elif status_filter == "warning":
            query = query.filter(
                and_(
                    Product.stock > Product.low_stock_threshold / 2,
                    Product.stock < Product.low_stock_threshold
                )
            )
        elif status_filter == "ok":
            query = query.filter(Product.stock >= Product.low_stock_threshold)

        # Get total count before pagination
        total = query.count()

        # Sorting
        if sort_by == "stock_asc":
            query = query.order_by(Product.stock.asc())
        elif sort_by == "stock_desc":
            query = query.order_by(Product.stock.desc())
        elif sort_by == "price_asc":
            query = query.order_by(Product.price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Product.price.desc())
        elif sort_by == "name_asc":
            query = query.order_by(Product.name.asc())
        elif sort_by == "name_desc":
            query = query.order_by(Product.name.desc())
        elif sort_by == "updated_at_desc":
            query = query.order_by(Product.updated_at.desc())
        else:  # status_urgent (default)
            # Sort by urgency (critical first), then by stock level
            urgency_case = case(
                (Product.stock <= Product.low_stock_threshold / 2, 0),  # critical
                (Product.stock < Product.low_stock_threshold, 1),       # warning
                else_=2                                                  # ok
            )
            query = query.order_by(urgency_case.asc(), Product.stock.asc())

        # Pagination
        offset = (page - 1) * per_page
        products = query.offset(offset).limit(per_page).all()

        # Build response dicts with urgency status
        result = []
        for product in products:
            status = InventoryService.get_stock_status(
                product.stock,
                product.low_stock_threshold
            )
            result.append({
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price": float(product.price) if product.price else 0,
                "stock": product.stock,
                "low_stock_threshold": product.low_stock_threshold,
                "image_url": product.image_url,
                "brand": product.brand,
                "team": product.team,
                "color": product.color,
                "silhouette": product.silhouette,
                "sale_price": float(product.sale_price) if product.sale_price else None,
                "urgency": status,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None
            })

        logger.info(
            f"Retrieved filtered inventory: {len(result)} items "
            f"(total: {total}, page: {page}, per_page: {per_page})"
        )
        return result, total

    @staticmethod
    def get_available_filters(db: Session) -> Dict:
        """
        Get available filter options for all categorical fields.

        Returns dict with:
        - brands: List of {name, count}
        - teams: List of {name, count}
        - colors: List of {name, count}
        - silhouettes: List of {name, count}
        - stock_range: {min, max}
        """
        products = db.query(Product).all()

        if not products:
            return {
                "brands": [],
                "teams": [],
                "colors": [],
                "silhouettes": [],
                "stock_range": {"min": 0, "max": 0}
            }

        def get_filter_options(field_name: str) -> List[Dict]:
            """Get distinct values and counts for a field"""
            from collections import Counter
            values = [
                getattr(p, field_name) for p in products
                if getattr(p, field_name)
            ]
            counts = Counter(values)
            return [
                {"name": v, "count": counts[v]}
                for v in sorted(set(values))
            ]

        result = {
            "brands": get_filter_options("brand"),
            "teams": get_filter_options("team"),
            "colors": get_filter_options("color"),
            "silhouettes": get_filter_options("silhouette"),
            "stock_range": {
                "min": min(p.stock for p in products),
                "max": max(p.stock for p in products)
            }
        }

        logger.info("Retrieved available filter options")
        return result

    @staticmethod
    def set_inventory_quantity(
        db: Session,
        product_id: int,
        new_quantity: int,
        operation_type: str = "set"
    ) -> Dict:
        """
        Set product stock to exact quantity (absolute value, not incremental).

        Args:
            db: Database session
            product_id: Product to update
            new_quantity: Target quantity (must be >= 0)
            operation_type: Type of operation for logging ('set', 'restock', 'adjust')

        Returns:
            Dict with before/after stock levels and updated product info

        Raises:
            ValueError: if new_quantity < 0 or product not found
        """
        if new_quantity < 0:
            raise ValueError("Quantity cannot be negative")

        product = db.query(Product).filter(
            Product.id == product_id
        ).with_for_update().first()

        if not product:
            raise ValueError(f"Product {product_id} not found")

        old_quantity = product.stock
        delta = new_quantity - old_quantity
        product.stock = new_quantity
        product.updated_at = datetime.utcnow()

        db.flush()  # Flush but don't commit yet (caller commits)

        status = InventoryService.get_stock_status(
            product.stock,
            product.low_stock_threshold
        )

        logger.info(
            f"Inventory quantity set: Product {product_id}, "
            f"old={old_quantity}, new={new_quantity}, delta={delta}, "
            f"operation_type={operation_type}"
        )

        return {
            "product_id": product.id,
            "product_name": product.name,
            "old_quantity": old_quantity,
            "new_quantity": new_quantity,
            "delta": delta,
            "stock": product.stock,
            "low_stock_threshold": product.low_stock_threshold,
            "urgency": status,
            "updated_at": product.updated_at.isoformat()
        }

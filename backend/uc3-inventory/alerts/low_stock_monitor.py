# Low-Stock Alert Monitor
# Real-time low-stock detection and notification logic
# Can be used by frontend for polling or by background tasks for WebSocket

from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
import logging

# Import shared models
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from shared.models import Product

logger = logging.getLogger(__name__)


class UrgencyLevel:
    """Low-stock urgency classification"""
    CRITICAL = "critical"  # stock <= threshold / 2
    WARNING = "warning"    # stock < threshold
    NORMAL = "normal"      # stock >= threshold


class LowStockMonitor:
    """
    Real-time low-stock monitoring and alert generation.

    Alert Logic:
    - CRITICAL: stock <= (threshold / 2) → immediate restock required
    - WARNING: stock < threshold → monitor closely, plan reorder
    - NORMAL: stock >= threshold → all good

    Integration Points:
    1. Frontend: Poll GET /inventory/low-stock every 5-10 seconds
    2. Backend Task: Async task queries every minute, sends webhooks
    3. WebSocket: Real-time updates (advanced, not MVP)
    """

    @staticmethod
    def classify_urgency(current_stock: int, threshold: int) -> str:
        """
        Classify alert urgency based on stock level.

        Args:
            current_stock: Current stock quantity
            threshold: Low-stock threshold

        Returns:
            UrgencyLevel (critical, warning, or normal)
        """
        if current_stock <= threshold / 2:
            return UrgencyLevel.CRITICAL
        elif current_stock < threshold:
            return UrgencyLevel.WARNING
        else:
            return UrgencyLevel.NORMAL

    @staticmethod
    def get_critical_alerts(db: Session) -> List[Dict]:
        """
        Get CRITICAL low-stock alerts (stock <= threshold/2).

        These require immediate action.

        Returns: List of alert dicts
        """
        products = db.query(Product).all()
        critical_alerts = []

        for product in products:
            urgency = LowStockMonitor.classify_urgency(
                product.stock,
                product.low_stock_threshold
            )
            if urgency == UrgencyLevel.CRITICAL:
                critical_alerts.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "current_stock": product.stock,
                    "low_stock_threshold": product.low_stock_threshold,
                    "urgency": UrgencyLevel.CRITICAL,
                    "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                    "action_required": True,
                    "suggested_restock": product.low_stock_threshold * 5  # Restock to 5x threshold
                })

        logger.info(f"Found {len(critical_alerts)} critical low-stock alerts")
        return critical_alerts

    @staticmethod
    def get_warning_alerts(db: Session) -> List[Dict]:
        """
        Get WARNING low-stock alerts (stock < threshold but > threshold/2).

        These should be monitored, reorder soon.

        Returns: List of alert dicts
        """
        products = db.query(Product).all()
        warning_alerts = []

        for product in products:
            urgency = LowStockMonitor.classify_urgency(
                product.stock,
                product.low_stock_threshold
            )
            if urgency == UrgencyLevel.WARNING:
                warning_alerts.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "current_stock": product.stock,
                    "low_stock_threshold": product.low_stock_threshold,
                    "urgency": UrgencyLevel.WARNING,
                    "updated_at": product.updated_at.isoformat() if product.updated_at else None,
                    "action_required": False,
                    "suggested_restock": product.low_stock_threshold * 3  # Restock to 3x threshold
                })

        logger.info(f"Found {len(warning_alerts)} warning low-stock alerts")
        return warning_alerts

    @staticmethod
    def get_all_alerts(db: Session) -> Dict[str, List[Dict]]:
        """
        Get all low-stock alerts grouped by urgency.

        Returns:
            Dict with keys: critical, warning, all_alerts
        """
        critical = LowStockMonitor.get_critical_alerts(db)
        warning = LowStockMonitor.get_warning_alerts(db)

        return {
            "critical": critical,
            "warning": warning,
            "all_alerts": critical + warning,
            "total_critical": len(critical),
            "total_warning": len(warning),
            "total_alerts": len(critical) + len(warning)
        }

    @staticmethod
    def should_trigger_webhook(
        db: Session,
        last_webhook_time: Optional[datetime] = None,
        webhook_interval_seconds: int = 300  # 5 minutes
    ) -> bool:
        """
        Determine if a webhook notification should be sent.

        Prevents alert fatigue by limiting webhook frequency.

        Args:
            db: Database session
            last_webhook_time: Timestamp of last webhook sent
            webhook_interval_seconds: Minimum seconds between webhooks

        Returns:
            True if webhook should be sent, False otherwise
        """
        critical_alerts = LowStockMonitor.get_critical_alerts(db)

        if not critical_alerts:
            return False  # No critical alerts, don't send

        if last_webhook_time is None:
            return True  # First webhook, send immediately

        time_since_last = datetime.utcnow() - last_webhook_time
        should_send = time_since_last.total_seconds() >= webhook_interval_seconds

        logger.debug(
            f"Webhook decision: {len(critical_alerts)} critical alerts, "
            f"last sent {time_since_last.total_seconds()}s ago, "
            f"should_send={should_send}"
        )

        return should_send

    @staticmethod
    def get_restock_recommendation(
        current_stock: int,
        threshold: int,
        urgency_factor: int = 5
    ) -> int:
        """
        Calculate recommended restock quantity.

        Strategy: Always restock to threshold * urgency_factor
        - Critical (0.5x): restock to 5x threshold (100 units for threshold=20)
        - Warning (0.8x): restock to 3x threshold (60 units for threshold=20)

        Args:
            current_stock: Current stock level
            threshold: Low-stock threshold
            urgency_factor: Multiplier for target stock level

        Returns:
            Recommended quantity to add
        """
        target_stock = threshold * urgency_factor
        restock_qty = max(0, target_stock - current_stock)

        return restock_qty

    @staticmethod
    def estimate_days_until_stockout(
        current_stock: int,
        daily_sales_rate: Optional[int] = None
    ) -> Optional[int]:
        """
        Estimate days until product runs out of stock.

        Args:
            current_stock: Current stock level
            daily_sales_rate: Average daily sales (optional, if not provided returns None)

        Returns:
            Estimated days until stockout, or None if rate not provided
        """
        if daily_sales_rate is None or daily_sales_rate == 0:
            return None

        days = current_stock / daily_sales_rate
        return int(days)

    @staticmethod
    def format_alert_message(alert: Dict) -> str:
        """
        Format alert dict as human-readable message.

        Example: "CRITICAL: Widget B has only 3 units (threshold: 10)"

        Args:
            alert: Alert dict from get_*_alerts()

        Returns:
            Formatted string message
        """
        urgency = alert["urgency"].upper()
        name = alert["product_name"]
        stock = alert["current_stock"]
        threshold = alert["low_stock_threshold"]

        return f"{urgency}: {name} has only {stock} units (threshold: {threshold})"

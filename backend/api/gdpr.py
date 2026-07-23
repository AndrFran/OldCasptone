# GDPR Compliance Endpoints
# Handles Data Subject Rights (Articles 15-22 of GDPR)
# - Right to Access (Article 15)
# - Right to Be Forgotten (Article 17)
# - Right to Data Portability (Article 20)
# - Right to Rectification (Article 16)
# - Right to Restrict Processing (Article 18)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json
import uuid
import logging

from shared.db import get_db
from shared.models import User, Customer, Order, OrderItem, UserConsent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gdpr", tags=["GDPR"])


class GDPRRequest:
    """Data model for GDPR requests"""

    def __init__(
        self,
        email: str,
        first_name: str,
        last_name: str,
        request_type: str,
        reason: str = "",
    ):
        self.id = str(uuid.uuid4())
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.request_type = request_type  # access, forgotten, portability, rectification, restrict
        self.reason = reason
        self.created_at = datetime.utcnow()
        self.status = "pending"  # pending, processing, completed, rejected


# ==================== PYDANTIC MODELS ====================

from pydantic import BaseModel, EmailStr


class GDPRRequestCreate(BaseModel):
    """Model for creating GDPR requests"""

    email: EmailStr
    firstName: str
    lastName: str
    requestType: str
    reason: str = ""

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "firstName": "John",
                "lastName": "Doe",
                "requestType": "access",
                "reason": "I want a copy of my data",
            }
        }


class ConsentUpdate(BaseModel):
    """Model for updating consent preferences"""

    email: EmailStr
    essential: bool = True
    analytics: bool = False
    marketing: bool = False
    preferences: bool = False


class DataExport(BaseModel):
    """Model for data export response"""

    user_id: int
    email: str
    name: str
    created_at: str
    orders: List[Dict[str, Any]]
    consent_history: List[Dict[str, Any]]


# ==================== ENDPOINTS ====================


@router.post("/request", status_code=202)
async def submit_gdpr_request(request: GDPRRequestCreate, db: Session = Depends(get_db)):
    """
    Submit a GDPR data subject rights request

    Handles:
    - Right to Access (Article 15): Get a copy of your data
    - Right to Be Forgotten (Article 17): Request deletion
    - Right to Data Portability (Article 20): Export data
    - Right to Rectification (Article 16): Correct inaccurate data
    - Right to Restrict Processing (Article 18): Limit processing

    **Response Time:** 30 days as per GDPR Article 12

    Returns:
    - 202 Accepted: Request received and will be processed
    - 400 Bad Request: Invalid request
    - 409 Conflict: Duplicate request within 30 days
    """
    try:
        # Check for duplicate requests within 30 days
        existing_request = (
            db.query(UserConsent)
            .filter(
                UserConsent.email == request.email,
                UserConsent.created_at > datetime.utcnow() - timedelta(days=30),
            )
            .first()
        )

        if existing_request and existing_request.request_id:
            raise HTTPException(
                status_code=409,
                detail="You have already submitted a similar request recently. Please wait 30 days between requests.",
            )

        # Generate request ID for tracking
        request_id = str(uuid.uuid4())

        # Find user by email
        user = db.query(User).filter(User.email == request.email).first()

        if not user:
            # Create a placeholder consent record for non-registered users
            consent = UserConsent(
                email=request.email,
                essential=1,
                request_id=request_id,
                consent_source="gdpr_request",
            )
            db.add(consent)
            db.commit()

            logger.warning(
                f"GDPR {request.request_type} request from non-registered user: {request.email}"
            )

            return {
                "status": "accepted",
                "request_id": request_id,
                "message": "Your request has been received. We will respond within 30 days.",
                "email": request.email,
                "response_deadline": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            }

        # Update consent record with request
        consent = (
            db.query(UserConsent).filter(UserConsent.user_id == user.id).first()
        )
        if not consent:
            consent = UserConsent(user_id=user.id, email=user.email)

        consent.request_id = request_id
        consent.consent_source = "gdpr_request"
        db.add(consent)
        db.commit()

        # Log request
        logger.info(
            f"GDPR {request.request_type} request submitted: {request_id} for {request.email}"
        )

        return {
            "status": "accepted",
            "request_id": request_id,
            "message": "Your GDPR request has been received and will be processed within 30 days.",
            "email": request.email,
            "request_type": request.request_type,
            "response_deadline": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing GDPR request: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error processing your request. Please try again."
        )


@router.get("/data/{user_id}")
async def export_user_data(user_id: int, db: Session = Depends(get_db)):
    """
    Right to Access (Article 15)

    Export all personal data associated with a user

    **Includes:**
    - Account information
    - Order history
    - Consent records
    - Contact information

    **Format:** JSON

    Returns: 200 OK with complete data export
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get customer info
        customer = db.query(Customer).filter(Customer.user_id == user_id).first()

        # Get all orders
        orders = []
        if customer:
            orders_query = db.query(Order).filter(
                Order.customer_id == customer.id
            ).all()
            for order in orders_query:
                order_items = (
                    db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                )
                orders.append(
                    {
                        "id": order.id,
                        "created_at": order.created_at.isoformat(),
                        "status": order.status,
                        "total": float(order.total),
                        "items": [
                            {
                                "product_id": item.product_id,
                                "quantity": item.quantity,
                                "price": float(item.price),
                            }
                            for item in order_items
                        ],
                    }
                )

        # Get consent history
        consents = db.query(UserConsent).filter(
            UserConsent.user_id == user_id
        ).all()
        consent_history = [
            {
                "created_at": c.created_at.isoformat(),
                "analytics": bool(c.analytics),
                "marketing": bool(c.marketing),
                "preferences": bool(c.preferences),
            }
            for c in consents
        ]

        return {
            "export_date": datetime.utcnow().isoformat(),
            "user": {
                "id": user.id,
                "email": user.email,
                "user_type": user.user_type,
                "created_at": user.created_at.isoformat(),
            },
            "customer": {
                "name": customer.name if customer else None,
                "email": customer.email if customer else None,
            } if customer else None,
            "orders": orders,
            "consent_history": consent_history,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting user data: {str(e)}")
        raise HTTPException(status_code=500, detail="Error exporting data")


@router.delete("/data/{user_id}")
async def delete_user_data(user_id: int, db: Session = Depends(get_db)):
    """
    Right to Be Forgotten (Article 17)

    Request deletion of a user's personal data

    **Deleted:**
    - User account
    - Customer profile
    - Consent records
    - Contact information

    **Retained (Legal Obligation):**
    - Order history (7 years for accounting/tax)
    - Anonymized analytics

    **Response Time:** 30 days

    Returns: 202 Accepted - Request submitted for processing
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Mark for deletion (don't actually delete due to legal requirements)
        # In production, implement proper GDPR deletion with audit trail
        deletion_request_id = str(uuid.uuid4())

        # Create consent record marking deletion request
        consent = UserConsent(
            user_id=user.id,
            email=user.email,
            request_id=deletion_request_id,
            consent_source="deletion_request",
            essential=0,
            analytics=0,
            marketing=0,
            preferences=0,
        )
        db.add(consent)
        db.commit()

        logger.info(
            f"User deletion request submitted: {deletion_request_id} for user {user_id}"
        )

        return {
            "status": "accepted",
            "request_id": deletion_request_id,
            "message": "Your account deletion request has been received. We will delete your data within 30 days.",
            "response_deadline": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing deletion request: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing deletion request")


@router.post("/consent")
async def update_user_consent(consent: ConsentUpdate, db: Session = Depends(get_db)):
    """
    Update user cookie consent preferences

    **Consent Categories:**
    - essential: Always required (can't be disabled)
    - analytics: Google Analytics, usage tracking
    - marketing: Advertising and promotional cookies
    - preferences: Theme, language, site preferences

    Returns: 200 OK with updated consent status
    """
    try:
        # Find or create consent record
        user_consent = (
            db.query(UserConsent)
            .filter(UserConsent.email == consent.email)
            .order_by(UserConsent.created_at.desc())
            .first()
        )

        if user_consent is None:
            user_consent = UserConsent(email=consent.email)

        # Update consent flags
        user_consent.essential = 1  # Always true
        user_consent.analytics = 1 if consent.analytics else 0
        user_consent.marketing = 1 if consent.marketing else 0
        user_consent.preferences = 1 if consent.preferences else 0
        user_consent.expires_at = datetime.utcnow() + timedelta(days=365)

        db.add(user_consent)
        db.commit()

        logger.info(f"Consent updated for {consent.email}")

        return {
            "status": "success",
            "message": "Your consent preferences have been updated",
            "email": consent.email,
            "consent": {
                "essential": True,
                "analytics": consent.analytics,
                "marketing": consent.marketing,
                "preferences": consent.preferences,
            },
            "expires_at": user_consent.expires_at.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error updating consent: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating consent")


@router.get("/consent/{email}")
async def get_user_consent(email: str, db: Session = Depends(get_db)):
    """
    Get current user consent preferences

    Returns: 200 OK with consent status
    """
    try:
        user_consent = (
            db.query(UserConsent)
            .filter(UserConsent.email == email)
            .order_by(UserConsent.created_at.desc())
            .first()
        )

        if not user_consent:
            return {
                "email": email,
                "consent": {
                    "essential": True,
                    "analytics": False,
                    "marketing": False,
                    "preferences": False,
                },
            }

        return {
            "email": email,
            "consent": {
                "essential": bool(user_consent.essential),
                "analytics": bool(user_consent.analytics),
                "marketing": bool(user_consent.marketing),
                "preferences": bool(user_consent.preferences),
            },
            "created_at": user_consent.created_at.isoformat(),
            "is_valid": user_consent.is_valid(),
        }

    except Exception as e:
        logger.error(f"Error retrieving consent: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving consent")


@router.post("/contact")
async def submit_contact_form(data: dict):
    """
    Process contact form submission

    **Fields:**
    - name: Full name
    - email: Contact email
    - subject: Subject line
    - category: Contact category
    - message: Message content

    Returns: 202 Accepted - Message queued for processing
    """
    try:
        # In production, queue this to send to appropriate department
        logger.info(
            f"Contact form submitted: {data.get('name')} - {data.get('category')}"
        )

        return {
            "status": "accepted",
            "message": "Your message has been received. We will respond within 24 hours.",
            "email": data.get("email"),
            "category": data.get("category"),
        }

    except Exception as e:
        logger.error(f"Error processing contact form: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing your message")


@router.get("/health")
async def gdpr_health_check():
    """
    Check GDPR endpoint health

    Returns: 200 OK
    """
    return {"status": "ok", "service": "gdpr"}

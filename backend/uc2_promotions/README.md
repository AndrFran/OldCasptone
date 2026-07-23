# UC2: Promotions & Discounts Service

Complete coupon validation and discount calculation service for Vibe Strike e-commerce platform.

## Overview

UC2 (Use Case 2) provides:
- **Coupon Validation**: Check coupon validity (expiry, usage limits)
- **Discount Calculation**: Apply percent or fixed-amount discounts
- **Promotion Management**: CRUD operations for ops managers
- **Active Promotions Listing**: Customer-facing promotion discovery

## Architecture

```
uc2_promotions/
├── api/
│   ├── __init__.py
│   └── coupons.py              # FastAPI routes
├── services/
│   ├── __init__.py
│   └── coupon_service.py        # Business logic
├── schemas.py                   # Pydantic models
├── tests/
│   ├── __init__.py
│   ├── test_coupon_service.py   # Service tests
│   └── test_api.py              # API tests
├── __init__.py
└── README.md
```

## Data Model

### Coupon (ORM Model)

```python
class Coupon(Base):
    __tablename__ = "coupons"
    
    id: int              # Primary key
    code: str            # Unique coupon code (e.g., "SUMMER10")
    description: str     # Human-readable description
    discount_type: str   # "percent" or "fixed"
    value: Decimal       # Discount value
    expires_at: datetime # Expiration timestamp
    max_uses: int?       # Usage limit (NULL = unlimited)
    used_count: int      # Current usage count
    created_at: datetime # Creation timestamp
```

## Service Layer: CouponService

Core business logic for coupon operations.

### Validation

```python
coupon = CouponService.validate_coupon_code(code: str, db: Session) -> Coupon
```

Validates:
- ✓ Coupon exists
- ✓ Not expired (`expires_at > NOW`)
- ✓ Within usage limits (`used_count < max_uses` OR `max_uses IS NULL`)

Raises `CouponValidationError` if any check fails.

**Example:**
```python
try:
    coupon = CouponService.validate_coupon_code("SUMMER10", db)
    # Coupon is valid, apply discount
except CouponValidationError as e:
    # Handle: invalid, expired, or limit exceeded
```

### Discount Calculation

```python
discount_amt, final_total = CouponService.calculate_discount(
    coupon: Coupon,
    subtotal: Decimal,
    min_order_amount: Decimal = Decimal("0.00")
) -> tuple[Decimal, Decimal]
```

Supports two discount types:

**Percentage Discount:**
```
discount_amount = subtotal * (value / 100)
final_total = subtotal - discount_amount
```

Example: Coupon with 10% off on $100 subtotal
- discount_amount = $100 * (10 / 100) = $10.00
- final_total = $100 - $10 = $90.00

**Fixed Amount Discount:**
```
discount_amount = min(value, subtotal)  # Cap at subtotal
final_total = subtotal - discount_amount
```

Example: Coupon with $5 off on $100 subtotal
- discount_amount = $5.00
- final_total = $95.00

Example: Coupon with $5 off on $3 subtotal
- discount_amount = $3.00 (capped)
- final_total = $0.00

**Minimum Order Amount:**
If subtotal < min_order_amount, no discount is applied.

### Coupon Management

#### Create Coupon

```python
coupon = CouponService.create_coupon(
    code: str,
    discount_type: str,  # "percent" or "fixed"
    value: Decimal,
    expires_at: datetime,
    description: str = None,
    max_uses: int = None,
    db: Session
) -> Coupon
```

Validates:
- Code is unique
- discount_type is "percent" or "fixed"
- value > 0
- expires_at is in the future

#### Update Coupon

```python
coupon = CouponService.update_coupon(
    code: str,
    description: str = None,
    expires_at: datetime = None,
    max_uses: int = None,
    db: Session
) -> Coupon
```

#### Delete Coupon

```python
CouponService.delete_coupon(code: str, db: Session) -> bool
```

#### Get Active Promotions

```python
coupons, total = CouponService.get_active_promotions(
    db: Session,
    skip: int = 0,
    limit: int = 100
) -> tuple[list[Coupon], int]
```

Returns only non-expired coupons (expires_at > NOW).

### Usage Tracking

After successful order placement with a coupon:

```python
CouponService.increment_coupon_usage(code: str, db: Session) -> bool
```

Increments `used_count` and validates against `max_uses`.

## API Routes

All routes live under `/coupons` prefix.

### Customer-Facing Endpoints

#### Validate Coupon

```http
POST /coupons/validate
Content-Type: application/json

{"code": "SUMMER10"}
```

**Response (200):**
```json
{
  "code": "SUMMER10",
  "valid": true,
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-12-31T23:59:59",
  "remaining_uses": 50
}
```

**Error (400):**
```json
{
  "detail": {
    "error": "Coupon expired on 2026-07-01",
    "code": "COUPON_EXPIRED"
  }
}
```

Error codes:
- `COUPON_NOT_FOUND`: Code doesn't exist
- `COUPON_EXPIRED`: Past expiration date
- `COUPON_LIMIT_EXCEEDED`: Max uses reached

#### Calculate Discount

```http
POST /coupons/calculate-discount?subtotal=100.00
Content-Type: application/json

{"code": "SUMMER10"}
```

**Response (200):**
```json
{
  "discount_amount": 10.0,
  "final_total": 90.0,
  "discount_type": "percent",
  "value": 10.0
}
```

#### List Active Promotions

```http
GET /coupons/?skip=0&limit=100
```

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "code": "SUMMER10",
      "description": "Summer Sale: 10% off all orders",
      "discount_type": "percent",
      "value": 10.0,
      "expires_at": "2026-12-31T23:59:59",
      "remaining_uses": 50,
      "max_uses": null
    }
  ],
  "total": 1
}
```

### Ops Manager Endpoints (CRUD)

**Note:** In production, add authentication/authorization middleware.

#### Create Coupon

```http
POST /coupons/manage/create
Content-Type: application/json

{
  "code": "NEWYEAR50",
  "description": "New Year: 50% off selected items",
  "discount_type": "percent",
  "value": 50.0,
  "expires_at": "2026-12-31T23:59:59",
  "max_uses": 100
}
```

**Response (201):** Coupon detail

#### Get Coupon

```http
GET /coupons/manage/SUMMER10
```

**Response (200):** Coupon detail with usage stats

#### Update Coupon

```http
PATCH /coupons/manage/SUMMER10
Content-Type: application/json

{
  "description": "Summer Sale Extended",
  "max_uses": 200
}
```

**Response (200):** Updated coupon detail

#### Delete Coupon

```http
DELETE /coupons/manage/SUMMER10
```

**Response (204):** No content

#### List All Coupons

```http
GET /coupons/manage?skip=0&limit=100
```

**Response (200):** All coupons (including expired), with usage stats

## Integration with UC1 (Orders)

When creating an order with a coupon code:

### 1. Customer submits order with coupon code

```json
{
  "customer_id": 1,
  "items": [
    {"product_id": 1, "quantity": 2}
  ],
  "coupon_code": "SUMMER10"
}
```

### 2. UC1 validates coupon via UC2

```python
from uc2_promotions.services import CouponService

coupon = CouponService.validate_coupon_code(coupon_code, db)
discount_amount, final_total = CouponService.calculate_discount(coupon, subtotal)
```

### 3. UC1 saves order with discount

```python
order = Order(
    customer_id=customer_id,
    subtotal=subtotal,
    discount_amount=discount_amount,
    total=final_total,
    coupon_code=coupon_code
)
db.add(order)
db.commit()
```

### 4. UC1 increments coupon usage

```python
CouponService.increment_coupon_usage(coupon_code, db)
```

## Database Schema

```sql
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,  -- 'percent' or 'fixed'
  value DECIMAL(10, 2) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  max_uses INTEGER NULL,  -- NULL = unlimited
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at);
```

### Constraints

- `code` is UNIQUE and case-sensitive
- `discount_type` must be 'percent' or 'fixed' (enforced in application)
- `value` must be positive (enforced in application and DB)
- `expires_at` must be in the future (enforced in application)
- `used_count` must be <= `max_uses` (enforced in application)

## Testing

### Run Service Tests

```bash
pytest backend/uc2_promotions/tests/test_coupon_service.py -v
```

Tests:
- Coupon validation (valid, expired, limit exceeded)
- Discount calculation (percent, fixed, rounding)
- Coupon CRUD operations
- Active promotion listing
- Usage tracking

### Run API Tests

```bash
pytest backend/uc2_promotions/tests/test_api.py -v
```

Tests:
- Endpoint validation
- HTTP status codes
- Request/response schemas
- Error handling
- Pagination

### Test Coverage

```bash
pytest backend/uc2_promotions/tests/ --cov=backend.uc2_promotions --cov-report=html
```

## Integration Checklist

- [ ] Register router in `backend/main.py`:
  ```python
  from uc2_promotions.api import router as uc2_router
  app.include_router(uc2_router, prefix="/api", tags=["UC2-Promotions"])
  ```

- [ ] Sample coupons created in `database/schema.sql` (included)

- [ ] Frontend calls `/api/coupons/validate` before checkout

- [ ] UC1 calls `CouponService` during order creation

- [ ] Authentication/authorization added for `/manage/*` endpoints

- [ ] Database backups configured

## Error Handling

### CouponValidationError

Raised by service layer when coupon validation fails:

```python
try:
    coupon = CouponService.validate_coupon_code(code, db)
except CouponValidationError as e:
    print(e.message)  # "Coupon expired on 2026-07-01"
    print(e.code)     # "COUPON_EXPIRED"
```

Error codes:
- `COUPON_NOT_FOUND`
- `COUPON_EXPIRED`
- `COUPON_LIMIT_EXCEEDED`
- `INVALID_COUPON`

### HTTP Errors

- `400 Bad Request`: Invalid/expired coupon
- `404 Not Found`: Coupon code not found
- `422 Unprocessable Entity`: Validation error (bad request data)
- `500 Internal Server Error`: Server error

## Performance Considerations

1. **Coupon Lookup**: Indexed on `code` for O(1) lookups
2. **Active Promotions**: Indexed on `expires_at` for efficient filtering
3. **Pagination**: Offset/limit for large result sets
4. **Discount Calculation**: In-memory, no DB calls (pure math)

## Optional: Claude AI Integration

For AI-powered coupon suggestions:

```python
# In frontend: After customer views products
coupon = CouponService.suggest_coupon_for_cart(
    cart_items: list[CartItem],
    customer_history: list[Order],
    db: Session
) -> Optional[Coupon]
```

This would use Claude API to analyze cart and suggest relevant coupons.

## Example Usage

### Creating Sample Coupons

```python
from datetime import datetime, timedelta
from decimal import Decimal
from uc2_promotions.services import CouponService

# Summer sale: 10% off all orders (unlimited)
coupon1 = CouponService.create_coupon(
    code="SUMMER10",
    discount_type="percent",
    value=Decimal("10.00"),
    expires_at=datetime.utcnow() + timedelta(days=180),
    description="Summer Sale: 10% off all orders",
    db=db
)

# Welcome discount: 20% off first order (limited to 100 uses)
coupon2 = CouponService.create_coupon(
    code="WELCOME20",
    discount_type="percent",
    value=Decimal("20.00"),
    expires_at=datetime.utcnow() + timedelta(days=90),
    description="Welcome discount: 20% off first order",
    max_uses=100,
    db=db
)

# Fixed discount: $5 off orders over $50
coupon3 = CouponService.create_coupon(
    code="SAVE5",
    discount_type="fixed",
    value=Decimal("5.00"),
    expires_at=datetime.utcnow() + timedelta(days=180),
    description="Save $5 on orders over $50",
    db=db
)
```

### Processing Order with Coupon

```python
# 1. Customer submits order with coupon
coupon_code = "SUMMER10"
items = [{"product_id": 1, "quantity": 2}]

# 2. Calculate order total
subtotal = Decimal("100.00")

# 3. Validate and apply coupon
try:
    coupon = CouponService.validate_coupon_code(coupon_code, db)
    discount_amount, final_total = CouponService.calculate_discount(coupon, subtotal)
    
    # 4. Create order
    order = Order(
        customer_id=1,
        subtotal=subtotal,
        discount_amount=discount_amount,
        total=final_total,
        coupon_code=coupon_code
    )
    db.add(order)
    db.commit()
    
    # 5. Increment coupon usage
    CouponService.increment_coupon_usage(coupon_code, db)
    
    return {"status": "success", "total": float(final_total)}
    
except CouponService.CouponValidationError as e:
    return {"status": "error", "message": e.message}
```

## Monitoring & Logging

All service methods log at INFO and WARNING levels:

```python
import logging

logger = logging.getLogger(__name__)

# Validation
logger.info(f"Coupon validated: {code}")
logger.warning(f"Coupon not found: {code}")

# Discount calculation
logger.info(f"Discount calculated: {code} | Subtotal: {subtotal} | Discount: {discount_amount}")

# Management
logger.info(f"Coupon created: {code}")
logger.info(f"Coupon usage incremented: {code} (now {used_count})")
```

## References

- **API Spec**: `api-contracts/openapi-spec.yaml`
- **Shared Models**: `backend/shared/models.py` (Coupon model)
- **Database Schema**: `database/schema.sql`
- **UC1 Integration**: `backend/uc1_browse_order/` (order creation)

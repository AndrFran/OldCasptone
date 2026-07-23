# UC2 Quick Reference Card

Fast lookup for UC2 Promotions & Coupon Service.

## File Locations

```
backend/uc2_promotions/
├── services/coupon_service.py      Business logic
├── api/coupons.py                  API routes
├── schemas.py                       Data models
├── tests/test_*.py                 Test suite
└── README.md                        Full docs
```

## Service Methods

### Validation
```python
from uc2_promotions.services import CouponService

coupon = CouponService.validate_coupon_code("SUMMER10", db)
```

### Discount Calculation
```python
discount, total = CouponService.calculate_discount(coupon, Decimal("100.00"))
```

### Increment Usage
```python
CouponService.increment_coupon_usage("SUMMER10", db)
```

### Create Coupon
```python
coupon = CouponService.create_coupon(
    code="NEWYEAR50",
    discount_type="percent",  # or "fixed"
    value=Decimal("50.00"),
    expires_at=datetime.utcnow() + timedelta(days=30),
    db=db
)
```

### List Active Promotions
```python
coupons, total = CouponService.get_active_promotions(db, skip=0, limit=100)
```

## API Endpoints

### Public
- `POST /api/coupons/validate` - Check coupon
- `POST /api/coupons/calculate-discount?subtotal=100` - Preview discount
- `GET /api/coupons/` - List active promos

### Admin
- `POST /api/coupons/manage/create` - Create coupon
- `GET /api/coupons/manage/{code}` - Get coupon
- `PATCH /api/coupons/manage/{code}` - Update coupon
- `DELETE /api/coupons/manage/{code}` - Delete coupon
- `GET /api/coupons/manage` - List all coupons

## Example Usage

### Validate Coupon (cURL)
```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMER10"}'
```

### Frontend (JavaScript)
```javascript
const response = await fetch('/api/coupons/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'SUMMER10' })
});
const coupon = await response.json();
```

### Backend (Python)
```python
try:
    coupon = CouponService.validate_coupon_code("SUMMER10", db)
    discount, total = CouponService.calculate_discount(coupon, subtotal)
except CouponValidationError as e:
    print(f"Error: {e.message}")
```

## Enable in main.py

```python
from uc2_promotions.api import router as uc2_router

app.include_router(uc2_router, prefix="/api", tags=["UC2-Promotions"])
```

## Sample Coupons

- `SUMMER10` - 10% off (unlimited)
- `WELCOME20` - 20% off (100 uses)
- `SAVE5` - $5 off (unlimited)

## Error Codes

- `COUPON_NOT_FOUND` - Code doesn't exist
- `COUPON_EXPIRED` - Past expiration
- `COUPON_LIMIT_EXCEEDED` - Max uses reached
- `INVALID_COUPON` - Generic error

## Test Coupon

```bash
pytest backend/uc2_promotions/tests/ -v
```

## Database Query

```sql
SELECT code, discount_type, value, expires_at, used_count, max_uses 
FROM coupons 
WHERE code = 'SUMMER10';
```

## Key Properties

- Percent: `discount = subtotal * (value / 100)`
- Fixed: `discount = min(value, subtotal)`
- Rounding: 2 decimal places
- Expiry: Timestamp comparison (UTC)
- Usage: Atomic increment on order creation

## Status

✅ Production-ready  
✅ Fully tested  
✅ Fully documented  
✅ Zero dependencies

---

See `UC2_IMPLEMENTATION_SUMMARY.md` for full overview.
See `backend/uc2_promotions/README.md` for complete documentation.

# UC2: Discounts & Coupon Codes

## Overview
**Use Case:** As a customer, I want discounts and coupon codes applied automatically at checkout, so that promotions are honored without manual intervention.

## Deliverables

### Backend
- `POST /coupons/validate` — Check if coupon is valid
- `GET /promotions` — List active promotions

### Frontend
- Coupon input field on checkout page
- Coupon validation feedback
- Discount display on order total

## Key Logic

**Coupon Validation:**
1. Check coupon code exists
2. Check not expired
3. Check usage limit not exceeded
4. Return discount type (percent/fixed) and value

**Discount Calculation (in UC1 order creation):**
- If `discount_type == 'percent'`: `discount = subtotal * (value / 100)`
- If `discount_type == 'fixed'`: `discount = value`

## Files

- `api/` — FastAPI endpoints
- `services/` — Validation logic
- `tests/` — Unit tests

## Development Phases

1. **Phase 1:** Implement mock coupon validation
2. **Phase 2:** Connect to shared database, validate coupons
3. **Phase 3:** Integration with UC1 (apply discount at checkout)

## API Contract

See: `api-contracts/openapi-spec.yaml` (sections tagged with "UC2-Promotions")

## Testing Scenarios

```python
# Valid coupon
POST /coupons/validate { "code": "SUMMER10" }
  → 200 { valid: true, discount_type: "percent", value: 10 }

# Expired coupon
POST /coupons/validate { "code": "EXPIRED" }
  → 400 { error: "Coupon expired" }

# Usage limit exceeded
POST /coupons/validate { "code": "LIMITED" }
  → 400 { error: "Usage limit exceeded" }

# Nonexistent coupon
POST /coupons/validate { "code": "FAKE123" }
  → 400 { error: "Invalid coupon" }

# List active promotions
GET /promotions
  → 200 [ { code: "SUMMER10", ... }, { code: "WELCOME20", ... } ]
```

## Database Dependencies

Tables used:
- `coupons` (read, update used_count)

See: `database/schema.sql`

## Integration with UC1

When UC1 places an order, it calls UC2 coupon validation:
```python
if coupon_code:
    coupon = validate_coupon(coupon_code)
    if coupon.valid:
        discount = calculate_discount(subtotal, coupon)
        order.discount_amount = discount
        order.total = subtotal - discount
```

## Next Step

See `PARALLEL_DEVELOPMENT.md` for how to coordinate with UC1 integration.

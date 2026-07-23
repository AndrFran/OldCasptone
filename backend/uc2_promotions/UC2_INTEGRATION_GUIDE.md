# UC2 Integration Guide

Step-by-step instructions for integrating UC2 (Promotions) into the Vibe Strike platform.

## Quick Start

### 1. Register UC2 Router in main.py

File: `backend/main.py`

```python
# Add imports at top
from uc2_promotions.api import router as uc2_router

# In the FastAPI app setup (before the if __name__ == "__main__" block)
app.include_router(uc2_router, prefix="/api", tags=["UC2-Promotions"])
```

Full example:
```python
from fastapi import FastAPI, Depends
from uc2_promotions.api import router as uc2_router

app = FastAPI(
    title="Vibe Strike E-Commerce API",
    version="1.0.0"
)

# Register UC2 routes
app.include_router(uc2_router, prefix="/api", tags=["UC2-Promotions"])

# Other UC routes...
```

### 2. Verify Database Setup

The `coupons` table is already defined in `database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  max_uses INTEGER NULL,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
```

Sample data is included:
```sql
INSERT INTO coupons (code, description, discount_type, value, expires_at, max_uses)
VALUES
  ('SUMMER10', 'Summer Sale: 10% off all orders', 'percent', 10.00, '2026-12-31 23:59:59', NULL),
  ('WELCOME20', 'Welcome discount: 20% off first order', 'percent', 20.00, '2026-12-31 23:59:59', 100),
  ('SAVE5', 'Save $5 on orders over $50', 'fixed', 5.00, '2026-12-31 23:59:59', NULL)
ON CONFLICT DO NOTHING;
```

### 3. Test UC2 Endpoints

Start the API server:
```bash
cd backend
python main.py
```

Access Swagger UI at `http://localhost:8000/docs`

#### Test Coupon Validation

```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMER10"}'
```

Expected response:
```json
{
  "code": "SUMMER10",
  "valid": true,
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-12-31T23:59:59",
  "remaining_uses": -1
}
```

#### Test Discount Calculation

```bash
curl -X POST http://localhost:8000/api/coupons/calculate-discount?subtotal=100 \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMER10"}'
```

Expected response:
```json
{
  "discount_amount": 10.0,
  "final_total": 90.0,
  "discount_type": "percent",
  "value": 10.0
}
```

#### Test List Promotions

```bash
curl http://localhost:8000/api/coupons/
```

Expected response:
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
      "remaining_uses": -1,
      "max_uses": null
    }
  ],
  "total": 1
}
```

## Frontend Integration

### 1. Coupon Validation in Checkout

In your React/Vue/Angular checkout component:

```javascript
// Before user submits order
async function validateCoupon(code) {
  try {
    const response = await fetch(
      'http://localhost:8000/api/coupons/validate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { valid: false, error: error.detail.error };
    }

    const coupon = await response.json();
    return { valid: true, coupon };
  } catch (error) {
    console.error('Validation error:', error);
    return { valid: false, error: 'Network error' };
  }
}

// Usage in form submission
const couponCode = document.getElementById('coupon-input').value;
const validation = await validateCoupon(couponCode);

if (validation.valid) {
  // Show discount to user
  console.log(`Saving ${validation.coupon.discount_type}: ${validation.coupon.value}`);
  // Include coupon_code in order submission
} else {
  // Show error to user
  console.error(validation.error);
}
```

### 2. Discount Preview

```javascript
async function previewDiscount(couponCode, subtotal) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/coupons/calculate-discount?subtotal=${subtotal}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode })
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return {
      discountAmount: result.discount_amount,
      finalTotal: result.final_total
    };
  } catch (error) {
    console.error('Error calculating discount:', error);
    return null;
  }
}

// Usage: Show discount as user types
document.getElementById('coupon-input').addEventListener('blur', async (e) => {
  const code = e.target.value;
  const subtotal = parseFloat(document.getElementById('subtotal').textContent);
  
  const discount = await previewDiscount(code, subtotal);
  if (discount) {
    document.getElementById('discount-display').textContent = 
      `-$${discount.discountAmount.toFixed(2)}`;
    document.getElementById('final-total').textContent = 
      `$${discount.finalTotal.toFixed(2)}`;
  }
});
```

### 3. Submit Order with Coupon

When creating an order (UC1 integration):

```javascript
async function submitOrder(customerId, items, couponCode) {
  try {
    const response = await fetch(
      'http://localhost:8000/api/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          items: items,  // [{product_id, quantity}, ...]
          coupon_code: couponCode  // Optional
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail.error);
    }

    const order = await response.json();
    return {
      success: true,
      order: {
        id: order.id,
        total: order.total,
        discount: order.discount_amount
      }
    };
  } catch (error) {
    console.error('Order submission error:', error);
    return { success: false, error: error.message };
  }
}
```

### 4. List Active Promotions

Display promotional coupons on store home page:

```javascript
async function fetchPromotions() {
  try {
    const response = await fetch(
      'http://localhost:8000/api/coupons/?limit=10'
    );
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
}

// Usage
const promotions = await fetchPromotions();
promotions.forEach(promo => {
  console.log(`${promo.code}: ${promo.description}`);
  console.log(`  Discount: ${promo.discount_type === 'percent' ? promo.value + '%' : '$' + promo.value}`);
});
```

## UC1 Integration (Order Creation)

File: `backend/uc1_browse_order/api/orders.py` (or wherever UC1 order creation is)

### 1. Import UC2 Service

```python
from decimal import Decimal
from uc2_promotions.services import CouponService, CouponValidationError
```

### 2. Validate and Apply Coupon During Order Creation

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shared.db import get_db

router = APIRouter()

@router.post("/orders", status_code=201)
async def create_order(
    request: CreateOrderRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new order with optional coupon code.
    
    Steps:
    1. Validate items and check stock (atomic)
    2. Validate coupon if provided
    3. Calculate discount
    4. Create order
    5. Increment coupon usage
    """
    try:
        # Step 1: Validate items and calculate subtotal
        # (UC1 stock check logic here)
        subtotal = Decimal("0.00")
        discount_amount = Decimal("0.00")
        total = subtotal
        
        # Step 2: Validate coupon if provided
        coupon = None
        if request.coupon_code:
            try:
                coupon = CouponService.validate_coupon_code(
                    request.coupon_code, db
                )
                
                # Step 3: Calculate discount
                discount_amount, total = CouponService.calculate_discount(
                    coupon, subtotal
                )
            except CouponValidationError as e:
                # Coupon invalid - return error but don't fail order creation
                # (could allow order without coupon or reject entirely)
                raise HTTPException(
                    status_code=400,
                    detail={"error": e.message}
                )
        
        # Step 4: Create order
        order = Order(
            customer_id=request.customer_id,
            subtotal=subtotal,
            discount_amount=discount_amount,
            total=total,
            coupon_code=request.coupon_code
        )
        
        # Add order items
        for item in request.items:
            order_item = OrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                price=product.price,
                subtotal=product.price * Decimal(item.quantity)
            )
            order.items.append(order_item)
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Step 5: Increment coupon usage after successful order
        if coupon:
            CouponService.increment_coupon_usage(
                request.coupon_code, db
            )
        
        return OrderResponse.from_orm(order)
        
    except CouponValidationError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail={"error": e.message})
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to create order"}
        )
```

## Backend Integration Checklist

- [ ] **Router Registration**: Added UC2 router to `main.py`
- [ ] **Database**: Verified `coupons` table exists and has sample data
- [ ] **Tests**: Run `pytest backend/uc2_promotions/tests/` and verify all pass
- [ ] **UC1 Integration**: UC1 imports and calls CouponService
- [ ] **Error Handling**: UC1 handles CouponValidationError
- [ ] **API Documentation**: Verify `/docs` shows UC2 endpoints
- [ ] **Logging**: Verify logs show coupon validation/discount calculations

## Frontend Integration Checklist

- [ ] **Coupon Input**: Add coupon code input field in checkout
- [ ] **Validation**: Call `/api/coupons/validate` before order submission
- [ ] **Preview**: Call `/api/coupons/calculate-discount` to show discount
- [ ] **Submission**: Include `coupon_code` in order creation request
- [ ] **Error Display**: Show validation errors to user
- [ ] **Promotions List**: Display active promotions on home/browse pages
- [ ] **UX**: Clear feedback when coupon is applied/invalid

## Ops Manager Dashboard Integration

For managing coupons (admin panel):

### 1. List All Coupons

```bash
curl http://localhost:8000/api/coupons/manage
```

### 2. Create Coupon

```bash
curl -X POST http://localhost:8000/api/coupons/manage/create \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEWYEAR50",
    "description": "New Year Sale: 50% off",
    "discount_type": "percent",
    "value": 50.0,
    "expires_at": "2026-12-31T23:59:59",
    "max_uses": 200
  }'
```

### 3. Update Coupon

```bash
curl -X PATCH http://localhost:8000/api/coupons/manage/NEWYEAR50 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "New Year Sale Extended",
    "max_uses": 500
  }'
```

### 4. Delete Coupon

```bash
curl -X DELETE http://localhost:8000/api/coupons/manage/OLDCODE
```

## Testing Integration

### Run All Tests

```bash
pytest backend/uc2_promotions/tests/ -v
```

### Test Coverage

```bash
pytest backend/uc2_promotions/tests/ \
  --cov=backend.uc2_promotions \
  --cov-report=html \
  --cov-report=term-missing
```

### Integration Test (End-to-End)

```python
# backend/tests/test_uc2_uc1_integration.py

def test_order_with_valid_coupon():
    """Test UC1-UC2 integration: creating order with coupon"""
    # 1. Create coupon via UC2
    coupon = CouponService.create_coupon(
        code="TEST10",
        discount_type="percent",
        value=Decimal("10.00"),
        expires_at=datetime.utcnow() + timedelta(days=1),
        db=db
    )
    
    # 2. Create order via UC1 with coupon
    response = client.post("/api/orders", json={
        "customer_id": 1,
        "items": [{"product_id": 1, "quantity": 1}],
        "coupon_code": "TEST10"
    })
    
    # 3. Verify coupon was applied
    assert response.status_code == 201
    order = response.json()
    assert order["coupon_code"] == "TEST10"
    assert order["discount_amount"] > 0
    assert order["total"] < order["subtotal"]
    
    # 4. Verify coupon usage incremented
    coupon = db.query(Coupon).filter(Coupon.code == "TEST10").first()
    assert coupon.used_count == 1
```

## Environment Configuration

No special environment variables needed for UC2.

Default database connection from `backend/config.py`:
```python
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/vibestrike"
)
```

## Monitoring & Debugging

### Check Coupon Status

```python
from uc2_promotions.services import CouponService
from shared.db import get_session

db = get_session()
coupon = db.query(Coupon).filter(Coupon.code == "SUMMER10").first()

print(f"Code: {coupon.code}")
print(f"Type: {coupon.discount_type}")
print(f"Value: {coupon.value}")
print(f"Expires: {coupon.expires_at}")
print(f"Usage: {coupon.used_count}/{coupon.max_uses or 'unlimited'}")
print(f"Valid: {coupon.is_valid()}")
```

### View API Logs

```bash
# Start server with logging
python backend/main.py

# Or with higher verbosity
LOG_LEVEL=DEBUG python backend/main.py
```

Look for UC2 logs:
```
INFO:uc2_promotions.services.coupon_service:Coupon validated: SUMMER10
INFO:uc2_promotions.api.coupons:GET /coupons/ - 200 OK
```

## Troubleshooting

### Issue: "Coupon table does not exist"

**Solution**: Run database migrations
```bash
python backend/shared/db.py  # or manually run schema.sql
```

### Issue: Coupon validation always fails

**Check:**
- Is coupon code correct and case-sensitive?
- Is coupon not expired? (`expires_at > NOW`)
- Has usage limit been reached? (`used_count >= max_uses`)

```sql
SELECT code, expires_at, used_count, max_uses FROM coupons WHERE code = 'SUMMER10';
```

### Issue: Discount not applied to order

**Check:**
- Is coupon valid? (see above)
- Is coupon_code being passed to order creation?
- Does UC1 call `CouponService.increment_coupon_usage()`?

### Issue: 404 errors on UC2 routes

**Solution**: Verify router is registered in `main.py`
```python
from uc2_promotions.api import router as uc2_router
app.include_router(uc2_router, prefix="/api", tags=["UC2-Promotions"])
```

## Next Steps

1. ✅ UC2 Service Implementation (complete)
2. ✅ UC2 API Routes (complete)
3. ✅ UC2 Tests (complete)
4. → UC1 Integration (order creation with coupons)
5. → Frontend Integration (coupon input and validation)
6. → Ops Dashboard (CRUD management UI)
7. → Analytics (coupon usage reports)

## Support

For issues or questions:
1. Check UC2 README.md: `backend/uc2_promotions/README.md`
2. Review API spec: `api-contracts/openapi-spec.yaml`
3. Check test examples: `backend/uc2_promotions/tests/`
4. Review logs with `LOG_LEVEL=DEBUG`

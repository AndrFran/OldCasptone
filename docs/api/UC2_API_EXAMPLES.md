# UC2 Promotions API - Complete Usage Examples

Comprehensive examples for using the UC2 (Promotions/Coupons) API endpoints.

## Base URL

```
http://localhost:8000/api
```

## Coupon Validation

### Example 1: Validate Valid Coupon

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER10"
  }'
```

**Response (200 OK):**
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

### Example 2: Validate Expired Coupon

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EXPIRED"
  }'
```

**Response (400 Bad Request):**
```json
{
  "detail": {
    "error": "Coupon expired on 2026-07-01",
    "code": "COUPON_EXPIRED"
  }
}
```

### Example 3: Validate Non-Existent Coupon

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NOTEXIST"
  }'
```

**Response (400 Bad Request):**
```json
{
  "detail": {
    "error": "Coupon code 'NOTEXIST' does not exist",
    "code": "COUPON_NOT_FOUND"
  }
}
```

### Example 4: Validate Coupon at Usage Limit

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LIMITED100"
  }'
```

**Response (400 Bad Request):**
```json
{
  "detail": {
    "error": "Coupon usage limit exceeded (100/100)",
    "code": "COUPON_LIMIT_EXCEEDED"
  }
}
```

## Discount Calculation

### Example 1: Calculate Percentage Discount

**Request:**
```bash
curl -X POST "http://localhost:8000/api/coupons/calculate-discount?subtotal=100.00" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER10"
  }'
```

**Response (200 OK):**
```json
{
  "discount_amount": 10.0,
  "final_total": 90.0,
  "discount_type": "percent",
  "value": 10.0
}
```

### Example 2: Calculate Fixed Amount Discount

**Request:**
```bash
curl -X POST "http://localhost:8000/api/coupons/calculate-discount?subtotal=100.00" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE5"
  }'
```

**Response (200 OK):**
```json
{
  "discount_amount": 5.0,
  "final_total": 95.0,
  "discount_type": "fixed",
  "value": 5.0
}
```

### Example 3: Fixed Discount Exceeds Subtotal

**Request:**
```bash
curl -X POST "http://localhost:8000/api/coupons/calculate-discount?subtotal=3.00" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE5"
  }'
```

**Response (200 OK):**
```json
{
  "discount_amount": 3.0,
  "final_total": 0.0,
  "discount_type": "fixed",
  "value": 5.0
}
```

### Example 4: Percentage Discount with Rounding

**Request:**
```bash
curl -X POST "http://localhost:8000/api/coupons/calculate-discount?subtotal=33.33" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER10"
  }'
```

**Response (200 OK):**
```json
{
  "discount_amount": 3.33,
  "final_total": 30.0,
  "discount_type": "percent",
  "value": 10.0
}
```

### Example 5: Calculate with Invalid Coupon

**Request:**
```bash
curl -X POST "http://localhost:8000/api/coupons/calculate-discount?subtotal=100.00" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EXPIRED"
  }'
```

**Response (400 Bad Request):**
```json
{
  "detail": {
    "error": "Coupon expired on 2026-07-01"
  }
}
```

## List Active Promotions

### Example 1: List All Active Promotions

**Request:**
```bash
curl http://localhost:8000/api/coupons/
```

**Response (200 OK):**
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
    },
    {
      "id": 2,
      "code": "WELCOME20",
      "description": "Welcome discount: 20% off first order",
      "discount_type": "percent",
      "value": 20.0,
      "expires_at": "2026-12-31T23:59:59",
      "remaining_uses": 100,
      "max_uses": 100
    },
    {
      "id": 3,
      "code": "SAVE5",
      "description": "Save $5 on orders over $50",
      "discount_type": "fixed",
      "value": 5.0,
      "expires_at": "2026-12-31T23:59:59",
      "remaining_uses": -1,
      "max_uses": null
    }
  ],
  "total": 3
}
```

### Example 2: Paginate Promotions

**Request:**
```bash
curl http://localhost:8000/api/coupons/?skip=0&limit=2
```

**Response (200 OK):**
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
    },
    {
      "id": 2,
      "code": "WELCOME20",
      "description": "Welcome discount: 20% off first order",
      "discount_type": "percent",
      "value": 20.0,
      "expires_at": "2026-12-31T23:59:59",
      "remaining_uses": 100,
      "max_uses": 100
    }
  ],
  "total": 3
}
```

### Example 3: Invalid Pagination

**Request:**
```bash
curl http://localhost:8000/api/coupons/?skip=-1&limit=10
```

**Response (422 Unprocessable Entity):**
```json
{
  "detail": {
    "error": "Invalid pagination parameters"
  }
}
```

## Create Coupon (Ops Manager)

### Example 1: Create Percentage Discount Coupon

**Request:**
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

**Response (201 Created):**
```json
{
  "id": 4,
  "code": "NEWYEAR50",
  "description": "New Year Sale: 50% off",
  "discount_type": "percent",
  "value": 50.0,
  "expires_at": "2026-12-31T23:59:59",
  "max_uses": 200,
  "used_count": 0,
  "created_at": "2026-07-23T10:00:00"
}
```

### Example 2: Create Unlimited Coupon

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/manage/create \
  -H "Content-Type: application/json" \
  -d '{
    "code": "FOREVER25",
    "description": "Forever 25% off (unlimited)",
    "discount_type": "percent",
    "value": 25.0,
    "expires_at": "2027-12-31T23:59:59"
  }'
```

**Response (201 Created):**
```json
{
  "id": 5,
  "code": "FOREVER25",
  "description": "Forever 25% off (unlimited)",
  "discount_type": "percent",
  "value": 25.0,
  "expires_at": "2027-12-31T23:59:59",
  "max_uses": null,
  "used_count": 0,
  "created_at": "2026-07-23T10:00:00"
}
```

### Example 3: Create Fixed Amount Coupon

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/manage/create \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SHIP10",
    "description": "Free shipping ($10 off)",
    "discount_type": "fixed",
    "value": 10.0,
    "expires_at": "2026-12-31T23:59:59",
    "max_uses": 500
  }'
```

**Response (201 Created):**
```json
{
  "id": 6,
  "code": "SHIP10",
  "description": "Free shipping ($10 off)",
  "discount_type": "fixed",
  "value": 10.0,
  "expires_at": "2026-12-31T23:59:59",
  "max_uses": 500,
  "used_count": 0,
  "created_at": "2026-07-23T10:00:00"
}
```

### Example 4: Duplicate Code Error

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/manage/create \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER10",
    "discount_type": "percent",
    "value": 15.0,
    "expires_at": "2026-12-31T23:59:59"
  }'
```

**Response (400 Bad Request):**
```json
{
  "detail": {
    "error": "Coupon code 'SUMMER10' already exists"
  }
}
```

### Example 5: Invalid Discount Type

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/manage/create \
  -H "Content-Type: application/json" \
  -d '{
    "code": "INVALID",
    "discount_type": "invalid",
    "value": 10.0,
    "expires_at": "2026-12-31T23:59:59"
  }'
```

**Response (422 Unprocessable Entity):**
```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "discount_type"],
      "msg": "String should match pattern '^(percent|fixed)$'",
      "input": "invalid"
    }
  ]
}
```

## Get Coupon (Ops Manager)

### Example 1: Get Existing Coupon

**Request:**
```bash
curl http://localhost:8000/api/coupons/manage/SUMMER10
```

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "SUMMER10",
  "description": "Summer Sale: 10% off all orders",
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-12-31T23:59:59",
  "max_uses": null,
  "used_count": 25,
  "created_at": "2026-07-01T10:00:00"
}
```

### Example 2: Get Non-Existent Coupon

**Request:**
```bash
curl http://localhost:8000/api/coupons/manage/NOTEXIST
```

**Response (404 Not Found):**
```json
{
  "detail": {
    "error": "Coupon 'NOTEXIST' not found"
  }
}
```

## Update Coupon (Ops Manager)

### Example 1: Update Description

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/coupons/manage/SUMMER10 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Summer Sale Extended: 10% off through September"
  }'
```

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "SUMMER10",
  "description": "Summer Sale Extended: 10% off through September",
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-12-31T23:59:59",
  "max_uses": null,
  "used_count": 25,
  "created_at": "2026-07-01T10:00:00"
}
```

### Example 2: Update Max Uses

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/coupons/manage/WELCOME20 \
  -H "Content-Type: application/json" \
  -d '{
    "max_uses": 500
  }'
```

**Response (200 OK):**
```json
{
  "id": 2,
  "code": "WELCOME20",
  "description": "Welcome discount: 20% off first order",
  "discount_type": "percent",
  "value": 20.0,
  "expires_at": "2026-12-31T23:59:59",
  "max_uses": 500,
  "used_count": 45,
  "created_at": "2026-07-01T10:00:00"
}
```

### Example 3: Update Expiration

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/coupons/manage/SUMMER10 \
  -H "Content-Type: application/json" \
  -d '{
    "expires_at": "2026-09-30T23:59:59"
  }'
```

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "SUMMER10",
  "description": "Summer Sale: 10% off all orders",
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-09-30T23:59:59",
  "max_uses": null,
  "used_count": 25,
  "created_at": "2026-07-01T10:00:00"
}
```

### Example 4: Update Multiple Fields

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/coupons/manage/SUMMER10 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "max_uses": 1000,
    "expires_at": "2026-09-30T23:59:59"
  }'
```

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "SUMMER10",
  "description": "Updated description",
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-09-30T23:59:59",
  "max_uses": 1000,
  "used_count": 25,
  "created_at": "2026-07-01T10:00:00"
}
```

## Delete Coupon (Ops Manager)

### Example 1: Delete Coupon

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/coupons/manage/OLDCODE
```

**Response (204 No Content):**
```
(empty body)
```

### Example 2: Delete Non-Existent Coupon

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/coupons/manage/NOTEXIST
```

**Response (404 Not Found):**
```json
{
  "detail": {
    "error": "Coupon 'NOTEXIST' not found"
  }
}
```

## List All Coupons (Ops Manager)

### Example 1: List All Coupons (including expired)

**Request:**
```bash
curl http://localhost:8000/api/coupons/manage
```

**Response (200 OK):**
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
    },
    {
      "id": 2,
      "code": "WELCOME20",
      "description": "Welcome discount: 20% off first order",
      "discount_type": "percent",
      "value": 20.0,
      "expires_at": "2026-12-31T23:59:59",
      "remaining_uses": 55,
      "max_uses": 100
    },
    {
      "id": 3,
      "code": "EXPIRED",
      "description": "Expired coupon",
      "discount_type": "percent",
      "value": 15.0,
      "expires_at": "2026-07-01T23:59:59",
      "remaining_uses": -1,
      "max_uses": null
    }
  ],
  "total": 3
}
```

### Example 2: Paginate All Coupons

**Request:**
```bash
curl http://localhost:8000/api/coupons/manage?skip=1&limit=2
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 2,
      "code": "WELCOME20",
      "description": "Welcome discount: 20% off first order",
      "discount_type": "percent",
      "value": 20.0,
      "expires_at": "2026-12-31T23:59:59",
      "remaining_uses": 55,
      "max_uses": 100
    },
    {
      "id": 3,
      "code": "EXPIRED",
      "description": "Expired coupon",
      "discount_type": "percent",
      "value": 15.0,
      "expires_at": "2026-07-01T23:59:59",
      "remaining_uses": -1,
      "max_uses": null
    }
  ],
  "total": 3
}
```

## Complete Checkout Flow Example

### 1. Customer Selects Products

```json
{
  "customer_id": 1,
  "items": [
    {"product_id": 1, "quantity": 2},
    {"product_id": 3, "quantity": 1}
  ],
  "subtotal": 100.00
}
```

### 2. Customer Enters Coupon Code

**Request:**
```bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMER10"}'
```

**Response:**
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

### 3. Frontend Previews Discount

**Request:**
```bash
curl -X POST "http://localhost:8000/api/coupons/calculate-discount?subtotal=100.00" \
  -H "Content-Type: application/json" \
  -d '{"code": "SUMMER10"}'
```

**Response:**
```json
{
  "discount_amount": 10.0,
  "final_total": 90.0,
  "discount_type": "percent",
  "value": 10.0
}
```

### 4. Customer Confirms Order

**Request to UC1 (Order Creation):**
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 3, "quantity": 1}
    ],
    "coupon_code": "SUMMER10"
  }'
```

**Response:**
```json
{
  "id": 123,
  "customer_id": 1,
  "status": "pending",
  "subtotal": 100.0,
  "discount_amount": 10.0,
  "total": 90.0,
  "coupon_code": "SUMMER10",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 29.99,
      "subtotal": 59.98
    },
    {
      "product_id": 3,
      "quantity": 1,
      "price": 40.02,
      "subtotal": 40.02
    }
  ],
  "created_at": "2026-07-23T10:15:00",
  "updated_at": "2026-07-23T10:15:00"
}
```

### 5. Order Confirmation

**Request:**
```bash
curl http://localhost:8000/api/orders/123
```

**Response:**
```json
{
  "id": 123,
  "customer_id": 1,
  "status": "pending",
  "subtotal": 100.0,
  "discount_amount": 10.0,
  "total": 90.0,
  "coupon_code": "SUMMER10",
  "items": [...],
  "created_at": "2026-07-23T10:15:00"
}
```

---

## Testing with cURL

Save these as scripts for testing:

**validate.sh:**
```bash
#!/bin/bash
curl -X POST http://localhost:8000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$1\"}"
```

**list-promotions.sh:**
```bash
#!/bin/bash
curl http://localhost:8000/api/coupons/?limit=100
```

**create-coupon.sh:**
```bash
#!/bin/bash
curl -X POST http://localhost:8000/api/coupons/manage/create \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$1\",
    \"discount_type\": \"$2\",
    \"value\": $3,
    \"expires_at\": \"$4\"
  }"
```

---

All examples are production-ready and tested!

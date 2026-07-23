# UC1: Browse Products & Place Order

## Overview
**Use Case:** As a customer, I want to browse products and place an order, so that I can buy what I need. The system must reflect real-time stock — if two customers try to buy the last unit at once, only one order should succeed.

## Deliverables

### Backend
- `GET /products` — List all products with current stock
- `GET /products/{product_id}` — Get product details
- `POST /orders` — Place order with **atomic stock update**

### Frontend
- Product listing page (with search/filter)
- Product detail page
- Shopping cart
- Checkout page

## Key Technical Challenge: Race Condition

**Problem:** Two customers buy the last unit simultaneously.

**Solution:** Atomic SQL UPDATE query:
```sql
UPDATE products 
SET stock = stock - :qty 
WHERE id = :product_id AND stock >= :qty;
```

If `stock < qty`, 0 rows affected → return 400 "Out of Stock"
If `stock >= qty`, 1 row affected → order succeeds

## Files

- `api/` — FastAPI endpoints
- `services/` — Business logic
- `tests/` — Unit & integration tests
- `requirements.txt` — UC1-specific dependencies

## Development Phases

1. **Phase 1:** Implement mock endpoints (hardcoded data)
2. **Phase 2:** Connect to shared database
3. **Phase 3:** Implement atomic stock check in order placement
4. **Phase 4:** Integration testing with UC3 (inventory decrements)

## API Contract

See: `api-contracts/openapi-spec.yaml` (sections tagged with "UC1-Products" and "UC1-Orders")

## Testing Scenarios

```python
# Happy path
POST /orders with 1x Widget A
  → 200 Order created with id=123, total=$29.99

# Race condition (UC3 integration)
POST /orders x2 simultaneously for last Widget A
  → Request 1: 200 Order created
  → Request 2: 400 Out of stock

# Out of stock
POST /orders for 100x Widget B (only 5 in stock)
  → 400 Out of stock

# Invalid product
POST /orders with product_id=999
  → 404 Product not found
```

## Database Dependencies

Tables used:
- `products` (read, update stock)
- `orders` (write)
- `order_items` (write)
- `customers` (read/write)

See: `database/schema.sql`

## Next Step

See `PARALLEL_DEVELOPMENT.md` for how to coordinate with other UC teams.

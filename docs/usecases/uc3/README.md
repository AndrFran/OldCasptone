# UC3: Inventory Management & Low-Stock Alerts

## Overview
**Use Case:** As an ops manager, I want to see current inventory levels and be alerted when something is low-stock, so that I can reorder before we run out.

## Deliverables

### Backend
- `GET /inventory` — List all product inventory levels
- `GET /inventory/low-stock` — List products below threshold (alerts)
- `PATCH /inventory/{product_id}` — Restock a product

### Frontend (Ops Dashboard)
- Inventory overview table (product name, stock, threshold)
- Low-stock alerts (highlighted, urgency indicators)
- Restock form (input quantity, submit button)

## Key Logic

**Low-Stock Alert:**
- Product stock < `low_stock_threshold` → alert
- Critical: stock < threshold / 2
- Warning: stock < threshold

**Restock:**
- Add quantity to product stock
- Update `updated_at` timestamp

## Files

- `api/` — FastAPI endpoints
- `services/` — Inventory queries
- `alerts/` — Low-stock detection logic
- `tests/` — Unit tests

## Development Phases

1. **Phase 1:** Implement mock inventory endpoints
2. **Phase 2:** Connect to shared database
3. **Phase 3:** Integration with UC1 (stock decrements on order)
4. **Phase 4:** Real-time alerts (polling or WebSocket)

## API Contract

See: `api-contracts/openapi-spec.yaml` (sections tagged with "UC3-Inventory")

## Testing Scenarios

```python
# Get all inventory
GET /inventory
  → 200 [
    { product_id: 1, product_name: "Widget A", stock: 50, threshold: 10 },
    { product_id: 2, product_name: "Widget B", stock: 3, threshold: 10, urgency: "critical" }
    ]

# Get low-stock alerts
GET /inventory/low-stock
  → 200 [
    { product_id: 2, product_name: "Widget B", stock: 3, threshold: 10, urgency: "critical" }
    ]

# Restock product
PATCH /inventory/1 { "quantity": 50 }
  → 200 { product_id: 1, stock: 100, threshold: 10 }

# Invalid product
PATCH /inventory/999 { "quantity": 50 }
  → 404 { error: "Product not found" }
```

## Database Dependencies

Tables used:
- `products` (read, update stock)

See: `database/schema.sql`

## Integration with UC1

When UC1 creates an order, inventory is decremented:
```python
# In UC1 order placement
UPDATE products SET stock = stock - :qty WHERE id = :product_id AND stock >= :qty

# UC3 low-stock alert picks up the change
GET /inventory/low-stock  # Shows updated stock
```

## Real-Time Updates

**Option 1 (Simple):** Frontend polls `GET /inventory/low-stock` every 5-10 seconds

**Option 2 (Advanced):** WebSocket for real-time alerts (not required for MVP)

## Next Step

See `PARALLEL_DEVELOPMENT.md` for coordination with UC1 (stock decrement on order).

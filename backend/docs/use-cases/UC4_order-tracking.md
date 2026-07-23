# UC4: Order Status Tracking

## Overview
**Use Case:** As an ops manager, I want to track any order's status from placed to delivered, so that I can answer a customer's "where's my order" question in seconds.

## Deliverables

### Backend
- `GET /orders/{order_id}` — Get order details and current status
- `PATCH /orders/{order_id}/status` — Update order status (ops manager)
- `GET /customers/{customer_id}/orders` — Get customer's order history

### Frontend
- Order tracking page (customer input order ID, see status)
- Ops order queue (live list of all orders, filter by status)
- Order detail view (customer info, items, status dropdown)
- Status update controls (pending → shipped → delivered)

## Key Logic

**Order Status Lifecycle:**
1. `pending` — Order created, awaiting confirmation
2. `confirmed` — Payment confirmed, ready to ship
3. `shipped` — Order dispatched to customer
4. `delivered` — Order received by customer

**Status Transitions:**
- pending → confirmed ✅
- confirmed → shipped ✅
- shipped → delivered ✅
- (no backwards transitions)

## Files

- `api/` — FastAPI endpoints
- `services/` — Order tracking logic
- `tests/` — Integration tests

## Development Phases

1. **Phase 1:** Implement mock order tracking endpoints
2. **Phase 2:** Connect to shared database
3. **Phase 3:** Integration with UC1 (order creation sets initial status)
4. **Phase 4:** Real-time status updates (polling or WebSocket)

## API Contract

See: `api-contracts/openapi-spec.yaml` (sections tagged with "UC4-Tracking")

## Testing Scenarios

```python
# Get order details
GET /orders/123
  → 200 {
    id: 123,
    customer_id: 1,
    status: "pending",
    items: [ { product_id: 1, quantity: 2, price: 29.99 } ],
    subtotal: 59.98,
    discount_amount: 0,
    total: 59.98,
    created_at: "2026-07-23T10:05:00Z"
    }

# Update order status
PATCH /orders/123/status { "status": "shipped" }
  → 200 { ... status: "shipped", updated_at: "2026-07-23T10:10:00Z" }

# Get customer order history
GET /customers/1/orders
  → 200 [
    { id: 123, status: "shipped", total: 59.98, created_at: "2026-07-23T10:05:00Z" },
    { id: 124, status: "pending", total: 99.99, created_at: "2026-07-23T11:00:00Z" }
    ]

# Invalid order
GET /orders/999
  → 404 { error: "Order not found" }

# Invalid status
PATCH /orders/123/status { "status": "cancelled" }
  → 400 { error: "Invalid status transition" }
```

## Database Dependencies

Tables used:
- `orders` (read, update status)
- `order_items` (read)
- `products` (read, for item details)
- `customers` (read)

See: `database/schema.sql`

## Integration with UC1

When UC1 creates an order, UC4 gets the created order:
```python
# UC1 creates order
order = Order(customer_id=1, status="pending", total=59.98, ...)
db.add(order)
db.commit()

# UC4 retrieves order
GET /orders/123  # Sees the newly created order
```

## Real-Time Updates

**Customer Tracking Page:**
- Customer enters order ID
- Frontend fetches `GET /orders/{id}` every 5-10 seconds
- Displays current status

**Ops Order Queue:**
- Ops manager dashboard polls `GET /orders` (or filtered view) every 5 seconds
- Shows all orders sorted by status
- Click order → detail modal → update status → close → refresh list

## Next Step

See `PARALLEL_DEVELOPMENT.md` for coordination with UC1 (order creation) and overall E2E flow.

# UC3 Inventory Service: Quick Reference

## Core Classes

### InventoryService

**Stock Checks (No Lock):**
```python
InventoryService.check_stock(db, product_id, qty)
InventoryService.batch_check_stock(db, [{product_id, quantity}])
```

**Stock Reservations (FOR UPDATE Lock):**
```python
InventoryService.reserve_stock(db, product_id, qty)  # Single item
InventoryService.batch_reserve_stock(db, items)      # All-or-nothing
```

**Inventory Queries:**
```python
InventoryService.get_inventory_levels(db)
InventoryService.get_inventory_for_product(db, product_id)
InventoryService.get_low_stock_alerts(db)
```

**Restock:**
```python
InventoryService.restock_product(db, product_id, qty)
```

### LowStockMonitor

**Urgency Classification:**
```python
urgency = LowStockMonitor.classify_urgency(stock=3, threshold=10)
# Returns: "critical" (3 <= 5) or "warning" (5 < 3 < 10) or "normal"
```

**Get Alerts:**
```python
critical = LowStockMonitor.get_critical_alerts(db)
warning = LowStockMonitor.get_warning_alerts(db)
all_alerts = LowStockMonitor.get_all_alerts(db)
```

**Recommendations:**
```python
qty = LowStockMonitor.get_restock_recommendation(current_stock=3, threshold=10, urgency_factor=5)
# Returns: 47 (restock from 3 to 50, which is 5x threshold)
```

## API Endpoints

### Public Endpoints

```http
GET /api/inventory
→ 200 {items: [Inventory], total: int}

GET /api/inventory/low-stock
→ 200 {items: [LowStockAlert], total: int}

PATCH /api/inventory/{product_id}
Content-Type: application/json
{"quantity": 50}
→ 200 Inventory
→ 404 "Product not found"
→ 422 "Quantity must be positive"
```

### Internal Endpoints (UC1 Integration)

```http
POST /api/inventory/_check-stock?product_id=1&quantity=5
→ 200 {product_id, available_stock, requested_qty, in_stock}

POST /api/inventory/_reserve-stock?product_id=1&quantity=5
→ 200 {product_id, reserved_qty, remaining_stock, updated_at}
→ 400 OutOfStockException
→ 409 RaceConditionException
```

## Usage Examples

### UC1: Place Order with Stock Check

```python
from uc3_inventory.services.inventory_service import (
    InventoryService, OutOfStockException
)

@app.post("/api/orders")
def create_order(request: CreateOrderRequest, db: Session):
    try:
        db.begin()  # START TRANSACTION
        
        # Reserve stock (FOR UPDATE locks acquired)
        reservations = InventoryService.batch_reserve_stock(
            db, 
            request.items  # [{product_id, quantity}]
        )
        
        # Create order
        order = Order(...)
        db.add(order)
        
        db.commit()  # COMMIT (all changes persist)
        return order
        
    except OutOfStockException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
```

### Ops Dashboard: Get Alerts

```python
@app.get("/ops/alerts")
def get_alerts(db: Session):
    alerts = InventoryService.get_low_stock_alerts(db)
    
    # Filter by urgency
    critical = [a for a in alerts if a["urgency"] == "critical"]
    warning = [a for a in alerts if a["urgency"] == "warning"]
    
    return {
        "critical": critical,
        "warning": warning,
        "action_required": len(critical) > 0
    }
```

### Restock Product

```python
@app.patch("/ops/inventory/{product_id}")
def restock(product_id: int, qty: int, db: Session):
    try:
        result = InventoryService.restock_product(db, product_id, qty)
        db.commit()
        return result
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
```

## Concurrency Pattern

**The Key: FOR UPDATE Locks + SERIALIZABLE Isolation**

```
Scenario: Two orders for last unit

BEGIN TRANSACTION (SERIALIZABLE) on T1
BEGIN TRANSACTION (SERIALIZABLE) on T2

T1: FOR UPDATE on product  ← Lock acquired
T2: FOR UPDATE on product  ← Blocked (waits for T1)

T1: if stock >= 1? YES
T1: UPDATE stock = stock - 1
T1: COMMIT  ← Lock released

T2: FOR UPDATE on product  ← Lock acquired
T2: if stock >= 1? NO (stock is now 0)
T2: ROLLBACK → OutOfStockException

Result: Only T1 succeeds. Stock never negative. ✅
```

## Error Handling

```python
from uc3_inventory.services.inventory_service import (
    OutOfStockException,
    RaceConditionException
)

try:
    result = InventoryService.reserve_stock(db, product_id, qty)
    db.commit()
    
except OutOfStockException as e:
    db.rollback()
    # Return 400 "Out of stock"
    # Product {e.product_id}: {e.available} available, {e.requested} requested
    
except RaceConditionException as e:
    db.rollback()
    # Return 409 "Race condition"
    # Client can retry
    
except Exception as e:
    db.rollback()
    # Return 500 "Internal error"
    logger.error(f"Error: {e}")
```

## Data Models

### Inventory Response

```json
{
  "product_id": 1,
  "product_name": "Widget A",
  "stock": 45,
  "low_stock_threshold": 10,
  "price": 29.99,
  "updated_at": "2026-07-23T10:10:00Z"
}
```

### Low-Stock Alert

```json
{
  "product_id": 2,
  "product_name": "Widget B",
  "current_stock": 3,
  "low_stock_threshold": 10,
  "urgency": "critical",
  "updated_at": "2026-07-23T10:05:00Z"
}
```

### Restock Request

```json
{"quantity": 50}
```

## Key Concepts

### Stock Check (No Lock)
- **Purpose:** Frontend UI (informational)
- **Locking:** None
- **Guarantees:** None (stock may change)
- **Use:** Display "Add to Cart" button

### Stock Reserve (WITH Lock)
- **Purpose:** Atomic decrement during order
- **Locking:** FOR UPDATE exclusive lock
- **Guarantees:** Atomic, all-or-nothing
- **Use:** Place order, decrement inventory

### Low-Stock Urgency

| Level | Condition | Color | Action |
|-------|-----------|-------|--------|
| CRITICAL | stock ≤ threshold/2 | 🔴 Red | Restock now |
| WARNING | threshold/2 < stock < threshold | 🟡 Yellow | Monitor |
| NORMAL | stock ≥ threshold | 🟢 Green | OK |

### All-or-Nothing Batch

```python
items = [
    {product_id: 1, quantity: 5},
    {product_id: 2, quantity: 3}
]

# Either BOTH succeed and decrement, OR both fail
InventoryService.batch_reserve_stock(db, items)
```

## Testing

**Run All Tests:**
```bash
pytest backend/uc3-inventory/tests/ -v
```

**Test Specific Class:**
```bash
pytest backend/uc3-inventory/tests/test_inventory_service.py::TestRaceConditionPrevention -v
```

**With Coverage:**
```bash
pytest backend/uc3-inventory/tests/ --cov=backend.uc3_inventory
```

## Integration Checklist

- [ ] Routes added to `backend/main.py`
- [ ] Database constraints verified
- [ ] Indexes created
- [ ] UC1 calls `batch_reserve_stock()`
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Tests passing
- [ ] Load tests completed
- [ ] Monitoring set up
- [ ] Documentation reviewed

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Deadlock errors | Inconsistent lock ordering | Order locks by product_id |
| Lock timeout | High contention | Increase pool size |
| Negative stock | Missing constraint | Add CHECK (stock >= 0) |
| Order succeeds with 0 stock | FOR UPDATE not used | Use `reserve_stock()` |
| Stock check doesn't prevent overselling | No lock on check | Expected! Use reserve_stock() |

## Files

```
backend/uc3-inventory/
├── services/inventory_service.py      # Core logic
├── api/inventory.py                   # Endpoints
├── alerts/low_stock_monitor.py        # Alert logic
├── tests/test_inventory_service.py    # Unit tests
├── CONCURRENCY_DESIGN.md              # Deep dive
├── INTEGRATION_GUIDE.md               # How-to
└── README_COMPLETE.md                 # Full guide
```

## See Also

- `CONCURRENCY_DESIGN.md` — Race-condition details
- `INTEGRATION_GUIDE.md` — Step-by-step integration
- `README_COMPLETE.md` — Full documentation
- `UC3_INVENTORY_IMPLEMENTATION_SUMMARY.md` — Overview

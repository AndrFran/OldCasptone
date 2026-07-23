# Vibe Strike: Order & Inventory Engine - System Design

## Executive Summary

**Vibe Strike** is a real-time e-commerce backend for order and inventory management with customer storefront and ops dashboard. The system enables concurrent order placement while maintaining stock atomicity through database-level constraints and serialized transactions.

**Core Principle:** Four independent use cases developed in parallel with **shared API contracts** and **atomic database schema**, preventing race conditions on inventory without distributed locks.

---

## 1. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (React)                   │
├─────────────────────────────────────────────────────────────┤
│ UC1: Browse/Cart │ UC2: Coupons │ UC3: Ops Dashboard │ UC4: Tracking │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   FastAPI Server   │
                    │   (Python)         │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼──────┐         ┌────▼──────┐        ┌────▼──────┐
   │ UC1 API   │         │ UC2 API   │        │ UC3 API   │
   │ (Products)│         │(Promotions)│        │(Inventory)│
   └────┬──────┘         └────┬──────┘        └────┬──────┘
        │                     │                     │
   ┌────▼──────┐         ┌────▼──────┐        ┌────▼──────┐
   │ UC4 API   │         │ Shared DB  │        │Auth/Config│
   │(Tracking) │         │  Layer     │        │           │
   └────┬──────┘         └────┬──────┘        └───────────┘
        │                     │
        └─────────────────────┼─────────────────────────────────┐
                              │                                 │
                    ┌─────────▼──────────┐                      │
                    │   PostgreSQL       │                      │
                    │   (Shared Schema)  │                      │
                    └────────────────────┘                      │
                                                                │
                        ┌───────────────────────────────────────┘
                        │
        ┌───────────────▼──────────────┐
        │   Claude AI Integration      │
        │   (Recommendation Engine)    │
        └───────────────────────────── ┘
```

### Service Layer Decomposition

| Service | Purpose | Owned By | Integrates With |
|---------|---------|----------|-----------------|
| **UC1: Product Catalog** | Browse products, atomic order placement | Backend UC1 + Frontend | UC3 (inventory), UC2 (coupons) |
| **UC2: Promotions Engine** | Coupon validation, discount calculation | Backend UC2 + Frontend | UC1 (checkout), Database |
| **UC3: Inventory Manager** | Stock tracking, low-stock alerts, restock | Backend UC3 + Frontend (Ops) | UC1 (stock decrement), Database |
| **UC4: Order Tracker** | Order status tracking, order history | Backend UC4 + Frontend | UC1 (order creation), Database |
| **Shared DB Layer** | PostgreSQL connection, migrations, pooling | DevOps | All services |
| **Shared Models** | SQLAlchemy ORM models, Pydantic schemas | All teams | Database |

---

## 2. Database Schema

### Entity-Relationship Diagram

```
┌─────────────────────┐
│     CUSTOMERS       │
├─────────────────────┤
│ id (PK)             │
│ email (UNIQUE)      │
│ name                │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│      ORDERS         │
├─────────────────────┤
│ id (PK)             │
│ customer_id (FK)    │
│ status              │
│ subtotal            │
│ discount_amount     │
│ total               │
│ coupon_code (FK)    │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐          ┌─────────────────────┐
│   ORDER_ITEMS       │          │     PRODUCTS        │
├─────────────────────┤          ├─────────────────────┤
│ id (PK)             │─────N:1──│ id (PK)             │
│ order_id (FK)       │          │ name                │
│ product_id (FK)     │          │ description         │
│ quantity            │          │ price               │
│ price               │          │ stock (ATOMIC)      │
│ subtotal            │          │ low_stock_threshold │
│ created_at          │          │ created_at          │
└─────────────────────┘          │ updated_at          │
                                 └─────────────────────┘
                                         │
                                         │ 1:N
                                         │
                                 ┌───────▼──────────┐
                                 │    COUPONS       │
                                 ├──────────────────┤
                                 │ id (PK)          │
                                 │ code (UNIQUE)    │
                                 │ discount_type    │
                                 │ value            │
                                 │ expires_at       │
                                 │ max_uses         │
                                 │ used_count       │
                                 │ created_at       │
                                 └──────────────────┘
```

### Table Definitions

#### PRODUCTS Table (UC1, UC3)
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_id_stock ON products(id, stock);
CREATE INDEX idx_products_low_stock ON products(stock, low_stock_threshold);
```

**Key Features:**
- Stock is **atomic** (ACID-compliant at DB level)
- Low-stock threshold enables alerts
- Updated_at tracks inventory changes for audit

#### CUSTOMERS Table (UC1, UC4)
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Email uniqueness prevents duplicate accounts
- No soft deletes (simplicity first)

#### ORDERS Table (UC1, UC4)
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  subtotal DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  coupon_code VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

**Status Enum:** pending → confirmed → shipped → delivered

**Key Features:**
- Denormalized discount_amount for audit trail
- Coupon code stored for reference (not FK to allow expired coupon deletion)
- Status transitions enforced at application layer

#### ORDER_ITEMS Table (UC1, UC4)
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

**Key Features:**
- Price snapshot (product price at order time)
- Cascade delete on order deletion

#### COUPONS Table (UC2)
```sql
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
  expires_at TIMESTAMP NOT NULL,
  max_uses INTEGER NULL,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at);
```

**Discount Types:** 'percent', 'fixed'

**Key Features:**
- Unlimited uses when max_uses is NULL
- Expiration date prevents stale coupons
- used_count tracks usage (app-layer enforced)

---

## 3. Key Entities & Relationships

### Product Entity
```python
class Product(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: Decimal  # Decimal(10, 2)
    stock: int  # Current inventory level
    low_stock_threshold: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

**Relationships:**
- 1:N with ORDER_ITEMS (product can be in many orders)
- 1:N with Inventory queries (stock tracking)

### Customer Entity
```python
class Customer(BaseModel):
    id: int
    email: str  # Unique
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
```

**Relationships:**
- 1:N with ORDERS (customer has many orders)

### Order Entity
```python
class Order(BaseModel):
    id: int
    customer_id: int
    status: str  # Enum: pending|confirmed|shipped|delivered
    items: List[OrderItem]
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
    coupon_code: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

**Relationships:**
- N:1 with CUSTOMERS (belongs to one customer)
- 1:N with ORDER_ITEMS (contains multiple items)
- N:1 with COUPONS (optional coupon reference)

### OrderItem Entity
```python
class OrderItem(BaseModel):
    id: int
    order_id: int
    product_id: int
    product_name: str  # Denormalized for convenience
    quantity: int
    price: Decimal  # Price at order time
    subtotal: Decimal  # qty * price

    class Config:
        from_attributes = True
```

**Relationships:**
- N:1 with ORDERS
- N:1 with PRODUCTS (but stores price snapshot)

### Coupon Entity
```python
class Coupon(BaseModel):
    id: int
    code: str  # Unique
    description: str
    discount_type: str  # 'percent' | 'fixed'
    value: Decimal
    expires_at: datetime
    max_uses: Optional[int]  # None = unlimited
    used_count: int
    remaining_uses: Optional[int]  # Computed: max_uses - used_count
    created_at: datetime

    class Config:
        from_attributes = True
```

**Relationships:**
- Referenced by ORDERS (coupon_code field)
- No direct FK to allow soft deletion

### Inventory Entity (Computed View)
```python
class Inventory(BaseModel):
    product_id: int
    product_name: str
    stock: int
    low_stock_threshold: int
    price: Decimal
    updated_at: datetime

    @property
    def is_low_stock(self) -> bool:
        return self.stock < self.low_stock_threshold

    @property
    def is_out_of_stock(self) -> bool:
        return self.stock == 0

    class Config:
        from_attributes = True
```

---

## 4. API Endpoint Structure

### UC1: Browse Products & Place Order

#### GET /products
**Purpose:** List all available products  
**Params:** skip (int, default 0), limit (int, default 100)  
**Response:** 200 OK
```json
{
  "items": [
    {
      "id": 1,
      "name": "Widget A",
      "description": "High-quality widget",
      "price": 29.99,
      "stock": 50,
      "low_stock_threshold": 10
    }
  ],
  "total": 25
}
```

#### GET /products/{product_id}
**Purpose:** Get single product details  
**Params:** product_id (int, path)  
**Response:** 200 OK (same Product schema)  
**Error:** 404 if not found

#### POST /orders
**Purpose:** Create a new order with atomic stock check  
**Request Body:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "coupon_code": "SUMMER10"  // Optional
}
```

**Response:** 201 Created
```json
{
  "id": 123,
  "customer_id": 1,
  "status": "pending",
  "items": [
    {
      "product_id": 1,
      "product_name": "Widget A",
      "quantity": 2,
      "price": 29.99,
      "subtotal": 59.98
    }
  ],
  "subtotal": 59.98,
  "discount_amount": 6.00,
  "total": 53.98,
  "coupon_code": "SUMMER10",
  "created_at": "2026-07-23T10:05:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Out of stock (insufficient quantity)
- **404 Not Found:** Product not found
- **409 Conflict:** Race condition (stock became unavailable during transaction)
- **422 Unprocessable Entity:** Validation error

**Atomic Guarantees:**
1. **Check Phase:** FOR UPDATE lock on all products in order
2. **Verify Phase:** Stock >= requested quantity for ALL items
3. **Update Phase:** Decrement stock atomically
4. **Record Phase:** Create order, order_items, apply discount
5. **Rollback:** If any step fails, entire transaction rolls back

---

### UC2: Promotions & Discounts

#### POST /coupons/validate
**Purpose:** Validate coupon code and return discount details  
**Request Body:**
```json
{
  "code": "SUMMER10"
}
```

**Response:** 200 OK
```json
{
  "code": "SUMMER10",
  "valid": true,
  "discount_type": "percent",
  "value": 10.0,
  "expires_at": "2026-12-31T23:59:59Z",
  "remaining_uses": 50
}
```

**Error Responses:**
- **400 Bad Request:** Invalid code, expired, or usage limit exceeded

**Validation Logic:**
1. Coupon exists and code matches
2. expires_at > NOW()
3. (max_uses is NULL) OR (used_count < max_uses)

#### GET /promotions
**Purpose:** List all active promotions  
**Response:** 200 OK
```json
{
  "items": [
    {
      "id": 1,
      "code": "SUMMER10",
      "description": "Summer Sale: 10% off all orders",
      "discount_type": "percent",
      "value": 10.0,
      "expires_at": "2026-12-31T23:59:59Z",
      "remaining_uses": 50
    }
  ],
  "total": 3
}
```

**Filter:** Only includes coupons where expires_at > NOW()

---

### UC3: Inventory Management & Alerts

#### GET /inventory
**Purpose:** Get all inventory levels (ops access)  
**Access:** Ops manager only  
**Response:** 200 OK
```json
{
  "items": [
    {
      "product_id": 1,
      "product_name": "Widget A",
      "stock": 25,
      "low_stock_threshold": 10,
      "price": 29.99,
      "updated_at": "2026-07-23T10:05:00Z"
    }
  ],
  "total": 15
}
```

#### GET /inventory/low-stock
**Purpose:** Get low-stock alerts  
**Access:** Ops manager only  
**Response:** 200 OK
```json
{
  "items": [
    {
      "product_id": 2,
      "product_name": "Widget B",
      "current_stock": 3,
      "low_stock_threshold": 10,
      "urgency": "critical"  // critical if stock <= 2, else warning
    }
  ],
  "total": 2
}
```

**Urgency Calculation:**
- **critical:** stock <= (low_stock_threshold / 5) OR stock == 0
- **warning:** stock < low_stock_threshold AND not critical

#### PATCH /inventory/{product_id}
**Purpose:** Restock a product  
**Access:** Ops manager only  
**Request Body:**
```json
{
  "quantity": 50  // Number of units to ADD to stock
}
```

**Response:** 200 OK
```json
{
  "product_id": 1,
  "product_name": "Widget A",
  "stock": 75,  // Previous 25 + 50
  "low_stock_threshold": 10,
  "price": 29.99,
  "updated_at": "2026-07-23T10:15:00Z"
}
```

**Error Responses:**
- **404 Not Found:** Product not found
- **422 Unprocessable Entity:** Quantity must be positive

---

### UC4: Order Status Tracking

#### GET /orders/{order_id}
**Purpose:** Get order status and details  
**Params:** order_id (int, path)  
**Response:** 200 OK
```json
{
  "id": 123,
  "customer_id": 1,
  "status": "shipped",
  "items": [
    {
      "product_id": 1,
      "product_name": "Widget A",
      "quantity": 2,
      "price": 29.99,
      "subtotal": 59.98
    }
  ],
  "subtotal": 59.98,
  "discount_amount": 6.00,
  "total": 53.98,
  "coupon_code": "SUMMER10",
  "created_at": "2026-07-23T10:05:00Z",
  "updated_at": "2026-07-23T10:15:00Z"
}
```

**Error Responses:**
- **404 Not Found:** Order not found

#### PATCH /orders/{order_id}/status
**Purpose:** Update order status (ops only)  
**Access:** Ops manager only  
**Request Body:**
```json
{
  "status": "shipped"  // pending|confirmed|shipped|delivered
}
```

**Response:** 200 OK (returns full order object with updated status)

**Error Responses:**
- **400 Bad Request:** Invalid status or invalid transition
- **404 Not Found:** Order not found

**Valid Status Transitions:**
```
pending → confirmed → shipped → delivered
(no backward transitions)
```

#### GET /customers/{customer_id}/orders
**Purpose:** Get all orders for a customer  
**Params:** customer_id (int, path)  
**Response:** 200 OK
```json
{
  "items": [
    { /* Order object */ },
    { /* Order object */ }
  ],
  "total": 5
}
```

**Error Responses:**
- **404 Not Found:** Customer not found

---

## 5. Real-Time Stock Handling: Race Condition Prevention

### The Problem: Lost Update Anomaly

**Scenario:** Two concurrent requests for the last unit of a product
```
T1: Customer A requests 1 unit of Product X (stock=1)
T2: Customer B requests 1 unit of Product X (stock=1)

Without atomicity:
T1: READ stock=1 ✓ sufficient
T2: READ stock=1 ✓ sufficient (concurrent with T1)
T1: UPDATE stock = 0
T2: UPDATE stock = 0
Result: Both orders succeed, stock is oversold (-1 units)
```

### Solution: Database-Level Atomicity

**Strategy:** SERIALIZABLE isolation level with explicit locking

#### Atomic Order Placement Query

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Step 1: Acquire exclusive lock on all products in order
SELECT * FROM products 
WHERE id IN (1, 2, 3) 
FOR UPDATE;

-- Step 2: Check all products have sufficient stock
-- If any fails, transaction aborts here
SELECT * FROM products 
WHERE id IN (1, 2, 3) 
AND stock >= requested_qty;

-- Step 3: Decrement stock for all items (atomic update)
UPDATE products 
SET stock = stock - qty 
WHERE id = product_id 
AND stock >= qty;

-- Step 4: Create order record
INSERT INTO orders (customer_id, status, subtotal, total, ...)
VALUES (...);

-- Step 5: Create order items
INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
VALUES (...);

COMMIT;  -- All-or-nothing
```

### Implementation in FastAPI

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

def create_order_atomic(db: Session, order_request: CreateOrderRequest):
    try:
        # Begin transaction (automatic in session)
        
        # Step 1: Lock all products for update
        product_ids = [item.product_id for item in order_request.items]
        products = db.query(Product)\
            .filter(Product.id.in_(product_ids))\
            .with_for_update()\
            .all()
        
        # Validate all products exist
        if len(products) != len(product_ids):
            raise ProductNotFoundError()
        
        # Step 2: Check stock for each item
        stock_map = {p.id: p.stock for p in products}
        for item in order_request.items:
            if stock_map[item.product_id] < item.quantity:
                raise OutOfStockError(
                    product_id=item.product_id,
                    requested=item.quantity,
                    available=stock_map[item.product_id]
                )
        
        # Step 3: Decrement stock atomically
        for item in order_request.items:
            product = next(p for p in products if p.id == item.product_id)
            product.stock -= item.quantity
        
        # Step 4: Create order
        order = Order(
            customer_id=order_request.customer_id,
            status='pending',
            subtotal=calculate_subtotal(order_request.items),
            discount_amount=0,
            total=0
        )
        db.add(order)
        db.flush()  # Get order.id without committing
        
        # Step 5: Create order items
        subtotal = Decimal(0)
        for item in order_request.items:
            product = next(p for p in products if p.id == item.product_id)
            item_subtotal = product.price * item.quantity
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=product.price,
                subtotal=item_subtotal
            )
            db.add(order_item)
            subtotal += item_subtotal
        
        # Step 6: Apply coupon if provided
        discount_amount = Decimal(0)
        if order_request.coupon_code:
            coupon = db.query(Coupon)\
                .filter(Coupon.code == order_request.coupon_code)\
                .first()
            
            if coupon and is_coupon_valid(coupon):
                discount_amount = calculate_discount(coupon, subtotal)
                order.coupon_code = coupon.code
                coupon.used_count += 1
        
        # Step 7: Calculate total
        order.subtotal = subtotal
        order.discount_amount = discount_amount
        order.total = subtotal - discount_amount
        
        # Commit all changes atomically
        db.commit()
        return order
        
    except Exception as e:
        db.rollback()  # Entire transaction undone
        if isinstance(e, OutOfStockError):
            raise HTTPException(status_code=400, detail=str(e))
        elif isinstance(e, ProductNotFoundError):
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=409, detail="Race condition detected")
```

### Guarantees Provided

| Guarantee | How Achieved | Benefit |
|-----------|-------------|---------|
| **Atomicity** | SERIALIZABLE isolation + transaction wrap | All-or-nothing: no partial orders |
| **Consistency** | CHECK constraints (stock >= 0) | Stock never negative |
| **Isolation** | FOR UPDATE locks | No dirty reads, lost updates, or phantom reads |
| **Durability** | PostgreSQL WAL (Write-Ahead Log) | Committed data survives crashes |

### Timeout & Deadlock Handling

```python
from sqlalchemy.exc import OperationalError

@app.exception_handler(OperationalError)
async def handle_db_timeout(request, exc):
    if "timeout" in str(exc).lower():
        return JSONResponse(
            status_code=409,
            content={"error": "Order processing delayed. Please retry."}
        )
    raise exc
```

### Performance Considerations

**Lock Contention:** If stock is hotly contested (e.g., flash sale):
1. **Pessimistic Locking** (current): FOR UPDATE waits for locks → serializes orders → slow but safe
2. **Optimistic Locking** (alternative): Compare-and-swap with version numbers → faster, but retry logic needed

**Chosen:** Pessimistic locking for simplicity and correctness (4-hour build window).

---

## 6. Claude AI Integration Points

### Use Case: Personalized Product Recommendations

**Where:** After order placement, in "Thank You" page  
**What:** AI-generated recommendations based on order history  
**How:** Use Anthropic Claude API to analyze customer purchases

#### Integration Flow

```python
from anthropic import Anthropic

class RecommendationEngine:
    def __init__(self):
        self.client = Anthropic()
    
    async def get_recommendations(
        self,
        customer_id: int,
        order_id: int,
        db: Session
    ) -> List[Product]:
        """
        Use Claude to generate personalized recommendations
        based on order history and product catalog
        """
        
        # Step 1: Gather customer data
        customer = db.query(Customer).filter_by(id=customer_id).first()
        order_history = db.query(Order)\
            .filter_by(customer_id=customer_id)\
            .order_by(Order.created_at.desc())\
            .limit(5)\
            .all()
        
        current_order = db.query(Order)\
            .filter_by(id=order_id)\
            .first()
        
        # Step 2: Build context for Claude
        catalog = db.query(Product).all()
        
        order_descriptions = "\n".join([
            f"- {item.product_name} (${item.price})" 
            for order in order_history
            for item in order.items
        ])
        
        current_items = "\n".join([
            f"- {item.product_name} (${item.price})" 
            for item in current_order.items
        ])
        
        catalog_text = "\n".join([
            f"- {p.name} (${p.price}): {p.description}"
            for p in catalog
        ])
        
        # Step 3: Call Claude API
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": f"""
You are a product recommendation specialist for an e-commerce store.

Customer: {customer.name} ({customer.email})

Previous purchases:
{order_descriptions}

Just purchased:
{current_items}

Available products:
{catalog_text}

Based on the customer's purchase history and current order, 
recommend 3 complementary products they might like. 
Return ONLY the product names (as they appear in the catalog), 
one per line, no explanations.
"""
                }
            ]
        )
        
        # Step 4: Parse recommendations
        recommended_names = [
            name.strip() 
            for name in response.content[0].text.split('\n') 
            if name.strip()
        ]
        
        # Step 5: Fetch recommended products
        recommendations = db.query(Product)\
            .filter(Product.name.in_(recommended_names[:3]))\
            .all()
        
        return recommendations
```

#### API Endpoint

```python
@router.get("/orders/{order_id}/recommendations")
async def get_order_recommendations(
    order_id: int,
    db: Session = Depends(get_db)
) -> List[Product]:
    """Get AI-powered product recommendations based on order"""
    
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    engine = RecommendationEngine()
    recommendations = await engine.get_recommendations(
        customer_id=order.customer_id,
        order_id=order_id,
        db=db
    )
    
    return recommendations
```

#### Response Example

```json
{
  "recommendations": [
    {
      "id": 3,
      "name": "Widget C",
      "description": "Premium widget with extra durability",
      "price": 79.99,
      "stock": 20
    },
    {
      "id": 5,
      "name": "Gadget Y",
      "description": "Advanced gadget for professionals",
      "price": 99.99,
      "stock": 15
    },
    {
      "id": 1,
      "name": "Widget A",
      "description": "High-quality widget with advanced features",
      "price": 29.99,
      "stock": 45
    }
  ],
  "reason": "Based on your purchase of Widget B, these complementary products are popular with similar customers"
}
```

### Alternative Claude Integration Points

| Point | Use Case | Benefit |
|-------|----------|---------|
| **Inventory Planning** | Forecast low-stock alerts based on trends | Reduce stockouts |
| **Customer Support** | Generate responses to common order issues | 24/7 support chatbot |
| **Fraud Detection** | Identify suspicious order patterns | Prevent chargebacks |
| **Dynamic Pricing** | Suggest price adjustments based on demand | Optimize margins |
| **Marketing** | Generate promotional copy for coupons | Faster campaign creation |

---

## 7. Separation of Concerns

### Module Organization

```
backend/
├── shared/
│   ├── db.py              # Database session, connection pooling
│   ├── models.py          # SQLAlchemy ORM + Pydantic schemas
│   ├── exceptions.py      # Custom exceptions (OutOfStockError, etc.)
│   └── utils.py           # Shared utilities (validators, formatters)
│
├── uc1-browse-order/
│   ├── api/
│   │   ├── products.py    # GET /products, GET /products/:id
│   │   ├── orders.py      # POST /orders (atomic order creation)
│   │   └── models.py      # UC1-specific Pydantic models
│   ├── services/
│   │   └── order_service.py  # Business logic: stock check, order creation
│   └── tests/
│       ├── test_products.py
│       └── test_order_atomic.py
│
├── uc2-promotions/
│   ├── api/
│   │   ├── coupons.py     # POST /coupons/validate, GET /promotions
│   │   └── models.py
│   ├── services/
│   │   └── promotion_service.py  # Coupon validation, discount calc
│   └── tests/
│       └── test_coupon_validation.py
│
├── uc3-inventory/
│   ├── api/
│   │   ├── inventory.py   # GET/PATCH /inventory, alerts
│   │   └── models.py
│   ├── services/
│   │   └── inventory_service.py  # Stock query, restock, alerts
│   ├── alerts/
│   │   └── low_stock_alerter.py  # Alert logic
│   └── tests/
│       └── test_inventory.py
│
├── uc4-order-tracking/
│   ├── api/
│   │   ├── tracking.py    # GET /orders/:id, PATCH status
│   │   └── models.py
│   ├── services/
│   │   └── tracking_service.py  # Status queries, updates
│   └── tests/
│       └── test_order_tracking.py
│
├── main.py                # FastAPI app setup (imports all UCs)
├── config.py              # Environment variables
└── requirements.txt       # All dependencies
```

### Dependency Injection Pattern

```python
# shared/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Usage in Each UC

```python
# uc1-browse-order/api/orders.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from shared.db import get_db
from shared.models import Order
from uc1_browse_order.services.order_service import create_order_atomic

router = APIRouter()

@router.post("/orders")
async def create_order(
    order_request: CreateOrderRequest,
    db: Session = Depends(get_db)  # Injected
):
    return await create_order_atomic(db, order_request)
```

### Clear Boundaries

| UC | Owns | Uses From Shared | Depends On |
|----|------|------------------|-----------|
| UC1 | Product queries, order creation | models.py, db.py, exceptions.py | PostgreSQL |
| UC2 | Coupon validation, discount logic | models.py, db.py | Coupon table |
| UC3 | Inventory queries, alerts | models.py, db.py, exceptions.py | Product table |
| UC4 | Order tracking, status updates | models.py, db.py | Order/OrderItem tables |

---

## 8. Data Flow Diagrams

### Flow 1: Browse Products & Place Order (UC1 + UC2 + UC3)

```
Customer Browser
       │
       ├─ GET /products
       │         │
       │         ├─ UC1 API (products.py)
       │         │      │
       │         ├─ DB Query: SELECT * FROM products
       │         │      │
       │         └─ Response: [Product, Product, ...]
       │
       ├─ [Select 2x Widget A (stock=1)]
       │
       ├─ POST /coupons/validate {"code": "SUMMER10"}
       │         │
       │         ├─ UC2 API (coupons.py)
       │         │      │
       │         ├─ DB Query: SELECT * FROM coupons WHERE code=?
       │         │      │
       │         └─ Response: {valid: true, discount_type: percent, value: 10}
       │
       └─ POST /orders {customer_id, items, coupon_code}
                │
                ├─ UC1 API (orders.py)
                │      │
                ├─ order_service.create_order_atomic()
                │      │
                ├─ [TRANSACTION START]
                │      │
                ├─ FOR UPDATE: SELECT products WHERE id IN (1) 
                │      │
                ├─ Stock check: widget_a.stock >= 2 ? 
                │      │       YES (stock=50)
                │      │
                ├─ UPDATE products SET stock=stock-2 WHERE id=1
                │      │
                ├─ INSERT INTO orders (...)
                │      │
                ├─ INSERT INTO order_items (...)
                │      │
                ├─ Coupon validation & discount calc
                │      │
                ├─ [TRANSACTION COMMIT] ✓
                │      │
                └─ Response: Order {id: 123, status: pending, total: 89.98}
```

### Flow 2: Check Low Stock & Restock (UC3)

```
Ops Dashboard
       │
       ├─ GET /inventory/low-stock
       │         │
       │         ├─ UC3 API (inventory.py)
       │         │      │
       │         ├─ DB Query: 
       │         │    SELECT * FROM products 
       │         │    WHERE stock < low_stock_threshold
       │         │      │
       │         └─ Response: [{id: 2, name: "Widget B", stock: 3, threshold: 10}]
       │
       └─ PATCH /inventory/2 {"quantity": 50}
                │
                ├─ UC3 API (inventory.py)
                │      │
                ├─ inventory_service.restock_product(2, 50)
                │      │
                ├─ UPDATE products SET stock=stock+50 WHERE id=2
                │      │
                ├─ UPDATE products SET updated_at=NOW()
                │      │
                └─ Response: {product_id: 2, stock: 53, updated_at: ...}
```

### Flow 3: Race Condition Prevention (UC1 + UC3)

```
[Concurrent Request 1]        [Concurrent Request 2]
Customer A (qty=1)             Customer B (qty=1)
Widget X (stock=1)             Widget X (stock=1)
       │                               │
       ├─ POST /orders                 │
       │         │                     │
       │    Req 1 [BEGIN TXON]        │
       │         │                     │
       │    Req 1 [FOR UPDATE]         │
       │    Locks Widget X             │
       │    (exclusive lock)           │
       │                    ┌─ POST /orders
       │                    │       │
       │                    │  Req 2 [BEGIN TXON]
       │                    │       │
       │                    │  Req 2 [FOR UPDATE]
       │                    │  BLOCKS (waiting for lock)
       │                    │
       │    Req 1 [CHECK STOCK]
       │    stock >= 1 ? YES ✓
       │         │
       │    Req 1 [UPDATE]
       │    stock = 0
       │         │
       │    Req 1 [COMMIT] ✓
       │    Lock released
       │                    │
       │                    │  Req 2 [FOR UPDATE acquired]
       │                    │       │
       │                    │  Req 2 [CHECK STOCK]
       │                    │  stock >= 1 ? NO ✗
       │                    │       │
       │                    │  Req 2 [ROLLBACK]
       │                    │  OutOfStockError
       │                    │       │
       │                    │  Response: 400 Bad Request
       │
Result: Order 1 succeeds, Order 2 fails → Stock atomicity guaranteed!
```

---

## 9. Integration Points & Dependencies

### Cross-UC Dependencies

```
UC1 (Browse & Order)
    │
    ├─ Uses: products table, orders table, order_items table
    ├─ Integrates with UC2: Applies coupon at checkout
    ├─ Integrates with UC3: Decrements inventory atomically
    └─ Integrates with UC4: Creates order record for tracking

UC2 (Promotions)
    │
    ├─ Uses: coupons table
    ├─ Standalone for validation
    └─ Integrated with UC1: Applied at order time

UC3 (Inventory)
    │
    ├─ Uses: products table
    ├─ Triggered by UC1: Stock decrements on order
    └─ Ops interface: Manual restock, alerts

UC4 (Order Tracking)
    │
    ├─ Uses: orders table, order_items table
    ├─ Tracks orders created by UC1
    └─ Ops interface: Status updates
```

### Service Call Sequence

```python
# In UC1 order creation
async def create_order_atomic(db: Session, order_request: CreateOrderRequest):
    
    # Step 1: Validate all products exist (UC1 responsibility)
    products = db.query(Product).filter(...).all()
    
    # Step 2: Check stock atomically (UC1 responsibility)
    # This is where UC3's inventory is modified
    for product in products:
        product.stock -= item.quantity  # UC3 data affected
    
    # Step 3: Apply coupon discount (UC2 service call)
    if order_request.coupon_code:
        discount = await promotion_service.calculate_discount(
            coupon_code=order_request.coupon_code,
            subtotal=subtotal,
            db=db
        )
        order.discount_amount = discount
    
    # Step 4: Create order record (UC4 uses this data)
    db.add(order)
    db.commit()  # All changes: UC1, UC2, UC3, UC4 persist atomically
    
    return order
```

### Error Handling & Recovery

```python
# Centralized exception handling
from shared.exceptions import (
    OutOfStockError,
    ProductNotFoundError,
    InvalidCouponError,
    InvalidStatusTransitionError
)

# Each UC can raise domain-specific errors
# main.py maps them to HTTP responses

@app.exception_handler(OutOfStockError)
async def handle_out_of_stock(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": "Out of stock", "details": str(exc)}
    )

@app.exception_handler(InvalidCouponError)
async def handle_invalid_coupon(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": "Invalid coupon", "details": str(exc)}
    )
```

---

## 10. Deployment & Scaling Considerations

### Horizontal Scaling (Multiple Instances)

```
Load Balancer (nginx)
    │
    ├─ FastAPI Instance 1 (port 8001)
    ├─ FastAPI Instance 2 (port 8002)
    └─ FastAPI Instance 3 (port 8003)
         │    │    │
         └────┼────┘
              │
        PostgreSQL (shared)
        (connection pooling via PgBouncer)
```

**Connection Pool Config:**
```python
# config.py
from sqlalchemy.pool import NullPool

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Use external pooling (PgBouncer)
    # OR
    pool_size=10,        # Connections per instance
    max_overflow=20      # Overflow connections
)
```

### Database Optimization

**Index Strategy:**
```sql
-- UC1: Order placement (hot path)
CREATE INDEX idx_products_id_stock ON products(id, stock);

-- UC3: Low-stock alerts
CREATE INDEX idx_products_low_stock 
ON products(stock, low_stock_threshold);

-- UC4: Order tracking
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- UC2: Coupon validation
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at);
```

**Query Optimization:**
- Use `SELECT FOR UPDATE` only on products (not entire table)
- Batch inserts for order items (reduce round trips)
- Eager load relationships where possible

---

## 11. Testing Strategy

### Unit Tests (Per UC)

```
tests/
├── unit/
│   ├── uc1/
│   │   ├── test_product_queries.py
│   │   └── test_order_service.py
│   ├── uc2/
│   │   └── test_promotion_service.py
│   ├── uc3/
│   │   └── test_inventory_service.py
│   └── uc4/
│       └── test_tracking_service.py
```

### Integration Tests (Cross-UC)

```
tests/
├── integration/
│   ├── test_uc1_uc2_checkout_with_coupon.py
│   ├── test_uc1_uc3_stock_decrement.py
│   ├── test_uc1_uc4_order_creation.py
│   └── test_race_condition_prevention.py
```

### Concurrency Tests

```python
# test_race_condition_prevention.py
import asyncio

async def test_race_condition_last_unit():
    """
    Two concurrent requests for the last unit.
    Only one should succeed.
    """
    order1_task = asyncio.create_task(
        client.post("/orders", json={
            "customer_id": 1,
            "items": [{"product_id": 4, "quantity": 1}]  # Gadget X (stock=0) → restock to 1
        })
    )
    
    order2_task = asyncio.create_task(
        client.post("/orders", json={
            "customer_id": 2,
            "items": [{"product_id": 4, "quantity": 1}]
        })
    )
    
    results = await asyncio.gather(order1_task, order2_task)
    
    # Expect: 1 success (201), 1 failure (400 or 409)
    statuses = [r.status_code for r in results]
    assert 201 in statuses  # One succeeded
    assert (400 in statuses or 409 in statuses)  # One failed
    
    # Verify stock is still 0 (not negative)
    product = client.get("/products/4").json()
    assert product["stock"] == 0
```

---

## Summary

**Vibe Strike System Design** provides:

1. ✅ **Clear Separation of Concerns:** 4 independent UCs with shared contracts
2. ✅ **Atomic Stock Handling:** SERIALIZABLE isolation + FOR UPDATE locks prevent race conditions
3. ✅ **Scalable Architecture:** Stateless FastAPI, shared PostgreSQL, horizontal scaling ready
4. ✅ **Robust Error Handling:** Domain-specific exceptions map to HTTP responses
5. ✅ **Claude AI Integration:** Personalized recommendations post-purchase
6. ✅ **Comprehensive API:** RESTful endpoints for all 4 use cases
7. ✅ **Testable Design:** Unit, integration, and concurrency tests
8. ✅ **Production-Ready:** Connection pooling, indexes, migrations, monitoring hooks

This design enables parallel development of 4 teams while maintaining data integrity and user experience.

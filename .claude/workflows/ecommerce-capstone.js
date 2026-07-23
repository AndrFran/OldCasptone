export const meta = {
  name: 'ecommerce-capstone',
  description: 'Build Vibe Strike Order & Inventory Engine with parallel subagents',
  phases: [
    { title: 'Design', detail: 'Architecture, schema, API structure' },
    { title: 'Backend', detail: 'Order, inventory, promotion services' },
    { title: 'API', detail: 'OpenAPI spec and endpoints' },
    { title: 'Frontend', detail: 'Customer UI and ops dashboard' },
    { title: 'Integration', detail: 'E2E testing and polish' },
  ],
}

// Phase 1: Architecture & Design
phase('Design')

const architecture = await agent(
  `Design the Vibe Strike Order & Inventory Engine system. Create:
1. System architecture (services, data flow, integration points)
2. Database schema for orders, inventory, promotions, customers
3. Key entities and relationships (Product, Order, OrderItem, Inventory, Coupon, etc.)
4. API endpoint structure (list products, place order, track order, manage inventory)
5. Real-time stock handling strategy (how to prevent race conditions on last unit)
6. Claude API integration point (where/how Claude adds value)

Return structured design with clear separation of concerns.`,
  { label: 'architecture-design', phase: 'Design', schema: ARCHITECTURE_SCHEMA }
)

// Phase 2: Parallel Backend Services
phase('Backend')

const [orderService, inventoryService, promotionService, database] = await parallel([
  () => agent(
    `Implement the Order Service for Vibe Strike. Given this architecture: ${JSON.stringify(architecture)}

Build:
1. Order model with fields: id, customerId, items[], status (pending/confirmed/shipped/delivered), total, createdAt, updatedAt
2. Place order endpoint that:
   - Validates items exist and are in stock
   - Checks promotions/coupons
   - Creates order atomically (prevent race conditions)
3. Get order status endpoint
4. Update order status endpoint (for ops manager)
5. List customer orders endpoint
6. Error handling for out-of-stock, invalid coupons

Use a database layer (abstract, will be implemented separately).
Return: complete Order service code with clear API contract.`,
    { label: 'order-service', phase: 'Backend' }
  ),
  () => agent(
    `Implement the Inventory Service for Vibe Strike. Given this architecture: ${JSON.stringify(architecture)}

Build:
1. Inventory model: productId, quantity, lowStockThreshold, lastUpdated
2. Check stock endpoint (with lock/transaction awareness)
3. Reserve stock endpoint (atomic decrement for order placement)
4. Get inventory levels endpoint
5. Low-stock alert logic (query for products below threshold)
6. Restock endpoint (ops manager adds inventory)
7. Race-condition safety: use optimistic locking or database transactions

Return: complete Inventory service with concurrency handling explained.`,
    { label: 'inventory-service', phase: 'Backend' }
  ),
  () => agent(
    `Implement the Promotion/Coupon Service for Vibe Strike. Given this architecture: ${JSON.stringify(architecture)}

Build:
1. Coupon model: code, discountType (percent/fixed), value, expiresAt, maxUses, currentUses
2. Validate coupon endpoint (check expiry, usage, applicability)
3. Apply discount logic (auto-apply at checkout)
4. List active promotions endpoint
5. Create/manage coupons endpoint (ops manager)
6. Optional: Claude API integration to suggest coupons based on cart contents

Return: complete Promotion service with coupon validation and discount calculation.`,
    { label: 'promotion-service', phase: 'Backend' }
  ),
  () => agent(
    `Implement the Database layer for Vibe Strike. Given this architecture: ${JSON.stringify(architecture)}

Build:
1. Database connection setup (SQLite recommended for simplicity, or in-memory)
2. Schema migration/initialization (create all tables)
3. Transaction handling for atomic operations
4. Query helpers (getById, create, update, query with filters)
5. Connection pooling if applicable
6. Error handling and logging

Return: database setup code with schema definitions and query layer.`,
    { label: 'database-layer', phase: 'Backend' }
  ),
])

// Phase 3: API Specification & Implementation
phase('API')

const apiSpec = await agent(
  `Generate OpenAPI 3.0 spec for Vibe Strike API. Based on this architecture:
${JSON.stringify(architecture)}

Include endpoints:
1. GET /products — list all products with stock levels
2. GET /products/:id — product details
3. POST /orders — place new order
4. GET /orders/:id — get order status
5. GET /customers/:customerId/orders — list customer orders
6. PATCH /orders/:id/status — update order status
7. GET /inventory — current inventory levels (ops)
8. PATCH /inventory/:productId — restock (ops)
9. GET /inventory/low-stock — low stock alerts (ops)
10. POST /coupons/validate — validate coupon code
11. GET /promotions — list active promotions

Each endpoint must have:
- Clear description
- Request/response schemas
- Error responses (400, 404, 409 for race conditions, etc.)
- Authentication notes

Return: complete, valid OpenAPI 3.0 YAML/JSON spec.`,
  { label: 'openapi-spec', phase: 'API', schema: OPENAPI_SCHEMA }
)

// Phase 4: Frontend Implementation
phase('Frontend')

const [customerUI, opsManager] = await parallel([
  () => agent(
    `Build the Customer Frontend for Vibe Strike. Given:
Architecture: ${JSON.stringify(architecture)}
API Spec: ${JSON.stringify(apiSpec)}

Create a React/Vue/HTML customer interface with:
1. Product listing page (shows product name, price, stock status)
2. Product detail page (description, price, add to cart button)
3. Shopping cart (items, quantities, subtotal)
4. Coupon code input field at checkout
5. Order confirmation page (order ID, total, estimated delivery)
6. Order tracking page (customer can paste order ID to see status)
7. Responsive design, clean UI (client-ready appearance)

Return: complete frontend code with component structure and styling.`,
    { label: 'customer-frontend', phase: 'Frontend' }
  ),
  () => agent(
    `Build the Ops Manager Dashboard for Vibe Strike. Given:
Architecture: ${JSON.stringify(architecture)}
API Spec: ${JSON.stringify(apiSpec)}

Create an ops dashboard interface with:
1. Inventory overview (table/cards showing all products and stock levels)
2. Low-stock alerts (highlighted list of items needing reorder)
3. Restock form (input field to add inventory to products)
4. Order queue (live list of orders with status filters)
5. Order detail view (see customer info, items, tracking status)
6. Status update controls (change order from pending → shipped → delivered)
7. Basic auth/login (simple email/password)

Return: complete dashboard code with real-time data refresh logic.`,
    { label: 'ops-dashboard', phase: 'Frontend' }
  ),
])

// Phase 5: Integration & Testing
phase('Integration')

const integration = await agent(
  `Test and integrate the Vibe Strike system end-to-end. Verify:
1. Customer can browse products, add to cart, place order
2. Inventory decrements correctly on order placement
3. Race condition: two simultaneous orders for last unit → only one succeeds
4. Coupon validation and discount application
5. Ops manager sees new order in queue immediately
6. Ops manager can update order status, customer sees it tracked
7. Low-stock alerts appear when inventory crosses threshold
8. API returns proper error codes (409 for race conditions, 400 for invalid coupons)

Create:
1. Test scenarios checklist
2. Any critical integration fixes needed
3. Performance/polish notes (smooth UI, fast queries, no bugs mid-demo)
4. Architecture diagram (text or ASCII art, reflecting actual build)

Return: integration report with test results and any final patches.`,
  { label: 'integration-e2e', phase: 'Integration' }
)

// Synthesis
log('Vibe Strike capstone build complete — order service, inventory concurrency, promotions engine, customer UI, ops dashboard, and OpenAPI spec all ready')

return {
  architecture,
  services: { orderService, inventoryService, promotionService, database },
  apiSpec,
  frontend: { customerUI, opsManager },
  integration,
}

// Schema definitions
const ARCHITECTURE_SCHEMA = {
  type: 'object',
  properties: {
    systemOverview: { type: 'string' },
    services: { type: 'array', items: { type: 'object' } },
    dataFlow: { type: 'string' },
    databaseSchema: { type: 'object' },
    apiStructure: { type: 'array', items: { type: 'object' } },
    concurrencyStrategy: { type: 'string' },
    claudeIntegrationPoint: { type: 'string' },
  },
}

const OPENAPI_SCHEMA = {
  type: 'object',
  properties: {
    openapi: { type: 'string' },
    info: { type: 'object' },
    paths: { type: 'object' },
    components: { type: 'object' },
  },
}

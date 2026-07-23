-- Vibe Strike: Shared Database Schema
-- All UC teams use this schema. Do NOT add tables without team consensus.

-- ===================== Products (UC1, UC3) =====================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Customers (UC1, UC4) =====================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Orders (UC1, UC4) =====================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  -- Status enum: pending, confirmed, shipped, delivered
  subtotal DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  coupon_code VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Order Items (UC1, UC4) =====================
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Coupons (UC2) =====================
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  -- discount_type enum: 'percent' or 'fixed'
  value DECIMAL(10, 2) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  max_uses INTEGER NULL,
  -- NULL = unlimited uses
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Indexes (Performance) =====================

-- UC1 Race Condition: Atomic stock check
-- SELECT * FROM products WHERE id = :id FOR UPDATE
-- UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty
CREATE INDEX IF NOT EXISTS idx_products_id_stock ON products(id, stock);

-- UC3 Low-stock alerts
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock, low_stock_threshold);

-- UC4 Order tracking
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- UC2 Coupon lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);

-- ===================== Sample Data (Seeding) =====================

-- Insert sample products (for testing & demo)
INSERT INTO products (name, description, price, stock, low_stock_threshold)
VALUES
  ('Widget A', 'High-quality widget with advanced features', 29.99, 50, 10),
  ('Widget B', 'Standard widget for everyday use', 49.99, 5, 10),
  ('Widget C', 'Premium widget with extra durability', 79.99, 20, 10),
  ('Gadget X', 'Essential gadget for productivity', 39.99, 0, 5),
  ('Gadget Y', 'Advanced gadget for professionals', 99.99, 15, 10)
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (email, name)
VALUES
  ('alice@example.com', 'Alice Johnson'),
  ('bob@example.com', 'Bob Smith'),
  ('charlie@example.com', 'Charlie Brown')
ON CONFLICT DO NOTHING;

-- Insert sample coupons
INSERT INTO coupons (code, description, discount_type, value, expires_at, max_uses)
VALUES
  ('SUMMER10', 'Summer Sale: 10% off all orders', 'percent', 10.00, '2026-12-31 23:59:59', NULL),
  ('WELCOME20', 'Welcome discount: 20% off first order', 'percent', 20.00, '2026-12-31 23:59:59', 100),
  ('SAVE5', 'Save $5 on orders over $50', 'fixed', 5.00, '2026-12-31 23:59:59', NULL)
ON CONFLICT DO NOTHING;

-- ===================== Constraints =====================

-- Ensure stock is never negative (UC1, UC3)
ALTER TABLE products ADD CONSTRAINT check_stock_nonnegative CHECK (stock >= 0);

-- Ensure price is positive
ALTER TABLE products ADD CONSTRAINT check_price_positive CHECK (price > 0);

-- Ensure discount value is positive
ALTER TABLE coupons ADD CONSTRAINT check_discount_positive CHECK (value > 0);

-- Ensure used_count never exceeds max_uses
-- (enforced in application layer, not DB constraint for flexibility)

COMMIT;

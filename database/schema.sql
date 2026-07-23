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
  image_url TEXT,
  brand VARCHAR(100),
  team VARCHAR(100),
  color VARCHAR(50),
  silhouette VARCHAR(50),
  sale_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Users (Auth) =====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  -- user_type enum: 'customer' or 'ops_manager'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================== Customers (UC1, UC4) =====================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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

-- Insert sample products (trucker caps)
INSERT INTO products (name, description, price, stock, low_stock_threshold, image_url, brand, team, color, silhouette, sale_price)
VALUES
  ('New York Yankees 9FORTY', 'Classic trucker style with embroidered Yankees logo', 34.99, 25, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'New York Yankees', 'Navy', '9FORTY', 29.99),
  ('Los Angeles Dodgers 9FIFTY', 'Snapback trucker with blue embroidered Dodgers patch', 39.99, 18, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'Los Angeles Dodgers', 'Royal Blue', '9FIFTY', 34.99),
  ('Ducati Motor 9FORTY', 'Red trucker with embroidered Ducati crest', 42.99, 12, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'Ducati Motor', 'Red', '9FORTY', null),
  ('Boston Red Sox 9FIFTY', 'Vintage style trucker with Red Sox logo', 39.99, 22, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'Boston Red Sox', 'Dark Red', '9FIFTY', null),
  ('NFL League 9FORTY', 'Black trucker with NFL embroidered logo', 34.99, 30, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Black', '9FORTY', 29.99),
  ('San Francisco Giants 9FORTY', 'Orange and black trucker cap', 34.99, 8, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'San Francisco Giants', 'Orange', '9FORTY', null),
  ('Chicago Cubs 9FIFTY', 'Snapback style with Cubs logo embroidery', 39.99, 15, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'Chicago Cubs', 'Navy', '9FIFTY', null),
  ('Miami Heat 9FORTY', 'Sleek trucker with Heat logo', 34.99, 20, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', 'Miami Heat', 'Black', '9FORTY', 29.99),
  ('Vintage Trucker Grey', 'Classic mesh trucker cap in grey', 29.99, 35, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Grey', '9FORTY', null),
  ('Retro Mesh 9FORTY', 'Breathable mesh trucker cap', 29.99, 5, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Khaki', '9FORTY', null),
  ('Premium Leather Trucker', 'Leather-accented trucker with embroidery', 49.99, 10, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Black', '9FIFTY', 44.99),
  ('Canvas Trucker Green', 'Heavy-duty canvas construction trucker', 39.99, 18, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Olive Green', '9FORTY', null),
  ('Metallic Logo Trucker', 'Shiny metallic logo trucker cap', 44.99, 7, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Silver', '9FIFTY', 39.99),
  ('Heritage Trucker Navy', 'Classic heritage-inspired trucker design', 34.99, 28, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Navy', '9FORTY', null),
  ('Snapback Neon Trucker', 'Bright neon snapback trucker cap', 32.99, 0, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Neon Yellow', '9FIFTY', null),
  ('Premium Wool Trucker', 'Luxury wool blend trucker cap', 54.99, 6, 10, 'https://images.unsplash.com/photo-1588668214407-3dae51d46bb1?w=400', 'New Era', null, 'Burgundy', '9FORTY', 49.99)
ON CONFLICT DO NOTHING;

-- Insert sample users with hashed passwords (all passwords: password123)
INSERT INTO users (email, password_hash, user_type)
VALUES
  ('alice@example.com', '$2b$12$dcfUNStTsWxvnJssaW.zXOCfccfksR4hXFj70EyjfE1.BkWnf3JOi', 'customer'),
  ('bob@example.com', '$2b$12$CRD87FXMMdkbou8WyPzNCulVhqdncRLOi.yz/SWAs44uPtkScGLDm', 'customer'),
  ('ops1@example.com', '$2b$12$1lz7IWWeSB5/9Dv62F7tyea5bkhNeUxDeI3i7OI1pV682vyK0VDd.', 'ops_manager')
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (email, name, user_id)
VALUES
  ('alice@example.com', 'Alice Johnson', 1),
  ('bob@example.com', 'Bob Smith', 2)
ON CONFLICT DO NOTHING;

-- Insert sample coupons
INSERT INTO coupons (code, description, discount_type, value, expires_at, max_uses)
VALUES
  ('SUMMER10', 'Summer Sale: 10% off all orders', 'percent', 10.00, '2026-12-31 23:59:59', NULL),
  ('WELCOME20', 'Welcome discount: 20% off first order', 'percent', 20.00, '2026-12-31 23:59:59', 100),
  ('SAVE5', 'Save $5 on orders over $50', 'fixed', 5.00, '2026-12-31 23:59:59', NULL)
ON CONFLICT DO NOTHING;

-- ===================== Indexes for Auth =====================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- ===================== Constraints =====================

-- Ensure user_type is valid
ALTER TABLE users ADD CONSTRAINT check_user_type CHECK (user_type IN ('customer', 'ops_manager'));

-- Ensure stock is never negative (UC1, UC3)
ALTER TABLE products ADD CONSTRAINT check_stock_nonnegative CHECK (stock >= 0);

-- Ensure price is positive
ALTER TABLE products ADD CONSTRAINT check_price_positive CHECK (price > 0);

-- Ensure discount value is positive
ALTER TABLE coupons ADD CONSTRAINT check_discount_positive CHECK (value > 0);

-- Ensure used_count never exceeds max_uses
-- (enforced in application layer, not DB constraint for flexibility)

COMMIT;

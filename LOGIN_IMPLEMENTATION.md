# Login Feature Implementation - Changes Summary

## Database Schema Changes

### New `users` Table
- `id` (PK): Primary key
- `email` (UNIQUE): User email for login
- `password_hash`: bcrypt hashed password (never plaintext)
- `user_type` (CHECK): 'customer' or 'ops_manager'
- `created_at`: Timestamp

### Updated `customers` Table
- Added `user_id` (FK → users.id): Links customer profile to user account
- Customers now authenticate via users table instead of email alone

### Sample Data
Three pre-seeded demo users (all password: `password123`):
- `alice@example.com` — customer
- `bob@example.com` — customer
- `ops1@example.com` — ops_manager

## Backend Changes

### New Files
- `backend/shared/auth.py`: Auth utilities
  - `hash_password()`: bcrypt hashing
  - `verify_password()`: Password verification
  - `create_access_token()`: JWT token generation
  - `decode_token()`: JWT token parsing
  - `get_user_from_token()`: Token → User lookup

- `backend/api/auth.py`: Auth endpoints
  - `POST /auth/login`: Email + password → JWT token
  - Validates credentials, returns token + user_type

- `backend/api/inventory.py`: Inventory endpoints
  - `GET /inventory`: List all products with stock levels
  - `?low_stock_only=true`: Filter below threshold
  - Used by ops dashboard

### Updated Files
- `backend/shared/models.py`: Added User model with user_type field
- `backend/api/orders.py`: Added `GET /orders` endpoint for ops dashboard (list all orders)
- `backend/main.py`: Registered auth & inventory routers
- `backend/requirements.txt`: Added bcrypt==4.1.1, PyJWT==2.13.0

## Frontend Changes

### New Pages
- `frontend/src/pages/Login.jsx`: Login page
  - Manual email/password form
  - Quick-login buttons for all 3 demo users
  - Redirects: customers → home, ops_manager → dashboard
  - Stores JWT token & user_type in localStorage

- `frontend/src/pages/OpsDashboard.jsx`: Ops manager interface
  - **Inventory Section**: View stock levels, low-stock alerts, filter options
  - **Orders Section**: List all orders, update status via dropdown
  - Auth-protected: redirects to login if not ops_manager
  - Auto-fetches from `/inventory` & `/orders` endpoints

### Updated Files
- `frontend/src/App.jsx`: 
  - Added `/login` and `/ops-dashboard` routes
  - Conditional header/footer (hidden for ops dashboard)
  - Auth state management via localStorage

- `frontend/src/components/Header.jsx`:
  - Added Login/Logout buttons
  - Shows based on token presence

## Authentication Flow

1. **Registration**: Removed (pre-seeded users only)
2. **Login**: POST /auth/login → JWT token
3. **Protected Routes**: Check localStorage token
4. **Role-Based Redirect**:
   - customer → / (product browsing)
   - ops_manager → /ops-dashboard

## Key Security Features
- Passwords hashed with bcrypt (never stored plaintext)
- JWT tokens with 24-hour expiration
- Token stored in localStorage (accessible to frontend only)
- Bearer auth for protected endpoints

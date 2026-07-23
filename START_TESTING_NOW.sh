#!/bin/bash

# UC4 Frontend Testing - Quick Start Script
# Run this to start the frontend and begin testing

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           UC4 FRONTEND - STARTING FOR TESTING                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check backend is running
echo "✓ Checking backend health..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ Backend is running at http://localhost:8000"
else
    echo "  ❌ Backend is not responding. Start it first:"
    echo "     cd backend && uvicorn main:app --reload"
    exit 1
fi

echo ""
echo "✓ Checking frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo "  ✅ npm packages installed"
else
    echo "  ⚠️  Installing npm packages..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✓ Starting frontend dev server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Frontend starting at http://localhost:5173"
echo ""
echo "NEXT STEPS:"
echo "  1. Open browser: http://localhost:5173"
echo "  2. Go to: /order-tracking"
echo "  3. Enter Order ID: 1"
echo "  4. Click Track"
echo "  5. See order details display"
echo ""
echo "For detailed testing, see: UC4_TESTING_MANUAL.md"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start frontend
cd frontend
npm run dev

#!/bin/bash

mkdir -p docs/{onboarding,architecture/database,guides/backend-docs,api/contracts,frontend,operations,usecases/{uc1,uc2,uc3,uc4},reports,visualizations}

# Onboarding
mv START_HERE.md docs/onboarding/ 2>/dev/null
mv CLAUDE.md docs/onboarding/ 2>/dev/null  
mv README.md docs/onboarding/ 2>/dev/null
mv START_DEVELOPMENT.md docs/onboarding/ 2>/dev/null
mv PROJECT_SETUP_COMPLETE.md docs/onboarding/ 2>/dev/null

# Architecture
mv SYSTEM_DESIGN.md docs/architecture/ 2>/dev/null
mv TECH_STACK.md docs/architecture/ 2>/dev/null
mv DATABASE_IMPLEMENTATION.md docs/architecture/ 2>/dev/null
mv RACE_CONDITION_PREVENTION.md docs/architecture/ 2>/dev/null
mv SCHEMA_IMPROVEMENTS.md docs/architecture/ 2>/dev/null
mv DATABASE_INDEX.md docs/architecture/ 2>/dev/null
mv DOCUMENT_INDEX.md docs/architecture/ 2>/dev/null
[ -f database/README.md ] && mv database/README.md docs/architecture/database/ 2>/dev/null
[ -f database/SCHEMA.md ] && mv database/SCHEMA.md docs/architecture/database/ 2>/dev/null

# API
mv UC2_API_EXAMPLES.md docs/api/ 2>/dev/null
[ -f api-contracts/README.md ] && mv api-contracts/README.md docs/api/contracts/ 2>/dev/null

# Frontend
mv CUSTOMER_FRONTEND_GUIDE.md docs/frontend/ 2>/dev/null
mv FRONTEND_DELIVERY.md docs/frontend/ 2>/dev/null
mv FRONTEND_INDEX.md docs/frontend/ 2>/dev/null
mv FRONTEND_QUICK_REFERENCE.md docs/frontend/ 2>/dev/null
mv FRONTEND_MANIFEST.txt docs/frontend/ 2>/dev/null
mv UI_DECISIONS.md docs/frontend/ 2>/dev/null
mv UI_STYLE_GUIDE.md docs/frontend/ 2>/dev/null

# Guides
mv INTEGRATION_GUIDE.md docs/guides/ 2>/dev/null
mv PARALLEL_DEVELOPMENT.md docs/guides/ 2>/dev/null
mv DATABASE_SETUP_COMPLETE.md docs/guides/ 2>/dev/null
mv PLAYWRIGHT_TDD_SETUP.md docs/guides/ 2>/dev/null
mv INTEGRATION_FIXES.md docs/guides/ 2>/dev/null
mv INTEGRATION_REPORT.md docs/guides/ 2>/dev/null
[ -f backend/QUICKSTART.md ] && mv backend/QUICKSTART.md docs/guides/backend-docs/ 2>/dev/null
[ -f backend/services/README.md ] && mv backend/services/README.md docs/guides/backend-docs/services.md 2>/dev/null

# Operations
mv OPS_DASHBOARD_DELIVERY.md docs/operations/ 2>/dev/null
mv OPS_MANAGER_IMPLEMENTATION.md docs/operations/ 2>/dev/null
mv DEMO_CHECKLIST.md docs/operations/ 2>/dev/null
mv DEPLOYMENT_STATUS.md docs/operations/ 2>/dev/null
mv OPS_DASHBOARD_SUMMARY.txt docs/operations/ 2>/dev/null

# Use Cases - only move documentation, not code folders
[ -f backend/uc1-browse-order/README.md ] && mv backend/uc1-browse-order/README.md docs/usecases/uc1/ 2>/dev/null
[ -f backend/uc2-promotions/README.md ] && mv backend/uc2-promotions/README.md docs/usecases/uc2/ 2>/dev/null
mv UC2_DELIVERY_INDEX.md docs/usecases/uc2/ 2>/dev/null
mv UC2_IMPLEMENTATION_SUMMARY.md docs/usecases/uc2/ 2>/dev/null
mv UC2_QUICK_REFERENCE.md docs/usecases/uc2/ 2>/dev/null
[ -f backend/uc3-inventory/README.md ] && mv backend/uc3-inventory/README.md docs/usecases/uc3/ 2>/dev/null
[ -f backend/uc3-inventory/QUICK_REFERENCE.md ] && mv backend/uc3-inventory/QUICK_REFERENCE.md docs/usecases/uc3/ 2>/dev/null
[ -f backend/uc3-inventory/CONCURRENCY_DESIGN.md ] && mv backend/uc3-inventory/CONCURRENCY_DESIGN.md docs/usecases/uc3/ 2>/dev/null
[ -f backend/uc3-inventory/INTEGRATION_GUIDE.md ] && mv backend/uc3-inventory/INTEGRATION_GUIDE.md docs/usecases/uc3/ 2>/dev/null
[ -f backend/uc4-order-tracking/README.md ] && mv backend/uc4-order-tracking/README.md docs/usecases/uc4/ 2>/dev/null

# Reports
mv PROJECT_ANALYSIS.md docs/reports/ 2>/dev/null
mv PROGRESS_REPORT.md docs/reports/ 2>/dev/null
mv DELIVERABLES.md docs/reports/ 2>/dev/null
mv ORDER_SERVICE_DELIVERABLES.md docs/reports/ 2>/dev/null
mv ORDER_SERVICE_INTEGRATION.md docs/reports/ 2>/dev/null
mv ORDER_SERVICE_SUMMARY.md docs/reports/ 2>/dev/null
mv INSTALLATION_SUMMARY.txt docs/reports/ 2>/dev/null
mv SETUP_SUMMARY.txt docs/reports/ 2>/dev/null
mv MERGE_VERIFICATION_REPORT.txt docs/reports/ 2>/dev/null
mv PLAYWRIGHT_QUICK_START.txt docs/reports/ 2>/dev/null

# Visualizations
mv erd-visualization.html docs/visualizations/ 2>/dev/null
mv database-schema-viz.html docs/visualizations/ 2>/dev/null

echo "✓ Документація організована"

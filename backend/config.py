# Shared Backend Configuration
# Used by all UC teams

import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/vibestrike"
)

# FastAPI
API_TITLE = "Vibe Strike E-Commerce API"
API_VERSION = "1.0.0"
API_DESCRIPTION = "Order & Inventory Engine for mid-size retailer"

# Environment
ENV = os.getenv("ENV", "development")
DEBUG = ENV == "development"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

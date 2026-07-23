# Shared Backend Configuration
# Used by all UC teams

import os
from dotenv import load_dotenv

load_dotenv()

# Database
# Use SQLite for simplicity in development (auto-creates vibestrike.db)
# Switch to PostgreSQL URL in production: postgresql://user:password@host:5432/vibestrike
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./vibestrike.db"  # SQLite for dev/testing (auto-creates)
)

# Database settings
DB_ECHO = os.getenv("DB_ECHO", "False").lower() == "true"  # Log SQL statements
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))
DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "True").lower() == "true"

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

# Claude AI Integration
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"

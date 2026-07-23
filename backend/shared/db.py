# Shared Database Connection Layer
# All UC teams use this for database access

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging

logger = logging.getLogger(__name__)

# Import config
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_URL

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for getting database session.

    Usage in UC teams:
    @app.get("/products")
    async def list_products(db: Session = Depends(get_db)):
        products = db.query(Product).all()
        return products
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database (create all tables)"""
    from models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized")


def get_session() -> Session:
    """Get a database session (non-async usage)"""
    return SessionLocal()

# Shared Database Connection Layer
# All UC teams use this for database access
# Features: connection pooling, transaction handling, atomic operations

from sqlalchemy import create_engine, event, text, __version__ as sqlalchemy_version, inspect
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import StaticPool, QueuePool
from typing import Generator, Optional, Type, TypeVar, List, Any
import logging
import sys
import os

logger = logging.getLogger(__name__)

# Import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_URL, DB_ECHO, DB_POOL_SIZE, DB_POOL_RECYCLE, DB_POOL_PRE_PING

# ==================== Engine Configuration ====================
# Use appropriate pool based on database type
is_sqlite = "sqlite" in DATABASE_URL
pool_class = StaticPool if is_sqlite else QueuePool

engine = create_engine(
    DATABASE_URL,
    echo=DB_ECHO,  # Set to True for SQL logging
    poolclass=pool_class,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    **(
        {}
        if is_sqlite
        else {
            "pool_size": DB_POOL_SIZE,
            "max_overflow": DB_POOL_SIZE,
            "pool_recycle": DB_POOL_RECYCLE,
            "pool_pre_ping": DB_POOL_PRE_PING,
        }
    ),
)

# Enable foreign keys for SQLite
if is_sqlite:

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
ScopedSession = scoped_session(SessionLocal)

T = TypeVar("T")


# ==================== Dependency Injection ====================
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


# ==================== Database Initialization ====================
def init_db():
    """Initialize database (create all tables)"""
    from shared.models import Base

    logger.info(f"Using SQLAlchemy {sqlalchemy_version}")
    logger.info(f"Database URL: {DATABASE_URL}")

    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized with all tables")

    # Log table info
    inspector_obj = inspect(engine)
    tables = inspector_obj.get_table_names()
    logger.info(f"Tables created: {', '.join(tables)}")


def drop_db():
    """Drop all tables (for testing/reset)"""
    from shared.models import Base

    logger.warning("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    logger.warning("All tables dropped")


def get_session() -> Session:
    """Get a database session (non-async usage)"""
    return SessionLocal()


# ==================== Query Helpers ====================
class DatabaseManager:
    """Helper class for common database operations"""

    @staticmethod
    def get_by_id(session: Session, model: Type[T], id: int) -> Optional[T]:
        """Get a record by ID"""
        return session.query(model).filter(model.id == id).first()

    @staticmethod
    def get_all(
        session: Session, model: Type[T], skip: int = 0, limit: int = 100
    ) -> tuple[List[T], int]:
        """Get all records with pagination, returns (items, total_count)"""
        query = session.query(model)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def create(session: Session, model: Type[T], **kwargs) -> T:
        """Create a new record"""
        instance = model(**kwargs)
        session.add(instance)
        session.commit()
        session.refresh(instance)
        return instance

    @staticmethod
    def update(session: Session, model: Type[T], id: int, **kwargs) -> Optional[T]:
        """Update a record by ID"""
        instance = session.query(model).filter(model.id == id).first()
        if instance:
            for key, value in kwargs.items():
                setattr(instance, key, value)
            session.commit()
            session.refresh(instance)
        return instance

    @staticmethod
    def delete(session: Session, model: Type[T], id: int) -> bool:
        """Delete a record by ID"""
        instance = session.query(model).filter(model.id == id).first()
        if instance:
            session.delete(instance)
            session.commit()
            return True
        return False

    @staticmethod
    def filter(
        session: Session, model: Type[T], skip: int = 0, limit: int = 100, **filters
    ) -> tuple[List[T], int]:
        """Query with filters, returns (items, total_count)"""
        query = session.query(model)
        for key, value in filters.items():
            if hasattr(model, key):
                query = query.filter(getattr(model, key) == value)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total


# ==================== Transaction Management ====================
class AtomicTransaction:
    """
    Context manager for atomic database operations
    Implements SERIALIZABLE isolation for race-condition prevention
    """

    def __init__(self, session: Session, isolation_level: str = "SERIALIZABLE"):
        self.session = session
        self.isolation_level = isolation_level
        self.transaction = None

    def __enter__(self):
        """Start transaction with specified isolation level"""
        try:
            # Set isolation level for non-SQLite databases
            if "sqlite" not in DATABASE_URL:
                self.session.connection().connection.set_isolation_level(
                    self.isolation_level
                )
            self.transaction = self.session.begin_nested()
            logger.debug(f"Transaction started: {self.isolation_level}")
        except Exception as e:
            logger.error(f"Failed to start transaction: {e}")
            raise
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Commit or rollback transaction"""
        if exc_type is not None:
            self.session.rollback()
            logger.warning(f"Transaction rolled back due to {exc_type.__name__}: {exc_val}")
            return False
        else:
            try:
                self.session.commit()
                logger.debug("Transaction committed")
            except Exception as e:
                self.session.rollback()
                logger.error(f"Transaction commit failed: {e}")
                raise
        return True


# ==================== Error Handling ====================
class DatabaseError(Exception):
    """Base database error"""

    pass


class RecordNotFoundError(DatabaseError):
    """Record not found"""

    pass


class IntegrityError(DatabaseError):
    """Integrity constraint violation"""

    pass


class OutOfStockError(DatabaseError):
    """Out of stock error for inventory operations"""

    def __init__(self, product_id: int, requested: int, available: int):
        self.product_id = product_id
        self.requested = requested
        self.available = available
        super().__init__(
            f"Out of stock: Product {product_id}, requested {requested}, available {available}"
        )


class RaceConditionError(DatabaseError):
    """Race condition detected (concurrent modification)"""

    pass


logger.info("✅ Database module loaded")

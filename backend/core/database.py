"""
Database setup and initialization
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from backend.core.config import settings

Base = declarative_base()

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def init_db() -> None:
    """Initialize database tables"""
    # Import models to ensure they're registered with Base
    from backend.models import MediaPath  # noqa: F401
    from backend.models.collection import Movie, TVShow, Season, Episode  # noqa: F401
    
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

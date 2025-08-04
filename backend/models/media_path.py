"""
Media path database model
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from backend.core.database import Base


class MediaPath(Base):
    """Media path configuration model"""
    __tablename__ = "media_paths"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    path = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # 'movies', 'tv', 'downloads'
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<MediaPath(id={self.id}, name='{self.name}', type='{self.media_type}', path='{self.path}')>"

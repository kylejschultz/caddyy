
"""
Database models for the media collection.
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, BigInteger, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    title = Column(String, index=True)
    overview = Column(String)
    poster_url = Column(String)
    backdrop_url = Column(String)
    rating = Column(Float)
    year = Column(Integer)
    runtime = Column(Integer)
    
    # Tracking
    monitored = Column(Boolean, default=True)
    downloaded = Column(Boolean, default=False)
    path = Column(String)

class TVShow(Base):
    __tablename__ = "tv_shows"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    title = Column(String, index=True)
    overview = Column(String)
    poster_url = Column(String)
    backdrop_url = Column(String)
    rating = Column(Float)
    year = Column(Integer)
    
    # TMDB metadata (stored for quick access)
    tmdb_total_episodes = Column(Integer, default=0)  # Total episodes from TMDB
    tmdb_season_count = Column(Integer, default=0)    # Total seasons from TMDB

    # Local file tracking
    folder_path = Column(String)  # Path to show folder
    total_size = Column(BigInteger, default=0)  # Total size in bytes

    # Tracking
    monitored = Column(Boolean, default=True)
    monitoring_option = Column(String, default='All')  # 'All', 'None', 'Existing', 'First Season', 'Latest Season'
    
    seasons = relationship("Season", back_populates="show", cascade="all, delete-orphan")

class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    show_id = Column(Integer, ForeignKey("tv_shows.id"))
    season_number = Column(Integer)
    title = Column(String)
    overview = Column(String)
    poster_url = Column(String)
    
    # TMDB metadata
    tmdb_episode_count = Column(Integer, default=0)  # Total episodes in this season from TMDB
    
    # Tracking
    monitored = Column(Boolean, default=True)

    show = relationship("TVShow", back_populates="seasons")
    episodes = relationship("Episode", back_populates="season", cascade="all, delete-orphan")

class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"))
    episode_number = Column(Integer)
    title = Column(String)
    overview = Column(String)
    air_date = Column(String)
    runtime = Column(Integer)  # Runtime in minutes

    # Local file tracking
    file_path = Column(String)  # Full path to episode file
    file_name = Column(String)  # Episode filename
    file_size = Column(BigInteger)  # File size in bytes
    quality = Column(String)  # Video quality (1080p, 720p, etc.)
    release_group = Column(String)  # Release group name

    # Tracking
    monitored = Column(Boolean, default=True)
    downloaded = Column(Boolean, default=False)
    path = Column(String)  # Legacy field, kept for compatibility

    season = relationship("Season", back_populates="episodes")


# Configuration Models
class ConfigSetting(Base):
    __tablename__ = "config_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    section = Column(String, index=True)  # e.g., 'general', 'tv', 'movies'
    description = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


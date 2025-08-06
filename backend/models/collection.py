
"""
Database models for the media collection.
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
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

    # Tracking
    monitored = Column(Boolean, default=True)
    
    seasons = relationship("Season", back_populates="show")

class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    show_id = Column(Integer, ForeignKey("tv_shows.id"))
    season_number = Column(Integer)
    title = Column(String)
    overview = Column(String)
    poster_url = Column(String)
    
    # Tracking
    monitored = Column(Boolean, default=True)

    show = relationship("TVShow", back_populates="seasons")
    episodes = relationship("Episode", back_populates="season")

class Episode(Base):
    __tablename__ = "episodes"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id"))
    episode_number = Column(Integer)
    title = Column(String)
    overview = Column(String)
    air_date = Column(String)

    # Tracking
    monitored = Column(Boolean, default=True)
    downloaded = Column(Boolean, default=False)
    path = Column(String)

    season = relationship("Season", back_populates="episodes")


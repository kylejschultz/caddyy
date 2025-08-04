"""
Media path Pydantic schemas
"""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


MediaType = Literal["movies", "tv", "downloads"]


class MediaPathBase(BaseModel):
    """Base media path schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Display name for the media path")
    path: str = Field(..., min_length=1, description="Filesystem path to the media directory")
    media_type: MediaType = Field(..., description="Type of media: movies, tv, or downloads")
    enabled: bool = Field(default=True, description="Whether this path is active")


class MediaPathCreate(MediaPathBase):
    """Schema for creating a new media path"""
    pass


class MediaPathUpdate(BaseModel):
    """Schema for updating an existing media path"""
    name: str | None = Field(None, min_length=1, max_length=100)
    path: str | None = Field(None, min_length=1)
    media_type: MediaType | None = None
    enabled: bool | None = None


class MediaPathResponse(MediaPathBase):
    """Schema for media path API responses"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

"""
Media paths API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.core.database import get_db
from backend.models.media_path import MediaPath
from backend.schemas.media_path import MediaPathCreate, MediaPathUpdate, MediaPathResponse

router = APIRouter()


@router.get("/", response_model=List[MediaPathResponse])
async def get_media_paths(db: Session = Depends(get_db)):
    """Get all media paths"""
    return db.query(MediaPath).all()


@router.get("/{path_id}", response_model=MediaPathResponse)
async def get_media_path(path_id: int, db: Session = Depends(get_db)):
    """Get a specific media path by ID"""
    path = db.query(MediaPath).filter(MediaPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Media path not found")
    return path


@router.post("/", response_model=MediaPathResponse, status_code=201)
async def create_media_path(path_data: MediaPathCreate, db: Session = Depends(get_db)):
    """Create a new media path"""
    # Check if path already exists
    existing = db.query(MediaPath).filter(
        MediaPath.path == path_data.path,
        MediaPath.media_type == path_data.media_type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Media path already exists for {path_data.media_type}: {path_data.path}"
        )
    
    # Create new media path
    db_path = MediaPath(**path_data.model_dump())
    db.add(db_path)
    db.commit()
    db.refresh(db_path)
    return db_path


@router.put("/{path_id}", response_model=MediaPathResponse)
async def update_media_path(
    path_id: int,
    path_data: MediaPathUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing media path"""
    db_path = db.query(MediaPath).filter(MediaPath.id == path_id).first()
    if not db_path:
        raise HTTPException(status_code=404, detail="Media path not found")
    
    # Update only provided fields
    update_data = path_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_path, field, value)
    
    db.commit()
    db.refresh(db_path)
    return db_path


@router.delete("/{path_id}")
async def delete_media_path(path_id: int, db: Session = Depends(get_db)):
    """Delete a media path"""
    db_path = db.query(MediaPath).filter(MediaPath.id == path_id).first()
    if not db_path:
        raise HTTPException(status_code=404, detail="Media path not found")
    
    db.delete(db_path)
    db.commit()
    return {"message": f"Media path '{db_path.name}' deleted successfully"}


@router.get("/type/{media_type}", response_model=List[MediaPathResponse])
async def get_media_paths_by_type(media_type: str, db: Session = Depends(get_db)):
    """Get all media paths of a specific type"""
    if media_type not in ["movies", "tv", "downloads"]:
        raise HTTPException(status_code=400, detail="Invalid media type")
    
    return db.query(MediaPath).filter(MediaPath.media_type == media_type).all()


@router.get("/enabled/true", response_model=List[MediaPathResponse])
async def get_enabled_media_paths(db: Session = Depends(get_db)):
    """Get all enabled media paths"""
    return db.query(MediaPath).filter(MediaPath.enabled == True).all()

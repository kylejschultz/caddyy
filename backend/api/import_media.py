"""
Import API endpoints for scanning and importing media libraries
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import asyncio
import json
from datetime import datetime

from backend.core.yaml_config import config_manager
from backend.core.database import get_db
from backend.services.media_scanner import media_scanner, ScannedTVShow, ScannedMovie
from backend.services.media_matcher import media_matcher, TVShowMatch, MovieMatch, ImportPreview
from backend.services.file_organizer import file_organizer, RenameOperation
from backend.services.tmdb_service import MediaResult
from backend.models.collection import TVShow, Season, Episode
from sqlalchemy.orm import Session

router = APIRouter()

# In-memory storage for import sessions (in production, use Redis or database)
import_sessions: Dict[str, Dict] = {}

class ImportSessionRequest(BaseModel):
    media_type: str  # "tv" or "movies"
    library_paths: List[str]

class ImportSessionStatus(BaseModel):
    session_id: str
    status: str  # "scanning", "matching", "preview", "importing", "complete", "error"
    progress: float  # 0.0 to 1.0
    message: str
    scanned_count: int = 0
    matched_count: int = 0
    error_message: Optional[str] = None

class ImportPreviewResponse(BaseModel):
    session_id: str
    preview: Dict[str, Any]  # Serialized ImportPreview
    status: str

class ManualMatchRequest(BaseModel):
    session_id: str
    item_index: int
    selected_tmdb_id: Optional[int] = None
    custom_search: Optional[str] = None

class ImportExecuteRequest(BaseModel):
    session_id: str
    confirmed_matches: List[Dict[str, Any]]

@router.post("/start-session", response_model=ImportSessionStatus)
async def start_import_session(
    request: ImportSessionRequest,
    background_tasks: BackgroundTasks
) -> ImportSessionStatus:
    """Start a new media import session"""
    
    # Validate media type
    if request.media_type not in ["tv", "movies"]:
        raise HTTPException(status_code=400, detail="Media type must be 'tv' or 'movies'")
    
    # Validate library paths
    if not request.library_paths:
        raise HTTPException(status_code=400, detail="At least one library path is required")
    
    # Get configuration to validate paths
    config = config_manager.get_config()
    
    # For TV shows, check configured TV paths
    if request.media_type == "tv":
        configured_paths = [path.path for path in config.tv.library_paths]
        for path in request.library_paths:
            if path not in configured_paths:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Path '{path}' is not configured as a TV library path"
                )
    
    # For movies, check configured movie paths  
    elif request.media_type == "movies":
        configured_paths = [path.path for path in config.movies.library_paths]
        for path in request.library_paths:
            if path not in configured_paths:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Path '{path}' is not configured as a movie library path"
                )
    
    # Generate session ID
    session_id = f"import_{request.media_type}_{int(datetime.now().timestamp())}"
    
    # Initialize session
    import_sessions[session_id] = {
        "media_type": request.media_type,
        "library_paths": request.library_paths,
        "status": "scanning",
        "progress": 0.0,
        "message": "Starting scan...",
        "scanned_count": 0,
        "matched_count": 0,
        "scanned_items": [],
        "matches": [],
        "created_at": datetime.now()
    }
    
    # Start background scanning task
    background_tasks.add_task(scan_and_match_media, session_id)
    
    return ImportSessionStatus(
        session_id=session_id,
        status="scanning",
        progress=0.0,
        message="Starting scan...",
        scanned_count=0,
        matched_count=0
    )

@router.get("/session/{session_id}/status", response_model=ImportSessionStatus)
async def get_session_status(session_id: str) -> ImportSessionStatus:
    """Get the status of an import session"""
    
    if session_id not in import_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = import_sessions[session_id]
    
    return ImportSessionStatus(
        session_id=session_id,
        status=session["status"],
        progress=session["progress"],
        message=session["message"],
        scanned_count=session["scanned_count"],
        matched_count=session["matched_count"],
        error_message=session.get("error_message")
    )

@router.get("/session/{session_id}/preview", response_model=ImportPreviewResponse)
async def get_import_preview(session_id: str) -> ImportPreviewResponse:
    """Get the import preview for a session"""
    
    if session_id not in import_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = import_sessions[session_id]
    
    if session["status"] not in ["preview", "complete"]:
        raise HTTPException(status_code=400, detail="Session is not ready for preview")
    
    # Serialize the preview data
    matches = session["matches"]
    preview_data = serialize_import_preview(matches, session["media_type"])
    
    return ImportPreviewResponse(
        session_id=session_id,
        preview=preview_data,
        status=session["status"]
    )

@router.post("/session/{session_id}/manual-match")
async def set_manual_match(session_id: str, request: ManualMatchRequest):
    """Set a manual match for an item"""
    
    if session_id not in import_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = import_sessions[session_id]
    matches = session["matches"]
    
    if request.item_index >= len(matches):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    match = matches[request.item_index]
    
    if request.selected_tmdb_id:
        # Find the selected match in the TMDB matches
        selected_match = None
        for tmdb_match in match.tmdb_matches:
            if tmdb_match.id == request.selected_tmdb_id:
                selected_match = tmdb_match
                break
        
        if not selected_match:
            raise HTTPException(status_code=400, detail="Selected TMDB ID not found in matches")
        
        match.selected_match = selected_match
        match.match_status = "manual"
    
    elif request.custom_search:
        # Perform custom search
        try:
            search_results = await media_matcher.search_manual_match(
                request.custom_search, 
                session["media_type"]
            )
            
            # Update the match with new search results
            match.tmdb_matches = search_results[:10]  # Top 10 results
            match.match_status = "pending"
            
            return {"status": "search_updated", "results": len(search_results)}
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    
    else:
        # Skip this item
        match.match_status = "skipped"
    
    return {"status": "updated"}

@router.post("/session/{session_id}/execute")
async def execute_import(
    session_id: str,
    background_tasks: BackgroundTasks
):
    """Execute the import with all matched shows"""
    
    if session_id not in import_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = import_sessions[session_id]
    
    if session["status"] != "preview":
        raise HTTPException(status_code=400, detail="Session is not ready for import")
    
    # Update session status
    session["status"] = "importing"
    session["message"] = "Importing matched shows..."
    session["progress"] = 0.0
    
    # Start background import task
    background_tasks.add_task(execute_import_task, session_id, [])
    
    return {"status": "started", "message": "Import started"}

@router.delete("/session/{session_id}")
async def cancel_session(session_id: str):
    """Cancel and clean up an import session"""
    
    if session_id not in import_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remove session
    del import_sessions[session_id]
    
    return {"status": "cancelled"}

@router.get("/session/{session_id}/rename-operations")
async def get_rename_operations(session_id: str):
    """Get suggested rename operations for scanned files"""
    
    if session_id not in import_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = import_sessions[session_id]
    
    if not session.get("scanned_items"):
        raise HTTPException(status_code=400, detail="No scanned items found")
    
    media_type = session["media_type"]
    scanned_items = session["scanned_items"]
    library_paths = session["library_paths"]
    
    # Generate rename operations
    operations = []
    
    if media_type == "tv":
        # Use the first library path as base for organizing
        base_path = library_paths[0] if library_paths else "/tv"
        operations = file_organizer.generate_tv_rename_operations(scanned_items, base_path)
    else:
        base_path = library_paths[0] if library_paths else "/movies"
        operations = file_organizer.generate_movie_rename_operations(scanned_items, base_path)
    
    # Validate operations
    validation_results = file_organizer.validate_rename_operations(operations)
    
    # Serialize operations for response
    serialized_operations = []
    for op in operations:
        serialized_operations.append({
            "current_path": op.current_path,
            "suggested_path": op.suggested_path,
            "current_name": op.current_name,
            "suggested_name": op.suggested_name,
            "operation_type": op.operation_type,
            "show_name": op.show_name,
            "season_number": op.season_number,
            "episode_number": op.episode_number,
            "needs_confirmation": op.needs_confirmation
        })
    
    return {
        "operations": serialized_operations,
        "validation": validation_results,
        "total_operations": len(operations)
    }

@router.get("/sessions")
async def list_sessions():
    """List all active import sessions"""
    
    sessions = []
    for session_id, session_data in import_sessions.items():
        sessions.append({
            "session_id": session_id,
            "media_type": session_data["media_type"],
            "status": session_data["status"],
            "progress": session_data["progress"],
            "created_at": session_data["created_at"].isoformat()
        })
    
    return {"sessions": sessions}

# Background tasks

async def scan_and_match_media(session_id: str):
    """Background task to scan and match media"""
    try:
        session = import_sessions[session_id]
        media_type = session["media_type"]
        library_paths = session["library_paths"]
        
        # Update progress callback
        async def update_progress(message: str, current: int, total: int):
            if session_id in import_sessions:
                session["message"] = message
                session["progress"] = current / total if total > 0 else 0.0
        
        # Phase 1: Scan files
        session["status"] = "scanning"
        session["message"] = "Scanning library..."
        
        if media_type == "tv":
            scanned_items = await media_scanner.scan_tv_library(
                library_paths, 
                progress_callback=update_progress
            )
        else:
            scanned_items = await media_scanner.scan_movie_library(
                library_paths,
                progress_callback=update_progress
            )
        
        session["scanned_items"] = scanned_items
        session["scanned_count"] = len(scanned_items)
        
        # Phase 2: Match with TMDB
        session["status"] = "matching"
        session["message"] = "Matching with TMDB..."
        session["progress"] = 0.0
        
        if media_type == "tv":
            matches = await media_matcher.match_tv_shows(
                scanned_items,
                progress_callback=update_progress
            )
        else:
            matches = await media_matcher.match_movies(
                scanned_items,
                progress_callback=update_progress
            )
        
        session["matches"] = matches
        session["matched_count"] = sum(1 for m in matches if m.match_status == "matched")
        
        # Phase 3: Ready for preview
        session["status"] = "preview"
        session["message"] = "Ready for review"
        session["progress"] = 1.0
        
    except Exception as e:
        session["status"] = "error"
        session["error_message"] = str(e)
        session["message"] = f"Error: {str(e)}"
        print(f"Error in scan_and_match_media for session {session_id}: {e}")

async def execute_import_task(session_id: str, confirmed_matches: List[Dict]):
    """Background task to execute the import"""
    try:
        session = import_sessions[session_id]
        matches = session["matches"]
        
        # Get database session
        from backend.core.database import SessionLocal
        db = SessionLocal()
        
        try:
            imported_count = 0
            total_matches = len(matches)
            
            for i, match in enumerate(matches):
                if match.match_status not in ["matched", "manual"] or not match.selected_match:
                    continue
                    
                session["message"] = f"Importing {match.selected_match.title}..."
                session["progress"] = (i + 1) / total_matches
                
                # Check if show already exists
                existing_show = db.query(TVShow).filter(
                    TVShow.tmdb_id == match.selected_match.id
                ).first()
                
                if existing_show:
                    print(f"Show {match.selected_match.title} already exists, skipping")
                    continue
                
                # Create TV show record
                tv_show = TVShow(
                    tmdb_id=match.selected_match.id,
                    title=match.selected_match.title,
                    overview=match.selected_match.overview,
                    poster_url=match.selected_match.poster_url,
                    rating=match.selected_match.rating,
                    year=match.selected_match.year,
                    folder_path=match.scanned_show.folder_path,
                    total_size=0,  # Will calculate below
                    monitored=True
                )
                
                db.add(tv_show)
                db.flush()  # Get the ID
                
                # Create seasons and episodes
                total_size = 0
                
                for scanned_season in match.scanned_show.seasons:
                    # Create season record
                    season = Season(
                        show_id=tv_show.id,
                        season_number=scanned_season.season_number,
                        title=f"Season {scanned_season.season_number}",
                        monitored=True
                    )
                    
                    db.add(season)
                    db.flush()  # Get the ID
                    
                    # Create episode records
                    for scanned_episode in scanned_season.episodes:
                        episode = Episode(
                            season_id=season.id,
                            episode_number=scanned_episode.episode_number,
                            title=scanned_episode.episode_title or f"Episode {scanned_episode.episode_number}",
                            file_path=scanned_episode.file_path,
                            file_name=scanned_episode.file_name,
                            file_size=scanned_episode.file_size,
                            quality=scanned_episode.quality,
                            release_group=scanned_episode.release_group,
                            downloaded=True,  # We have the file
                            monitored=True
                        )
                        
                        db.add(episode)
                        total_size += scanned_episode.file_size
                
                # Update total size
                tv_show.total_size = total_size
                imported_count += 1
                
                await asyncio.sleep(0.1)  # Small delay for progress
            
            db.commit()
            
            # Complete
            session["status"] = "complete"
            session["message"] = f"Import complete! {imported_count} shows imported."
            session["progress"] = 1.0
            
        finally:
            db.close()
        
    except Exception as e:
        session["status"] = "error"
        session["error_message"] = str(e)
        session["message"] = f"Import error: {str(e)}"
        print(f"Error in execute_import_task for session {session_id}: {e}")
        import traceback
        traceback.print_exc()

def serialize_import_preview(matches: List, media_type: str) -> Dict[str, Any]:
    """Serialize import preview data for JSON response"""
    serialized_matches = []
    
    for match in matches:
        if media_type == "tv":
            scanned_item = {
                "show_name": match.scanned_show.show_name,
                "show_year": match.scanned_show.show_year,
                "folder_path": match.scanned_show.folder_path,
                "total_episodes": match.scanned_show.total_episodes,
                "seasons": [
                    {
                        "season_number": season.season_number,
                        "episode_count": len(season.episodes),
                        "folder_path": season.folder_path
                    }
                    for season in match.scanned_show.seasons
                ]
            }
        else:
            scanned_item = {
                "title": match.scanned_movie.title,
                "year": match.scanned_movie.year,
                "file_path": match.scanned_movie.file_path,
                "file_name": match.scanned_movie.file_name,
                "file_size": match.scanned_movie.file_size,
                "quality": match.scanned_movie.quality
            }
        
        tmdb_matches = [
            {
                "id": tmdb_match.id,
                "title": tmdb_match.title,
                "year": tmdb_match.year,
                "poster_url": tmdb_match.poster_url,
                "overview": tmdb_match.overview,
                "rating": tmdb_match.rating,
                "media_type": tmdb_match.media_type
            }
            for tmdb_match in match.tmdb_matches
        ]
        
        selected_match = None
        if match.selected_match:
            selected_match = {
                "id": match.selected_match.id,
                "title": match.selected_match.title,
                "year": match.selected_match.year,
                "poster_url": match.selected_match.poster_url,
                "overview": match.selected_match.overview,
                "rating": match.selected_match.rating,
                "media_type": match.selected_match.media_type
            }
        
        serialized_matches.append({
            "scanned_item": scanned_item,
            "tmdb_matches": tmdb_matches,
            "selected_match": selected_match,
            "confidence_score": match.confidence_score,
            "match_status": match.match_status
        })
    
    # Calculate summary stats
    total_scanned = len(matches)
    total_matched = sum(1 for m in matches if m.match_status == "matched")
    total_manual = sum(1 for m in matches if m.match_status == "needs_review")
    total_skipped = sum(1 for m in matches if m.match_status == "skipped")
    already_in_collection = sum(1 for m in matches if m.match_status == "already_in_collection")
    
    return {
        "matches": serialized_matches,
        "summary": {
            "total_scanned": total_scanned,
            "total_matched": total_matched,
            "total_manual": total_manual,
            "total_skipped": total_skipped,
            "already_in_collection": already_in_collection
        }
    }

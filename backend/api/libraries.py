"""
Libraries API (Plex-style)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Literal, Any
import os

from backend.core.yaml_config import config_manager, Library, LibraryFolder

router = APIRouter(tags=["libraries"])

MediaType = Literal["movies", "tv"]

class LibraryCreate(BaseModel):
    name: str
    media_type: MediaType
    enabled: bool = True
    sort_order: int = 0
    tags: List[str] = []

class LibraryUpdate(BaseModel):
    name: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None
    tags: List[str] | None = None

class LibraryFolderCreate(BaseModel):
    name: str
    path: str
    enabled: bool = True
    priority: int = 0

class LibraryFolderUpdate(BaseModel):
    name: str | None = None
    path: str | None = None
    enabled: bool | None = None
    priority: int | None = None

class FolderUsage(BaseModel):
    folder_id: int
    free_bytes: int
    total_bytes: int


def _next_library_id(libs: List[Library]) -> int:
    return (max((lib.id for lib in libs), default=0) + 1)


def _next_folder_id(libs: List[Library]) -> int:
    max_id = 0
    for lib in libs:
        for f in lib.folders:
            if f.id > max_id:
                max_id = f.id
    return max_id + 1


@router.get("", response_model=List[Library])
async def list_libraries() -> List[Library]:
    cfg = config_manager.get_config()
    return cfg.libraries


@router.post("", response_model=Library)
async def create_library(payload: LibraryCreate) -> Library:
    cfg = config_manager.get_config()
    libs = list(cfg.libraries)
    new_id = _next_library_id(libs)
    new_lib = Library(
        id=new_id,
        name=payload.name,
        media_type=payload.media_type,
        enabled=payload.enabled,
        sort_order=payload.sort_order,
        tags=payload.tags,
        folders=[],
    )
    libs.append(new_lib)
    cfg.libraries = libs
    config_manager.save_config(cfg)
    config_manager._config = cfg
    return new_lib


@router.put("/{library_id}", response_model=Library)
async def update_library(library_id: int, payload: LibraryUpdate) -> Library:
    cfg = config_manager.get_config()
    for i, lib in enumerate(cfg.libraries):
        if lib.id == library_id:
            data = lib.dict()
            updates = payload.dict(exclude_unset=True)
            data.update({k: v for k, v in updates.items() if v is not None})
            updated = Library(**data)
            cfg.libraries[i] = updated
            config_manager.save_config(cfg)
            config_manager._config = cfg
            return updated
    raise HTTPException(status_code=404, detail="Library not found")


@router.delete("/{library_id}")
async def delete_library(library_id: int):
    cfg = config_manager.get_config()
    for i, lib in enumerate(cfg.libraries):
        if lib.id == library_id:
            removed = cfg.libraries.pop(i)
            config_manager.save_config(cfg)
            config_manager._config = cfg
            return {"message": f"Library '{removed.name}' deleted"}
    raise HTTPException(status_code=404, detail="Library not found")


@router.get("/{library_id}", response_model=Library)
async def get_library(library_id: int) -> Library:
    cfg = config_manager.get_config()
    for lib in cfg.libraries:
        if lib.id == library_id:
            return lib
    raise HTTPException(status_code=404, detail="Library not found")


@router.get("/{library_id}/folders", response_model=List[LibraryFolder])
async def list_folders(library_id: int) -> List[LibraryFolder]:
    lib = await get_library(library_id)
    return lib.folders


@router.post("/{library_id}/folders", response_model=LibraryFolder)
async def add_folder(library_id: int, payload: LibraryFolderCreate) -> LibraryFolder:
    cfg = config_manager.get_config()
    for i, lib in enumerate(cfg.libraries):
        if lib.id == library_id:
            new_id = _next_folder_id(cfg.libraries)
            folder = LibraryFolder(id=new_id, **payload.dict())
            lib.folders.append(folder)
            cfg.libraries[i] = lib
            config_manager.save_config(cfg)
            config_manager._config = cfg
            return folder
    raise HTTPException(status_code=404, detail="Library not found")


@router.put("/{library_id}/folders/{folder_id}", response_model=LibraryFolder)
async def update_folder(library_id: int, folder_id: int, payload: LibraryFolderUpdate) -> LibraryFolder:
    cfg = config_manager.get_config()
    for i, lib in enumerate(cfg.libraries):
        if lib.id == library_id:
            for j, f in enumerate(lib.folders):
                if f.id == folder_id:
                    data = f.dict()
                    updates = payload.dict(exclude_unset=True)
                    data.update({k: v for k, v in updates.items() if v is not None})
                    updated = LibraryFolder(**data)
                    lib.folders[j] = updated
                    cfg.libraries[i] = lib
                    config_manager.save_config(cfg)
                    config_manager._config = cfg
                    return updated
            raise HTTPException(status_code=404, detail="Folder not found")
    raise HTTPException(status_code=404, detail="Library not found")


@router.delete("/{library_id}/folders/{folder_id}")
async def delete_folder(library_id: int, folder_id: int):
    cfg = config_manager.get_config()
    for i, lib in enumerate(cfg.libraries):
        if lib.id == library_id:
            for j, f in enumerate(lib.folders):
                if f.id == folder_id:
                    removed = lib.folders.pop(j)
                    cfg.libraries[i] = lib
                    config_manager.save_config(cfg)
                    config_manager._config = cfg
                    return {"message": f"Folder '{removed.name}' removed"}
            raise HTTPException(status_code=404, detail="Folder not found")
    raise HTTPException(status_code=404, detail="Library not found")


@router.get("/{library_id}/folders/usage", response_model=List[FolderUsage])
async def folder_usage(library_id: int) -> List[FolderUsage]:
    lib = await get_library(library_id)
    results: List[FolderUsage] = []
    for f in lib.folders:
        try:
            stat = os.statvfs(f.path)
            free = stat.f_bavail * stat.f_frsize
            total = stat.f_blocks * stat.f_frsize
        except Exception:
            free = 0
            total = 0
        results.append(FolderUsage(folder_id=f.id, free_bytes=free, total_bytes=total))
    return results

# Library-scoped collection listing (placeholder implementations)
@router.get("/{library_id}/collection/tv", response_model=List[Any])
async def list_library_collection_tv(library_id: int) -> List[Any]:
    """List TV shows in collection whose folder_path resides under any of the library's folders.
    Returns a rich payload for flexible UI columns, including:
    - total_size (bytes), folder_path
    - downloaded_episodes, total_episodes, missing_episodes, completion_pct
    - monitored, monitoring_option, seasons_count
    - derived status: 'Complete', 'In Progress', or 'Not Started'
    - networks (from TMDB when available)
    """
    lib = await get_library(library_id)
    from sqlalchemy.orm import Session
    from backend.models.collection import TVShow
    from backend.core.database import SessionLocal
    from backend.services.tmdb_service import tmdb_service
    db: Session = SessionLocal()
    try:
      base_paths = [f.path for f in lib.folders if f.enabled]
      shows = db.query(TVShow).all()
      results = []
      for s in shows:
        if s.folder_path and any(str(s.folder_path).startswith(bp) for bp in base_paths):
          # Compute episode counts (downloaded and local total present in DB)
          downloaded_episodes = 0
          local_total_eps = 0
          seasons_count = 0
          try:
            seasons_count = len(s.seasons)
            for season in s.seasons:
              local_total_eps += len(season.episodes)
              for ep in season.episodes:
                if getattr(ep, 'downloaded', False):
                  downloaded_episodes += 1
          except Exception:
            pass

          # Prefer TMDB total episodes if available; otherwise, try to fetch
          tmdb_total = getattr(s, 'tmdb_total_episodes', 0) or 0
          networks: list[str] = []
          networks_detailed = []
          show_status = ""
          def _normalize_status(raw: str) -> str:
            m = (raw or "").strip()
            if m.lower() == "returning series":
              return "Continuing"
            return m or ""
          if tmdb_total <= 0:
            try:
              data = await tmdb_service.get_tv_details(s.tmdb_id)
              if data:
                tmdb_total = int(data.get('number_of_episodes') or 0)
                networks = [n.get('name') for n in (data.get('networks') or []) if n.get('name')]
                networks_detailed = [
                  {"name": n.get('name'), "logo_url": tmdb_service.get_image_url(n.get('logo_path'))}
                  for n in (data.get('networks') or []) if n.get('name')
                ]
                show_status = _normalize_status(str(data.get('status') or ""))
            except Exception:
              pass
          else:
            # If we already have TMDB totals, we can optionally fetch networks lazily
            try:
              data = await tmdb_service.get_tv_details(s.tmdb_id)
              if data:
                networks = [n.get('name') for n in (data.get('networks') or []) if n.get('name')]
                networks_detailed = [
                  {"name": n.get('name'), "logo_url": tmdb_service.get_image_url(n.get('logo_path'))}
                  for n in (data.get('networks') or []) if n.get('name')
                ]
                show_status = _normalize_status(str(data.get('status') or ""))
            except Exception:
              pass

          total_episodes = tmdb_total if tmdb_total and tmdb_total > 0 else local_total_eps
          missing_episodes = max(0, (total_episodes or 0) - (downloaded_episodes or 0))
          completion_pct = 0
          if total_episodes and total_episodes > 0:
            completion_pct = int(round((downloaded_episodes / total_episodes) * 100))
          # Derived status
          if downloaded_episodes <= 0:
            status = 'Not Started'
          elif missing_episodes <= 0:
            status = 'Complete'
          else:
            status = 'In Progress'
          results.append({
            "id": s.id,
            "tmdb_id": s.tmdb_id,
            "title": s.title,
            "overview": s.overview,
            "poster_url": s.poster_url,
            "backdrop_url": s.backdrop_url,
            "rating": s.rating,
            "year": s.year,
            "monitored": s.monitored,
            "monitoring_option": getattr(s, 'monitoring_option', None),
            "seasons_count": seasons_count,
            "status": status,
            "show_status": show_status,
            "completion_pct": completion_pct,
            "missing_episodes": missing_episodes,
            "folder_path": s.folder_path,
            "total_size": getattr(s, 'total_size', None),
            "downloaded_episodes": downloaded_episodes,
            "total_episodes": total_episodes,
            "networks": networks,
            "networks_detailed": networks_detailed,
          })
      return results
    finally:
      db.close()

@router.get("/{library_id}/collection/movies", response_model=List[Any])
async def list_library_collection_movies(library_id: int) -> List[Any]:
    """List Movies in collection whose path resides under any of the library's folders.
    Returns extended fields for flexible UI columns.
    """
    lib = await get_library(library_id)
    from backend.core.database import SessionLocal
    from sqlalchemy.orm import Session
    from backend.models.collection import Movie
    db: Session = SessionLocal()
    try:
      base_paths = [f.path for f in lib.folders if f.enabled]
      movies = db.query(Movie).all()
      results = []
      for m in movies:
        if m.path and any(str(m.path).startswith(bp) for bp in base_paths):
          # Derive simple status based on downloaded flag
          status = 'Complete' if getattr(m, 'downloaded', False) else 'Not Started'
          results.append({
            "id": m.id,
            "tmdb_id": m.tmdb_id,
            "title": m.title,
            "overview": m.overview,
            "poster_url": m.poster_url,
            "backdrop_url": m.backdrop_url,
            "rating": m.rating,
            "year": m.year,
            "monitored": m.monitored,
            "status": status,
            "path": m.path,
          })
      return results
    finally:
      db.close()


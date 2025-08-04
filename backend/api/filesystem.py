from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
import os
import stat
from datetime import datetime

router = APIRouter()

class FileSystemItem(BaseModel):
    name: str
    path: str
    is_directory: bool
    size: Optional[int] = None
    modified_time: Optional[datetime] = None
    permissions: Optional[str] = None

class DirectoryListing(BaseModel):
    current_path: str
    parent_path: Optional[str]
    items: List[FileSystemItem]

@router.get("/browse", response_model=DirectoryListing)
async def browse_directory(path: str = Query("/", description="Directory path to browse")):
    """Browse a directory and return its contents."""
    try:
        # Normalize and validate the path
        target_path = Path(path).resolve()
        
        # Security check: ensure we're not accessing system-critical directories
        restricted_paths = ["/etc", "/usr/bin", "/bin", "/sbin", "/usr/sbin"]
        if any(str(target_path).startswith(restricted) for restricted in restricted_paths):
            raise HTTPException(status_code=403, detail="Access to this directory is restricted")
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Directory not found")
        
        if not target_path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        items = []
        
        try:
            # Get directory contents
            for item in target_path.iterdir():
                try:
                    item_stat = item.stat()
                    is_directory = item.is_dir()
                    
                    # Skip hidden files/directories (starting with .)
                    if item.name.startswith('.'):
                        continue
                    
                    file_item = FileSystemItem(
                        name=item.name,
                        path=str(item),
                        is_directory=is_directory,
                        size=item_stat.st_size if not is_directory else None,
                        modified_time=datetime.fromtimestamp(item_stat.st_mtime),
                        permissions=stat.filemode(item_stat.st_mode)
                    )
                    items.append(file_item)
                except (PermissionError, OSError):
                    # Skip items we can't access
                    continue
                    
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Sort items: directories first, then files, both alphabetically
        items.sort(key=lambda x: (not x.is_directory, x.name.lower()))
        
        # Get parent directory path
        parent_path = str(target_path.parent) if target_path.parent != target_path else None
        
        return DirectoryListing(
            current_path=str(target_path),
            parent_path=parent_path,
            items=items
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error browsing directory: {str(e)}")

@router.get("/roots")
async def get_filesystem_roots():
    """Get available filesystem roots (useful for different OS)."""
    roots = []
    
    # On Unix-like systems, start with /
    if os.name == 'posix':
        roots.append({
            "name": "Root (/)",
            "path": "/"
        })
        
        # Add common user directories
        home_dir = Path.home()
        roots.append({
            "name": f"Home ({home_dir.name})",
            "path": str(home_dir)
        })
        
        # Add common media directories if they exist
        common_dirs = [
            "/mnt",
            "/media",
            "/Volumes",  # macOS
            str(home_dir / "Movies"),
            str(home_dir / "Downloads")
        ]
        
        for dir_path in common_dirs:
            path_obj = Path(dir_path)
            if path_obj.exists() and path_obj.is_dir():
                roots.append({
                    "name": path_obj.name or dir_path,
                    "path": str(path_obj)
                })
    
    # On Windows
    elif os.name == 'nt':
        import string
        available_drives = ['%s:' % d for d in string.ascii_uppercase if os.path.exists('%s:' % d)]
        for drive in available_drives:
            roots.append({
                "name": f"Drive {drive}",
                "path": f"{drive}/"
            })
    
    return {"roots": roots}

@router.post("/validate-path")
async def validate_media_path(path: str):
    """Validate if a path is suitable for media storage."""
    try:
        target_path = Path(path).resolve()
        
        if not target_path.exists():
            return {"valid": False, "reason": "Path does not exist"}
        
        if not target_path.is_dir():
            return {"valid": False, "reason": "Path is not a directory"}
        
        # Check if we can write to the directory
        if not os.access(target_path, os.R_OK):
            return {"valid": False, "reason": "No read access to directory"}
        
        # Check for common media file extensions in the directory
        media_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'}
        has_media_files = False
        
        try:
            for item in target_path.rglob('*'):
                if item.is_file() and item.suffix.lower() in media_extensions:
                    has_media_files = True
                    break
        except (PermissionError, OSError):
            pass
        
        return {
            "valid": True,
            "path": str(target_path),
            "has_media_files": has_media_files,
            "writable": os.access(target_path, os.W_OK)
        }
        
    except Exception as e:
        return {"valid": False, "reason": f"Error validating path: {str(e)}"}

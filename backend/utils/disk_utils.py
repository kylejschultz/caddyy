"""
Utility functions for mapping folder paths to library paths
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.models.media_path import MediaPath

def get_library_path_from_folder(folder_path: str, db: Session) -> Dict[str, Any]:
    """
    Find which library path contains the given folder path
    
    Args:
        folder_path: The full folder path
        db: Database session
        
    Returns:
        Dict containing library path info
    """
    if not folder_path:
        return {
            "library_path_id": None,
            "library_path_name": "Unknown",
            "library_path_path": None,
            "folder_path": folder_path
        }
    
    try:
        # Get all TV library paths from database
        tv_paths = db.query(MediaPath).filter(
            MediaPath.media_type == "tv",
            MediaPath.enabled == True
        ).all()
        
        # Find which library path contains this folder
        # Sort by path length descending to find the most specific match first
        tv_paths_sorted = sorted(tv_paths, key=lambda x: len(x.path), reverse=True)
        
        for lib_path in tv_paths_sorted:
            # Use the original paths without resolving to match frontend logic
            if folder_path.startswith(lib_path.path):
                return {
                    "library_path_id": lib_path.id,
                    "library_path_name": lib_path.name,
                    "library_path_path": lib_path.path,
                    "folder_path": folder_path
                }
        
        # If no match found, return unknown
        return {
            "library_path_id": None,
            "library_path_name": "Unknown",
            "library_path_path": None,
            "folder_path": folder_path
        }
            
    except Exception as e:
        print(f"Error getting library path info for {folder_path}: {e}")
        return {
            "library_path_id": None,
            "library_path_name": "Error",
            "library_path_path": None,
            "folder_path": folder_path
        }

def _get_macos_disk_info(path: Path, original_path: str) -> Dict[str, Any]:
    """Get disk info for macOS"""
    path_str = str(path)
    
    # Check if it's in /Volumes (external drives)
    if path_str.startswith("/Volumes/"):
        parts = path_str.split("/")
        if len(parts) >= 3:
            volume_name = parts[2]
            return {
                "disk_name": volume_name,
                "display_name": volume_name,
                "mount_point": f"/Volumes/{volume_name}",
                "folder_path": original_path
            }
    
    # Check common paths
    if path_str.startswith("/Users/"):
        return {
            "disk_name": "Macintosh HD",
            "display_name": "Macintosh HD",
            "mount_point": "/",
            "folder_path": original_path
        }
    
    # Default for root filesystem
    return {
        "disk_name": "Macintosh HD", 
        "display_name": "Macintosh HD",
        "mount_point": "/",
        "folder_path": original_path
    }

def _get_linux_disk_info(path: Path, original_path: str) -> Dict[str, Any]:
    """Get disk info for Linux"""
    path_str = str(path)
    
    # Check /mnt and /media mount points
    if path_str.startswith("/mnt/"):
        parts = path_str.split("/")
        if len(parts) >= 3:
            mount_name = parts[2]
            return {
                "disk_name": mount_name,
                "display_name": mount_name,
                "mount_point": f"/mnt/{mount_name}",
                "folder_path": original_path
            }
    
    if path_str.startswith("/media/"):
        parts = path_str.split("/")
        if len(parts) >= 4:
            mount_name = parts[3]  # /media/user/disk_name
            return {
                "disk_name": mount_name,
                "display_name": mount_name,
                "mount_point": f"/media/{parts[2]}/{mount_name}",
                "folder_path": original_path
            }
    
    # Check /home for user directories
    if path_str.startswith("/home/"):
        return {
            "disk_name": "Root",
            "display_name": "System Drive",
            "mount_point": "/",
            "folder_path": original_path
        }
    
    # Default for root filesystem
    return {
        "disk_name": "Root",
        "display_name": "System Drive", 
        "mount_point": "/",
        "folder_path": original_path
    }

def _get_windows_disk_info(path: Path, original_path: str) -> Dict[str, Any]:
    """Get disk info for Windows"""
    path_str = str(path)
    
    # Extract drive letter
    if len(path_str) >= 2 and path_str[1] == ":":
        drive_letter = path_str[0].upper()
        return {
            "disk_name": f"{drive_letter}:",
            "display_name": f"Drive {drive_letter}:",
            "mount_point": f"{drive_letter}:\\",
            "folder_path": original_path
        }
    
    # Fallback
    return {
        "disk_name": "Unknown",
        "display_name": "Unknown Drive",
        "mount_point": None,
        "folder_path": original_path
    }

def format_disk_display(disk_info: Dict[str, Any]) -> str:
    """
    Format disk information for display
    
    Args:
        disk_info: Dict from get_disk_info_from_path
        
    Returns:
        Formatted display string
    """
    if not disk_info or not disk_info.get("display_name"):
        return "Unknown"
    
    return disk_info["display_name"]

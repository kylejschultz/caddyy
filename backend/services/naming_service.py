"""
Service for handling TrashGuides naming conventions and folder operations
"""

import os
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

from backend.core.yaml_config import config_manager
from backend.models.collection import TVShow, Season, Episode


@dataclass
class FolderCreationResult:
    """Result of folder creation operation"""
    success: bool
    folder_path: str
    message: str
    created_folders: List[str] = None


class NamingService:
    """Service for handling naming conventions and folder operations"""
    
    def __init__(self):
        pass
    
    def clean_name(self, name: str) -> str:
        """
        Clean a name for use in file/folder paths
        Removes or replaces problematic characters following TrashGuides recommendations
        """
        config = config_manager.get_config()
        
        if config.tv.clean_special_chars:
            # Remove or replace characters that can cause issues on different filesystems
            # Based on TrashGuides recommendations
            name = re.sub(r'[<>:"/\\|?*]', '', name)  # Remove these entirely
            name = re.sub(r'[&]', 'and', name)       # Replace & with 'and'
            # Replace problematic characters with safe alternatives
            name = name.replace('…', '...')          # Replace ellipsis
            name = name.replace('‘', "'")            # Replace left single quote
            name = name.replace('’', "'")            # Replace right single quote
            name = name.replace('“', '"')            # Replace left double quote
            name = name.replace('”', '"')            # Replace right double quote
        
        # Handle spaces
        if config.tv.replace_spaces_with != " ":
            name = name.replace(" ", config.tv.replace_spaces_with)
        
        # Remove multiple consecutive spaces/replacements and trim
        if config.tv.replace_spaces_with == " ":
            name = re.sub(r'\s+', ' ', name)
        else:
            pattern = re.escape(config.tv.replace_spaces_with) + '+'
            name = re.sub(pattern, config.tv.replace_spaces_with, name)
        
        return name.strip()
    
    def generate_show_folder_name(self, show_name: str, year: Optional[int] = None) -> str:
        """
        Generate show folder name following TrashGuides convention
        Example: "The Expanse (2015)"
        """
        config = config_manager.get_config()
        clean_name = self.clean_name(show_name)
        
        if config.tv.include_year_in_folder and year:
            return config.tv.show_folder_format.format(
                show_name=clean_name,
                year=year
            )
        else:
            return clean_name
    
    def generate_season_folder_name(self, season_number: int) -> str:
        """
        Generate season folder name following TrashGuides convention
        Example: "Season 01"
        """
        config = config_manager.get_config()
        return config.tv.season_folder_format.format(season=season_number)
    
    def generate_episode_filename(self, show_name: str, season_number: int, 
                                episode_number: int, episode_title: str = "",
                                quality: str = "", video_codec: str = "", 
                                audio_codec: str = "", release_group: str = "",
                                file_extension: str = ".mkv") -> str:
        """
        Generate episode filename following TrashGuides convention
        Example: "The Expanse - S01E01 - Dulcinea [WEBDL-1080p][x264][DTS][AMZN].mkv"
        """
        config = config_manager.get_config()
        clean_show_name = self.clean_name(show_name)
        clean_episode_title = self.clean_name(episode_title) if episode_title else ""
        
        # Start with base format
        filename = f"{clean_show_name} - S{season_number:02d}E{episode_number:02d}"
        
        # Add episode title if available
        if clean_episode_title:
            filename += f" - {clean_episode_title}"
        
        # Add quality/codec info if available (following TrashGuides format)
        format_parts = []
        if quality:
            format_parts.append(quality)
        if video_codec:
            format_parts.append(video_codec)
        if audio_codec:
            format_parts.append(audio_codec)
        if release_group:
            format_parts.append(release_group)
        
        if format_parts:
            filename += " [" + "][".join(format_parts) + "]"
        
        return filename + file_extension
    
    def create_show_folder_structure(self, library_path: str, show_name: str, 
                                   year: Optional[int] = None, 
                                   seasons: List[int] = None) -> FolderCreationResult:
        """
        Create folder structure for a new TV show
        Creates: Library/Show Name (Year)/Season XX/ folders
        """
        try:
            # Generate show folder name
            show_folder_name = self.generate_show_folder_name(show_name, year)
            show_folder_path = Path(library_path) / show_folder_name
            
            created_folders = []
            
            # Create show folder
            show_folder_path.mkdir(parents=True, exist_ok=True)
            created_folders.append(str(show_folder_path))
            
            # Create season folders if specified
            if seasons:
                for season_num in seasons:
                    season_folder_name = self.generate_season_folder_name(season_num)
                    season_folder_path = show_folder_path / season_folder_name
                    season_folder_path.mkdir(exist_ok=True)
                    created_folders.append(str(season_folder_path))
            
            return FolderCreationResult(
                success=True,
                folder_path=str(show_folder_path),
                message=f"Successfully created folder structure for '{show_name}'",
                created_folders=created_folders
            )
        
        except Exception as e:
            return FolderCreationResult(
                success=False,
                folder_path="",
                message=f"Failed to create folder structure: {str(e)}"
            )
    
    def rename_show_folder(self, current_path: str, show_name: str, 
                          year: Optional[int] = None) -> FolderCreationResult:
        """
        Rename existing show folder to follow TrashGuides convention
        """
        try:
            current_folder = Path(current_path)
            if not current_folder.exists():
                return FolderCreationResult(
                    success=False,
                    folder_path=current_path,
                    message="Source folder does not exist"
                )
            
            # Generate new folder name
            new_folder_name = self.generate_show_folder_name(show_name, year)
            new_folder_path = current_folder.parent / new_folder_name
            
            # Skip if already correctly named
            if current_folder.name == new_folder_name:
                return FolderCreationResult(
                    success=True,
                    folder_path=str(current_folder),
                    message="Folder already has correct name"
                )
            
            # Check if destination already exists
            if new_folder_path.exists():
                return FolderCreationResult(
                    success=False,
                    folder_path=current_path,
                    message=f"Destination folder already exists: {new_folder_name}"
                )
            
            # Rename the folder
            current_folder.rename(new_folder_path)
            
            return FolderCreationResult(
                success=True,
                folder_path=str(new_folder_path),
                message=f"Successfully renamed to '{new_folder_name}'"
            )
        
        except Exception as e:
            return FolderCreationResult(
                success=False,
                folder_path=current_path,
                message=f"Failed to rename folder: {str(e)}"
            )
    
    def get_library_paths(self) -> List[Dict[str, str]]:
        """Get configured TV library paths"""
        config = config_manager.get_config()
        return [
            {
                "name": path.name,
                "path": path.path,
                "enabled": path.enabled
            }
            for path in config.tv.library_paths
            if path.enabled
        ]
    
    def validate_library_path(self, path: str) -> Dict[str, Any]:
        """Validate that a library path exists and is writable"""
        try:
            path_obj = Path(path)
            
            if not path_obj.exists():
                return {
                    "valid": False,
                    "message": "Path does not exist",
                    "writable": False
                }
            
            if not path_obj.is_dir():
                return {
                    "valid": False,
                    "message": "Path is not a directory",
                    "writable": False
                }
            
            # Test write access
            writable = os.access(path, os.W_OK)
            
            return {
                "valid": True,
                "message": "Path is valid",
                "writable": writable
            }
        
        except Exception as e:
            return {
                "valid": False,
                "message": f"Error validating path: {str(e)}",
                "writable": False
            }


# Global naming service instance
naming_service = NamingService()

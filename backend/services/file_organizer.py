"""
File organizer service for renaming and organizing media files according to TRaSH Guides conventions
"""

import os
import re
import shutil
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from backend.services.media_scanner import ScannedTVShow, ScannedMovie, ScannedEpisode

@dataclass
class RenameOperation:
    """Represents a file rename operation"""
    current_path: str
    suggested_path: str
    current_name: str
    suggested_name: str
    operation_type: str  # "rename", "move", "organize"
    show_name: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    needs_confirmation: bool = True

class FileOrganizer:
    """Service for organizing media files according to TRaSH Guides conventions"""
    
    def __init__(self):
        pass
    
    def generate_tv_rename_operations(self, shows: List[ScannedTVShow], 
                                    base_library_path: str) -> List[RenameOperation]:
        """
        Generate rename operations for TV shows to follow TRaSH conventions
        
        Args:
            shows: List of scanned TV shows
            base_library_path: Base path for the TV library
        
        Returns:
            List of rename operations
        """
        operations = []
        
        for show in shows:
            # Generate proper show folder name
            proper_show_name = self._clean_show_name(show.show_name)
            if show.show_year:
                show_folder_name = f"{proper_show_name} ({show.show_year})"
            else:
                show_folder_name = proper_show_name
            
            show_folder_path = Path(base_library_path) / show_folder_name
            
            # Check if show folder needs to be created/renamed
            current_show_path = Path(show.folder_path)
            if current_show_path.name != show_folder_name:
                operations.append(RenameOperation(
                    current_path=str(current_show_path),
                    suggested_path=str(show_folder_path),
                    current_name=current_show_path.name,
                    suggested_name=show_folder_name,
                    operation_type="move",
                    show_name=show.show_name
                ))
            
            # Process seasons and episodes
            for season in show.seasons:
                season_folder_name = f"Season {season.season_number:02d}"
                season_folder_path = show_folder_path / season_folder_name
                
                for episode in season.episodes:
                    # Generate proper episode filename
                    suggested_episode_name = self._generate_episode_filename(
                        proper_show_name, episode, show.show_year
                    )
                    
                    current_file_path = Path(episode.file_path)
                    suggested_file_path = season_folder_path / suggested_episode_name
                    
                    # Check if episode needs renaming/moving
                    if str(current_file_path) != str(suggested_file_path):
                        operations.append(RenameOperation(
                            current_path=str(current_file_path),
                            suggested_path=str(suggested_file_path),
                            current_name=current_file_path.name,
                            suggested_name=suggested_episode_name,
                            operation_type="organize",
                            show_name=show.show_name,
                            season_number=season.season_number,
                            episode_number=episode.episode_number
                        ))
        
        return operations
    
    def generate_movie_rename_operations(self, movies: List[ScannedMovie], 
                                       base_library_path: str) -> List[RenameOperation]:
        """
        Generate rename operations for movies to follow TRaSH conventions
        
        Args:
            movies: List of scanned movies
            base_library_path: Base path for the movie library
        
        Returns:
            List of rename operations
        """
        operations = []
        
        for movie in movies:
            # Generate proper movie filename
            suggested_movie_name = self._generate_movie_filename(movie)
            
            # Create movie folder if needed (TRaSH recommends individual folders for movies)
            movie_folder_name = self._clean_movie_name(movie.title)
            if movie.year:
                movie_folder_name = f"{movie_folder_name} ({movie.year})"
            
            movie_folder_path = Path(base_library_path) / movie_folder_name
            suggested_file_path = movie_folder_path / suggested_movie_name
            
            current_file_path = Path(movie.file_path)
            
            # Check if movie needs organizing
            if str(current_file_path) != str(suggested_file_path):
                operations.append(RenameOperation(
                    current_path=str(current_file_path),
                    suggested_path=str(suggested_file_path),
                    current_name=current_file_path.name,
                    suggested_name=suggested_movie_name,
                    operation_type="organize",
                    show_name=movie.title
                ))
        
        return operations
    
    def _clean_show_name(self, show_name: str) -> str:
        """Clean show name for folder/file naming"""
        # Remove problematic characters
        cleaned = re.sub(r'[<>:"/\\|?*]', '', show_name)
        # Replace multiple spaces with single space
        cleaned = re.sub(r'\s+', ' ', cleaned)
        # Strip whitespace
        return cleaned.strip()
    
    def _clean_movie_name(self, movie_title: str) -> str:
        """Clean movie title for folder/file naming"""
        return self._clean_show_name(movie_title)
    
    def _generate_episode_filename(self, show_name: str, episode: ScannedEpisode, 
                                 show_year: Optional[int] = None) -> str:
        """
        Generate TRaSH-compliant episode filename
        
        Format: Show Name - S01E01 - Episode Title [Quality] [Group].ext
        """
        file_extension = Path(episode.file_path).suffix
        
        # Base filename
        filename = f"{show_name} - S{episode.season_number:02d}E{episode.episode_number:02d}"
        
        # Add episode title if available
        if episode.episode_title and episode.episode_title.strip():
            clean_title = self._clean_show_name(episode.episode_title)
            filename += f" - {clean_title}"
        
        # Add quality if available
        if episode.quality:
            filename += f" [{episode.quality}]"
        
        # Add release group if available
        if episode.release_group:
            filename += f" [{episode.release_group}]"
        
        return filename + file_extension
    
    def _generate_movie_filename(self, movie: ScannedMovie) -> str:
        """
        Generate TRaSH-compliant movie filename
        
        Format: Movie Name (Year) [Quality] [Group].ext
        """
        file_extension = Path(movie.file_path).suffix
        
        # Base filename
        clean_title = self._clean_movie_name(movie.title)
        filename = clean_title
        
        # Add year if available
        if movie.year:
            filename += f" ({movie.year})"
        
        # Add quality if available
        if movie.quality:
            filename += f" [{movie.quality}]"
        
        # Add release group if available
        if movie.release_group:
            filename += f" [{movie.release_group}]"
        
        return filename + file_extension
    
    async def execute_rename_operations(self, operations: List[RenameOperation], 
                                      dry_run: bool = True) -> Dict[str, any]:
        """
        Execute the rename operations
        
        Args:
            operations: List of operations to execute
            dry_run: If True, don't actually perform the operations
        
        Returns:
            Results of the operations
        """
        results = {
            "total_operations": len(operations),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "dry_run": dry_run
        }
        
        for operation in operations:
            try:
                if not dry_run:
                    # Create destination directory if it doesn't exist
                    dest_path = Path(operation.suggested_path)
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Perform the actual move/rename
                    if operation.operation_type in ["move", "organize"]:
                        shutil.move(operation.current_path, operation.suggested_path)
                    elif operation.operation_type == "rename":
                        os.rename(operation.current_path, operation.suggested_path)
                
                results["successful"] += 1
                
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "operation": operation.current_path,
                    "error": str(e)
                })
        
        return results
    
    def validate_rename_operations(self, operations: List[RenameOperation]) -> Dict[str, any]:
        """
        Validate rename operations before execution
        
        Args:
            operations: List of operations to validate
        
        Returns:
            Validation results
        """
        results = {
            "valid": 0,
            "invalid": 0,
            "warnings": [],
            "errors": []
        }
        
        for operation in operations:
            try:
                current_path = Path(operation.current_path)
                suggested_path = Path(operation.suggested_path)
                
                # Check if source exists
                if not current_path.exists():
                    results["invalid"] += 1
                    results["errors"].append(f"Source file does not exist: {operation.current_path}")
                    continue
                
                # Check if destination already exists
                if suggested_path.exists():
                    results["warnings"].append(f"Destination already exists: {operation.suggested_path}")
                
                # Check if we have write permissions
                if not os.access(current_path.parent, os.W_OK):
                    results["invalid"] += 1
                    results["errors"].append(f"No write permission for: {current_path.parent}")
                    continue
                
                # Check if destination directory can be created
                try:
                    suggested_path.parent.mkdir(parents=True, exist_ok=True)
                    if not os.access(suggested_path.parent, os.W_OK):
                        results["invalid"] += 1
                        results["errors"].append(f"No write permission for destination: {suggested_path.parent}")
                        continue
                except Exception as e:
                    results["invalid"] += 1
                    results["errors"].append(f"Cannot create destination directory: {str(e)}")
                    continue
                
                results["valid"] += 1
                
            except Exception as e:
                results["invalid"] += 1
                results["errors"].append(f"Validation error for {operation.current_path}: {str(e)}")
        
        return results

# Global organizer instance
file_organizer = FileOrganizer()

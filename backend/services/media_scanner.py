"""
Media scanner service for parsing TV shows and movies from filesystem
Supports TRaSH Guides naming conventions for Sonarr/Radarr
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import asyncio

@dataclass
class ScannedEpisode:
    """Represents a scanned TV episode file"""
    file_path: str
    file_name: str
    file_size: int
    modified_time: datetime
    season_number: int
    episode_number: int
    episode_title: Optional[str] = None
    quality: Optional[str] = None
    release_group: Optional[str] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None

@dataclass
class ScannedSeason:
    """Represents a scanned TV season"""
    season_number: int
    episodes: List[ScannedEpisode]
    folder_path: Optional[str] = None

@dataclass
class ScannedTVShow:
    """Represents a scanned TV show"""
    show_name: str
    show_year: Optional[int]
    folder_path: str
    seasons: List[ScannedSeason]
    total_episodes: int = 0
    
    def __post_init__(self):
        self.total_episodes = sum(len(season.episodes) for season in self.seasons)

@dataclass
class ScannedMovie:
    """Represents a scanned movie file"""
    title: str
    year: Optional[int]
    file_path: str
    file_name: str
    file_size: int
    modified_time: datetime
    quality: Optional[str] = None
    release_group: Optional[str] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    folder_path: Optional[str] = None

class MediaScanner:
    """Scanner for media files following TRaSH Guides naming conventions"""
    
    # Common video file extensions
    VIDEO_EXTENSIONS = {'.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.m2ts'}
    
    # TRaSH naming patterns for TV shows
    # Pattern: Show Name (Year)/Season XX/Show Name - SxxExx - Episode Title [Quality] [Group].ext
    TV_EPISODE_PATTERNS = [
        # Standard pattern: Show Name - S01E01 - Episode Title [Quality].ext
        r'^(.+?)\s*-\s*S(\d{1,2})E(\d{1,3})(?:\s*-\s*(.+?))?(?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?(?:\s*\{([^}]+)\})?\.(\w+)$',
        # Alternative: Show Name S01E01 Episode Title
        r'^(.+?)\s+S(\d{1,2})E(\d{1,3})(?:\s+(.+?))?(?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?\.(\w+)$',
        # Simple pattern: Show.Name.S01E01.Title.Quality.Group.ext
        r'^(.+?)\.S(\d{1,2})E(\d{1,3})(?:\.(.+?))?\.(\w+)$'
    ]
    
    # TRaSH naming patterns for movies
    # Pattern: Movie Name (Year) [Quality] [Group].ext
    MOVIE_PATTERNS = [
        # Standard pattern: Movie Name (Year) [Quality] [Group].ext
        r'^(.+?)\s*\((\d{4})\)(?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?(?:\s*\{([^}]+)\})?\.(\w+)$',
        # Alternative: Movie Name (Year) Quality Group.ext
        r'^(.+?)\s*\((\d{4})\)(?:\s+(.+?))?\.(\w+)$',
        # Simple pattern: Movie.Name.Year.Quality.Group.ext
        r'^(.+?)\.(\d{4})(?:\.(.+?))?\.(\w+)$'
    ]
    
    # Quality indicators (for basic quality detection)
    QUALITY_INDICATORS = {
        '480p', '720p', '1080p', '1080i', '2160p', '4k', 'uhd',
        'dvdrip', 'brrip', 'bluray', 'hdtv', 'webrip', 'webdl',
        'remux', 'proper', 'repack'
    }
    
    def __init__(self):
        self.scanned_paths: Set[str] = set()
    
    async def scan_tv_library(self, library_paths: List[str], 
                             progress_callback=None) -> List[ScannedTVShow]:
        """
        Scan TV library paths for shows following TRaSH naming conventions
        
        Args:
            library_paths: List of paths to scan
            progress_callback: Optional callback for progress updates
        
        Returns:
            List of scanned TV shows
        """
        all_shows = []
        total_paths = len(library_paths)
        
        for i, path in enumerate(library_paths):
            if progress_callback:
                await progress_callback(f"Scanning {path}...", i, total_paths)
            
            try:
                shows = await self._scan_tv_directory(path)
                all_shows.extend(shows)
            except Exception as e:
                print(f"Error scanning TV path {path}: {e}")
                continue
        
        return all_shows
    
    async def _scan_tv_directory(self, root_path: str) -> List[ScannedTVShow]:
        """Scan a single TV library directory"""
        shows = []
        root = Path(root_path)
        
        if not root.exists() or not root.is_dir():
            return shows
        
        # Look for show directories and also loose video files
        try:
            loose_video_files = []
            
            for item in root.iterdir():
                if item.name.startswith('.'):
                    continue
                    
                if item.is_dir():
                    show = await self._scan_show_directory(item)
                    if show:
                        shows.append(show)
                elif item.is_file() and item.suffix.lower() in self.VIDEO_EXTENSIONS:
                    loose_video_files.append(item)
            
            # Process loose video files that might be episodes without show folders
            if loose_video_files:
                loose_shows = await self._process_loose_video_files(loose_video_files, root_path)
                shows.extend(loose_shows)
                
        except PermissionError:
            print(f"Permission denied accessing {root_path}")
        
        return shows
    
    async def _scan_show_directory(self, show_path: Path) -> Optional[ScannedTVShow]:
        """Scan a single TV show directory"""
        show_name, show_year = self._parse_show_folder_name(show_path.name)
        
        if not show_name:
            return None
        
        seasons = []
        
        try:
            # Check for season folders or files directly in show folder
            season_dirs = []
            loose_files = []
            
            for item in show_path.iterdir():
                if item.is_dir() and self._is_season_folder(item.name):
                    season_dirs.append(item)
                elif item.is_file() and item.suffix.lower() in self.VIDEO_EXTENSIONS:
                    loose_files.append(item)
            
            # Process season directories
            for season_dir in season_dirs:
                season = await self._scan_season_directory(season_dir, show_name)
                if season:
                    seasons.append(season)
            
            # Process loose files (episodes not in season folders)
            if loose_files:
                loose_episodes = []
                for file_path in loose_files:
                    episode = self._parse_episode_file(file_path, show_name)
                    if episode:
                        loose_episodes.append(episode)
                
                # Group loose episodes by season
                seasons_dict = {}
                for episode in loose_episodes:
                    season_num = episode.season_number
                    if season_num not in seasons_dict:
                        seasons_dict[season_num] = []
                    seasons_dict[season_num].append(episode)
                
                for season_num, episodes in seasons_dict.items():
                    season = ScannedSeason(
                        season_number=season_num,
                        episodes=sorted(episodes, key=lambda e: e.episode_number),
                        folder_path=str(show_path)
                    )
                    seasons.append(season)
        
        except PermissionError:
            print(f"Permission denied accessing show directory {show_path}")
            return None
        
        if not seasons:
            return None
        
        # Sort seasons by number
        seasons.sort(key=lambda s: s.season_number)
        
        return ScannedTVShow(
            show_name=show_name,
            show_year=show_year,
            folder_path=str(show_path),
            seasons=seasons
        )
    
    async def _scan_season_directory(self, season_path: Path, show_name: str) -> Optional[ScannedSeason]:
        """Scan a season directory for episodes"""
        season_number = self._parse_season_number(season_path.name)
        if season_number is None:
            return None
        
        episodes = []
        
        try:
            for file_path in season_path.iterdir():
                if not file_path.is_file() or file_path.suffix.lower() not in self.VIDEO_EXTENSIONS:
                    continue
                
                episode = self._parse_episode_file(file_path, show_name)
                if episode:
                    episodes.append(episode)
        except PermissionError:
            print(f"Permission denied accessing season directory {season_path}")
            return None
        
        if not episodes:
            return None
        
        # Sort episodes by episode number
        episodes.sort(key=lambda e: e.episode_number)
        
        return ScannedSeason(
            season_number=season_number,
            episodes=episodes,
            folder_path=str(season_path)
        )
    
    def _parse_show_folder_name(self, folder_name: str) -> Tuple[Optional[str], Optional[int]]:
        """Parse show name and year from folder name"""
        # Pattern: Show Name (Year)
        match = re.match(r'^(.+?)\s*\((\d{4})\)$', folder_name)
        if match:
            return match.group(1).strip(), int(match.group(2))
        
        # If no year, just return the folder name as show name
        return folder_name.strip(), None
    
    def _is_season_folder(self, folder_name: str) -> bool:
        """Check if folder name indicates a season folder"""
        return bool(re.match(r'^Season\s+\d+$', folder_name, re.IGNORECASE) or
                   re.match(r'^S\d+$', folder_name, re.IGNORECASE) or
                   re.match(r'^Season\s*\d+$', folder_name, re.IGNORECASE))
    
    def _parse_season_number(self, folder_name: str) -> Optional[int]:
        """Parse season number from folder name"""
        match = re.search(r'(\d+)', folder_name)
        if match:
            return int(match.group(1))
        return None
    
    def _parse_episode_file(self, file_path: Path, show_name: str) -> Optional[ScannedEpisode]:
        """Parse episode information from filename"""
        filename = file_path.name
        
        for pattern in self.TV_EPISODE_PATTERNS:
            match = re.match(pattern, filename, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    parsed_show = groups[0].replace('.', ' ').replace('_', ' ').strip()
                    season = int(groups[1])
                    episode = int(groups[2])
                    
                    # Extract additional info based on pattern
                    episode_title = None
                    quality = None
                    release_group = None
                    
                    if len(groups) > 3 and groups[3]:
                        episode_title = groups[3].replace('.', ' ').replace('_', ' ').strip()
                    
                    # Extract quality and other metadata from filename
                    quality, release_group = self._extract_quality_and_group(filename)
                    
                    file_stat = file_path.stat()
                    
                    return ScannedEpisode(
                        file_path=str(file_path),
                        file_name=filename,
                        file_size=file_stat.st_size,
                        modified_time=datetime.fromtimestamp(file_stat.st_mtime),
                        season_number=season,
                        episode_number=episode,
                        episode_title=episode_title,
                        quality=quality,
                        release_group=release_group
                    )
                except (ValueError, OSError):
                    continue
        
        return None
    
    async def _process_loose_video_files(self, video_files: List[Path], root_path: str) -> List[ScannedTVShow]:
        """Process loose video files that might be TV episodes without proper folder structure"""
        shows = []
        shows_dict = {}
        
        for file_path in video_files:
            # Try to parse as TV episode
            episode = self._parse_episode_file_permissive(file_path)
            if episode:
                show_key = (episode.get('show_name', 'Unknown Show'), episode.get('show_year'))
                if show_key not in shows_dict:
                    shows_dict[show_key] = {}
                
                season_num = episode['season_number']
                if season_num not in shows_dict[show_key]:
                    shows_dict[show_key][season_num] = []
                
                shows_dict[show_key][season_num].append(episode)
        
        # Convert to ScannedTVShow objects
        for (show_name, show_year), seasons_data in shows_dict.items():
            seasons = []
            for season_num, episodes_data in seasons_data.items():
                episodes = []
                for ep_data in episodes_data:
                    episodes.append(ScannedEpisode(
                        file_path=ep_data['file_path'],
                        file_name=ep_data['file_name'],
                        file_size=ep_data['file_size'],
                        modified_time=ep_data['modified_time'],
                        season_number=ep_data['season_number'],
                        episode_number=ep_data['episode_number'],
                        episode_title=ep_data.get('episode_title'),
                        quality=ep_data.get('quality'),
                        release_group=ep_data.get('release_group')
                    ))
                
                episodes.sort(key=lambda e: e.episode_number)
                seasons.append(ScannedSeason(
                    season_number=season_num,
                    episodes=episodes,
                    folder_path=root_path
                ))
            
            seasons.sort(key=lambda s: s.season_number)
            shows.append(ScannedTVShow(
                show_name=show_name,
                show_year=show_year,
                folder_path=root_path,
                seasons=seasons
            ))
        
        return shows
    
    def _parse_episode_file_permissive(self, file_path: Path) -> Optional[Dict]:
        """More permissive parsing that attempts to extract show info from any video file"""
        filename = file_path.name
        file_stat = file_path.stat()
        
        # Try strict patterns first
        for pattern in self.TV_EPISODE_PATTERNS:
            match = re.match(pattern, filename, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    parsed_show = groups[0].replace('.', ' ').replace('_', ' ').strip()
                    season = int(groups[1])
                    episode = int(groups[2])
                    
                    episode_title = None
                    if len(groups) > 3 and groups[3]:
                        episode_title = groups[3].replace('.', ' ').replace('_', ' ').strip()
                    
                    quality, release_group = self._extract_quality_and_group(filename)
                    
                    return {
                        'file_path': str(file_path),
                        'file_name': filename,
                        'file_size': file_stat.st_size,
                        'modified_time': datetime.fromtimestamp(file_stat.st_mtime),
                        'show_name': parsed_show,
                        'show_year': None,  # Will try to extract if needed
                        'season_number': season,
                        'episode_number': episode,
                        'episode_title': episode_title,
                        'quality': quality,
                        'release_group': release_group
                    }
                except (ValueError, OSError):
                    continue
        
        # Try more permissive patterns for files that don't follow strict naming
        permissive_patterns = [
            # Less strict patterns
            r'^(.+?)[\s\._-]+[Ss](\d{1,2})[Ee](\d{1,3}).*\.(\w+)$',
            r'^(.+?)[\s\._-]+(\d{1,2})x(\d{1,3}).*\.(\w+)$',  # 1x01 format
            r'^(.+?)[\s\._-]+Season[\s\._-]*(\d+)[\s\._-]*Episode[\s\._-]*(\d+).*\.(\w+)$',
        ]
        
        for pattern in permissive_patterns:
            match = re.match(pattern, filename, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    show_name = groups[0].replace('.', ' ').replace('_', ' ').strip()
                    season = int(groups[1])
                    episode = int(groups[2])
                    
                    quality, release_group = self._extract_quality_and_group(filename)
                    
                    return {
                        'file_path': str(file_path),
                        'file_name': filename,
                        'file_size': file_stat.st_size,
                        'modified_time': datetime.fromtimestamp(file_stat.st_mtime),
                        'show_name': show_name,
                        'show_year': None,
                        'season_number': season,
                        'episode_number': episode,
                        'episode_title': None,
                        'quality': quality,
                        'release_group': release_group
                    }
                except (ValueError, OSError):
                    continue
        
        return None
    
    def _extract_quality_and_group(self, filename: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract quality and release group from filename"""
        quality = None
        release_group = None
        
        # Look for quality indicators
        filename_lower = filename.lower()
        for quality_indicator in self.QUALITY_INDICATORS:
            if quality_indicator in filename_lower:
                if not quality or len(quality_indicator) > len(quality):
                    quality = quality_indicator
        
        # Look for release group in brackets or at end
        group_patterns = [
            r'\[([^\]]+)\]',  # [Group]
            r'\{([^}]+)\}',   # {Group}
            r'-([A-Z0-9]+)(?:\.\w+)?$'  # -GROUP.ext
        ]
        
        for pattern in group_patterns:
            match = re.search(pattern, filename)
            if match:
                potential_group = match.group(1)
                # Skip if it looks like quality or other metadata
                if potential_group.lower() not in self.QUALITY_INDICATORS:
                    release_group = potential_group
                    break
        
        return quality, release_group
    
    async def scan_movie_library(self, library_paths: List[str], 
                                progress_callback=None) -> List[ScannedMovie]:
        """
        Scan movie library paths for movies following TRaSH naming conventions
        
        Args:
            library_paths: List of paths to scan
            progress_callback: Optional callback for progress updates
        
        Returns:
            List of scanned movies
        """
        all_movies = []
        total_paths = len(library_paths)
        
        for i, path in enumerate(library_paths):
            if progress_callback:
                await progress_callback(f"Scanning {path}...", i, total_paths)
            
            try:
                movies = await self._scan_movie_directory(path)
                all_movies.extend(movies)
            except Exception as e:
                print(f"Error scanning movie path {path}: {e}")
                continue
        
        return all_movies
    
    async def _scan_movie_directory(self, root_path: str) -> List[ScannedMovie]:
        """Scan a single movie library directory"""
        movies = []
        root = Path(root_path)
        
        if not root.exists() or not root.is_dir():
            return movies
        
        try:
            for item in root.rglob('*'):
                if not item.is_file() or item.suffix.lower() not in self.VIDEO_EXTENSIONS:
                    continue
                
                movie = self._parse_movie_file(item)
                if movie:
                    movies.append(movie)
        except PermissionError:
            print(f"Permission denied accessing {root_path}")
        
        return movies
    
    def _parse_movie_file(self, file_path: Path) -> Optional[ScannedMovie]:
        """Parse movie information from filename"""
        filename = file_path.name
        
        for pattern in self.MOVIE_PATTERNS:
            match = re.match(pattern, filename, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    title = groups[0].replace('.', ' ').replace('_', ' ').strip()
                    year = int(groups[1]) if groups[1] else None
                    
                    quality, release_group = self._extract_quality_and_group(filename)
                    
                    file_stat = file_path.stat()
                    
                    return ScannedMovie(
                        title=title,
                        year=year,
                        file_path=str(file_path),
                        file_name=filename,
                        file_size=file_stat.st_size,
                        modified_time=datetime.fromtimestamp(file_stat.st_mtime),
                        quality=quality,
                        release_group=release_group,
                        folder_path=str(file_path.parent)
                    )
                except (ValueError, OSError):
                    continue
        
        return None

# Global scanner instance
media_scanner = MediaScanner()

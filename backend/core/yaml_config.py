"""
YAML configuration management
"""

import yaml
from pathlib import Path
from pydantic import BaseModel
from typing import Any, Dict


class MediaDirectory(BaseModel):
    """Media directory configuration (legacy)"""
    name: str
    path: str
    enabled: bool = True

class LibraryFolder(BaseModel):
    """Folder belonging to a Library (Plex-style)"""
    id: int
    name: str
    path: str
    enabled: bool = True
    priority: int = 0  # smaller number = higher priority (0 is primary)

class Library(BaseModel):
    """Plex-style Library grouping content by media type with one or more folders"""
    id: int
    name: str
    media_type: str  # 'movies' | 'tv'
    enabled: bool = True
    sort_order: int = 0
    tags: list[str] = []
    folders: list[LibraryFolder] = []


class GeneralConfig(BaseModel):
    """General application configuration"""
    log_level: str = "INFO"
    authentication: str = "None"
    timezone: str = "America/Los_Angeles"
    date_time_format: str = "YYYY-MM-DD HH:mm:ss"
    debug_mode: bool = False
    tmdb_api_key: str = ""
    theme: str = "system"  # Options: system, light, dark
    download_paths: list[MediaDirectory] = []
    auto_match_threshold: float = 0.8  # Auto-match confidence threshold (0.5-1.0)


class MoviesConfig(BaseModel):
    """Movies configuration"""
    library_paths: list[MediaDirectory] = []
    # Future movie-specific settings can go here
    quality_profiles: list[str] = ["HD-1080p", "HD-720p", "SD"]
    auto_search: bool = True


class TVConfig(BaseModel):
    """TV Shows configuration"""
    library_paths: list[MediaDirectory] = []
    quality_profiles: list[str] = ["HD-1080p", "HD-720p", "SD"]
    auto_search: bool = True
    
    # TrashGuides Naming Convention Settings
    # Show Folder Format - Example: "The Expanse (2015)"
    show_folder_format: str = "{show_name} ({year})"
    
    # Season Folder Format - Example: "Season 01" 
    season_folder_format: str = "Season {season:02d}"
    
    # Standard Episode Format - Example: "The Expanse - S01E01 - Dulcinea [WEBDL-1080p][x264][DTS][AMZN]"
    episode_format: str = "{show_name} - S{season:02d}E{episode:02d} - {episode_title} [{quality}][{video_codec}][{audio_codec}][{release_group}]"
    
    # Daily Episode Format (for daily shows) - Example: "The Daily Show - 2020-03-15 - Episode Title [WEBDL-1080p][x264][AAC][CC]"
    daily_episode_format: str = "{show_name} - {air_date} - {episode_title} [{quality}][{video_codec}][{audio_codec}][{release_group}]"
    
    # Anime Episode Format - Example: "Attack on Titan - S01E01 - To You, in 2000 Years [WEBDL-1080p][x264][AAC][Funimation]"
    anime_episode_format: str = "{show_name} - S{season:02d}E{episode:02d} - {episode_title} [{quality}][{video_codec}][{audio_codec}][{release_group}]"
    
    # Multi-Episode Format - Example: "The Expanse - S01E01-E02 - Dulcinea + The Big Empty [WEBDL-1080p][x264][DTS][AMZN]"
    multi_episode_format: str = "{show_name} - S{season:02d}E{episode_start}-E{episode_end} - {episode_titles} [{quality}][{video_codec}][{audio_codec}][{release_group}]"
    
    # Additional naming options
    include_year_in_folder: bool = True     # Whether to include year in show folder names
    clean_special_chars: bool = True        # Remove/replace problematic characters
    replace_spaces_with: str = " "          # Character to replace spaces with
    use_original_title: bool = False        # Use original title instead of translated title when available


class UsersConfig(BaseModel):
    """Users configuration (future)"""
    pass


class SecurityConfig(BaseModel):
    """Security configuration (future)"""
    pass


class AppConfig(BaseModel):
    """Complete application configuration"""
    general: GeneralConfig = GeneralConfig()
    movies: MoviesConfig = MoviesConfig()
    tv: TVConfig = TVConfig()
    users: UsersConfig = UsersConfig()
    security: SecurityConfig = SecurityConfig()
    libraries: list[Library] = []  # Plex-style libraries
    
    class Config:
        extra = "allow"


class ConfigManager:
    """Handles YAML configuration file management"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = Path(config_path)
        self._config = None
    
    def load_config(self) -> AppConfig:
        """Load configuration from YAML file"""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as file:
                    data = yaml.safe_load(file) or {}
                    return AppConfig(**data)
            except Exception as e:
                print(f"Error loading config: {e}")
                return AppConfig()
        else:
            # Create default config file
            default_config = AppConfig()
            self.save_config(default_config)
            return default_config
    
    def save_config(self, config: AppConfig) -> None:
        """Save configuration to YAML file"""
        try:
            with open(self.config_path, "w") as file:
                file.write("# Caddyy Configuration\n\n")
                yaml.safe_dump(config.dict(), file, default_flow_style=False, sort_keys=False)
        except Exception as e:
            print(f"Error saving config: {e}")
    
    def get_config(self) -> AppConfig:
        """Get current configuration (cached)"""
        if self._config is None:
            self._config = self.load_config()
        return self._config
    
    def update_config(self, updates: Dict[str, Any]) -> AppConfig:
        """Update configuration with new values"""
        current = self.get_config()
        updated_data = current.dict()
        updated_data.update(updates)
        
        new_config = AppConfig(**updated_data)
        self.save_config(new_config)
        self._config = new_config
        return new_config


# Global config manager instance
config_manager = ConfigManager()

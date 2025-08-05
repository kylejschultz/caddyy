"""
YAML configuration management
"""

import yaml
from pathlib import Path
from pydantic import BaseModel
from typing import Any, Dict


class GeneralConfig(BaseModel):
    """General application configuration"""
    log_level: str = "INFO"
    authentication: str = "None"
    timezone: str = "America/Los_Angeles"
    date_time_format: str = "YYYY-MM-DD HH:mm:ss"
    debug_mode: bool = False
    tmdb_api_key: str = ""


class MediaDirectory(BaseModel):
    """Media directory configuration"""
    name: str
    path: str
    enabled: bool = True


class MoviesConfig(BaseModel):
    """Movies configuration"""
    library_paths: list[MediaDirectory] = []
    download_paths: list[MediaDirectory] = []
    # Future movie-specific settings can go here
    quality_profiles: list[str] = ["HD-1080p", "HD-720p", "SD"]
    auto_search: bool = True


class TVConfig(BaseModel):
    """TV Shows configuration"""
    library_paths: list[MediaDirectory] = []
    download_paths: list[MediaDirectory] = []
    # Future TV-specific settings can go here
    quality_profiles: list[str] = ["HD-1080p", "HD-720p", "SD"]
    auto_search: bool = True
    season_folder_format: str = "Season {season:02d}"


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

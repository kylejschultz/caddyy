"""
Application configuration settings
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite:///./db/caddyy.db"
    
    TMDB_API_KEY: str = ""
    
    SABNZBD_HOST: str = "localhost"
    SABNZBD_PORT: int = 8080
    SABNZBD_API_KEY: str = ""
    
    MEDIA_ROOT: str = "/media"
    DOWNLOAD_ROOT: str = "/downloads"

    class Config:
        env_file = ".env"


settings = Settings()

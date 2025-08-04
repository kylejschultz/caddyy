"""
Settings API endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict

from backend.core.yaml_config import config_manager, AppConfig

router = APIRouter()


class SettingsUpdateRequest(BaseModel):
    """Request model for updating settings"""
    app_name: str = None
    app_description: str = None
    debug_mode: bool = None


@router.get("/", response_model=AppConfig)
async def get_settings() -> AppConfig:
    """Get current application settings"""
    return config_manager.get_config()


@router.put("/", response_model=AppConfig)
async def update_settings(updates: Dict[str, Any]) -> AppConfig:
    """Update application settings"""
    return config_manager.update_config(updates)

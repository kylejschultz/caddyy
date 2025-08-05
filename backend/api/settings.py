"""
Settings API endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict

from backend.core.yaml_config import config_manager, AppConfig, GeneralConfig

router = APIRouter()


@router.get("/", response_model=GeneralConfig)
async def get_settings() -> GeneralConfig:
    """Get current general settings"""
    config = config_manager.get_config()
    return config.general


@router.put("/", response_model=GeneralConfig)
async def update_settings(updates: Dict[str, Any]) -> GeneralConfig:
    """Update general settings"""
    current_config = config_manager.get_config()
    
    # Update only the general section
    general_data = current_config.general.dict()
    general_data.update(updates)
    
    # Create updated config
    updated_config = current_config.copy(deep=True)
    updated_config.general = GeneralConfig(**general_data)
    
    # Save full config
    config_manager.save_config(updated_config)
    config_manager._config = updated_config
    
    return updated_config.general

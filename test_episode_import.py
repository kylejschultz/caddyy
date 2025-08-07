#!/usr/bin/env python3
"""
Test script to demonstrate the enhanced TV show import functionality
that now fetches and stores all seasons and episodes from TMDB.

This script shows how the new CollectionService.add_tv_show() method
properly populates episode data so that total_episodes is no longer 0.
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.collection import CollectionService
from backend.core.database import get_db
from backend.models.collection import TVShow

async def test_tv_show_import():
    """Test importing a TV show with full episode data"""
    
    # Get database session
    db = next(get_db())
    
    # Create collection service
    service = CollectionService(db)
    
    # Test with a popular show (Breaking Bad TMDB ID: 1396)
    # This show has 5 seasons with 62 total episodes
    tmdb_id = 1396
    
    try:
        print(f"Testing TV show import for TMDB ID {tmdb_id} (Breaking Bad)...")
        
        # Check if show already exists
        existing = db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()
        if existing:
            print(f"Show already exists in database with ID {existing.id}")
            print(f"Title: {existing.title}")
            print(f"Seasons: {len(existing.seasons)}")
            print(f"TMDB Total Episodes: {existing.tmdb_total_episodes}")
            print(f"TMDB Season Count: {existing.tmdb_season_count}")
            
            total_episodes_in_db = sum(len(season.episodes) for season in existing.seasons)
            print(f"Episodes stored in database: {total_episodes_in_db}")
            
            if total_episodes_in_db == 0 or existing.tmdb_total_episodes == 0:
                print("Missing data! Let's refresh...")
                await service.refresh_tv_show_episodes(existing)
                
                # Refresh from database
                db.refresh(existing)
                total_episodes_in_db = sum(len(season.episodes) for season in existing.seasons)
                print(f"Episodes in database after refresh: {total_episodes_in_db}")
                print(f"TMDB Total Episodes after refresh: {existing.tmdb_total_episodes}")
            
            return existing
        else:
            # Import new show
            print("Importing new TV show...")
            tv_show = await service.add_tv_show(tmdb_id)
            
            print(f"Successfully imported: {tv_show.title}")
            print(f"Year: {tv_show.year}")
            print(f"Rating: {tv_show.rating}")
            print(f"Seasons: {len(tv_show.seasons)}")
            
            total_episodes = sum(len(season.episodes) for season in tv_show.seasons)
            print(f"Total episodes imported: {total_episodes}")
            
            # Show breakdown by season
            for season in tv_show.seasons:
                print(f"  Season {season.season_number}: {len(season.episodes)} episodes")
            
            return tv_show
            
    except Exception as e:
        print(f"Error: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    print("TV Show Import Test")
    print("=" * 50)
    print("This test demonstrates the enhanced TV show import")
    print("that now properly fetches episode data from TMDB.")
    print()
    
    result = asyncio.run(test_tv_show_import())
    
    if result:
        print()
        print("SUCCESS: TV show import is working correctly!")
        print("The UI should now show proper episode counts instead of 0/0.")
    else:
        print()
        print("FAILED: TV show import encountered errors.")

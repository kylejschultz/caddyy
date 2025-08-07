#!/usr/bin/env python3
"""
Script to fix existing TV shows that might be missing TMDB episode count data.
This will update any shows that have tmdb_total_episodes = 0 or NULL.
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.collection import CollectionService
from backend.core.database import get_db
from backend.models.collection import TVShow

async def fix_existing_shows():
    """Fix existing TV shows with missing TMDB data"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Find all shows that need fixing
        shows_to_fix = db.query(TVShow).filter(
            (TVShow.tmdb_total_episodes == 0) | 
            (TVShow.tmdb_total_episodes.is_(None))
        ).all()
        
        if not shows_to_fix:
            print("✅ No shows need fixing. All shows have TMDB episode counts.")
            return
        
        print(f"Found {len(shows_to_fix)} shows that need fixing...")
        
        # Create collection service
        service = CollectionService(db)
        
        for show in shows_to_fix:
            print(f"\n🔧 Fixing: {show.title}")
            print(f"   Current TMDB total episodes: {show.tmdb_total_episodes}")
            
            try:
                await service.refresh_tv_show_episodes(show)
                
                # Refresh from database to get updated values
                db.refresh(show)
                
                print(f"   ✅ Updated TMDB total episodes: {show.tmdb_total_episodes}")
                print(f"   ✅ Updated TMDB season count: {show.tmdb_season_count}")
                
                # Count episodes in database
                total_episodes_in_db = sum(len(season.episodes) for season in show.seasons)
                print(f"   📁 Episodes in database: {total_episodes_in_db}")
                
            except Exception as e:
                print(f"   ❌ Error fixing {show.title}: {e}")
        
        print(f"\n🎉 Finished processing {len(shows_to_fix)} shows!")
        
    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("TV Show Episode Count Fixer")
    print("=" * 50)
    print("This script will fix existing TV shows that are missing")
    print("TMDB episode count data, which would cause 0/0 displays.")
    print()
    
    asyncio.run(fix_existing_shows())
    
    print()
    print("✅ Done! The collection page should now show proper episode counts.")

#!/usr/bin/env python3

from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
import traceback
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.getcwd())

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Test server working"}

@app.get("/test-collection")
def test_collection():
    try:
        # Import step by step to see where it fails
        print("Step 1: Importing database...")
        from core.database import get_db
        print("✅ Database import successful")
        
        print("Step 2: Importing models...")
        from models.collection import TVShow
        print("✅ Models import successful")
        
        print("Step 3: Getting database session...")
        db = next(get_db())
        print("✅ Database session successful")
        
        print("Step 4: Querying TV shows...")
        shows = db.query(TVShow).all()
        print(f"✅ Query successful, found {len(shows)} shows")
        
        print("Step 5: Processing shows...")
        result = []
        for show in shows:
            downloaded_episodes = 0
            for season in show.seasons:
                for episode in season.episodes:
                    if episode.downloaded:
                        downloaded_episodes += 1
            
            tmdb_total_episodes = getattr(show, 'tmdb_total_episodes', None) or 0
            
            result.append({
                "id": show.id,
                "tmdb_id": show.tmdb_id,
                "title": show.title,
                "downloaded_episodes": downloaded_episodes,
                "total_episodes": tmdb_total_episodes
            })
        
        print(f"✅ Processing successful, result: {result}")
        
        db.close()
        return {"success": True, "shows": result}
        
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"❌ Error: {error_msg}")
        print(f"❌ Traceback: {error_trace}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": error_msg,
                "traceback": error_trace
            }
        )

if __name__ == "__main__":
    import uvicorn
    print("Starting test server on port 8002...")
    uvicorn.run(app, host="127.0.0.1", port=8002)

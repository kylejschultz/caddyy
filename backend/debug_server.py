#!/usr/bin/env python3
"""
Debug server to isolate the 500 error issue
"""

from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
import traceback
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, '/Volumes/kdev/caddyy/backend')

app = FastAPI(title="Debug Server")

@app.get("/debug/test")
async def test_endpoint():
    return {"message": "Debug server is working"}

@app.get("/debug/collection-test")
async def test_collection():
    try:
        print("Attempting to import collection components...")
        
        from backend.core.database import get_db
        from backend.models.collection import TVShow
        from backend.api.collection import get_tv_shows
        
        print("✅ All imports successful")
        
        # Test database connection
        db = next(get_db())
        print("✅ Database connection successful")
        
        # Test the actual function
        result = get_tv_shows(db=db)
        print(f"✅ Function call successful, result: {result}")
        
        db.close()
        
        return {"success": True, "result": result}
        
    except Exception as e:
        error_msg = str(e)
        error_traceback = traceback.format_exc()
        print(f"❌ Error in collection test: {error_msg}")
        print(f"Traceback: {error_traceback}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False, 
                "error": error_msg,
                "traceback": error_traceback
            }
        )

if __name__ == "__main__":
    import uvicorn
    print("Starting debug server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)

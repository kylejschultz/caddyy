"""
Main FastAPI application
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from caddyy.core.config import settings
from caddyy.core.database import init_db
from caddyy.api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Caddyy",
        description="A Modern Media Management Solution",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(api_router, prefix="/api")

    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")
        
        @app.get("/")
        async def serve_frontend():
            return FileResponse(static_dir / "index.html")
        
        @app.get("/{path:path}")
        async def serve_frontend_routes(path: str):
            # For client-side routing, always serve index.html
            if not path.startswith("api/") and "." not in path:
                return FileResponse(static_dir / "index.html")
            return {"message": "Not found"}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "caddyy.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )

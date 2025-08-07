"""
Collection service for managing movies and TV shows in the local database
"""

import httpx
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from backend.models.collection import Movie, TVShow, Season, Episode


class CollectionService:
    """Service for managing the local media collection"""
    
    def __init__(self, db: Session):
        self.db = db
        self.tmdb_base_url = "https://api.themoviedb.org/3"
    
    def _get_api_key(self) -> Optional[str]:
        """Get API key from YAML config"""
        try:
            from backend.core.yaml_config import config_manager
            config = config_manager.get_config()
            api_key = config.general.tmdb_api_key.strip() if config.general.tmdb_api_key else None
            return api_key if api_key else None
        except Exception:
            return None
    
    async def _fetch_tmdb_data(self, endpoint: str) -> Optional[Dict[Any, Any]]:
        """Fetch data from TMDB API"""
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("TMDB API key is not configured")
        
        url = f"{self.tmdb_base_url}{endpoint}"
        params = {"api_key": api_key}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                raise Exception(f"Failed to fetch TMDB data: {e}")
    
    def add_movie(self, tmdb_id: int) -> Movie:
        """Add a movie to the collection by TMDB ID"""
        # Check if movie already exists
        existing = self.db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
        if existing:
            raise ValueError(f"Movie with TMDB ID {tmdb_id} already exists in collection")
        
        # For now, create a placeholder movie
        # In a real implementation, you'd fetch from TMDB API
        movie = Movie(
            tmdb_id=tmdb_id,
            title=f"Movie {tmdb_id}",
            overview="Movie added to collection (TMDB data pending)",
            poster_url="",
            backdrop_url="",
            rating=0.0,
            year=2023,
            runtime=0,
            monitored=True,
            downloaded=False,
            path=""
        )
        
        self.db.add(movie)
        self.db.commit()
        self.db.refresh(movie)
        
        return movie
    
    async def add_tv_show(self, tmdb_id: int) -> TVShow:
        """Add a TV show to the collection by TMDB ID"""
        # Check if TV show already exists
        existing = self.db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()
        if existing:
            raise ValueError(f"TV show with TMDB ID {tmdb_id} already exists in collection")
        
        # Fetch TV show data from TMDB
        tmdb_data = await self._fetch_tmdb_data(f"/tv/{tmdb_id}")
        if not tmdb_data:
            raise ValueError(f"Could not fetch TV show data from TMDB for ID {tmdb_id}")
        
        # Extract year from first_air_date
        year = None
        if tmdb_data.get("first_air_date"):
            try:
                year = int(tmdb_data["first_air_date"].split("-")[0])
            except (ValueError, IndexError):
                year = None
        
        # Build poster and backdrop URLs
        poster_url = ""
        if tmdb_data.get("poster_path"):
            poster_url = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
        
        backdrop_url = ""
        if tmdb_data.get("backdrop_path"):
            backdrop_url = f"https://image.tmdb.org/t/p/w1280{tmdb_data['backdrop_path']}"
        
        # Create TV show with real TMDB data
        tv_show = TVShow(
            tmdb_id=tmdb_id,
            title=tmdb_data.get("name", ""),  # TV shows use "name" not "title"
            overview=tmdb_data.get("overview", ""),
            poster_url=poster_url,
            backdrop_url=backdrop_url,
            rating=tmdb_data.get("vote_average", 0.0),
            year=year,
            monitored=True,
            # Store TMDB totals directly for fast access
            tmdb_total_episodes=tmdb_data.get("number_of_episodes", 0),
            tmdb_season_count=tmdb_data.get("number_of_seasons", 0)
        )
        
        self.db.add(tv_show)
        self.db.commit()
        self.db.refresh(tv_show)
        
        # Fetch and store all seasons and episodes
        await self._fetch_and_store_seasons_episodes(tv_show, tmdb_data)
        
        return tv_show
    
    async def _fetch_and_store_seasons_episodes(self, tv_show: TVShow, tmdb_data: Dict[Any, Any]):
        """Fetch and store seasons and episodes for a TV show from TMDB"""
        seasons_data = tmdb_data.get("seasons", [])
        
        for season_data in seasons_data:
            season_number = season_data.get("season_number")
            # Skip season 0 (specials) for now, or include if you want specials
            if season_number is None or season_number < 1:
                continue
            
            # Create season record
            season = Season(
                tmdb_id=season_data.get("id"),
                show_id=tv_show.id,
                season_number=season_number,
                title=season_data.get("name", f"Season {season_number}"),
                overview=season_data.get("overview", ""),
                poster_url=f"https://image.tmdb.org/t/p/w500{season_data['poster_path']}" if season_data.get("poster_path") else "",
                monitored=tv_show.monitored  # Inherit from show
            )
            
            self.db.add(season)
            self.db.commit()
            self.db.refresh(season)
            
            # Fetch detailed season data to get episodes
            season_detail = await self._fetch_tmdb_data(f"/tv/{tv_show.tmdb_id}/season/{season_number}")
            if season_detail and "episodes" in season_detail:
                # Store the TMDB episode count for this season
                season.tmdb_episode_count = len(season_detail["episodes"])
                self.db.commit()
                self.db.refresh(season)
                
                for episode_data in season_detail["episodes"]:
                    episode = Episode(
                        tmdb_id=episode_data.get("id"),
                        season_id=season.id,
                        episode_number=episode_data.get("episode_number"),
                        title=episode_data.get("name", f"Episode {episode_data.get('episode_number', 0)}"),
                        overview=episode_data.get("overview", ""),
                        air_date=episode_data.get("air_date"),
                        runtime=episode_data.get("runtime"),
                        monitored=season.monitored,  # Inherit from season
                        downloaded=False  # Default to not downloaded
                    )
                    
                    self.db.add(episode)
                
                # Commit all episodes for this season
                self.db.commit()
    
    async def refresh_tv_show_episodes(self, tv_show: TVShow):
        """Refresh episodes for an existing TV show (useful for shows added before this fix)"""
        # Fetch fresh TV show data from TMDB
        tmdb_data = await self._fetch_tmdb_data(f"/tv/{tv_show.tmdb_id}")
        if not tmdb_data:
            raise ValueError(f"Could not fetch TV show data from TMDB for ID {tv_show.tmdb_id}")
        
        # Update TMDB totals if they're missing or zero
        if not tv_show.tmdb_total_episodes or not tv_show.tmdb_season_count:
            tv_show.tmdb_total_episodes = tmdb_data.get("number_of_episodes", 0)
            tv_show.tmdb_season_count = tmdb_data.get("number_of_seasons", 0)
            self.db.commit()
            self.db.refresh(tv_show)
        
        # If show has no seasons, fetch them
        if not tv_show.seasons:
            await self._fetch_and_store_seasons_episodes(tv_show, tmdb_data)
        else:
            # Check if existing seasons have all episodes
            for season in tv_show.seasons:
                if not season.episodes:
                    # Fetch detailed season data to get episodes
                    season_detail = await self._fetch_tmdb_data(f"/tv/{tv_show.tmdb_id}/season/{season.season_number}")
                    if season_detail and "episodes" in season_detail:
                        # Update season's TMDB episode count if missing
                        if not season.tmdb_episode_count:
                            season.tmdb_episode_count = len(season_detail["episodes"])
                            self.db.commit()
                            self.db.refresh(season)
                        
                        for episode_data in season_detail["episodes"]:
                            # Check if episode already exists
                            existing_episode = self.db.query(Episode).filter(
                                Episode.tmdb_id == episode_data.get("id")
                            ).first()
                            
                            if not existing_episode:
                                episode = Episode(
                                    tmdb_id=episode_data.get("id"),
                                    season_id=season.id,
                                    episode_number=episode_data.get("episode_number"),
                                    title=episode_data.get("name", f"Episode {episode_data.get('episode_number', 0)}"),
                                    overview=episode_data.get("overview", ""),
                                    air_date=episode_data.get("air_date"),
                                    runtime=episode_data.get("runtime"),
                                    monitored=season.monitored,
                                    downloaded=False
                                )
                                self.db.add(episode)
                        
                        # Commit episodes for this season
                        self.db.commit()
    
    def get_movies(self, skip: int = 0, limit: int = 100) -> List[Movie]:
        """Get movies from the collection"""
        return self.db.query(Movie).offset(skip).limit(limit).all()
    
    def get_tv_shows(self, skip: int = 0, limit: int = 100) -> List[TVShow]:
        """Get TV shows from the collection"""
        return self.db.query(TVShow).offset(skip).limit(limit).all()
    
    def get_movie_by_id(self, movie_id: int) -> Optional[Movie]:
        """Get a specific movie by ID"""
        return self.db.query(Movie).filter(Movie.id == movie_id).first()
    
    def get_tv_show_by_id(self, show_id: int) -> Optional[TVShow]:
        """Get a specific TV show by ID"""
        return self.db.query(TVShow).filter(TVShow.id == show_id).first()
    
    def update_movie(self, movie_id: int, **kwargs) -> Optional[Movie]:
        """Update a movie in the collection"""
        movie = self.get_movie_by_id(movie_id)
        if not movie:
            return None
        
        for field, value in kwargs.items():
            if hasattr(movie, field):
                setattr(movie, field, value)
        
        self.db.commit()
        self.db.refresh(movie)
        return movie
    
    def update_tv_show(self, show_id: int, **kwargs) -> Optional[TVShow]:
        """Update a TV show in the collection"""
        show = self.get_tv_show_by_id(show_id)
        if not show:
            return None
        
        for field, value in kwargs.items():
            if hasattr(show, field):
                setattr(show, field, value)
        
        self.db.commit()
        self.db.refresh(show)
        return show
    
    def remove_movie(self, movie_id: int) -> bool:
        """Remove a movie from the collection"""
        movie = self.get_movie_by_id(movie_id)
        if not movie:
            return False
        
        self.db.delete(movie)
        self.db.commit()
        return True
    
    def remove_tv_show(self, show_id: int) -> bool:
        """Remove a TV show from the collection"""
        show = self.get_tv_show_by_id(show_id)
        if not show:
            return False
        
        self.db.delete(show)
        self.db.commit()
        return True

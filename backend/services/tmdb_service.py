"""
TMDB API service for movie and TV show data
"""

import httpx
import asyncio
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# Embedded TMDB API key for zero-config setup
DEFAULT_TMDB_API_KEY = "ffd06157c00e7a9fb2f147d90b2c6048"
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"


class MediaResult(BaseModel):
    """Base model for search results (movies and TV shows)"""
    id: int
    title: str
    media_type: str  # "movie" or "tv"
    year: Optional[int] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    overview: str = ""
    rating: float = 0.0
    vote_count: int = 0
    popularity: float = 0.0


class MovieResult(MediaResult):
    """Movie-specific search result"""
    media_type: str = "movie"
    runtime: Optional[int] = None
    release_date: Optional[str] = None


class TVResult(MediaResult):
    """TV show-specific search result"""
    media_type: str = "tv"
    seasons: int = 0
    episodes: int = 0
    first_air_date: Optional[str] = None
    last_air_date: Optional[str] = None


class TMDBService:
    """Service for interacting with TMDB API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or DEFAULT_TMDB_API_KEY
        self.client = httpx.AsyncClient()
    
    async def search(self, query: str, media_type: Optional[str] = None) -> List[MediaResult]:
        """
        Search for movies and/or TV shows
        
        Args:
            query: Search query
            media_type: Filter by "movie", "tv", or None for both
        
        Returns:
            List of MediaResult objects
        """
        results = []
        
        if media_type is None or media_type == "movie":
            movie_results = await self._search_movies(query)
            results.extend(movie_results)
        
        if media_type is None or media_type == "tv":
            tv_results = await self._search_tv(query)
            results.extend(tv_results)
        
        # Sort by relevance: combine popularity and vote count for better results
        # TMDB already returns results in relevance order, but we can enhance it
        results.sort(key=lambda x: (x.popularity * (1 + x.vote_count / 1000)), reverse=True)
        
        return results
    
    async def _search_movies(self, query: str) -> List[MovieResult]:
        """Search for movies"""
        url = f"{TMDB_BASE_URL}/search/movie"
        params = {
            "api_key": self.api_key,
            "query": query,
            "page": 1
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("results", []):
                movie = MovieResult(
                    id=item["id"],
                    title=item.get("title", ""),
                    year=self._extract_year(item.get("release_date")),
                    poster_url=self._build_image_url(item.get("poster_path")),
                    backdrop_url=self._build_image_url(item.get("backdrop_path")),
                    overview=item.get("overview", ""),
                    rating=item.get("vote_average", 0.0),
                    vote_count=item.get("vote_count", 0),
                    popularity=item.get("popularity", 0.0),
                    release_date=item.get("release_date"),
                    runtime=None  # Not available in search results
                )
                results.append(movie)
            
            return results
        
        except Exception as e:
            print(f"Error searching movies: {e}")
            return []
    
    async def _search_tv(self, query: str) -> List[TVResult]:
        """Search for TV shows"""
        url = f"{TMDB_BASE_URL}/search/tv"
        params = {
            "api_key": self.api_key,
            "query": query,
            "page": 1
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("results", []):
                tv_show = TVResult(
                    id=item["id"],
                    title=item.get("name", ""),  # TV shows use "name" instead of "title"
                    year=self._extract_year(item.get("first_air_date")),
                    poster_url=self._build_image_url(item.get("poster_path")),
                    backdrop_url=self._build_image_url(item.get("backdrop_path")),
                    overview=item.get("overview", ""),
                    rating=item.get("vote_average", 0.0),
                    vote_count=item.get("vote_count", 0),
                    popularity=item.get("popularity", 0.0),
                    first_air_date=item.get("first_air_date"),
                    seasons=item.get("number_of_seasons", 0),
                    episodes=item.get("number_of_episodes", 0)
                )
                results.append(tv_show)
            
            return results
        
        except Exception as e:
            print(f"Error searching TV shows: {e}")
            return []
    
    def _extract_year(self, date_string: Optional[str]) -> Optional[int]:
        """Extract year from date string"""
        if not date_string:
            return None
        try:
            return int(date_string.split("-")[0])
        except (ValueError, IndexError):
            return None
    
    def _build_image_url(self, path: Optional[str]) -> Optional[str]:
        """Build full image URL from TMDB path"""
        if not path:
            return None
        return f"{TMDB_IMAGE_BASE_URL}{path}"
    
    async def get_movie_details(self, movie_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific movie"""
        url = f"{TMDB_BASE_URL}/movie/{movie_id}"
        params = {
            "api_key": self.api_key,
            "append_to_response": "credits"
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Extract cast and crew information
            cast = []
            director = None
            if "credits" in data:
                cast = [actor["name"] for actor in data["credits"].get("cast", [])[:10]]  # Top 10 cast
                crew = data["credits"].get("crew", [])
                for person in crew:
                    if person.get("job") == "Director":
                        director = person["name"]
                        break
            
            # Extract genres
            genres = [genre["name"] for genre in data.get("genres", [])]
            
            movie_details = {
                "id": data["id"],
                "title": data.get("title", ""),
                "overview": data.get("overview", ""),
                "poster_url": self._build_image_url(data.get("poster_path")),
                "backdrop_url": self._build_image_url(data.get("backdrop_path")),
                "rating": data.get("vote_average", 0.0),
                "vote_count": data.get("vote_count", 0),
                "year": self._extract_year(data.get("release_date")),
                "runtime": data.get("runtime"),
                "release_date": data.get("release_date"),
                "genres": genres,
                "cast": cast,
                "director": director,
                "popularity": data.get("popularity", 0.0),
                # Collection status (would come from database in real implementation)
                "in_collection": False,
                "monitored": False
            }
            
            return movie_details
            
        except Exception as e:
            print(f"Error getting movie details: {e}")
            return None
    
    async def get_tv_details(self, tv_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific TV show"""
        url = f"{TMDB_BASE_URL}/tv/{tv_id}"
        params = {
            "api_key": self.api_key,
            "append_to_response": "credits"
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            print(f"Error getting TV show details: {e}")
            return None
    
    async def get_tv_season_details(self, tv_id: int, season_number: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific season of a TV show"""
        url = f"{TMDB_BASE_URL}/tv/{tv_id}/season/{season_number}"
        params = {
            "api_key": self.api_key
        }
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            print(f"Error getting TV season details: {e}")
            return None
    
    def get_image_url(self, path: Optional[str]) -> Optional[str]:
        """Public method to build full image URL from TMDB path"""
        return self._build_image_url(path)
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global service instance
tmdb_service = TMDBService()

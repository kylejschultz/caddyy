"""
TV shows API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from backend.services.tmdb_service import TMDBService

router = APIRouter()
tmdb = TMDBService()


class TVShowDetails(BaseModel):
    id: int
    title: str
    overview: str
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    first_air_date: str
    last_air_date: Optional[str] = None
    status: str
    rating: float
    vote_count: int
    genres: List[str]
    created_by: List[str]
    networks: List[str]
    number_of_seasons: int
    number_of_episodes: int
    episode_run_time: List[int]
    seasons: List['Season']


class Season(BaseModel):
    id: int
    season_number: int
    name: str
    overview: str
    air_date: Optional[str] = None
    episode_count: int
    poster_url: Optional[str] = None


class Episode(BaseModel):
    id: int
    episode_number: int
    name: str
    overview: str
    air_date: Optional[str] = None
    runtime: Optional[int] = None
    still_url: Optional[str] = None
    rating: Optional[float] = None


@router.get("/{tv_id}/")
async def get_tv_show(tv_id: int) -> TVShowDetails:
    """Get detailed information about a TV show"""
    try:
        show_data = await tmdb.get_tv_details(tv_id)
        
        return TVShowDetails(
            id=show_data['id'],
            title=show_data.get('name', 'Unknown Title'),
            overview=show_data.get('overview', ''),
            poster_url=tmdb.get_image_url(show_data.get('poster_path')),
            backdrop_url=tmdb.get_image_url(show_data.get('backdrop_path')),
            first_air_date=show_data.get('first_air_date', ''),
            last_air_date=show_data.get('last_air_date'),
            status=show_data.get('status', 'Unknown'),
            rating=show_data.get('vote_average', 0.0),
            vote_count=show_data.get('vote_count', 0),
            genres=[genre['name'] for genre in show_data.get('genres', [])],
            created_by=[creator['name'] for creator in show_data.get('created_by', [])],
            networks=[network['name'] for network in show_data.get('networks', [])],
            number_of_seasons=show_data.get('number_of_seasons', 0),
            number_of_episodes=show_data.get('number_of_episodes', 0),
            episode_run_time=show_data.get('episode_run_time', []),
            seasons=[
                Season(
                    id=season['id'],
                    season_number=season['season_number'],
                    name=season.get('name', f'Season {season["season_number"]}'),
                    overview=season.get('overview', ''),
                    air_date=season.get('air_date'),
                    episode_count=season.get('episode_count', 0),
                    poster_url=tmdb.get_image_url(season.get('poster_path'))
                ) for season in show_data.get('seasons', [])
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"TV show not found: {str(e)}")


@router.get("/{tv_id}/season/{season_number}/episodes/")
async def get_season_episodes(tv_id: int, season_number: int) -> List[Episode]:
    """Get episodes for a specific season of a TV show"""
    try:
        season_data = await tmdb.get_tv_season_details(tv_id, season_number)
        
        episodes = []
        for episode_data in season_data.get('episodes', []):
            episodes.append(Episode(
                id=episode_data['id'],
                episode_number=episode_data['episode_number'],
                name=episode_data.get('name', f'Episode {episode_data["episode_number"]}'),
                overview=episode_data.get('overview', ''),
                air_date=episode_data.get('air_date'),
                runtime=episode_data.get('runtime'),
                still_url=tmdb.get_image_url(episode_data.get('still_path')),
                rating=episode_data.get('vote_average')
            ))
        
        return episodes
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Season not found: {str(e)}")

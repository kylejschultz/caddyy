"""
TV shows API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from backend.services.tmdb_service import TMDBService
from backend.core.database import get_db
from backend.models.collection import TVShow as CollectionTVShow
from sqlalchemy.orm import Session
from fastapi import Depends

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
    episodes: List['Episode'] = []


class Episode(BaseModel):
    id: int
    episode_number: int
    name: str
    overview: str
    air_date: Optional[str] = None
    runtime: Optional[int] = None
    still_url: Optional[str] = None
    rating: Optional[float] = None


# Collection-aware models with additional metadata
class CollectionTVShowDetails(BaseModel):
    id: int
    tmdb_id: int
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
    seasons: List['CollectionSeason']
    # Collection-specific fields
    in_collection: bool = True
    monitored: bool = True
    monitoring_option: Optional[str] = None
    folder_path: Optional[str] = None
    library_path_name: Optional[str] = None
    total_size: Optional[int] = None
    downloaded_episodes: int = 0
    total_episodes_count: int = 0


class CollectionSeason(BaseModel):
    id: int
    season_number: int
    name: str
    overview: str
    air_date: Optional[str] = None
    episode_count: int
    poster_url: Optional[str] = None
    # Collection-specific fields
    tmdb_id: Optional[int] = None
    monitored: bool = True
    downloaded_episodes: int = 0
    episodes: List['CollectionEpisode'] = []


class CollectionEpisode(BaseModel):
    id: int
    episode_number: int
    name: str
    overview: str
    air_date: Optional[str] = None
    runtime: Optional[int] = None
    still_url: Optional[str] = None
    rating: Optional[float] = None
    # Collection-specific fields
    tmdb_id: Optional[int] = None
    monitored: bool = True
    downloaded: bool = False
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    quality: Optional[str] = None
    release_group: Optional[str] = None


@router.get("/{tv_id}/")
async def get_tv_show(tv_id: int) -> TVShowDetails:
    """Get detailed information about a TV show with complete episode data"""
    try:
        show_data = await tmdb.get_tv_details(tv_id)
        
        # Build seasons with complete episode data from TMDB
        seasons_data = []
        for season in show_data.get('seasons', []):
            # Fetch detailed season data to get episodes
            season_episodes = []
            try:
                season_data = await tmdb.get_tv_season_details(tv_id, season['season_number'])
                
                # Build episodes list for this season
                for episode_data in season_data.get('episodes', []):
                    season_episodes.append(Episode(
                        id=episode_data['id'],
                        episode_number=episode_data['episode_number'],
                        name=episode_data.get('name', f'Episode {episode_data["episode_number"]}'),
                        overview=episode_data.get('overview', ''),
                        air_date=episode_data.get('air_date'),
                        runtime=episode_data.get('runtime'),
                        still_url=tmdb.get_image_url(episode_data.get('still_path')),
                        rating=episode_data.get('vote_average')
                    ))
            except Exception as e:
                print(f"Error fetching season {season['season_number']} episodes: {e}")
                # Continue without episodes if season fetch fails
            
            seasons_data.append(Season(
                id=season['id'],
                season_number=season['season_number'],
                name=season.get('name', f'Season {season["season_number"]}'),
                overview=season.get('overview', ''),
                air_date=season.get('air_date'),
                episode_count=len(season_episodes),
                poster_url=tmdb.get_image_url(season.get('poster_path')),
                episodes=season_episodes
            ))
        
        # Calculate actual total episodes from fetched data
        total_episodes = sum(len(season.episodes) for season in seasons_data)
        
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
            number_of_seasons=len(seasons_data),
            number_of_episodes=total_episodes,
            episode_run_time=show_data.get('episode_run_time', []),
            seasons=seasons_data
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


@router.get("/collection/{show_id}/")
async def get_collection_tv_show(show_id: int, db: Session = Depends(get_db)) -> CollectionTVShowDetails:
    """Get detailed information about a TV show from the collection with enhanced metadata"""
    # First, get the show from the collection database
    show = db.query(CollectionTVShow).filter(CollectionTVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found in collection")
    
    try:
        # Get TMDB data for additional metadata
        tmdb_data = await tmdb.get_tv_details(show.tmdb_id)
        
        # Build seasons with collection data + TMDB metadata
        seasons_data = []
        for season in show.seasons:
            # Count downloaded episodes in this season
            downloaded_count = sum(1 for ep in season.episodes if ep.downloaded)
            
            # Get TMDB season data to find missing episodes
            tmdb_season_data = None
            try:
                tmdb_season_data = await tmdb.get_tv_season_details(show.tmdb_id, season.season_number)
            except:
                pass
            
            # Build a map of collection episodes by episode number for quick lookup
            collection_episodes_map = {ep.episode_number: ep for ep in season.episodes}
            
            # Build complete episodes list (collection + missing from TMDB)
            episodes_data = []
            
            # If we have TMDB data, use it as the complete episode list
            if tmdb_season_data and 'episodes' in tmdb_season_data:
                for tmdb_episode in tmdb_season_data['episodes']:
                    episode_num = tmdb_episode['episode_number']
                    collection_episode = collection_episodes_map.get(episode_num)
                    
                    if collection_episode:
                        # We have this episode in our collection
                        episodes_data.append(CollectionEpisode(
                            id=collection_episode.id,
                            episode_number=collection_episode.episode_number,
                            name=collection_episode.title or tmdb_episode.get('name', f"Episode {episode_num}"),
                            overview=collection_episode.overview or tmdb_episode.get('overview', ""),
                            air_date=collection_episode.air_date or tmdb_episode.get('air_date'),
                            runtime=collection_episode.runtime or tmdb_episode.get('runtime'),
                            still_url=tmdb.get_image_url(tmdb_episode.get('still_path')),
                            rating=tmdb_episode.get('vote_average'),
                            tmdb_id=collection_episode.tmdb_id or tmdb_episode['id'],
                            monitored=collection_episode.monitored,
                            downloaded=collection_episode.downloaded,
                            file_path=collection_episode.file_path,
                            file_name=collection_episode.file_name,
                            file_size=collection_episode.file_size,
                            quality=collection_episode.quality,
                            release_group=collection_episode.release_group
                        ))
                    else:
                        # Missing episode from TMDB
                        episodes_data.append(CollectionEpisode(
                            id=tmdb_episode['id'],  # Use TMDB ID for missing episodes
                            episode_number=episode_num,
                            name=tmdb_episode.get('name', f"Episode {episode_num}"),
                            overview=tmdb_episode.get('overview', ""),
                            air_date=tmdb_episode.get('air_date'),
                            runtime=tmdb_episode.get('runtime'),
                            still_url=tmdb.get_image_url(tmdb_episode.get('still_path')),
                            rating=tmdb_episode.get('vote_average'),
                            tmdb_id=tmdb_episode['id'],
                            monitored=False,  # Missing episodes default to not monitored
                            downloaded=False,  # Obviously not downloaded
                            file_path=None,
                            file_name=None,
                            file_size=None,
                            quality=None,
                            release_group=None
                        ))
            else:
                # Fallback to just collection episodes if no TMDB data
                for episode in season.episodes:
                    episodes_data.append(CollectionEpisode(
                        id=episode.id,
                        episode_number=episode.episode_number,
                        name=episode.title or f"Episode {episode.episode_number}",
                        overview=episode.overview or "",
                        air_date=episode.air_date,
                        runtime=episode.runtime,
                        still_url=None,
                        rating=None,
                        tmdb_id=episode.tmdb_id,
                        monitored=episode.monitored,
                        downloaded=episode.downloaded,
                        file_path=episode.file_path,
                        file_name=episode.file_name,
                        file_size=episode.file_size,
                        quality=episode.quality,
                        release_group=episode.release_group
                    ))
            
            # Try to get TMDB season data for poster
            season_poster_url = None
            try:
                tmdb_seasons = tmdb_data.get('seasons', [])
                for tmdb_season in tmdb_seasons:
                    if tmdb_season.get('season_number') == season.season_number:
                        season_poster_url = tmdb.get_image_url(tmdb_season.get('poster_path'))
                        break
            except:
                pass
            
            seasons_data.append(CollectionSeason(
                id=season.id,
                season_number=season.season_number,
                name=season.title or f"Season {season.season_number}",
                overview=season.overview or "",
                air_date=None,  # Could be enhanced with TMDB data
                episode_count=len(episodes_data),
                poster_url=season.poster_url or season_poster_url,
                tmdb_id=season.tmdb_id,
                monitored=season.monitored,
                downloaded_episodes=downloaded_count,
                episodes=episodes_data
            ))
        
        # Count total downloaded episodes
        total_downloaded = sum(1 for season in show.seasons for episode in season.episodes if episode.downloaded)
        total_episodes = sum(len(season.episodes) for season in show.seasons)
        
        # Get library path information - use the same logic as the frontend
        library_path_name = "Unknown"
        if show.folder_path:
            # Call the config API to get library paths (same as frontend does)
            import httpx
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get("http://localhost:8000/api/config/tv/library-paths")
                    if response.status_code == 200:
                        library_paths = response.json()
                        # Find matching library path (same logic as frontend getDiskReferenceName)
                        for lib_path in library_paths:
                            if show.folder_path.startswith(lib_path["path"]) and lib_path.get("enabled", True):
                                library_path_name = lib_path["name"]
                                break
            except Exception as e:
                print(f"Error fetching library paths from config API: {e}")
                library_path_name = "Error"
        
        return CollectionTVShowDetails(
            id=show.id,
            tmdb_id=show.tmdb_id,
            title=show.title,
            overview=show.overview or "",
            poster_url=show.poster_url,
            backdrop_url=show.backdrop_url,
            first_air_date=tmdb_data.get('first_air_date', ''),
            last_air_date=tmdb_data.get('last_air_date'),
            status=tmdb_data.get('status', 'Unknown'),
            rating=show.rating or tmdb_data.get('vote_average', 0.0),
            vote_count=tmdb_data.get('vote_count', 0),
            genres=[genre['name'] for genre in tmdb_data.get('genres', [])],
            created_by=[creator['name'] for creator in tmdb_data.get('created_by', [])],
            networks=[network['name'] for network in tmdb_data.get('networks', [])],
            number_of_seasons=tmdb_data.get('number_of_seasons', 0),  # Use TMDB total seasons
            number_of_episodes=tmdb_data.get('number_of_episodes', 0),  # Use TMDB total episodes
            episode_run_time=tmdb_data.get('episode_run_time', []),
            seasons=seasons_data,
            in_collection=True,
            monitored=show.monitored,
            monitoring_option=show.monitoring_option,
            folder_path=show.folder_path,
            library_path_name=library_path_name,
            total_size=show.total_size,
            downloaded_episodes=total_downloaded,
            total_episodes_count=tmdb_data.get('number_of_episodes', 0)  # Use TMDB total episodes
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching TV show details: {str(e)}")


@router.get("/collection/{show_id}/season/{season_number}/episodes/")
async def get_collection_season_episodes(show_id: int, season_number: int, db: Session = Depends(get_db)) -> List[CollectionEpisode]:
    """Get episodes for a specific season from the collection"""
    # Get the show from the collection
    show = db.query(CollectionTVShow).filter(CollectionTVShow.id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="TV show not found in collection")
    
    # Find the season
    season = None
    for s in show.seasons:
        if s.season_number == season_number:
            season = s
            break
    
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    # Build episodes with collection data
    episodes_data = []
    for episode in season.episodes:
        episodes_data.append(CollectionEpisode(
            id=episode.id,
            episode_number=episode.episode_number,
            name=episode.title or f"Episode {episode.episode_number}",
            overview=episode.overview or "",
            air_date=episode.air_date,
            runtime=episode.runtime,
            still_url=None,  # Could be enhanced with TMDB data later
            rating=None,  # Could be enhanced with TMDB data later
            tmdb_id=episode.tmdb_id,
            monitored=episode.monitored,
            downloaded=episode.downloaded,
            file_path=episode.file_path,
            file_name=episode.file_name,
            file_size=episode.file_size,
            quality=episode.quality,
            release_group=episode.release_group
        ))
    
    return episodes_data

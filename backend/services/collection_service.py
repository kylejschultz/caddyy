"""
Service for managing the local media collection.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models.collection import Movie, TVShow, Season, Episode
from backend.services.tmdb_service import tmdb_service


class CollectionService:
    """Service for managing the local media collection."""

    def __init__(self):
        pass

    async def add_movie_to_collection(self, tmdb_id: int, db: Session) -> Optional[Movie]:
        """
        Add a movie to the collection by fetching details from TMDB
        and creating a local database entry.
        """
        try:
            # Check if movie already exists
            existing_movie = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
            if existing_movie:
                return existing_movie

            # Fetch movie details from TMDB
            movie_details = await tmdb_service.get_movie_details(tmdb_id)
            if not movie_details:
                return None

            # Create new movie entry
            movie = Movie(
                tmdb_id=tmdb_id,
                title=movie_details["title"],
                overview=movie_details["overview"],
                poster_url=movie_details["poster_url"],
                backdrop_url=movie_details["backdrop_url"],
                rating=movie_details["rating"],
                year=movie_details["year"],
                runtime=movie_details["runtime"]
            )

            db.add(movie)
            db.commit()
            db.refresh(movie)
            return movie

        except IntegrityError:
            db.rollback()
            # Movie already exists (race condition), return existing
            return db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
        except Exception as e:
            db.rollback()
            print(f"Error adding movie to collection: {e}")
            return None

    async def add_tv_show_to_collection(self, tmdb_id: int, db: Session) -> Optional[TVShow]:
        """
        Add a TV show to the collection by fetching details from TMDB
        and creating local database entries for the show, seasons, and episodes.
        """
        try:
            # Check if TV show already exists
            existing_show = db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()
            if existing_show:
                return existing_show

            # Fetch TV show details from TMDB
            show_details = await tmdb_service.get_tv_details(tmdb_id)
            if not show_details:
                return None

            # Create new TV show entry
            tv_show = TVShow(
                tmdb_id=tmdb_id,
                title=show_details.get("name", "Unknown"),
                overview=show_details.get("overview", ""),
                poster_url=tmdb_service.get_image_url(show_details.get("poster_path")),
                backdrop_url=tmdb_service.get_image_url(show_details.get("backdrop_path")),
                rating=show_details.get("vote_average", 0.0),
                year=self._extract_year(show_details.get("first_air_date"))
            )

            db.add(tv_show)
            db.flush()  # Flush to get the ID without committing

            # Add seasons and episodes
            seasons_data = show_details.get("seasons", [])
            for season_data in seasons_data:
                # Skip specials (season 0)
                if season_data.get("season_number", 0) == 0:
                    continue

                season = Season(
                    tmdb_id=season_data["id"],
                    show_id=tv_show.id,
                    season_number=season_data["season_number"],
                    title=season_data.get("name", f"Season {season_data['season_number']}"),
                    overview=season_data.get("overview", ""),
                    poster_url=tmdb_service.get_image_url(season_data.get("poster_path"))
                )

                db.add(season)
                db.flush()  # Flush to get the season ID

                # Fetch episode details for this season
                episodes_data = await tmdb_service.get_tv_season_details(tmdb_id, season_data["season_number"])
                if episodes_data and "episodes" in episodes_data:
                    for episode_data in episodes_data["episodes"]:
                        episode = Episode(
                            tmdb_id=episode_data["id"],
                            season_id=season.id,
                            episode_number=episode_data["episode_number"],
                            title=episode_data.get("name", f"Episode {episode_data['episode_number']}"),
                            overview=episode_data.get("overview", ""),
                            air_date=episode_data.get("air_date")
                        )
                        db.add(episode)

            db.commit()
            db.refresh(tv_show)
            return tv_show

        except IntegrityError:
            db.rollback()
            # TV show already exists (race condition), return existing
            return db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()
        except Exception as e:
            db.rollback()
            print(f"Error adding TV show to collection: {e}")
            return None

    def get_movie_by_tmdb_id(self, tmdb_id: int, db: Session) -> Optional[Movie]:
        """Get a movie from the collection by TMDB ID."""
        return db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()

    def get_tv_show_by_tmdb_id(self, tmdb_id: int, db: Session) -> Optional[TVShow]:
        """Get a TV show from the collection by TMDB ID."""
        return db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()

    def get_all_movies(self, db: Session) -> List[Movie]:
        """Get all movies in the collection."""
        return db.query(Movie).all()

    def get_all_tv_shows(self, db: Session) -> List[TVShow]:
        """Get all TV shows in the collection."""
        return db.query(TVShow).all()

    def remove_movie_from_collection(self, tmdb_id: int, db: Session) -> bool:
        """Remove a movie from the collection."""
        try:
            movie = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
            if movie:
                db.delete(movie)
                db.commit()
                return True
            return False
        except Exception as e:
            db.rollback()
            print(f"Error removing movie from collection: {e}")
            return False

    def remove_tv_show_from_collection(self, tmdb_id: int, db: Session) -> bool:
        """Remove a TV show from the collection."""
        try:
            tv_show = db.query(TVShow).filter(TVShow.tmdb_id == tmdb_id).first()
            if tv_show:
                # Episodes and seasons will be deleted automatically due to foreign key constraints
                db.delete(tv_show)
                db.commit()
                return True
            return False
        except Exception as e:
            db.rollback()
            print(f"Error removing TV show from collection: {e}")
            return False

    def _extract_year(self, date_string: Optional[str]) -> Optional[int]:
        """Extract year from date string."""
        if not date_string:
            return None
        try:
            return int(date_string.split("-")[0])
        except (ValueError, IndexError):
            return None


# Global service instance
collection_service = CollectionService()

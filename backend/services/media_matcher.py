"""
Media matcher service for pairing scanned files with TMDB metadata
"""

from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from difflib import SequenceMatcher
import re
import asyncio

from backend.services.media_scanner import ScannedTVShow, ScannedMovie
from backend.services.tmdb_service import tmdb_service, MediaResult
from backend.core.yaml_config import config_manager
from backend.core.database import SessionLocal
from backend.models.collection import TVShow

@dataclass
class TVShowMatch:
    """Represents a matched TV show with TMDB data"""
    scanned_show: ScannedTVShow
    tmdb_matches: List[MediaResult]
    selected_match: Optional[MediaResult] = None
    confidence_score: float = 0.0
    match_status: str = "pending"  # pending, matched, manual, skipped

@dataclass
class MovieMatch:
    """Represents a matched movie with TMDB data"""
    scanned_movie: ScannedMovie
    tmdb_matches: List[MediaResult]
    selected_match: Optional[MediaResult] = None
    confidence_score: float = 0.0
    match_status: str = "pending"  # pending, matched, manual, skipped

@dataclass
class ImportPreview:
    """Preview of import operation"""
    tv_matches: List[TVShowMatch]
    movie_matches: List[MovieMatch]
    total_scanned: int
    total_matched: int
    total_manual: int
    total_skipped: int

class MediaMatcher:
    """Service for matching scanned media with TMDB data"""
    
    # Minimum confidence score for automatic matching
    AUTO_MATCH_THRESHOLD = 0.85
    
    # Common words to ignore when matching
    IGNORE_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'between', 'among', 'under',
        'over', 'beneath', 'beside', 'beyond', 'across', 'within'
    }
    
    def __init__(self):
        pass
    
    async def match_tv_shows(self, scanned_shows: List[ScannedTVShow], 
                            progress_callback=None) -> List[TVShowMatch]:
        """
        Match scanned TV shows with TMDB data
        
        Args:
            scanned_shows: List of scanned TV shows
            progress_callback: Optional callback for progress updates
        
        Returns:
            List of TV show matches
        """
        matches = []
        total_shows = len(scanned_shows)
        
        for i, show in enumerate(scanned_shows):
            if progress_callback:
                await progress_callback(f"Matching {show.show_name}...", i, total_shows)
            
            try:
                match = await self._match_single_tv_show(show)
                matches.append(match)
                
                # Small delay to avoid overwhelming the API
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"Error matching show {show.show_name}: {e}")
                # Create a match with no results on error
                match = TVShowMatch(
                    scanned_show=show,
                    tmdb_matches=[],
                    confidence_score=0.0,
                    match_status="pending"
                )
                matches.append(match)
        
        return matches
    
    async def _match_single_tv_show(self, show: ScannedTVShow) -> TVShowMatch:
        """Match a single TV show with TMDB"""
        # Create search query
        search_query = self._create_search_query(show.show_name, show.show_year)
        
        # Search TMDB for TV shows
        results = await tmdb_service.search(search_query, "tv")
        
        # Filter and score the results
        scored_matches = []
        for result in results:
            score = self._calculate_tv_match_score(show, result)
            if score > 0.3:  # Only include reasonably good matches
                scored_matches.append((result, score))
        
        # Sort by score descending
        scored_matches.sort(key=lambda x: x[1], reverse=True)
        
        # Create match object
        match = TVShowMatch(
            scanned_show=show,
            tmdb_matches=[result for result, score in scored_matches[:10]],  # Top 10 matches
            confidence_score=scored_matches[0][1] if scored_matches else 0.0
        )
        
        # Check if we have any good matches
        if not scored_matches:
            match.match_status = "skipped"
            return match
        
        best_match = scored_matches[0][0]
        best_score = scored_matches[0][1]
        
        # Check if this show is already in the collection
        db = SessionLocal()
        try:
            existing_show = db.query(TVShow).filter(
                TVShow.tmdb_id == best_match.id
            ).first()
            
            if existing_show:
                match.selected_match = best_match
                match.match_status = "already_in_collection"
                return match
        finally:
            db.close()
        
        # Get auto-match threshold from settings
        config = config_manager.get_config()
        auto_match_threshold = getattr(config, 'auto_match_threshold', 0.8)
        
        # Auto-select if confidence is high enough
        if best_score >= auto_match_threshold:
            match.selected_match = best_match
            match.match_status = "matched"
        else:
            match.match_status = "needs_review"
        
        return match
    
    async def match_movies(self, scanned_movies: List[ScannedMovie], 
                          progress_callback=None) -> List[MovieMatch]:
        """
        Match scanned movies with TMDB data
        
        Args:
            scanned_movies: List of scanned movies
            progress_callback: Optional callback for progress updates
        
        Returns:
            List of movie matches
        """
        matches = []
        total_movies = len(scanned_movies)
        
        for i, movie in enumerate(scanned_movies):
            if progress_callback:
                await progress_callback(f"Matching {movie.title}...", i, total_movies)
            
            try:
                match = await self._match_single_movie(movie)
                matches.append(match)
                
                # Small delay to avoid overwhelming the API
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"Error matching movie {movie.title}: {e}")
                # Create a match with no results on error
                match = MovieMatch(
                    scanned_movie=movie,
                    tmdb_matches=[],
                    confidence_score=0.0,
                    match_status="pending"
                )
                matches.append(match)
        
        return matches
    
    async def _match_single_movie(self, movie: ScannedMovie) -> MovieMatch:
        """Match a single movie with TMDB"""
        # Create search query
        search_query = self._create_search_query(movie.title, movie.year)
        
        # Search TMDB for movies
        results = await tmdb_service.search(search_query, "movie")
        
        # Filter and score the results
        scored_matches = []
        for result in results:
            score = self._calculate_movie_match_score(movie, result)
            if score > 0.3:  # Only include reasonably good matches
                scored_matches.append((result, score))
        
        # Sort by score descending
        scored_matches.sort(key=lambda x: x[1], reverse=True)
        
        # Create match object
        match = MovieMatch(
            scanned_movie=movie,
            tmdb_matches=[result for result, score in scored_matches[:10]],  # Top 10 matches
            confidence_score=scored_matches[0][1] if scored_matches else 0.0
        )
        
        # Auto-select if confidence is high enough
        if scored_matches and scored_matches[0][1] >= self.AUTO_MATCH_THRESHOLD:
            match.selected_match = scored_matches[0][0]
            match.match_status = "matched"
        
        return match
    
    def _create_search_query(self, title: str, year: Optional[int] = None) -> str:
        """Create an optimized search query for TMDB"""
        # Clean up the title
        cleaned_title = self._clean_title_for_search(title)
        
        # Add year if available
        if year:
            return f"{cleaned_title} {year}"
        
        return cleaned_title
    
    def _clean_title_for_search(self, title: str) -> str:
        """Clean title for better search results"""
        # Remove common prefixes/suffixes that might confuse search
        title = re.sub(r'\b(US|UK|AU|CA)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\b\d{4}\b', '', title)  # Remove years from title
        title = re.sub(r'\(.*?\)', '', title)    # Remove parenthetical content
        title = re.sub(r'\[.*?\]', '', title)    # Remove bracketed content
        title = re.sub(r'\{.*?\}', '', title)    # Remove braced content
        
        # Clean up extra spaces
        title = ' '.join(title.split())
        
        return title.strip()
    
    def _calculate_tv_match_score(self, show: ScannedTVShow, result: MediaResult) -> float:
        """Calculate match score for a TV show"""
        score = 0.0
        
        # Title similarity (60% weight)
        title_score = self._calculate_title_similarity(show.show_name, result.title)
        score += title_score * 0.6
        
        # Year matching (20% weight)
        if show.show_year and result.year:
            year_diff = abs(show.show_year - result.year)
            if year_diff == 0:
                score += 0.2
            elif year_diff <= 2:  # Allow for some variance in release dates
                score += 0.1
        elif show.show_year is None:
            # If no year in scanned data, don't penalize
            score += 0.1
        
        # Popularity boost (10% weight) - more popular shows are more likely to be correct
        if result.popularity > 10:
            score += min(0.1, result.popularity / 1000)
        
        # Rating boost (10% weight) - higher rated shows are more likely to be correct
        if result.rating > 6.0:
            score += min(0.1, (result.rating - 6.0) / 4.0)
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _calculate_movie_match_score(self, movie: ScannedMovie, result: MediaResult) -> float:
        """Calculate match score for a movie"""
        score = 0.0
        
        # Title similarity (60% weight)
        title_score = self._calculate_title_similarity(movie.title, result.title)
        score += title_score * 0.6
        
        # Year matching (25% weight)
        if movie.year and result.year:
            year_diff = abs(movie.year - result.year)
            if year_diff == 0:
                score += 0.25
            elif year_diff == 1:  # Allow for one year difference
                score += 0.15
        elif movie.year is None:
            # If no year in scanned data, don't penalize
            score += 0.125
        
        # Popularity boost (8% weight)
        if result.popularity > 10:
            score += min(0.08, result.popularity / 1000)
        
        # Rating boost (7% weight)
        if result.rating > 6.0:
            score += min(0.07, (result.rating - 6.0) / 4.0)
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _calculate_title_similarity(self, title1: str, title2: str) -> float:
        """Calculate similarity between two titles"""
        # Normalize titles
        norm1 = self._normalize_title(title1)
        norm2 = self._normalize_title(title2)
        
        # Exact match
        if norm1 == norm2:
            return 1.0
        
        # Use SequenceMatcher for similarity
        similarity = SequenceMatcher(None, norm1, norm2).ratio()
        
        # Boost score if key words match
        words1 = set(norm1.split()) - self.IGNORE_WORDS
        words2 = set(norm2.split()) - self.IGNORE_WORDS
        
        if words1 and words2:
            word_intersection = len(words1 & words2)
            word_union = len(words1 | words2)
            word_similarity = word_intersection / word_union if word_union > 0 else 0
            
            # Combine sequence similarity with word similarity
            similarity = (similarity * 0.7) + (word_similarity * 0.3)
        
        return similarity
    
    def _normalize_title(self, title: str) -> str:
        """Normalize title for comparison"""
        # Convert to lowercase
        title = title.lower()
        
        # Remove common punctuation and special characters
        title = re.sub(r'[^\w\s]', ' ', title)
        
        # Remove extra spaces
        title = ' '.join(title.split())
        
        return title.strip()
    
    def create_import_preview(self, tv_matches: List[TVShowMatch], 
                             movie_matches: List[MovieMatch]) -> ImportPreview:
        """Create an import preview summary"""
        total_tv_scanned = len(tv_matches)
        total_movie_scanned = len(movie_matches)
        total_scanned = total_tv_scanned + total_movie_scanned
        
        tv_matched = sum(1 for match in tv_matches if match.match_status == "matched")
        movie_matched = sum(1 for match in movie_matches if match.match_status == "matched")
        total_matched = tv_matched + movie_matched
        
        tv_manual = sum(1 for match in tv_matches if match.match_status == "pending" and match.tmdb_matches)
        movie_manual = sum(1 for match in movie_matches if match.match_status == "pending" and match.tmdb_matches)
        total_manual = tv_manual + movie_manual
        
        tv_skipped = sum(1 for match in tv_matches if not match.tmdb_matches)
        movie_skipped = sum(1 for match in movie_matches if not match.tmdb_matches)
        total_skipped = tv_skipped + movie_skipped
        
        return ImportPreview(
            tv_matches=tv_matches,
            movie_matches=movie_matches,
            total_scanned=total_scanned,
            total_matched=total_matched,
            total_manual=total_manual,
            total_skipped=total_skipped
        )
    
    async def search_manual_match(self, query: str, media_type: str) -> List[MediaResult]:
        """Search for manual matches when auto-matching fails"""
        return await tmdb_service.search(query, media_type)

# Global matcher instance
media_matcher = MediaMatcher()

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Star,
  Play,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Television as Tv
} from '@phosphor-icons/react'
import axios from 'axios'

export interface Season {
  id: number
  season_number: number
  name?: string // TMDB field
  title?: string // Collection field
  overview: string
  air_date?: string
  episode_count?: number // TMDB field
  poster_url?: string
  // Collection-specific fields
  tmdb_id?: number
  monitored?: boolean
  downloaded_episodes?: number
  episodes?: CollectionEpisode[]
}

export interface Episode {
  id: number
  episode_number: number
  name: string
  overview: string
  air_date?: string
  runtime?: number
  still_url?: string
  rating?: number
}

export interface CollectionEpisode extends Episode {
  // Collection-specific fields
  tmdb_id?: number
  monitored?: boolean
  downloaded?: boolean
  file_path?: string
  file_name?: string
  file_size?: number
  quality?: string
  release_group?: string
}

interface SeasonAccordionProps {
  season: Season
  showId: string
  isCollectionShow: boolean
  isExpanded: boolean
  onToggle: () => void
  showTmdbId?: number // Add TMDB ID for proper episode fetching
}

export default function SeasonAccordion({ 
  season, 
  showId, 
  isCollectionShow, 
  isExpanded, 
  onToggle,
  showTmdbId 
}: SeasonAccordionProps) {
  
  
  // Fetch TMDB episodes using the stored tmdb_id for clean metadata
  const { data: tmdbEpisodes, isLoading } = useQuery<Episode[]>({
    queryKey: ['tv-episodes', showTmdbId || showId, season.season_number, 'tmdb'],
    queryFn: () => {
      // Use tmdb_id if available (for collection shows), otherwise use showId (for direct TMDB shows)
      const tmdbShowId = showTmdbId || showId
      const endpoint = `/api/tv/${tmdbShowId}/season/${season.season_number}/episodes/`
      return axios.get(endpoint).then(res => res.data)
    },
    enabled: Boolean(isExpanded && (showTmdbId || !isCollectionShow)), // Only fetch if we have tmdb_id or it's a direct TMDB show
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })

  // Merge TMDB episode data (for clean titles/metadata) with collection data (for file info)
  const episodes = useMemo(() => {
    
    if (!isCollectionShow) {
      // For non-collection shows, just use TMDB episodes
      return tmdbEpisodes || []
    }
    
    // For collection shows, merge TMDB metadata with collection file data
    const collectionEpisodes = season.episodes || []
    const tmdbData = tmdbEpisodes || []
    
    
    // Create a map of TMDB episodes by episode number for quick lookup
    const tmdbMap = new Map()
    tmdbData.forEach(ep => {
      tmdbMap.set(ep.episode_number, ep)
    })
    
    // Merge collection episodes with TMDB metadata
    const mergedEpisodes = collectionEpisodes.map(collectionEp => {
      const tmdbEp = tmdbMap.get(collectionEp.episode_number)
      
      
      if (tmdbEp) {
        // Use TMDB metadata with collection file data
        const merged = {
          ...tmdbEp, // TMDB metadata (title, overview, air_date, etc.)
          ...collectionEp, // Collection file data (downloaded, file_path, etc.)
          // Ensure we keep the clean TMDB title and metadata
          name: tmdbEp.name,
          overview: tmdbEp.overview,
          air_date: tmdbEp.air_date,
          runtime: tmdbEp.runtime,
          still_url: tmdbEp.still_url,
          rating: tmdbEp.rating
        }
        
        
        return merged
      }
      return collectionEp // Fallback to collection data if no TMDB match
    })
    
    // Add any TMDB episodes that aren't in the collection (missing episodes)
    tmdbData.forEach(tmdbEp => {
      const existsInCollection = mergedEpisodes.find(ep => ep.episode_number === tmdbEp.episode_number)
      if (!existsInCollection) {
        mergedEpisodes.push({
          ...tmdbEp,
          downloaded: false // Mark as not downloaded since it's not in collection
        })
      }
    })
    
    // Sort by episode number
    const sorted = mergedEpisodes.sort((a, b) => a.episode_number - b.episode_number)
    
    return sorted
  }, [isCollectionShow, season.episodes, tmdbEpisodes])

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return ''
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
  
  // Helper function to get episode title - now simplified since we merge TMDB data
  const getEpisodeTitle = (episode: Episode | CollectionEpisode) => {
    // Since we merge TMDB data, we can rely on clean episode names
    if (episode.name && episode.name.trim()) {
      return episode.name
    }
    return `Episode ${episode.episode_number}`
  }
  
  // Helper to calculate downloaded count for season header
  const getDownloadedCount = () => {
    if (!episodes || episodes.length === 0) return 0
    
    // If it's a collection show, count episodes that are actually downloaded
    if (isCollectionShow) {
      return episodes.filter((ep: Episode | CollectionEpisode) => {
        const epData = ep as any
        // Use the same comprehensive check as in episode rendering
        return (
          epData.downloaded === true || 
          epData.file_path || 
          epData.file_name ||
          (epData.file_size && epData.file_size > 0) ||
          epData.quality ||
          epData.release_group
        )
      }).length
    }
    
    // For TMDB shows, no episodes are downloaded
    return 0
  }

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center space-x-4">
          {season.poster_url ? (
            <img 
              src={season.poster_url} 
              alt={season.name}
              className="w-12 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center">
              <Tv className="w-6 h-6 text-slate-500" />
            </div>
          )}
          <div>
            <h4 className="font-semibold text-white">
              {season.name || season.title || `Season ${season.season_number}`}
            </h4>
            {season.air_date && (
              <p className="text-xs text-slate-500">
                {new Date(season.air_date).getFullYear()}
              </p>
            )}
            <p className="text-sm text-slate-400">
              {(() => {
                // Get episode count - prefer TMDB count, fallback to episodes array
                const totalEpisodes = season.episode_count || (season.episodes ? season.episodes.length : 0);
                const downloadedCount = isCollectionShow ? getDownloadedCount() : 0;
                
                return (
                  <>
                    {`${totalEpisodes} episode${totalEpisodes !== 1 ? 's' : ''}`}
                    {isCollectionShow && (
                      <span className="ml-2 text-green-400">
                        • {downloadedCount} downloaded
                      </span>
                    )}
                  </>
                );
              })()} 
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-700">
          {isLoading && !season.episodes ? (
            <div className="p-4">
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3 p-2">
                    <div className="w-16 h-9 bg-slate-700 rounded"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : episodes && episodes.length > 0 ? (
            <div className="divide-y divide-slate-700">
              {episodes.map((episode: Episode | CollectionEpisode) => {
                // For collection shows, ALL episodes are either downloaded or missing
                let isDownloaded = false
                let isMissing = false
                
                if (isCollectionShow) {
                  const epData = episode as any
                  
                  // More comprehensive check for downloaded episodes
                  // Check for any indication that the episode has file data
                  isDownloaded = (
                    epData.downloaded === true || 
                    epData.file_path || 
                    epData.file_name ||
                    (epData.file_size && epData.file_size > 0) ||
                    epData.quality ||
                    epData.release_group
                  )
                  
                  isMissing = !isDownloaded // If it's a collection show and not downloaded, it's missing
                }
                // For TMDB shows, episodes are neither downloaded nor missing (normal display)
                
                return (
                  <div 
                    key={episode.id} 
                    className={`p-4 hover:bg-slate-800/30 transition-colors ${
                      isDownloaded ? 'bg-green-800/20 border-l-4 !border-l-green-500' : 
                      isMissing ? 'bg-red-800/20 border-l-4 !border-l-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {episode.still_url ? (
                        <img 
                          src={episode.still_url} 
                          alt={getEpisodeTitle(episode)}
                          className="w-16 h-9 object-cover rounded"
                        />
                      ) : (
                        <div className={`w-16 h-9 rounded flex items-center justify-center ${
                          isDownloaded ? 'bg-green-800' : isMissing ? 'bg-red-800' : 'bg-slate-700'
                        }`}>
                          <Play className={`w-4 h-4 ${
                            isDownloaded ? 'text-green-300' : isMissing ? 'text-red-300' : 'text-slate-500'
                          }`} />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-white">
                                {episode.episode_number}. {getEpisodeTitle(episode)}
                              </h5>
                              {isDownloaded && (
                                <span className="px-2 py-1 bg-green-800 text-green-200 text-xs rounded">
                                  Downloaded
                                </span>
                              )}
                              {isMissing && (
                                <span className="px-2 py-1 bg-red-800 text-red-200 text-xs rounded">
                                  Missing
                                </span>
                              )}
                            </div>
                            {episode.overview && (
                              <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                {episode.overview}
                              </p>
                            )}
                            
                            {/* File info for downloaded episodes */}
                            {isCollectionShow && isDownloaded && (
                              <div className="mt-2 text-xs text-green-400 space-y-1">
                                {(episode as CollectionEpisode).file_name && (
                                  <div>📁 {(episode as CollectionEpisode).file_name}</div>
                                )}
                                <div className="flex items-center space-x-3">
                                  {(episode as CollectionEpisode).file_size && (episode as CollectionEpisode).file_size! > 0 && (
                                    <span>💾 {formatFileSize((episode as CollectionEpisode).file_size!)}</span>
                                  )}
                                  {(episode as CollectionEpisode).quality && (
                                    <span>🎬 {(episode as CollectionEpisode).quality!.toUpperCase()}</span>
                                  )}
                                  {(episode as CollectionEpisode).release_group && (
                                    <span>👥 {(episode as CollectionEpisode).release_group}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                              {episode.air_date && (
                                <span>{new Date(episode.air_date).toLocaleDateString()}</span>
                              )}
                              {episode.runtime && (
                                <span>{episode.runtime} min</span>
                              )}
                              {episode.rating && episode.rating > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                  <span>{episode.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400">
              No episodes available for this season
            </div>
          )}
        </div>
      )}
    </div>
  )
}

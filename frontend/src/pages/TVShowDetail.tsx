import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Calendar, 
  Star, 
  Clock, 
  Users, 
  Play, 
  Download,
  ChevronDown,
  ChevronRight,
  Tv
} from 'lucide-react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'

interface TVShowDetails {
  id: number
  title: string
  overview: string
  poster_url?: string
  backdrop_url?: string
  first_air_date: string
  last_air_date?: string
  status: string
  rating: number
  vote_count: number
  genres: string[]
  created_by: string[]
  networks: string[]
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number[]
  seasons: Season[]
}

interface Season {
  id: number
  season_number: number
  name: string
  overview: string
  air_date?: string
  episode_count: number
  poster_url?: string
}

interface Episode {
  id: number
  episode_number: number
  name: string
  overview: string
  air_date?: string
  runtime?: number
  still_url?: string
  rating?: number
}

export default function TVShowDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set())

  // Fetch TV show details
  const { data: show, isLoading, error } = useQuery<TVShowDetails>({
    queryKey: ['tv-show', id],
    queryFn: () => 
      axios.get(`/api/tv/${id}/`).then(res => res.data),
    enabled: !!id,
  })

  // Fetch episodes for a specific season (only when expanded)
  const useSeasonEpisodes = (seasonNumber: number, enabled: boolean) => {
    return useQuery<Episode[]>({
      queryKey: ['tv-episodes', id, seasonNumber],
      queryFn: () => 
        axios.get(`/api/tv/${id}/season/${seasonNumber}/episodes/`).then(res => res.data),
      enabled: enabled && !!id,
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    })
  }

  const toggleSeason = (seasonNumber: number) => {
    const newExpanded = new Set(expandedSeasons)
    if (newExpanded.has(seasonNumber)) {
      newExpanded.delete(seasonNumber)
    } else {
      newExpanded.add(seasonNumber)
    }
    setExpandedSeasons(newExpanded)
  }

  if (isLoading) {
    return (
      <>
        <PageHeader 
          title="Loading..." 
          description="Loading TV show details..."
        />
        <div className="p-6">
          <div className="animate-pulse">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-80">
                <div className="bg-slate-700 aspect-[2/3] rounded-lg"></div>
              </div>
              <div className="flex-1">
                <div className="h-8 bg-slate-700 rounded mb-4"></div>
                <div className="h-4 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 bg-slate-700 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded mb-4 w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !show) {
    return (
      <>
        <PageHeader 
          title="TV Show Not Found" 
          description="The requested TV show could not be found."
        />
        <div className="p-6">
          <div className="text-center py-12">
            <Tv className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">TV Show Not Found</h3>
            <p className="text-slate-400 mb-6">
              The TV show you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/shows')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse TV Shows
            </button>
          </div>
        </div>
      </>
    )
  }

  const formatRuntime = (minutes: number[]) => {
    if (!minutes || minutes.length === 0) return 'Unknown'
    if (minutes.length === 1) return `${minutes[0]} min`
    return `${Math.min(...minutes)}-${Math.max(...minutes)} min`
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).getFullYear()
    } catch {
      return 'Unknown'
    }
  }

  return (
    <>
      <PageHeader 
        title={show.title}
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span>Add to Collection</span>
            </button>
          </div>
        }
      />
      
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="lg:w-80">
            <div className="sticky top-24">
              {show.poster_url ? (
                <img
                  src={show.poster_url}
                  alt={show.title}
                  className="w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-slate-700 rounded-lg flex items-center justify-center">
                  <Tv className="w-16 h-16 text-slate-500" />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Overview */}
            {show.overview && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
                <p className="text-slate-300 leading-relaxed">{show.overview}</p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-slate-400">First Aired:</span>
                    <span className="text-white ml-2">{formatDate(show.first_air_date)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <div>
                    <span className="text-slate-400">Rating:</span>
                    <span className="text-white ml-2">{show.rating.toFixed(1)}/10</span>
                    <span className="text-slate-500 ml-1">({show.vote_count.toLocaleString()} votes)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-slate-400">Episode Runtime:</span>
                    <span className="text-white ml-2">{formatRuntime(show.episode_run_time)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Tv className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-slate-400">Seasons:</span>
                    <span className="text-white ml-2">{show.number_of_seasons}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-slate-400">Episodes:</span>
                    <span className="text-white ml-2">{show.number_of_episodes}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-slate-400" />
                  <div>
                    <span className="text-slate-400">Status:</span>
                    <span className="text-white ml-2">{show.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {show.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Networks */}
            {show.networks && show.networks.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Networks</h3>
                <div className="flex flex-wrap gap-2">
                  {show.networks.map((network) => (
                    <span
                      key={network}
                      className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700/30"
                    >
                      {network}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Seasons & Episodes */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Seasons & Episodes</h3>
              <div className="space-y-2">
                {show.seasons
                  .filter(season => season.season_number > 0) // Filter out specials
                  .map((season) => (
                    <SeasonAccordion
                      key={season.id}
                      season={season}
                      isExpanded={expandedSeasons.has(season.season_number)}
                      onToggle={() => toggleSeason(season.season_number)}
                      useSeasonEpisodes={useSeasonEpisodes}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface SeasonAccordionProps {
  season: Season
  isExpanded: boolean
  onToggle: () => void
  useSeasonEpisodes: (seasonNumber: number, enabled: boolean) => any
}

function SeasonAccordion({ season, isExpanded, onToggle, useSeasonEpisodes }: SeasonAccordionProps) {
  const { data: episodes, isLoading } = useSeasonEpisodes(season.season_number, isExpanded)

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
            <h4 className="font-semibold text-white">{season.name}</h4>
            <p className="text-sm text-slate-400">
              {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
              {season.air_date && ` • ${new Date(season.air_date).getFullYear()}`}
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
          {isLoading ? (
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
              {episodes.map((episode) => (
                <div key={episode.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start space-x-4">
                    {episode.still_url ? (
                      <img 
                        src={episode.still_url} 
                        alt={episode.name}
                        className="w-16 h-9 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-9 bg-slate-700 rounded flex items-center justify-center">
                        <Play className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium text-white">
                            {episode.episode_number}. {episode.name}
                          </h5>
                          {episode.overview && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                              {episode.overview}
                            </p>
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
              ))}
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

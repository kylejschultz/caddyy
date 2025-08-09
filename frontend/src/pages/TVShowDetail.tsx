import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Calendar, 
  Star, 
  Clock, 
  Users, 
  Play, 
  Download,
  Television as Tv,
  Trash as Trash2,
  CheckCircle,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight
} from '@phosphor-icons/react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'
import SeasonAccordion, { Season } from '../components/SeasonAccordion'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import AddToCollectionModal from '../components/AddToCollectionModal'
import MonitoringDropdown, { MonitoringOption } from '../components/MonitoringDropdown'
import Toast from '../components/Toast'

interface TVShowDetails {
  id: number
  tmdb_id?: number
  title: string
  overview: string
  poster_url?: string
  backdrop_url?: string
  first_air_date: string
  last_air_date?: string
  status: string
  rating: float
  vote_count: number
  genres: string[]
  created_by: string[]
  networks: string[]
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number[]
  seasons: Season[]
  // Collection-specific fields
  tmdb_id?: number
  in_collection?: boolean
  monitored?: boolean
  monitoring_option?: MonitoringOption
  folder_path?: string
  library_path_name?: string
  total_size?: number
  downloaded_episodes?: number
  total_episodes_count?: number
}
// Interfaces now imported from SeasonAccordion component

export default function TVShowDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [removedShowData, setRemovedShowData] = useState<{ name: string; deletedFromDisk: boolean } | null>(null)

  const { data: show, isLoading, error } = useQuery<TVShowDetails>({
    queryKey: ['tv-show', id],
    queryFn: async () => {
      console.log('🔍 TVShowDetail: Fetching show with TMDB ID:', id)
      
      let collectionData = null
      
      // First, try to find the show in the collection by TMDB ID
      try {
        console.log('📡 TVShowDetail: Fetching collection shows...')
        const collectionResponse = await axios.get(`/api/collection/tv`)
        const collectionShows = collectionResponse.data
        console.log('📊 TVShowDetail: Collection shows:', collectionShows.length, 'shows')
        
        const collectionShow = collectionShows.find((show: any) => show.tmdb_id.toString() === id)
        console.log('🎯 TVShowDetail: Found in collection:', !!collectionShow, collectionShow?.title)
        
        if (collectionShow) {
          // If found in collection, fetch full details from collection endpoint
          console.log('📡 TVShowDetail: Fetching detailed collection data for show ID:', collectionShow.id)
          const response = await axios.get(`/api/tv/collection/${collectionShow.id}/`)
          console.log('📊 TVShowDetail: Collection detail response:', response.data)
          collectionData = response.data
        }
      } catch (collectionError) {
        console.error('❌ TVShowDetail: Collection lookup failed:', collectionError)
      }
      
      // Always fetch TMDB data for complete metadata
      console.log('📡 TVShowDetail: Fetching from TMDB API...')
      const tmdbResponse = await axios.get(`/api/tv/${id}/`)
      console.log('📊 TVShowDetail: TMDB response:', tmdbResponse.data)
      
      // Merge collection data with TMDB data, carefully handling seasons
      const tmdbSeasons = tmdbResponse.data.seasons || []
      const collectionSeasons = collectionData?.seasons || []
      
      // Create a map of collection seasons by season number
      const collectionSeasonMap = new Map()
      collectionSeasons.forEach((season: any) => {
        collectionSeasonMap.set(season.season_number, season)
      })
      
      // Merge seasons: keep all TMDB seasons, add collection data where available
      const mergedSeasons = tmdbSeasons.map((tmdbSeason: any) => {
        const collectionSeason = collectionSeasonMap.get(tmdbSeason.season_number)
        
        if (collectionSeason) {
          // This season exists in collection - merge the data
          return {
            ...tmdbSeason, // TMDB metadata (name, episode_count, air_date, etc.)
            ...collectionSeason, // Collection data (id, monitored, episodes, etc.)
            // Preserve TMDB metadata fields
            name: tmdbSeason.name,
            episode_count: tmdbSeason.episode_count,
            air_date: tmdbSeason.air_date,
            poster_url: tmdbSeason.poster_url || collectionSeason.poster_url,
            overview: tmdbSeason.overview || collectionSeason.overview,
          }
        } else {
          // Season not in collection - use TMDB data only
          return {
            ...tmdbSeason,
            // Collection-specific fields for non-collection seasons
            monitored: false,
            episodes: [],
            downloaded_episodes: 0,
          }
        }
      })
      
      const mergedData = {
        ...tmdbResponse.data, // TMDB data as base (has all metadata)
        ...collectionData, // Collection data overrides where available
        seasons: mergedSeasons, // Use properly merged seasons
        in_collection: !!collectionData, // Set collection status
        tmdb_id: parseInt(id!), // Ensure TMDB ID is set
      }
      
      // The backend now properly stores and returns monitoring_option
      if (collectionData) {
        mergedData.monitoring_option = collectionData.monitoring_option || 'All'
      } else {
        mergedData.monitoring_option = 'None'
      }
      
      return mergedData
    },
    enabled: !!id,
    retry: 1,
  })

  // React Query mutation for removing show from collection - moved before early returns
  const removeShowMutation = useMutation({
    mutationFn: async (deleteFromDisk: boolean) => {
      if (!show?.in_collection) {
        throw new Error('Show is not in collection')
      }
      
      // First get the collection ID from the current show data
      const collectionId = show.id // This is the collection database ID
      
      // Use the collection ID for deletion
      const response = await axios.delete(`/api/collection/tv/${collectionId}?delete_from_disk=${deleteFromDisk}`)
      return { deleteFromDisk } // Return the deleteFromDisk flag for the toast
    },
    onSuccess: (data) => {
      // Store the removed show data for the toast
      setRemovedShowData({
        name: show?.title || 'Unknown Show',
        deletedFromDisk: data.deleteFromDisk
      })
      setShowToast(true)
      
      // Invalidate and refetch the current show data
      queryClient.invalidateQueries({ queryKey: ['tv-show', id] })
      // Close the modal
      setShowDeleteModal(false)
      // Don't navigate away - let the user see the updated button state
    },
    onError: (error) => {
      console.error('Error removing show from collection:', error)
      // You might want to show a toast notification here
    }
  })

  // React Query mutation for updating monitoring status
  const updateMonitoringMutation = useMutation({
    mutationFn: async (monitoringOption: MonitoringOption) => {
      if (!show?.in_collection) {
        throw new Error('Show is not in collection')
      }
      
      const collectionId = show.id // This is the collection database ID
      
      // Update monitoring status via API
      const response = await axios.patch(`/api/collection/tv/${collectionId}/monitoring`, {
        monitoring: monitoringOption
      })
      return response.data
    },
    onSuccess: () => {
      // Invalidate and refetch the current show data
      queryClient.invalidateQueries({ queryKey: ['tv-show', id] })
    },
    onError: (error) => {
      console.error('Error updating monitoring status:', error)
      // You might want to show a toast notification here
    }
  })

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
              <div className="w-28 sm:w-32 lg:w-56 flex-shrink-0">
                <div className="bg-slate-700 aspect-[2/3] rounded-lg"></div>
              </div>
              <div className="flex-1 min-w-0">
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }


  const handleRemoveFromCollection = (deleteFromDisk: boolean) => {
    removeShowMutation.mutate(deleteFromDisk)
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
            {!show.in_collection ? (
              <button 
                onClick={() => setShowAddToCollectionModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Add to Collection</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="group flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4 group-hover:hidden" />
                <Trash2 className="w-4 h-4 hidden group-hover:inline" />
                <span className="group-hover:hidden">In Collection</span>
                <span className="hidden group-hover:inline">Remove</span>
              </button>
            )}
          </div>
        }
      />
      
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="w-28 sm:w-32 lg:w-56 flex-shrink-0">
            <div className="sticky top-24">
              {show.poster_url ? (
                <img
                  src={show.poster_url}
                  alt={show.title}
                  className="w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-slate-700 rounded-lg flex items-center justify-center">
                  <Tv className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-slate-500" />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Collapsible Details Section */}
            <div className="mb-8">
              <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-600/50">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-600/50 transition-colors">
                      {showDetails ? (
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <span className="text-white font-medium">Details</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/40 rounded-lg border border-slate-600/30">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">{formatDate(show.first_air_date)}</span>
                    </div>
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/40 rounded-lg border border-slate-600/30">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-slate-200">{show.rating.toFixed(1)}/10</span>
                    </div>
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/40 rounded-lg border border-slate-600/30">
                      <Tv className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">{show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}</span>
                    </div>
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 rounded-lg border border-emerald-700/40">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-200">{show.status}</span>
                    </div>
                  </div>
                </button>
                
                {showDetails && (
                  <div className="px-6 pb-6 border-t border-slate-700/30">
                    <div className="pt-6 space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                          <Calendar className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                          <div className="text-xs text-slate-400 mb-1">First Aired</div>
                          <div className="text-white font-semibold">{formatDate(show.first_air_date)}</div>
                        </div>
                        
                        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                          <Star className="w-5 h-5 text-yellow-400 fill-current mx-auto mb-2" />
                          <div className="text-xs text-slate-400 mb-1">Rating</div>
                          <div className="text-white font-semibold">{show.rating.toFixed(1)}/10</div>
                          <div className="text-xs text-slate-500">({show.vote_count?.toLocaleString() || '0'} votes)</div>
                        </div>
                        
                        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                          <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                          <div className="text-xs text-slate-400 mb-1">Runtime</div>
                          <div className="text-white font-semibold">{formatRuntime(show.episode_run_time)}</div>
                        </div>
                        
                        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                          <Tv className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                          <div className="text-xs text-slate-400 mb-1">Seasons</div>
                          <div className="text-white font-semibold">{show.number_of_seasons}</div>
                        </div>
                        
                        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                          <Play className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                          <div className="text-xs text-slate-400 mb-1">Episodes</div>
                          <div className="text-white font-semibold">{show.number_of_episodes}</div>
                        </div>
                        
                        <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                          <Users className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                          <div className="text-xs text-slate-400 mb-1">Status</div>
                          <div className="text-white font-semibold text-sm">{show.status}</div>
                        </div>
                      </div>

                      {/* Genres & Networks Side by Side */}
                      {(show.genres && show.genres.length > 0) || (show.networks && show.networks.length > 0) ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Genres */}
                          {show.genres && show.genres.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                                <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
                                Genres
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {show.genres.map((genre) => (
                                  <span
                                    key={genre}
                                    className="px-3 py-1.5 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-slate-200 rounded-lg text-sm font-medium border border-slate-600/30"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Networks */}
                          {show.networks && show.networks.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                                <div className="w-1 h-4 bg-purple-500 rounded-full mr-2"></div>
                                Networks
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {show.networks.map((network) => (
                                  <span
                                    key={network}
                                    className="px-3 py-1.5 bg-gradient-to-r from-purple-900/40 to-purple-800/40 text-purple-200 rounded-lg text-sm font-medium border border-purple-700/40"
                                  >
                                    {network}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Overview */}
            {show.overview && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
                <p className="text-slate-300 leading-relaxed">{show.overview}</p>
              </div>
            )}

            {/* Collection Status */}
            {show.in_collection && (
              <div className="mb-8 p-6 bg-gradient-to-br from-green-900/15 to-emerald-900/10 border border-green-700/25 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-green-300 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>In Collection</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 text-sm">Monitoring:</span>
                    <MonitoringDropdown
                      value={show.monitoring_option || 'None'}
                      onChange={(option) => updateMonitoringMutation.mutate(option)}
                      disabled={updateMonitoringMutation.isPending}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Collection Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Downloaded</div>
                      <div className="text-sm text-slate-200 font-semibold">
                        {show.downloaded_episodes || 0}/{show.total_episodes_count || show.number_of_episodes}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Library Path</div>
                      <div className="text-sm text-slate-200 font-semibold" title={show.library_path_name || "Unknown"}>
                        {show.library_path_name || "Unknown"}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Total Size</div>
                      <div className="text-sm text-slate-200 font-semibold">
                        {show.total_size && show.total_size > 0 ? formatFileSize(show.total_size) : "0 B"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Seasons & Episodes */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Seasons & Episodes</h3>
              <div className="space-y-2">
                {show.seasons
                  .filter((season) => season.season_number !== 0) // Filter out specials
                  .sort((a, b) => a.season_number - b.season_number) // Simple ascending sort
                  .map((season) => (
                    <SeasonAccordion
                      key={season.id}
                      season={season}
                      showId={id!}
                      isCollectionShow={show.in_collection || false}
                      isExpanded={expandedSeasons.has(season.season_number)}
                      onToggle={() => toggleSeason(season.season_number)}
                      showTmdbId={show.tmdb_id} // Pass the stored TMDB ID
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleRemoveFromCollection}
        title="Remove TV Show"
        itemName={show.title}
        itemType="show"
        hasFiles={Boolean(show.folder_path)}
        folderPath={show.folder_path}
        totalSize={show.total_size}
      />
      
      <AddToCollectionModal
        isOpen={showAddToCollectionModal}
        onClose={() => setShowAddToCollectionModal(false)}
        showId={id!}
        showName={show.title}
        showPosterUrl={show.poster_url}
        showOverview={show.overview}
        showYear={show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined}
        showRating={show.rating}
        onSuccess={() => {
          // Invalidate and refetch the show data to update the UI
          queryClient.invalidateQueries({ queryKey: ['tv-show', id] })
        }}
      />
      
      {/* Toast notification for show removal */}
      {showToast && removedShowData && (
        <Toast
          type="error"
          title="Show Removed"
          message={`"${removedShowData.name}" has been removed from your collection${removedShowData.deletedFromDisk ? ' and deleted from disk' : ''}.`}
          isVisible={showToast}
          onClose={() => {
            setShowToast(false)
            setRemovedShowData(null)
          }}
        />
      )}
    </>
  )
}

// Now using the reusable SeasonAccordion component from ../components/SeasonAccordion

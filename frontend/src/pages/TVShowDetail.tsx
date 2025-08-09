import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Users, 
  Download,
  Television as Tv,
  Broadcast,
  HardDrive,
  Trash as Trash2,
  CheckCircle
} from '@phosphor-icons/react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'
import SeasonAccordion, { Season } from '../components/SeasonAccordion'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import AddToCollectionModal from '../components/AddToCollectionModal'
import MonitoringDropdown, { MonitoringOption } from '../components/MonitoringDropdown'
import DiskDropdown from '../components/DiskDropdown'
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
  rating: number
  vote_count: number
  genres: string[]
  created_by: string[]
  networks: string[]
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number[]
  seasons: Season[]
  // Collection-specific fields
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
      await axios.delete(`/api/collection/tv/${collectionId}?delete_from_disk=${deleteFromDisk}`)
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

  // Load libraries and disks (folders) for disk management
  const { data: libraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: async () => {
      const response = await axios.get('/api/libraries')
      return response.data as Array<{ id: number; name: string; media_type: 'movies' | 'tv' }>
    }
  })

  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null)
  const { data: disks } = useQuery({
    queryKey: ['library-disks', selectedLibraryId],
    queryFn: async () => {
      if (!selectedLibraryId) return [] as Array<{ id: number; name: string; path: string }>
      const response = await axios.get(`/api/libraries/${selectedLibraryId}/folders`)
      return response.data as Array<{ id: number; name: string; path: string }>
    },
    enabled: !!selectedLibraryId
  })

  // Determine library and disk based on the show's current folder_path
  const [selectedDiskId, setSelectedDiskId] = useState<number | undefined>(undefined)
  const [diskOptions, setDiskOptions] = useState<Array<{ id: number; name: string; path: string }>>([])

  useEffect(() => {
    if (libraries && libraries.length > 0 && !selectedLibraryId) {
      // Pick first TV library
      const tvLib = libraries.find(l => l.media_type === 'tv') || libraries[0]
      setSelectedLibraryId(tvLib.id)
    }
  }, [libraries, selectedLibraryId])

  useEffect(() => {
    if (!disks) return
    setDiskOptions(disks)
    // Infer current disk from show.folder_path
    if (show?.folder_path) {
      const match = disks.find(d => show.folder_path!.startsWith(d.path))
      if (match) setSelectedDiskId(match.id)
    }
  }, [disks, show?.folder_path])

  // Change disk handler
  const handleChangeDisk = (diskId: number) => {
    if (!show?.in_collection || !selectedLibraryId) return
    axios
      .patch(`/api/collection/tv/${show.id}/location`, {
        library_id: selectedLibraryId,
        disk_id: diskId,
        create_folders: true,
      })
      .then(() => {
        setSelectedDiskId(diskId)
        queryClient.invalidateQueries({ queryKey: ['tv-show', id] })
      })
      .catch((err) => {
        console.error('Failed to move show between disks:', err)
        alert('Failed to move show. Please check server logs and try again.')
      })
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

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }


  const handleRemoveFromCollection = (deleteFromDisk: boolean) => {
    removeShowMutation.mutate(deleteFromDisk)
  }

  const year = show.first_air_date ? formatDate(show.first_air_date) : undefined
  const heroImageUrl = show.backdrop_url || show.poster_url || null
  const isPosterHero = !show.backdrop_url && !!show.poster_url

  return (
    <>
      {/* Hero Header */}
      <div className="relative">
        {/* Backdrop */}
        <div className="relative h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] overflow-hidden">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={`${show.title} backdrop`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-900" />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/10" />
          <div className={`absolute inset-0 ${isPosterHero ? 'backdrop-blur-[16px]' : 'backdrop-blur-[8px]'}`} />
        </div>

        {/* Content overlay */}
        <div className="container mx-auto px-4 sm:px-6 -mt-24 relative z-10">
          <div className="flex items-end gap-6">
            {/* Poster */}
            <div className="hidden sm:block w-28 sm:w-32 md:w-40 lg:w-48 xl:w-56 flex-shrink-0">
              <div className="relative -mt-24 rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/20">
                {show.poster_url ? (
                  <img src={show.poster_url} alt={show.title} className="w-full object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-slate-800 flex items-center justify-center">
                    <Tv className="w-10 h-10 text-slate-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Title and actions */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => navigate(-1)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-white text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white truncate">
                      {show.title}
                    </h1>
                    {year && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm text-slate-200">
                        {year}
                      </span>
                    )}
                  </div>

                  {/* Key stats */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-slate-200/90">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm">
                      <Star className="w-4 h-4 text-yellow-400" />
                      {show.rating?.toFixed ? show.rating.toFixed(1) : show.rating}/10
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm">
                      <Tv className="w-4 h-4" />
                      {show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm">
                      <Clock className="w-4 h-4" />
                      {formatRuntime(show.episode_run_time)}
                    </span>
                    {/* Episodes pill moved inline */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm">
                      <Tv className="w-4 h-4" />
                      {(show.downloaded_episodes || 0)}/{show.total_episodes_count || show.number_of_episodes} episodes
                    </span>
                    {/* Total size pill moved inline */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm">
                      <HardDrive className="w-4 h-4" />
                      {formatFileSize(show.total_size)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-800/40 border border-emerald-700/40 text-emerald-200 text-sm">
                      <Users className="w-4 h-4" />
                      {show.status}
                    </span>
                    {show.networks && show.networks.length > 0 && show.networks.slice(0, 4).map((network) => (
                      <span key={network} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-sm">
                        <Broadcast className="w-4 h-4" />
                        {network}
                      </span>
                    ))}
                  </div>

                  {/* In-collection details moved into hero (pills removed; now inline above) */}
                  {show.in_collection && null}

                  {/* Details line below: genres only */}
                  <div className="mt-3">
                    {show.genres && show.genres.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {show.genres.slice(0, 8).map((genre) => (
                          <span key={genre} className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50 text-xs text-slate-200">
                            {genre}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="mb-4 flex flex-col items-stretch sm:items-end">
                  {!show.in_collection ? (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setShowAddToCollectionModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        Add to Collection
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 justify-end">
                        <button 
                          onClick={() => setShowDeleteModal(true)}
                          className="group inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-5 h-5 group-hover:hidden" />
                          <Trash2 className="w-5 h-5 hidden group-hover:inline" />
                          <span className="group-hover:hidden">In Collection</span>
                          <span className="hidden group-hover:inline">Remove</span>
                        </button>
                      </div>
                      {/* Management section below: monitoring + disk selector */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 justify-end">
                        <MonitoringDropdown
                          value={show.monitoring_option || 'None'}
                          onChange={(option) => updateMonitoringMutation.mutate(option)}
                          disabled={updateMonitoringMutation.isPending}
                        />
                        {/* Disk selector using library/disk IDs */}
                        <DiskDropdown
                          value={selectedDiskId}
                          options={diskOptions}
                          onChange={(diskId) => handleChangeDisk(diskId)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Overview (full width) */}
        {show.overview && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p className="text-slate-300 leading-relaxed">{show.overview}</p>
          </div>
        )}

        {/* Seasons & Episodes full width */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Seasons & Episodes</h3>
          <div className="space-y-2">
            {show.seasons
              .filter((season) => season.season_number !== 0)
              .sort((a, b) => a.season_number - b.season_number)
              .map((season) => (
                <SeasonAccordion
                  key={season.id}
                  season={season}
                  showId={id!}
                  isCollectionShow={show.in_collection || false}
                  isExpanded={expandedSeasons.has(season.season_number)}
                  onToggle={() => toggleSeason(season.season_number)}
                  showTmdbId={show.tmdb_id}
                />
              ))}
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

import { Tv, List, Plus, Calendar, Monitor, Download, HardDrive, Trash2, Disc, Grid, Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Toast from '../components/Toast'

interface TVShow {
  id: number
  tmdb_id: number
  title: string
  overview: string
  poster_url: string
  backdrop_url: string
  rating: number
  year: number
  monitored: boolean
  seasons_count: number
  folder_path?: string
  total_size?: number
  downloaded_episodes?: number
  total_episodes?: number
  monitoring_option?: string
}

interface MediaPath {
  path: string
  name: string
  enabled: boolean
  media_type: 'movies' | 'tv' | 'downloads'
}

type ViewType = 'list' | 'tile' | 'calendar'

export default function Shows() {
  const navigate = useNavigate()
  const [shows, setShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showToDelete, setShowToDelete] = useState<TVShow | null>(null)
  const [mediaPaths, setMediaPaths] = useState<MediaPath[]>([])
  const [showToast, setShowToast] = useState(false)
  const [removedShowData, setRemovedShowData] = useState<{ name: string; deletedFromDisk: boolean } | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    // Get saved view preference from localStorage
    const savedView = localStorage.getItem('caddyy-shows-view') as ViewType
    return savedView && ['list', 'tile', 'calendar'].includes(savedView) ? savedView : 'list'
  })

  useEffect(() => {
    fetchShows()
    fetchMediaPaths()
  }, [])

  const fetchShows = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true)
      }
      const response = await fetch('/api/collection/tv')
      if (!response.ok) {
        throw new Error('Failed to fetch TV shows')
      }
      const data = await response.json()
      setShows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      if (!skipLoading) {
        setLoading(false)
      }
    }
  }

  const fetchMediaPaths = async () => {
    try {
      const tvResponse = await fetch('/api/config/tv/library-paths')
      if (tvResponse.ok) {
        const tvPaths = await tvResponse.json()
        setMediaPaths(tvPaths.map((path: any) => ({ ...path, media_type: 'tv' as const })))
      }
    } catch (err) {
      console.error('Error fetching media paths:', err)
    }
  }

  const getDiskReferenceName = (folderPath: string): string => {
    if (!folderPath) return 'Unknown'
    
    // Find the media path that matches the beginning of the folder path
    const matchingPath = mediaPaths.find(path => 
      folderPath.startsWith(path.path) && path.media_type === 'tv'
    )
    
    return matchingPath?.name || 'TV Shows'
  }

  const toggleMonitored = async (showId: number, monitored: boolean) => {
    try {
      const response = await fetch(`/api/collection/tv/${showId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monitored: !monitored }),
      })
      
      if (response.ok) {
        fetchShows() // Refresh the list
      }
    } catch (err) {
      console.error('Error updating TV show:', err)
    }
  }

  const handleDeleteClick = (show: TVShow) => {
    setShowToDelete(show)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async (deleteFromDisk: boolean) => {
    if (!showToDelete) return

    try {
      const url = new URL(`/api/collection/tv/${showToDelete.id}`, window.location.origin)
      if (deleteFromDisk) {
        url.searchParams.set('delete_from_disk', 'true')
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Store the removed show data for the toast
        setRemovedShowData({
          name: showToDelete.title,
          deletedFromDisk: deleteFromDisk
        })
        console.log('Setting toast visible for:', showToDelete.title)
        setShowToast(true)
        
        // Close the modal
        setShowDeleteModal(false)
        setShowToDelete(null)
        
        // Delay the list refresh to allow the toast to show (skip loading state)
        setTimeout(() => {
          fetchShows(true) // Skip loading state to prevent component re-render issues
        }, 100)
      } else {
        const errorData = await response.json()
        console.error('Error removing TV show:', errorData.detail || 'Unknown error')
        alert(`Failed to remove show: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error removing TV show:', err)
      alert('Failed to remove show. Please try again.')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // View options for the collection
  const viewOptions = [
    { 
      type: 'list' as ViewType, 
      icon: List, 
      label: 'List',
      active: currentView === 'list'
    },
    { 
      type: 'tile' as ViewType, 
      icon: Grid, 
      label: 'Tiles',
      active: currentView === 'tile'
    },
    { 
      type: 'calendar' as ViewType, 
      icon: Calendar, 
      label: 'Calendar',
      active: currentView === 'calendar'
    }
  ]

  // Header actions (view switcher + add show button)
  const headerActions = (
    <div className="flex items-center space-x-3">
      {/* View Switcher */}
      <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-lg p-1">
        {viewOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.type}
              onClick={() => {
                setCurrentView(option.type)
                localStorage.setItem('caddyy-shows-view', option.type)
              }}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                option.active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title={option.label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          )
        })}
      </div>

      {/* Add Show Button */}
      <button
        onClick={() => navigate('/shows/add')}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add Show</span>
      </button>
    </div>
  )

  // Render different views
  const renderListView = () => (
    <div className="grid grid-cols-1 gap-4">
      {shows.map((show) => (
        <div 
          key={show.id} 
          className="group bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 hover:bg-slate-800/80 transition-all duration-200 cursor-pointer"
          onClick={() => navigate(`/tv/${show.tmdb_id}`)}
        >
          <div className="flex items-start space-x-4">
            {/* Poster */}
            <div className="flex-shrink-0">
              {show.poster_url ? (
                <img
                  src={show.poster_url.startsWith('http') ? show.poster_url : `https://image.tmdb.org/t/p/w154${show.poster_url}`}
                  alt={show.title}
                  className="w-16 h-24 object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-16 h-24 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Tv className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">
                    {show.title} {show.year && <span className="text-slate-400 font-normal">({show.year})</span>}
                  </h3>
                  <div className="flex items-center space-x-3 text-sm text-slate-400">
                    <span>{show.seasons_count} Season{show.seasons_count !== 1 ? 's' : ''}</span>
                    {show.rating && (
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-400">★</span>
                        <span>{show.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDeleteClick(show)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove from collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Pills */}
              <div className="flex items-center space-x-3 mb-2">
                {/* Episodes */}
                <div className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 rounded-full">
                  <Download className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm font-medium text-slate-200">
                    {show.downloaded_episodes || 0}/{show.total_episodes || 0}
                  </span>
                </div>

                {/* Disk Size */}
                <div className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 rounded-full">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm font-medium text-slate-200">
                    {formatFileSize(show.total_size || 0)}
                  </span>
                </div>

                {/* Disk Reference */}
                {show.folder_path && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 rounded-full">
                    <Disc className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-sm font-medium text-slate-200">
                      {getDiskReferenceName(show.folder_path)}
                    </span>
                  </div>
                )}

                {/* Monitoring Status */}
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                  show.monitored
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-600/50 text-slate-400'
                }`}>
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">
                    {show.monitoring_option || (show.monitored ? 'Monitored' : 'Unmonitored')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderTileView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {shows.map((show) => (
        <div
          key={show.id}
          className="group cursor-pointer bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 hover:bg-slate-800/80 transition-all duration-200 hover:scale-105"
          onClick={() => navigate(`/tv/${show.tmdb_id}`)}
        >
          {/* Poster */}
          <div className="aspect-[2/3] bg-slate-700 relative overflow-hidden">
            {show.poster_url ? (
              <img
                src={show.poster_url.startsWith('http') ? show.poster_url : `https://image.tmdb.org/t/p/w342${show.poster_url}`}
                alt={show.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tv className="w-12 h-12 text-slate-400" />
              </div>
            )}
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-200 flex items-end opacity-0 group-hover:opacity-100">
              <div className="p-3 w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleMonitored(show.id, show.monitored)}
                    className={`p-2 rounded-full transition-colors ${
                      show.monitored
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-blue-500 hover:text-white'
                    }`}
                    title={show.monitored ? 'Monitored' : 'Not monitored'}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(show)}
                    className="p-2 bg-slate-700 text-slate-300 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                    title="Remove from collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="absolute top-2 left-2 flex flex-col space-y-1">
              {show.monitored && (
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Monitored
                </div>
              )}
            </div>
            
            {/* Episode progress */}
            <div className="absolute top-2 right-2">
              <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-full font-medium">
                {show.downloaded_episodes || 0}/{show.total_episodes || 0}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-3">
            <h3 className="text-white font-semibold text-sm mb-1 truncate" title={show.title}>
              {show.title}
            </h3>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{show.year}</span>
              {show.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span>{show.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderCalendarView = () => (
    <div className="text-center py-12">
      <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">Calendar View</h3>
      <p className="text-slate-400">Coming soon! This will show upcoming episodes and air dates.</p>
    </div>
  )

  const renderCurrentView = () => {
    switch (currentView) {
      case 'tile':
        return renderTileView()
      case 'calendar':
        return renderCalendarView()
      case 'list':
      default:
        return renderListView()
    }
  }

  return (
    <div>
      <PageHeader 
        title="TV Shows" 
        description="Manage your TV show collection"
        actions={headerActions}
      />
      
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading TV shows...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">Error: {error}</p>
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-12">
            <Tv className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Your TV Shows</h2>
            <p className="text-slate-400 mb-6">No TV shows in your collection yet.</p>
            <button
              onClick={() => navigate('/shows/add')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Show</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Collection</h2>
              <span className="text-slate-400">{shows.length} show{shows.length !== 1 ? 's' : ''}</span>
            </div>
            
            {renderCurrentView()}
          </>
        )}
      </div>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setShowToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Remove TV Show"
        itemName={showToDelete?.title || ''}
        itemType="show"
        hasFiles={Boolean(showToDelete?.folder_path)}
        folderPath={showToDelete?.folder_path}
        totalSize={showToDelete?.total_size}
      />
      
      {/* Toast for removal notifications */}
      <Toast
        isVisible={showToast}
        type="error"
        title="Show Removed Successfully!"
        message={removedShowData ? `"${removedShowData.name}" has been removed from your collection.${removedShowData.deletedFromDisk ? ' Files were also deleted from disk.' : ''}` : ''}
        duration={4000}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}

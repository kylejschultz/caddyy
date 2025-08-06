import { Tv, List, Plus, Calendar, Monitor } from 'lucide-react'
import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'

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
}

export default function Shows() {
  const [shows, setShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const showTabs = [
    { name: 'Collection', href: '/shows', icon: List },
    { name: 'Add Show', href: '/shows/add', icon: Plus },
    { name: 'Calendar', href: '/shows/calendar', icon: Calendar },
  ]

  useEffect(() => {
    fetchShows()
  }, [])

  const fetchShows = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collection/tv')
      if (!response.ok) {
        throw new Error('Failed to fetch TV shows')
      }
      const data = await response.json()
      setShows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
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

  const removeShow = async (showId: number) => {
    if (!confirm('Are you sure you want to remove this TV show from your collection?')) {
      return
    }

    try {
      const response = await fetch(`/api/collection/tv/${showId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchShows() // Refresh the list
      }
    } catch (err) {
      console.error('Error removing TV show:', err)
    }
  }

  return (
    <div>
      <PageHeader 
        title="TV Shows" 
        description="Manage your TV show collection"
        tabs={showTabs}
      />
      
      <div className="p-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="p-6">
              <p className="text-gray-500 dark:text-slate-400">Loading TV shows...</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : shows.length === 0 ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your TV Shows</h2>
              <p className="text-gray-500 dark:text-slate-400">No TV shows in your collection yet.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your TV Shows ({shows.length})</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {shows.map((show) => (
                  <div key={show.id} className="p-4 flex items-center space-x-4 group hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div className="flex-shrink-0">
                      {show.poster_url ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w154${show.poster_url}`}
                          alt={show.title}
                          className="w-12 h-18 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-18 bg-gray-300 dark:bg-slate-600 rounded flex items-center justify-center">
                          <Tv className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline space-x-2">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                              {show.title} {show.year && `(${show.year})`}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-slate-400 flex-shrink-0">
                              {show.seasons_count} season{show.seasons_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {show.rating && (
                            <div className="mt-1">
                              <span className="text-sm text-gray-500 dark:text-slate-400">
                                ⭐ {show.rating}/10
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleMonitored(show.id, show.monitored)}
                              className={`group/btn px-3 py-1 rounded text-sm font-medium transition-all ${
                                show.monitored
                                  ? 'bg-blue-100 text-blue-800 hover:bg-red-100 hover:text-red-800 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-red-900 dark:hover:text-red-300'
                                  : 'bg-gray-200 text-gray-800 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-blue-600'
                              }`}
                            >
                              <Monitor className="w-3 h-3 mr-1 inline" />
                              <span className="group-hover/btn:hidden">
                                {show.monitored ? 'Monitored' : 'Monitor'}
                              </span>
                              <span className="hidden group-hover/btn:inline">
                                {show.monitored ? 'Unmonitor' : 'Monitor'}
                              </span>
                            </button>
                          </div>
                          <button
                            onClick={() => removeShow(show.id)}
                            className="px-2 py-1 rounded text-sm font-medium text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

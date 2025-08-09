import { FilmSlate as Film, List, Plus, Monitor, Download, Clock } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'

interface Movie {
  id: number
  tmdb_id: number
  title: string
  overview: string
  poster_url: string
  backdrop_url: string
  rating: number
  year: number
  runtime: number
  monitored: boolean
  downloaded: boolean
  path: string
}

export default function Movies() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const movieTabs = [
    { name: 'Collection', href: '/movies', icon: List },
    { name: 'Add Movie', href: '/movies/add', icon: Plus },
  ]

  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collection/movies')
      if (!response.ok) {
        throw new Error('Failed to fetch movies')
      }
      const data = await response.json()
      setMovies(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleMonitored = async (movieId: number, monitored: boolean) => {
    try {
      const response = await fetch(`/api/collection/movies/${movieId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monitored: !monitored }),
      })
      
      if (response.ok) {
        fetchMovies() // Refresh the list
      }
    } catch (err) {
      console.error('Error updating movie:', err)
    }
  }

  const removeMovie = async (movieId: number) => {
    if (!confirm('Are you sure you want to remove this movie from your collection?')) {
      return
    }

    try {
      const response = await fetch(`/api/collection/movies/${movieId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchMovies() // Refresh the list
      }
    } catch (err) {
      console.error('Error removing movie:', err)
    }
  }

  return (
    <div>
      <PageHeader 
        title="Movies" 
        description="Manage your movie collection"
        tabs={movieTabs}
      />
      
      <div className="p-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="p-6">
              <p className="text-gray-500 dark:text-slate-400">Loading movies...</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : movies.length === 0 ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Movies</h2>
              <p className="text-gray-500 dark:text-slate-400">No movies in your collection yet.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Movies ({movies.length})</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {movies.map((movie) => (
                  <div key={movie.id} className="p-4 flex items-center space-x-4 group hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div className="flex-shrink-0">
                      {movie.poster_url ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w154${movie.poster_url}`}
                          alt={movie.title}
                          className="w-12 h-18 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-18 bg-gray-300 dark:bg-slate-600 rounded flex items-center justify-center">
                          <Film className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                            {movie.title} {movie.year && `(${movie.year})`}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            {movie.rating && (
                              <span className="text-sm text-gray-500 dark:text-slate-400">
                                ⭐ {movie.rating}/10
                              </span>
                            )}
                            {movie.runtime && (
                              <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {movie.runtime}min
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                          <div className="flex items-center space-x-2">
                            {movie.downloaded && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <Download className="w-3 h-3 mr-1" />
                                Downloaded
                              </span>
                            )}
                            <button
                              onClick={() => toggleMonitored(movie.id, movie.monitored)}
                              className={`group/btn px-3 py-1 rounded text-sm font-medium transition-all ${
                                movie.monitored
                                  ? 'bg-blue-100 text-blue-800 hover:bg-red-100 hover:text-red-800 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-red-900 dark:hover:text-red-300'
                                  : 'bg-gray-200 text-gray-800 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-blue-600'
                              }`}
                            >
                              <Monitor className="w-3 h-3 mr-1 inline" />
                              <span className="group-hover/btn:hidden">
                                {movie.monitored ? 'Monitored' : 'Monitor'}
                              </span>
                              <span className="hidden group-hover/btn:inline">
                                {movie.monitored ? 'Unmonitor' : 'Monitor'}
                              </span>
                            </button>
                          </div>
                          <button
                            onClick={() => removeMovie(movie.id)}
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

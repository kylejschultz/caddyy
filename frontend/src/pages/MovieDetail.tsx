import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Star, 
  Calendar, 
  Clock, 
  Plus,
  Check,
  Film,
  Download
} from 'lucide-react'
import axios from 'axios'

interface MovieDetails {
  id: number
  title: string
  overview: string
  poster_url?: string
  backdrop_url?: string
  rating: number
  vote_count: number
  year?: number
  runtime?: number
  release_date?: string
  genres: string[]
  cast: string[]
  director?: string
  // Collection status
  in_collection?: boolean
  monitored?: boolean
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  
  const { data: movie, isLoading, error } = useQuery<MovieDetails>({
    queryKey: ['movie', id],
    queryFn: () => 
      axios.get(`/api/movies/${id}`).then(res => res.data),
    enabled: !!id,
  })

  const handleAddToCollection = async () => {
    if (!movie) return
    
    setIsAdding(true)
    try {
      await axios.post(`/api/movies/${id}/add`)
      // Refetch to update collection status
      // queryClient.invalidateQueries(['movie', id])
    } catch (error) {
      console.error('Failed to add to collection:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleSearch = () => {
    // Navigate to search and automatically add to collection
    navigate(`/search?q=${encodeURIComponent(movie?.title || '')}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="h-8 bg-slate-700 rounded w-48 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-slate-700 aspect-[2/3] rounded-lg animate-pulse"></div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
            <div className="h-20 bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold text-white">Movie Not Found</h1>
        </div>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="text-red-400">
            <h3 className="font-semibold mb-2">Error</h3>
            <p>Unable to load movie details. Please try again later.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-800 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full rounded-lg shadow-2xl"
              />
            ) : (
              <div className="aspect-[2/3] bg-slate-700 rounded-lg flex items-center justify-center">
                <Film className="w-16 h-16 text-slate-500" />
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {movie.in_collection ? (
                <div className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md">
                  <Check className="w-5 h-5 mr-2" />
                  In Collection
                </div>
              ) : (
                <button
                  onClick={handleAddToCollection}
                  disabled={isAdding}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {isAdding ? 'Adding...' : 'Add to Collection'}
                </button>
              )}
              
              <button
                onClick={handleSearch}
                className="w-full flex items-center justify-center px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Search & Download
              </button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {movie.year && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{movie.year}</span>
              </div>
            )}
            
            {movie.runtime && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{movie.runtime} min</span>
              </div>
            )}
            
            {movie.rating > 0 && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>{movie.rating.toFixed(1)}</span>
                <span className="text-slate-500">({movie.vote_count} votes)</span>
              </div>
            )}
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
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

          {/* Overview */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
            <p className="text-slate-300 leading-relaxed">
              {movie.overview || 'No overview available.'}
            </p>
          </div>

          {/* Director */}
          {movie.director && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Director</h3>
              <p className="text-slate-300">{movie.director}</p>
            </div>
          )}

          {/* Cast */}
          {movie.cast && movie.cast.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Cast</h3>
              <p className="text-slate-300">{movie.cast.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

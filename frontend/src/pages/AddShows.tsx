import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Search as SearchIcon, Tv, Star, Plus } from 'lucide-react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'
import AddToCollectionModal from '../components/AddToCollectionModal'

interface TVShowResult {
  id: number
  title: string
  media_type: 'tv'
  year?: number
  poster_url?: string
  backdrop_url?: string
  overview: string
  rating: number
  vote_count: number
}

export default function AddShows() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const query = searchParams.get('q') || ''
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedShow, setSelectedShow] = useState<TVShowResult | null>(null)

  const { data: rawResults, isLoading, error } = useQuery<TVShowResult[]>({
    queryKey: ['search-tv', query],
    queryFn: () => 
      axios.get('/api/search/', { params: { q: query } }).then(res => 
        res.data.filter((item: any) => item.media_type === 'tv')
      ),
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() })
    }
  }

  const handleAddShow = (show: TVShowResult) => {
    setSelectedShow(show)
    setShowAddModal(true)
  }

  const handleAddModalClose = () => {
    setShowAddModal(false)
    setSelectedShow(null)
  }

  const handleAddSuccess = () => {
    // The AddToCollectionModal handles the success flow
    // We just need to refresh the search results or navigate
  }

  const headerActions = (
    <button
      onClick={() => navigate('/shows')}
      className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back to Collection</span>
    </button>
  )

  return (
    <>
      <PageHeader 
        title="Add TV Shows" 
        description="Search for TV shows to add to your collection"
        actions={headerActions}
      />
      
      <div className="p-6">
        {/* Search Form */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for TV shows..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-700 aspect-[2/3] rounded-lg mb-2"></div>
                <div className="h-4 bg-slate-700 rounded mb-1"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <div className="text-red-400">
              <h3 className="font-semibold mb-2">Search Error</h3>
              <p>Unable to search at this time. Please try again later.</p>
            </div>
          </div>
        )}

        {rawResults && rawResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {rawResults.map((show) => (
              <div
                key={show.id}
                className="group bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-all duration-200"
              >
                {/* Poster */}
                <div className="aspect-[2/3] bg-slate-700 relative overflow-hidden">
                  {show.poster_url ? (
                    <img
                      src={show.poster_url}
                      alt={show.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  
                  {/* Add button overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleAddShow(show)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Show</span>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-3">
                  <h3 
                    className="text-white font-semibold text-sm mb-1 truncate cursor-pointer hover:text-blue-400 transition-colors" 
                    title={show.title}
                    onClick={() => navigate(`/tv/${show.id}`)}
                  >
                    {show.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{show.year}</span>
                    {show.rating > 0 && (
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
        )}

        {query && !isLoading && rawResults && rawResults.length === 0 && (
          <div className="text-center py-12">
            <Tv className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No TV Shows Found</h3>
            <p className="text-slate-400">
              No TV shows found for "{query}". Try searching with different terms.
            </p>
          </div>
        )}

        {!query && (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Search for TV Shows</h3>
            <p className="text-slate-400">
              Enter a TV show name above to search for shows to add to your collection.
            </p>
          </div>
        )}
      </div>
      
      {selectedShow && (
        <AddToCollectionModal
          isOpen={showAddModal}
          onClose={handleAddModalClose}
          showId={selectedShow.id.toString()}
          showName={selectedShow.title}
          showPosterUrl={selectedShow.poster_url}
          showOverview={selectedShow.overview}
          showYear={selectedShow.year}
          showRating={selectedShow.rating}
          onSuccess={handleAddSuccess}
        />
      )}
    </>
  )
}

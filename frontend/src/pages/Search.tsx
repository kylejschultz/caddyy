import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Film, Tv, Calendar, Star, ArrowUpDown, Search as SearchIcon } from 'lucide-react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'

interface MediaResult {
  id: number
  title: string
  media_type: 'movie' | 'tv'
  year?: number
  poster_url?: string
  backdrop_url?: string
  overview: string
  rating: number
  vote_count: number
}

type SortOption = 'relevance' | 'rating' | 'year' | 'title'
type FilterType = 'all' | 'movie' | 'tv'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const query = searchParams.get('q') || ''
  const filter = (searchParams.get('filter') as FilterType) || 'all'
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  
  const { data: rawResults, isLoading, error } = useQuery<MediaResult[]>({
    queryKey: ['search', query],
    queryFn: () => 
      axios.get(`/api/search/`, { params: { q: query } }).then(res => res.data),
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Filter results based on selected tab
  const filteredResults = rawResults ? rawResults.filter(item => {
    if (filter === 'all') return true
    return item.media_type === filter
  }) : []

  // Sort filtered results based on selected option
  const results = filteredResults ? [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating
      case 'year':
        return (b.year || 0) - (a.year || 0)
      case 'title':
        return a.title.localeCompare(b.title)
      case 'relevance':
      default:
        // Keep original TMDB relevance order
        return 0
    }
  }) : []

  // Get counts for each tab
  const allCount = rawResults?.length || 0
  const movieCount = rawResults?.filter(item => item.media_type === 'movie').length || 0
  const tvCount = rawResults?.filter(item => item.media_type === 'tv').length || 0

  // Define tabs for filtering
  const tabs = [
    {
      name: `All (${allCount})`,
      href: `/search?q=${encodeURIComponent(query)}&filter=all`,
      icon: SearchIcon
    },
    {
      name: `Movies (${movieCount})`,
      href: `/search?q=${encodeURIComponent(query)}&filter=movie`,
      icon: Film
    },
    {
      name: `TV Shows (${tvCount})`,
      href: `/search?q=${encodeURIComponent(query)}&filter=tv`,
      icon: Tv
    }
  ]

  if (!query.trim()) {
    return (
      <>
        <PageHeader 
          title="Search" 
          description="Enter a search term to find movies and TV shows" 
        />
        <div className="p-6">
          {/* Empty state for no search query */}
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <PageHeader 
          title="Search Results" 
          description={`Searching for "${query}"...`} 
        />
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-700 aspect-[2/3] rounded-lg mb-2"></div>
                <div className="h-4 bg-slate-700 rounded mb-1"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader 
          title="Search Results" 
          description={`Searched for "${query}"`} 
        />
        <div className="p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <div className="text-red-400">
              <h3 className="font-semibold mb-2">Search Error</h3>
              <p>Unable to search at this time. Please try again later.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const handleItemClick = (item: MediaResult) => {
    navigate(`/${item.media_type}/${item.id}`)
  }

  const sortDropdown = results && results.length > 0 ? (
    <div className="flex items-center space-x-2">
      <ArrowUpDown className="w-4 h-4 text-slate-400" />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="relevance">Relevance</option>
        <option value="rating">Rating</option>
        <option value="year">Year</option>
        <option value="title">Title</option>
      </select>
    </div>
  ) : null

  return (
    <>
      <PageHeader 
        title="Search Results" 
        description={`Searching for "${query}"`}
        tabs={tabs}
        actions={sortDropdown}
      />
      <div className="p-6">

      {results && results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((item) => (
            <div
              key={`${item.media_type}-${item.id}`}
              className="group cursor-pointer bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-slate-600 transition-all duration-200 hover:scale-105"
              onClick={() => handleItemClick(item)}
            >
              <div className="aspect-[2/3] bg-slate-700 relative overflow-hidden">
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    {item.media_type === 'movie' ? (
                      <Film className="w-12 h-12" />
                    ) : (
                      <Tv className="w-12 h-12" />
                    )}
                  </div>
                )}
                
                <div className="absolute top-2 left-2">
                  <div className="bg-black/70 rounded-full p-1">
                    {item.media_type === 'movie' ? (
                      <Film className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Tv className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>

                {item.rating > 0 && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-black/70 rounded-full px-2 py-1 flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-white font-medium">
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">
                  {item.title}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{item.year || 'Unknown'}</span>
                  </div>
                  <span className="capitalize text-slate-500">
                    {item.media_type}
                  </span>
                </div>

                {item.overview && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                    {item.overview}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">
            <Film className="w-16 h-16 mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
          <p className="text-slate-400">
            Try adjusting your search terms or check for typos.
          </p>
        </div>
      )}
      </div>
    </>
  )
}

import { Film, List, Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'

export default function Movies() {
  const movieTabs = [
    { name: 'Collection', href: '/movies', icon: List },
    { name: 'Add Movie', href: '/movies/add', icon: Plus },
  ]

  return (
    <div>
      <PageHeader 
        title="Movies" 
        description="Manage your movie collection"
        tabs={movieTabs}
      />
      
      <div className="p-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Your Movies</h2>
          <p className="text-slate-400">No movies in your collection yet.</p>
        </div>
      </div>
    </div>
  )
}

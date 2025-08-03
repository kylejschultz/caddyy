import { Tv, List, Plus, Calendar } from 'lucide-react'
import PageHeader from '../components/PageHeader'

export default function Shows() {
  const showTabs = [
    { name: 'Collection', href: '/shows', icon: List },
    { name: 'Add Show', href: '/shows/add', icon: Plus },
    { name: 'Calendar', href: '/shows/calendar', icon: Calendar },
  ]

  return (
    <div>
      <PageHeader 
        title="TV Shows" 
        description="Manage your TV show collection"
        tabs={showTabs}
      />
      
      <div className="p-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Your TV Shows</h2>
          <p className="text-slate-400">No TV shows in your collection yet.</p>
        </div>
      </div>
    </div>
  )
}

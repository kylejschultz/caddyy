import { useState, useEffect } from 'react'
import { List, Trash2 } from 'lucide-react'

interface HistoryItem {
  id: string
  name: string
  completedAt: string
  size: string
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', name: 'The Dark Knight (2008)', completedAt: 'Yesterday at 3:24 PM', size: '1.2 GB' },
    { id: '2', name: 'Breaking Bad S01E01', completedAt: '2 days ago', size: '550 MB' },
    { id: '3', name: 'Inception (2010)', completedAt: '3 days ago', size: '800 MB' },
    { id: '4', name: 'Interstellar (2014)', completedAt: '4 days ago', size: '2.4 GB' },
    { id: '5', name: 'The Office S02E05', completedAt: '5 days ago', size: '300 MB' }
  ])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  const handleRemove = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-800 rounded w-32"></div>
            <div className="h-10 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center space-x-3 mb-6">
        <List className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Download History</h1>
      </div>

      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Completed Downloads</h2>
          <div className="text-sm text-slate-400">{history.length} items</div>
        </div>
        
        <div className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="bg-slate-700 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                <div className="text-slate-400 text-xs">
                  <span>{item.completedAt}</span>
                  <span className="mx-2">•</span>
                  <span>{item.size}</span>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

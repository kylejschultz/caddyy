import { useState, useEffect } from 'react'
import { Clock, Play, Pause, X } from '@phosphor-icons/react'

interface QueueItem {
  id: string
  name: string
  progress: number
  speed: string
  status: 'downloading' | 'paused' | 'queued'
  eta: string
}

export default function Queue() {
  const [queue, setQueue] = useState<QueueItem[]>([
    { id: '1', name: 'The Dark Knight (2008)', progress: 75, speed: '3.2 MB/s', status: 'downloading', eta: '12 min' },
    { id: '2', name: 'Breaking Bad S01E01', progress: 40, speed: '1.8 MB/s', status: 'downloading', eta: '28 min' },
    { id: '3', name: 'Inception (2010)', progress: 90, speed: '5.1 MB/s', status: 'downloading', eta: '4 min' },
    { id: '4', name: 'The Office S02E05', progress: 0, speed: '0 B/s', status: 'queued', eta: 'Queued' },
    { id: '5', name: 'Dune (2021)', progress: 25, speed: '0 B/s', status: 'paused', eta: 'Paused' }
  ])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  const handlePause = (id: string) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'paused', speed: '0 B/s', eta: 'Paused' } : item
    ))
  }

  const handleResume = (id: string) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'downloading', speed: '2.1 MB/s', eta: '15 min' } : item
    ))
  }

  const handleRemove = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
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
        <Clock className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Download Queue</h1>
      </div>

      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Active Queue</h2>
          <div className="text-sm text-slate-400">{queue.length} items</div>
        </div>
        
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="bg-slate-700 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 text-xs">{item.speed}</span>
                      <span className="text-slate-400 text-xs">{item.eta}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          item.status === 'downloading' ? 'bg-blue-500' :
                          item.status === 'paused' ? 'bg-yellow-500' :
                          'bg-slate-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-slate-400 text-xs min-w-[3rem]">{item.progress}%</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-3">
                  {item.status === 'downloading' ? (
                    <button
                      onClick={() => handlePause(item.id)}
                      className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  ) : item.status === 'paused' ? (
                    <button
                      onClick={() => handleResume(item.id)}
                      className="p-1 text-slate-400 hover:text-green-400 transition-colors"
                      title="Resume"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { 
  X, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Tv,
  CheckCircle 
} from 'lucide-react'
import axios from 'axios'

interface AddToCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  showId: string
  showName: string
  showPosterUrl?: string
  showOverview?: string
  showYear?: number
  showRating?: number
  onSuccess?: () => void
}

export default function AddToCollectionModal({ 
  isOpen, 
  onClose, 
  showId, 
  showName,
  showPosterUrl,
  showOverview,
  showYear,
  showRating,
  onSuccess 
}: AddToCollectionModalProps) {
  const [monitoringStatus, setMonitoringStatus] = useState('All Episodes')

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { tmdb_id: number, monitoring_status: string }) => {
      // First, add the show to collection with just the TMDB ID
      const response = await axios.post('/api/collection/tv', null, {
        params: { tmdb_id: data.tmdb_id }
      })
      
      // TODO: Update monitoring status after creation
      // For now, we'll just return the created show
      return response.data
    },
    onSuccess: () => {
      onSuccess?.()
      handleClose()
    },
    onError: (error) => {
      console.error('Failed to add to collection:', error)
    }
  })

  const handleClose = () => {
    setMonitoringStatus('All Episodes')
    onClose()
  }

  const handleAddToCollection = () => {
    addToCollectionMutation.mutate({
      tmdb_id: parseInt(showId),
      monitoring_status: monitoringStatus
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Add to Collection</h2>
            <p className="text-slate-400 text-sm mt-1">
              Add "{showName}" to your collection
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Show Preview */}
          <div className="border border-slate-600 rounded-lg p-4 bg-slate-700/50">
            <div className="flex items-start space-x-4">
              {showPosterUrl ? (
                <img
                  src={showPosterUrl}
                  alt={showName}
                  className="w-16 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-24 bg-slate-600 rounded flex items-center justify-center">
                  <Tv className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{showName}</h3>
                {showYear && (
                  <p className="text-sm text-slate-400 mt-1">{showYear}</p>
                )}
                {showOverview && (
                  <p className="text-sm text-slate-400 line-clamp-3 mt-2">
                    {showOverview}
                  </p>
                )}
                {showRating && showRating > 0 && (
                  <div className="flex items-center space-x-1 mt-2">
                    <span className="text-sm text-yellow-400">★</span>
                    <span className="text-sm text-slate-400">
                      {showRating.toFixed(1)}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monitoring Options */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Episode Monitoring
            </label>
            <select
              value={monitoringStatus}
              onChange={(e) => setMonitoringStatus(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="None">None - Don't monitor any episodes</option>
              <option value="All Episodes">All Episodes - Monitor all episodes</option>
              <option value="Future Episodes">Future Episodes - Monitor future episodes only</option>
              <option value="Current Season">Current Season - Monitor current season only</option>
              <option value="First Season">First Season - Monitor first season only</option>
              <option value="Last Season">Last Season - Monitor latest season only</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Choose which episodes to monitor for downloads. You can change this later.
            </p>
          </div>

          {/* Error Display */}
          {addToCollectionMutation.isError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Failed to add to collection</span>
              </div>
              <p className="text-red-300 text-sm mt-1">
                Please try again or check your connection.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCollection}
            disabled={addToCollectionMutation.isPending}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md"
          >
            {addToCollectionMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Add to Collection</span>
          </button>
        </div>
      </div>
    </div>
  )
}

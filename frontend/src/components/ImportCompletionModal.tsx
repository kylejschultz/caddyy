import { CheckCircle, X, ArrowRight, Television as Tv } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'

interface ImportCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  importedCount: number
  totalSelected: number
  importedShows?: string[]
}

export default function ImportCompletionModal({
  isOpen,
  onClose,
  importedCount,
  totalSelected,
  importedShows = []
}: ImportCompletionModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleViewCollection = () => {
    navigate('/shows')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import Complete!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {importedCount}
            </div>
            <div className="text-gray-600 dark:text-slate-300">
              {importedCount === 1 ? 'show has' : 'shows have'} been successfully imported to your collection
            </div>
            {totalSelected > importedCount && (
              <div className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                ({totalSelected - importedCount} {totalSelected - importedCount === 1 ? 'show was' : 'shows were'} already in collection)
              </div>
            )}
          </div>

          {/* Show list preview if we have show names */}
          {importedShows.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                Imported Shows:
              </h4>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {importedShows.slice(0, 5).map((showName, index) => (
                  <div key={index} className="flex items-center space-x-2 py-1">
                    <Tv className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-slate-300 truncate">
                      {showName}
                    </span>
                  </div>
                ))}
                {importedShows.length > 5 && (
                  <div className="text-xs text-gray-500 dark:text-slate-400 pt-2">
                    +{importedShows.length - 5} more shows
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">What's next?</p>
              <p>Your imported shows are now available in your TV Shows collection. You can manage monitoring, view episodes, and track downloads from there.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Stay Here
          </button>
          <button
            onClick={handleViewCollection}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span>View Collection</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

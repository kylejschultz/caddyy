import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { 
  X, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Tv,
  CheckCircle,
  HardDrive,
  FolderPlus,
  Folder,
  ChevronDown
} from 'lucide-react'
import axios from 'axios'
import Toast from './Toast'
import MonitoringDropdown, { MonitoringOption } from './MonitoringDropdown'

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

interface AddToCollectionResponse {
  id: number
  tmdb_id: number
  title: string
  folder_path?: string
  folder_created?: boolean
  [key: string]: any
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
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringOption>('All Episodes')
  const [selectedLibraryPath, setSelectedLibraryPath] = useState('')
  const [createFolder, setCreateFolder] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [addedShowData, setAddedShowData] = useState<AddToCollectionResponse | null>(null)

  // Query to get available library paths
  const { data: libraryPaths, isLoading: isLoadingPaths } = useQuery({
    queryKey: ['tv-library-paths'],
    queryFn: async () => {
      const response = await axios.get('/api/collection/library/tv/paths')
      return response.data
    },
    enabled: isOpen
  })

  // Set default library path when paths are loaded
  useEffect(() => {
    if (libraryPaths?.paths?.length > 0 && !selectedLibraryPath) {
      setSelectedLibraryPath(libraryPaths.paths[0].path)
    }
  }, [libraryPaths, selectedLibraryPath])

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { 
      tmdb_id: number, 
      monitoring_status: string, 
      library_path?: string, 
      create_folder?: boolean 
    }) => {
      // Add the show to collection with disk selection and folder creation
      const params: any = { tmdb_id: data.tmdb_id }
      
      if (data.library_path) {
        params.library_path = data.library_path
      }
      
      if (data.create_folder !== undefined) {
        params.create_folder = data.create_folder
      }
      
      // Include monitoring status in the initial request
      // Use the same field name as the update monitoring mutation
      if (data.monitoring_status) {
        params.monitoring = data.monitoring_status
        // Also try alternative field names in case the API expects something different
        params.monitoring_option = data.monitoring_status
        params.monitoring_status = data.monitoring_status
      }
      
      const response = await axios.post('/api/collection/tv', null, { params })
      const showData = response.data as AddToCollectionResponse
      
      // Return both the show data and the monitoring status for reference
      return { ...showData, monitoring_option: data.monitoring_status }
    },
    onSuccess: (data) => {
      setAddedShowData(data)
      setShowToast(true)
      
      // Close the modal first
      setTimeout(() => {
        handleClose()
      }, 300)
      
      // Then trigger the page refresh after toast has time to show
      setTimeout(() => {
        onSuccess?.()
      }, 1000)
    },
    onError: (error) => {
      console.error('Failed to add to collection:', error)
    }
  })

  const handleClose = () => {
    setMonitoringStatus('All Episodes')
    // Don't reset toast state - let it finish its duration
    setAddedShowData(null)
    onClose()
  }

  const handleAddToCollection = () => {
    addToCollectionMutation.mutate({
      tmdb_id: parseInt(showId),
      monitoring_status: monitoringStatus,
      library_path: selectedLibraryPath || undefined,
      create_folder: createFolder
    })
  }

  return (
    <>
      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
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

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-300 mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Episode Monitoring</span>
                <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-200">Important</span>
              </div>
            </label>
            <p className="text-xs text-blue-200 mb-3">
              Choose which episodes to monitor for automatic downloads. This determines what content will be searched for and downloaded.
            </p>
            <MonitoringDropdown
              value={monitoringStatus}
              onChange={setMonitoringStatus}
              inModal={true}
            />
          </div>

          {/* Library Path Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4" />
                <span>Library Path</span>
              </div>
            </label>
            {isLoadingPaths ? (
              <div className="flex items-center space-x-2 text-slate-400 p-3 bg-slate-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading library paths...</span>
              </div>
            ) : libraryPaths?.paths?.length > 0 ? (
              <select
                value={selectedLibraryPath}
                onChange={(e) => setSelectedLibraryPath(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {libraryPaths.paths.map((path: any) => (
                  <option key={path.path} value={path.path}>
                    {path.name} - {path.path}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">No library paths configured</span>
                </div>
                <p className="text-yellow-300 text-xs mt-1">
                  Configure TV library paths in Settings → TV Shows to enable folder creation.
                </p>
              </div>
            )}
            
            {selectedLibraryPath && (
              <p className="text-xs text-slate-500 mt-2">
                Show will be added to this library location.
              </p>
            )}
          </div>

          {/* Folder Creation Options */}
          {selectedLibraryPath && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="createFolder"
                  checked={createFolder}
                  onChange={(e) => setCreateFolder(e.target.checked)}
                  className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <label htmlFor="createFolder" className="text-sm font-medium text-slate-300">
                  <div className="flex items-center space-x-2">
                    <FolderPlus className="w-4 h-4" />
                    <span>Create folder structure</span>
                  </div>
                </label>
              </div>
              
              {createFolder && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 ml-6">
                  <p className="text-blue-300 text-sm font-medium">Folder Preview:</p>
                  <p className="text-blue-200 text-xs mt-1 font-mono">
                    {selectedLibraryPath}/{showName}{showYear ? ` (${showYear})` : ''}/
                    <br />
                    ├── Season 01/
                    <br />
                    ├── Season 02/
                    <br />
                    └── ...
                  </p>
                  <p className="text-blue-300 text-xs mt-2">
                    Folders will follow TrashGuides naming conventions.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-slate-500 mt-2">
                {createFolder 
                  ? 'Show folder and season folders will be created automatically.' 
                  : 'Show will be added to collection without creating folders.'
                }
              </p>
            </div>
          )}

          {/* Error Display */}
          {addToCollectionMutation.isError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Failed to add to collection</span>
              </div>
              <div className="text-red-300 text-sm mt-2 break-words overflow-hidden">
                {(() => {
                  const errorMsg = addToCollectionMutation.error?.response?.data?.detail || 
                                  addToCollectionMutation.error?.message || 
                                  'Please try again or check your connection.'
                  
                  // Clean up common error patterns to be more user-friendly
                  if (errorMsg.includes('IntegrityError')) {
                    return 'This show conflicts with existing data. It may already be in your collection. Try checking your Shows library.'
                  }
                  if (errorMsg.includes('already in your collection') || errorMsg.includes('already exists')) {
                    return errorMsg // Use the server's user-friendly message
                  }
                  if (errorMsg.includes('TMDB')) {
                    return 'Unable to fetch show information from TMDB. Please check your API key or try again later.'
                  }
                  
                  // Truncate very long error messages
                  return errorMsg.length > 200 ? errorMsg.substring(0, 197) + '...' : errorMsg
                })()} 
              </div>
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
      )}
      
      {/* Toast - positioned outside the modal so it persists */}
      <Toast
        isVisible={showToast}
        type="success"
        title="Show Added Successfully!"
        message={`"${showName}" has been added to your collection with monitoring set to "${addedShowData?.monitoring_option || monitoringStatus}".${addedShowData?.folder_created ? ` Folders were created at: ${addedShowData.folder_path}` : ''}`}
        duration={4000} // Auto close after 4 seconds
        onClose={() => setShowToast(false)}
      />
    </>
  )
}

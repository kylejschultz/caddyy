import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { 
  X, 
  Plus, 
  CircleNotch as Loader2, 
  WarningCircle as AlertCircle, 
  Television as Tv,
  CheckCircle,
  HardDrive,
  FolderPlus
} from '@phosphor-icons/react'
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
  library_id?: number
  disk_id?: number
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
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | ''>('')
  const [selectedDiskId, setSelectedDiskId] = useState<number | ''>('')
  const [createFolder, setCreateFolder] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [addedShowData, setAddedShowData] = useState<AddToCollectionResponse | null>(null)

  // Load libraries
  const { data: libraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: async () => {
      const response = await axios.get('/api/libraries')
      return response.data as Array<{ id: number; name: string; media_type: 'movies' | 'tv' }>
    },
    enabled: isOpen
  })

  // Load disks for selected library
  const { data: disks, isLoading: isLoadingDisks } = useQuery({
    queryKey: ['library-disks', selectedLibraryId],
    queryFn: async () => {
      if (!selectedLibraryId) return []
      const response = await axios.get(`/api/libraries/${selectedLibraryId}/folders`)
      return response.data as Array<{ id: number; name: string; path: string; enabled: boolean }>
    },
    enabled: isOpen && !!selectedLibraryId
  })

  // Default selections when data loads
  useEffect(() => {
    if (libraries && libraries.length > 0 && selectedLibraryId === '') {
      // Prefer a TV library by default
      const tvLib = libraries.find(l => l.media_type === 'tv') || libraries[0]
      setSelectedLibraryId(tvLib.id)
    }
  }, [libraries, selectedLibraryId])

  useEffect(() => {
    if (disks && disks.length > 0 && selectedDiskId === '') {
      setSelectedDiskId(disks[0].id)
    }
  }, [disks, selectedDiskId])

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { 
      tmdb_id: number, 
      monitoring_status: string, 
      library_id: number, 
      disk_id: number, 
      create_folder?: boolean 
    }) => {
      // Add the show to collection with library/disk IDs
      const params: any = { 
        tmdb_id: data.tmdb_id,
        library_id: data.library_id,
        disk_id: data.disk_id,
      }

      if (data.create_folder !== undefined) {
        params.create_folder = data.create_folder
      }
      
      // Include monitoring status in the initial request
      if (data.monitoring_status) {
        params.monitoring = data.monitoring_status
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
    if (!selectedLibraryId || !selectedDiskId) return
    addToCollectionMutation.mutate({
      tmdb_id: parseInt(showId),
      monitoring_status: monitoringStatus,
      library_id: selectedLibraryId as number,
      disk_id: selectedDiskId as number,
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

          {/* Library and Disk Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4" />
                <span>Library and Disk</span>
              </div>
            </label>

            {/* Library select */}
            {isLoadingLibraries ? (
              <div className="flex items-center space-x-2 text-slate-400 p-3 bg-slate-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading libraries...</span>
              </div>
            ) : libraries && libraries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={selectedLibraryId}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : ''
                    setSelectedLibraryId(val)
                    setSelectedDiskId('')
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {libraries
                    .filter((l: any) => l.media_type === 'tv')
                    .map((lib: any) => (
                      <option key={lib.id} value={lib.id}>
                        {lib.name}
                      </option>
                    ))}
                </select>

                {/* Disk select */}
                {isLoadingDisks ? (
                  <div className="flex items-center space-x-2 text-slate-400 p-3 bg-slate-700 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading disks...</span>
                  </div>
                ) : (
                  <select
                    value={selectedDiskId}
                    onChange={(e) => setSelectedDiskId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedLibraryId}
                  >
                    {(disks || []).map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} - {d.path}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">No libraries configured</span>
                </div>
                <p className="text-yellow-300 text-xs mt-1">
                  Create a TV library and add disks in Settings → Libraries.
                </p>
              </div>
            )}

            {selectedLibraryId && selectedDiskId && (
              <p className="text-xs text-slate-500 mt-2">
                Show will be added to the selected disk in this library.
              </p>
            )}
          </div>

          {/* Folder Creation Options */}
          {selectedLibraryId && selectedDiskId && (
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
                    {`<selected disk>`}/{showName}{showYear ? ` (${showYear})` : ''}/
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
                  let errorMsg = 'Please try again or check your connection.'
                  const err = addToCollectionMutation.error as unknown
                  if (axios.isAxiosError(err)) {
                    const detail = (err.response?.data as any)?.detail
                    errorMsg = detail || err.message || errorMsg
                  } else if (err && typeof err === 'object' && 'message' in (err as any)) {
                    errorMsg = (err as any).message || errorMsg
                  }

                  if (errorMsg.includes('IntegrityError')) {
                    return 'This show conflicts with existing data. It may already be in your collection. Try checking your Shows library.'
                  }
                  if (errorMsg.includes('already in your collection') || errorMsg.includes('already exists')) {
                    return errorMsg
                  }
                  if (errorMsg.includes('TMDB')) {
                    return 'Unable to fetch show information from TMDB. Please check your API key or try again later.'
                  }
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
        duration={4000}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}

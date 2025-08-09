import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  FolderOpen, 
  MagnifyingGlass as Search, 
  CheckCircle, 
  WarningCircle as AlertCircle, 
  XCircle, 
  Play,
  Eye,
  CircleNotch as Loader2,
  Clock,
  FileText,
  TreeStructure as FolderTree,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Archive,
  FunnelSimple as Filter,
  ArrowsDownUp as ArrowUpDown
} from '@phosphor-icons/react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'
import ImportCompletionModal from '../components/ImportCompletionModal'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'

interface LibraryPath {
  name: string
  path: string
}


interface ImportPreview {
  matches: ImportMatch[]
  summary: {
    total_scanned: number
    total_matched: number
    total_manual: number
    total_skipped: number
    already_in_collection: number
  }
}

interface ImportMatch {
  scanned_item: {
    show_name: string
    show_year?: number
    folder_path: string
    total_episodes: number
    seasons: Array<{
      season_number: number
      episode_count: number
      folder_path?: string
    }>
  }
  tmdb_matches: Array<{
    id: number
    title: string
    year?: number
    poster_url?: string
    overview: string
    rating: number
  }>
  selected_match?: {
    id: number
    title: string
    year?: number
    poster_url?: string
    overview: string
    rating: number
  }
  confidence_score: number
  match_status: string
}

export default function ImportTVShows() {
  const navigate = useNavigate()
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [activeTab, setActiveTab] = useState('matches')
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set())
  const [monitoringStatus, setMonitoringStatus] = useState<Record<number, string>>({})
  const [sortBy, setSortBy] = useState<'name' | 'confidence' | 'status' | 'episodes'>('name')
  const [filterBy, setFilterBy] = useState<'all' | 'matched' | 'needs_review' | 'already_in_collection' | 'ready_for_import'>('all')
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionData, setCompletionData] = useState<{importedCount: number, totalSelected: number, importedShows: string[]}>({importedCount: 0, totalSelected: 0, importedShows: []})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showToDelete, setShowToDelete] = useState<{id: number, title: string, folder_path?: string, total_size?: number} | null>(null)

  // Fetch configured TV library paths
  const { data: config } = useQuery({
    queryKey: ['tv-config'],
    queryFn: () => axios.get('/api/config/tv/').then(res => res.data)
  })

  // Fetch general settings for auto-match threshold
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => axios.get('/api/settings/').then(res => res.data)
  })

  // Get current session status
  const { data: sessionStatus } = useQuery({
    queryKey: ['import-session-status', currentSession],
    queryFn: () => currentSession 
      ? axios.get(`/api/import/session/${currentSession}/status`).then(res => res.data)
      : null,
    enabled: !!currentSession,
    refetchInterval: currentSession ? 2000 : false // Poll every 2 seconds while active
  })

  // Get import preview when ready
  const { data: previewData, refetch: refetchPreview } = useQuery({
    queryKey: ['import-preview', currentSession],
    queryFn: () => currentSession 
      ? axios.get(`/api/import/session/${currentSession}/preview`).then(res => res.data.preview)
      : null,
    enabled: !!currentSession && (sessionStatus?.status === 'preview' || sessionStatus?.status === 'complete')
  })

  // Update preview when data changes
  useEffect(() => {
    if (previewData && settings) {
      setImportPreview(previewData)
      
      // Auto-select shows that have matches above threshold or manually selected
      const autoSelect = new Set<number>()
      const defaultMonitoring: Record<number, string> = {}
      const threshold = settings.auto_match_threshold || 0.8
      const statusesToExclude = ['already_in_collection', 'skipped', 'duplicate', 'existing']
      
      previewData.matches.forEach((match, index) => {
        // Auto-select shows with confidence above threshold, regardless of status (except excluded ones)
        // This handles 'pending' status shows that have high confidence
        if (!statusesToExclude.includes(match.match_status) && (match.confidence_score >= threshold || match.selected_match)) {
          autoSelect.add(index)
        }
        // Set default monitoring status to 'None'
        defaultMonitoring[index] = 'None'
      })
      setSelectedForImport(autoSelect)
      setMonitoringStatus(defaultMonitoring)
    }
  }, [previewData, settings])

  // Show completion modal when import completes
  useEffect(() => {
    if (sessionStatus?.status === 'complete' && currentSession && importPreview) {
      // Calculate imported shows
      const importedShows: string[] = []
      let actuallyImported = 0
      
      importPreview.matches.forEach((match, index) => {
        if (selectedForImport.has(index) && match.selected_match) {
          // Check if this was actually imported (not already in collection)
          if (match.match_status !== 'already_in_collection') {
            importedShows.push(match.scanned_item.show_name)
            actuallyImported++
          }
        }
      })
      
      setCompletionData({
        importedCount: actuallyImported,
        totalSelected: selectedForImport.size,
        importedShows
      })
      
      setShowCompletionModal(true)
    }
  }, [sessionStatus?.status, currentSession, importPreview, selectedForImport])

  // Start import session mutation
  const startSessionMutation = useMutation({
    mutationFn: (data: { media_type: string; library_paths: string[] }) =>
      axios.post('/api/import/start-session', data),
    onSuccess: (response) => {
      setCurrentSession(response.data.session_id)
    },
    onError: (error) => {
      console.error('Failed to start import session:', error)
    }
  })

  // Manual match mutation
  const manualMatchMutation = useMutation({
    mutationFn: (data: { session_id: string; item_index: number; selected_tmdb_id?: number; custom_search?: string }) =>
      axios.post(`/api/import/session/${data.session_id}/manual-match`, data),
    onSuccess: () => {
      refetchPreview()
    }
  })

  // Execute import mutation
  const executeImportMutation = useMutation({
    mutationFn: (sessionId: string) =>
      axios.post(`/api/import/session/${sessionId}/execute`),
    onSuccess: () => {
      // Import started, continue polling status
    }
  })

  const handleStartImport = () => {
    if (selectedPaths.length === 0) return

    startSessionMutation.mutate({
      media_type: 'tv',
      library_paths: selectedPaths
    })
  }

  const handleSelectMatch = (matchIndex: number, tmdbId: number) => {
    if (!currentSession) return

    manualMatchMutation.mutate({
      session_id: currentSession,
      item_index: matchIndex,
      selected_tmdb_id: tmdbId
    })

    // Auto-select for import when a match is selected
    setSelectedForImport(prev => new Set([...prev, matchIndex]))
  }

  const toggleImportSelection = (matchIndex: number) => {
    const match = importPreview?.matches[matchIndex]
    // Only allow selection if the show has been matched and is not already in collection
    if (!match || (!match.selected_match && match.match_status !== 'matched') || match.match_status === 'already_in_collection') {
      return
    }
    
    setSelectedForImport(prev => {
      const newSet = new Set(prev)
      if (newSet.has(matchIndex)) {
        newSet.delete(matchIndex)
      } else {
        newSet.add(matchIndex)
      }
      return newSet
    })
  }

  const updateMonitoringStatus = (matchIndex: number, status: string) => {
    setMonitoringStatus(prev => ({
      ...prev,
      [matchIndex]: status
    }))
  }

  const handleCustomSearch = (matchIndex: number, query: string) => {
    if (!currentSession) return

    manualMatchMutation.mutate({
      session_id: currentSession,
      item_index: matchIndex,
      custom_search: query
    })
  }

  const handleRemoveFromCollection = (showData: {id: number, title: string, folder_path?: string, total_size?: number}) => {
    setShowToDelete(showData)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async (deleteFromDisk: boolean) => {
    if (!showToDelete) return

    try {
      const url = new URL(`/api/collection/tv/${showToDelete.id}`, window.location.origin)
      if (deleteFromDisk) {
        url.searchParams.set('delete_from_disk', 'true')
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Immediately update the local import preview to reflect the removal
        setImportPreview(prev => {
          if (!prev) return prev
          
          const updatedMatches = prev.matches.map(match => {
            if (match.selected_match?.id === showToDelete.id) {
              // Update the match status to indicate it's no longer in collection
              return {
                ...match,
                match_status: match.selected_match ? 'matched' : 'pending'
              }
            }
            return match
          })
          
          return {
            ...prev,
            matches: updatedMatches
          }
        })
        
        // Remove from selectedForImport set if it was selected
        setSelectedForImport(prev => {
          const newSet = new Set(prev)
          // Find the match index for the removed show
          const matchIndex = importPreview?.matches.findIndex(match => match.selected_match?.id === showToDelete.id)
          if (matchIndex !== undefined && matchIndex >= 0) {
            newSet.delete(matchIndex)
          }
          return newSet
        })
        
        // Also refresh the preview from the backend
        refetchPreview()
      } else {
        const errorData = await response.json()
        console.error('Error removing TV show:', errorData.detail || 'Unknown error')
        alert(`Failed to remove show: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error removing TV show:', err)
      alert('Failed to remove show. Please try again.')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scanning':
      case 'matching':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'preview':
        return <Eye className="w-5 h-5 text-green-500" />
      case 'importing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getMatchStatusColor = (status: string, confidenceScore: number) => {
    if (status === 'matched') {
      return confidenceScore >= 0.9 ? 'text-green-500' : 'text-yellow-500'
    }
    if (status === 'manual') return 'text-blue-500'
    if (status === 'skipped') return 'text-gray-500'
    return 'text-orange-500'
  }

  const getFilteredAndSortedMatches = (matches: ImportMatch[]) => {
    // Add original index to preserve mapping
    const matchesWithIndex = matches.map((match, index) => ({
      match,
      originalIndex: index
    }))
    
    // Filter matches
    const filtered = matchesWithIndex.filter(({ match, originalIndex }) => {
      switch (filterBy) {
        case 'matched':
          return match.match_status === 'matched'
        case 'needs_review':
          return match.match_status === 'manual' || match.match_status === 'needs_review' || match.match_status === 'pending' || (!match.selected_match && match.match_status !== 'matched' && match.match_status !== 'already_in_collection')
        case 'already_in_collection':
          return match.match_status === 'already_in_collection'
        case 'ready_for_import':
          return selectedForImport.has(originalIndex)
        default:
          return true
      }
    })
    
    // Sort matches
    const sorted = filtered.sort(({ match: a }, { match: b }) => {
      switch (sortBy) {
        case 'name':
          return a.scanned_item.show_name.localeCompare(b.scanned_item.show_name)
        case 'confidence':
          return b.confidence_score - a.confidence_score // Descending
        case 'status':
          // Define status priority order
          const statusOrder: Record<string, number> = {
            'matched': 1,
            'manual': 2,
            'already_in_collection': 3,
            'skipped': 4
          }
          return (statusOrder[a.match_status] || 5) - (statusOrder[b.match_status] || 5)
        case 'episodes':
          return b.scanned_item.total_episodes - a.scanned_item.total_episodes // Descending
        default:
          return 0
      }
    })
    
    return sorted
  }

  const libraryPaths = config?.library_paths || []

  return (
    <>
      <PageHeader 
        title="Import TV Shows" 
        description="Scan your existing TV library and import shows with TMDb metadata"
      />
      
      <div className="p-6 space-y-6">
        {!currentSession && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Select Library Paths</h2>
            <p className="text-slate-400 mb-4">
              Choose which TV library paths you want to scan for existing shows. 
              The scanner will look for shows following TRaSH Guides naming conventions.
            </p>
            
            {libraryPaths.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Library Paths Configured</h3>
                <p className="text-slate-400 mb-4">
                  You need to configure TV library paths before importing.
                </p>
                <button
                  onClick={() => navigate('/shows/settings')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Configure TV Settings
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {libraryPaths.map((path: LibraryPath) => {
                  const isSelected = selectedPaths.includes(path.path)
                  return (
                    <div 
                      key={path.path} 
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPaths(selectedPaths.filter(p => p !== path.path))
                        } else {
                          setSelectedPaths([...selectedPaths, path.path])
                        }
                      }}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-slate-500'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{path.name}</div>
                          <div className="text-sm text-slate-400">{path.path}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                <div className="pt-4">
                  <button
                    onClick={handleStartImport}
                    disabled={selectedPaths.length === 0 || startSessionMutation.isPending}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md"
                  >
                    {startSessionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>Start Import Scan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentSession && sessionStatus && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Import Progress</h2>
              <div className="flex items-center space-x-2">
                {getStatusIcon(sessionStatus.status)}
                <span className="text-white capitalize">{sessionStatus.status}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-slate-400 mb-1">
                  <span>{sessionStatus.message}</span>
                  <span>{Math.round(sessionStatus.progress * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sessionStatus.progress * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{sessionStatus.scanned_count}</div>
                  <div className="text-slate-400">Scanned</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{sessionStatus.matched_count}</div>
                  <div className="text-slate-400">Auto-Matched</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{importPreview?.summary.already_in_collection || 0}</div>
                  <div className="text-slate-400">Already in Collection</div>
                </div>
              </div>

              {sessionStatus.error_message && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="text-red-400">
                    <h4 className="font-semibold mb-1">Error</h4>
                    <p>{sessionStatus.error_message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {importPreview && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Import Summary</h2>
                {selectedForImport.size > 0 && sessionStatus?.status === 'preview' && (
                  <button
                    onClick={() => currentSession && executeImportMutation.mutate(currentSession)}
                    disabled={executeImportMutation.isPending}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md"
                  >
                    {executeImportMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Import to Collection</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{importPreview.summary.total_scanned}</div>
                  <div className="text-slate-400">Shows Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{importPreview.summary.total_matched}</div>
                  <div className="text-slate-400">Auto-Matched</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{importPreview.summary.total_manual}</div>
                  <div className="text-slate-400">Need Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{importPreview.summary.already_in_collection || 0}</div>
                  <div className="text-slate-400">Already in Collection</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{selectedForImport.size}</div>
                  <div className="text-slate-400">Ready for Import</div>
                </div>
              </div>
              {sessionStatus?.status === 'complete' && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-green-400 font-medium">Import Complete!</div>
                  <div className="text-slate-400 text-sm mt-1">
                    Your shows have been added to your collection. You can view them in the TV Shows section.
                  </div>
                </div>
              )}
            </div>

            {/* Matches */}
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Import Matches</h2>
                <div className="flex items-center space-x-3">
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                      className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm pr-8 appearance-none cursor-pointer"
                    >
                      <option value="all">All Shows</option>
                      <option value="matched">Auto-Matched</option>
                      <option value="needs_review">Need Review</option>
                      <option value="already_in_collection">Already in Collection</option>
                      <option value="ready_for_import">Ready for Import</option>
                    </select>
                    <Filter className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                  
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm pr-8 appearance-none cursor-pointer"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="confidence">Sort by Confidence</option>
                      <option value="status">Sort by Status</option>
                      <option value="episodes">Sort by Episodes</option>
                    </select>
                    <ArrowUpDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {getFilteredAndSortedMatches(importPreview.matches).map((item) => (
                  <ImportMatchCard
                    key={item.originalIndex}
                    match={item.match}
                    matchIndex={item.originalIndex}
                    isSelectedForImport={selectedForImport.has(item.originalIndex)}
                    monitoringStatus={monitoringStatus[item.originalIndex] || 'None'}
                    onSelectMatch={handleSelectMatch}
                    onCustomSearch={handleCustomSearch}
                    onToggleImportSelection={() => toggleImportSelection(item.originalIndex)}
                    onUpdateMonitoringStatus={(status) => updateMonitoringStatus(item.originalIndex, status)}
                    onRemoveFromCollection={handleRemoveFromCollection}
                  />
                ))}
              </div>
              
              {getFilteredAndSortedMatches(importPreview.matches).length === 0 && (
                <div className="text-center py-8">
                  <div className="text-slate-400">No matches found for the selected filter.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <ImportCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        importedCount={completionData.importedCount}
        totalSelected={completionData.totalSelected}
        importedShows={completionData.importedShows}
      />
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setShowToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Remove TV Show"
        itemName={showToDelete?.title || ''}
        itemType="show"
        hasFiles={Boolean(showToDelete?.folder_path)}
        folderPath={showToDelete?.folder_path}
        totalSize={showToDelete?.total_size}
      />
    </>
  )
}

interface ImportMatchCardProps {
  match: ImportMatch
  matchIndex: number
  isSelectedForImport: boolean
  monitoringStatus: string
  onSelectMatch: (index: number, tmdbId: number) => void
  onCustomSearch: (index: number, query: string) => void
  onToggleImportSelection: () => void
  onUpdateMonitoringStatus: (status: string) => void
  onRemoveFromCollection?: (showData: {id: number, title: string, folder_path?: string, total_size?: number}) => void
}

function ImportMatchCard({ match, matchIndex, isSelectedForImport, monitoringStatus, onSelectMatch, onCustomSearch, onToggleImportSelection, onUpdateMonitoringStatus, onRemoveFromCollection }: ImportMatchCardProps) {
  const [showCustomSearch, setShowCustomSearch] = useState(false)
  const [customQuery, setCustomQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = (status: string, score: number) => {
    switch (status) {
      case 'matched':
        return score >= 0.9 
          ? <CheckCircle className="w-5 h-5 text-green-500" />
          : <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'manual':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'skipped':
        return <XCircle className="w-5 h-5 text-gray-500" />
      case 'already_in_collection':
        return <Archive className="w-5 h-5 text-purple-500" />
      default:
        return <Search className="w-5 h-5 text-orange-500" />
    }
  }

  const handleCustomSearchSubmit = () => {
    if (customQuery.trim()) {
      onCustomSearch(matchIndex, customQuery.trim())
      setShowCustomSearch(false)
      setCustomQuery('')
    }
  }

  // Debug logging
  console.log(`Match ${matchIndex}:`, {
    show: match.scanned_item.show_name,
    status: match.match_status,
    hasSelectedMatch: !!match.selected_match,
    selectedMatchId: match.selected_match?.id,
    isSelectedForImport
  })

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {/* Import Selection Checkbox - Only show for matched shows that aren't already in collection */}
            {(match.selected_match || match.match_status === 'matched') && match.match_status !== 'already_in_collection' ? (
              <div 
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isSelectedForImport 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-slate-500 hover:border-blue-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleImportSelection()
                }}
              >
                {isSelectedForImport && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>
            ) : (
              getStatusIcon(match.match_status, match.confidence_score)
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-white">
                {match.scanned_item.show_name} {match.scanned_item.show_year && `(${match.scanned_item.show_year})`}
              </h3>
              {match.selected_match && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                  ✓ Matched
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
              <span>{match.scanned_item.total_episodes} episodes</span>
              <span>{match.scanned_item.seasons.length} seasons</span>
              {match.confidence_score > 0 && (
                <span>Confidence: {Math.round(match.confidence_score * 100)}%</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {match.selected_match && (
            <div className="text-sm text-slate-300">
              {match.selected_match.title} ({match.selected_match.year})
            </div>
          )}
          
          {/* In Collection / Remove Button for already imported shows */}
          {match.match_status === 'already_in_collection' && match.selected_match && onRemoveFromCollection && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveFromCollection({
                  id: match.selected_match!.id,
                  title: match.selected_match!.title,
                  folder_path: match.scanned_item.folder_path,
                  total_size: undefined // We don't have size info in import data
                })
              }}
              className="group px-3 py-1 rounded text-sm font-medium transition-all bg-purple-100 text-purple-800 hover:bg-red-100 hover:text-red-800 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-red-900 dark:hover:text-red-300"
            >
              <Archive className="w-3 h-3 mr-1 inline" />
              <span className="group-hover:hidden">
                In Collection
              </span>
              <span className="hidden group-hover:inline">
                Remove
              </span>
            </button>
          )}
          
          <div onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700 p-4 bg-slate-800/50">
          <div className="space-y-4">
            {/* Scanned Show Details */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Scanned Files</h4>
              <div className="text-sm text-slate-400">
                <p>{match.scanned_item.folder_path}</p>
                <div className="mt-1">
                  {match.scanned_item.seasons.map((season) => (
                    <span key={season.season_number} className="inline-block mr-3">
                      S{season.season_number}: {season.episode_count} episodes
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Selected Match */}
            {match.selected_match && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <h4 className="text-green-400 font-medium mb-2">Selected Match</h4>
                <div className="flex items-start space-x-3">
                  {match.selected_match.poster_url && (
                    <img 
                      src={match.selected_match.poster_url} 
                      alt={match.selected_match.title}
                      className="w-12 h-18 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="font-medium text-white">
                      {match.selected_match.title} {match.selected_match.year && `(${match.selected_match.year})`}
                    </div>
                    <div className="text-sm text-slate-400 line-clamp-2 mt-1">
                      {match.selected_match.overview}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Rating: {match.selected_match.rating.toFixed(1)}/10
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TMDB Matches */}
            {match.tmdb_matches.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300">
                  {match.selected_match ? 'Other Matches' : 'Available Matches'}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {match.tmdb_matches.slice(0, 8).map((tmdbMatch) => (
                    <div 
                      key={tmdbMatch.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        match.selected_match?.id === tmdbMatch.id
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                      }`}
                      onClick={() => onSelectMatch(matchIndex, tmdbMatch.id)}
                    >
                      {tmdbMatch.poster_url && (
                        <img 
                          src={tmdbMatch.poster_url} 
                          alt={tmdbMatch.title}
                          className="w-8 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {tmdbMatch.title} {tmdbMatch.year && `(${tmdbMatch.year})`}
                        </div>
                        <div className="text-sm text-slate-400 line-clamp-1">
                          {tmdbMatch.overview}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Rating: {tmdbMatch.rating.toFixed(1)}/10
                        </div>
                      </div>
                      {match.selected_match?.id === tmdbMatch.id && (
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monitoring Status */}
            {(match.selected_match || match.match_status === 'matched') && (
              <div className="border-t border-slate-700 pt-3">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Monitoring Status</h4>
                <select
                  value={monitoringStatus}
                  onChange={(e) => onUpdateMonitoringStatus(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="None">None - Don't monitor for new episodes</option>
                  <option value="All Episodes">All Episodes - Monitor all episodes</option>
                  <option value="Future Episodes">Future Episodes - Monitor future episodes only</option>
                  <option value="Current Season">Current Season - Monitor current season only</option>
                  <option value="First Season">First Season - Monitor first season only</option>
                  <option value="Last Season">Last Season - Monitor last season only</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Choose how to monitor this show for new episodes after import
                </p>
              </div>
            )}

            {/* Custom Search */}
            <div className="border-t border-slate-700 pt-3">
              {!showCustomSearch ? (
                <button
                  onClick={() => setShowCustomSearch(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Custom Search
                </button>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Custom Search</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      placeholder="Search for show..."
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomSearchSubmit()}
                    />
                    <button
                      onClick={handleCustomSearchSubmit}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Search
                    </button>
                    <button
                      onClick={() => setShowCustomSearch(false)}
                      className="text-slate-400 hover:text-slate-300 text-sm px-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

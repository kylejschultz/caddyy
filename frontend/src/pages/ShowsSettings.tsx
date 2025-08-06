import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { Tv, Folder, HardDrive, Plus, Trash2, Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PathInput from '../components/PathInput'
import { validatePath } from '../utils/pathValidation'

interface MediaDirectory {
  name: string
  path: string
  enabled: boolean
}

interface TVConfig {
  library_paths: MediaDirectory[]
  quality_profiles: string[]
  auto_search: boolean
  season_folder_format: string
}

export default function ShowsSettings() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [newLibraryPath, setNewLibraryPath] = useState({ name: '', path: '' })
  const [isAddingLibrary, setIsAddingLibrary] = useState(false)
  const [editableConfig, setEditableConfig] = useState<TVConfig | null>(null)
  const [originalConfig, setOriginalConfig] = useState<TVConfig | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set())
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())

  // Fetch TV config
  const { data: config, isLoading, error } = useQuery<TVConfig>({
    queryKey: ['tv-config'],
    queryFn: () => axios.get('/api/config/tv/').then(res => res.data),
  })

  // Initialize editable config when data loads
  useEffect(() => {
    if (config && !editableConfig) {
      setEditableConfig(JSON.parse(JSON.stringify(config)))
      setOriginalConfig(JSON.parse(JSON.stringify(config)))
    }
  }, [config, editableConfig])

  // Check if config has changed
  useEffect(() => {
    if (editableConfig && originalConfig) {
      const hasChanged = JSON.stringify(editableConfig) !== JSON.stringify(originalConfig)
      setIsDirty(hasChanged)
    }
  }, [editableConfig, originalConfig])

  // Navigation warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Toast auto-hide
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  // Mutation to update the entire config
  const updateConfigMutation = useMutation({
    mutationFn: (updatedConfig: TVConfig) => 
      axios.put('/api/config/tv/', updatedConfig).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tv-config'])
      setOriginalConfig(JSON.parse(JSON.stringify(editableConfig)))
      setIsDirty(false)
      setShowToast(true)
    },
  })

  // Mutations for adding paths
  const addLibraryPathMutation = useMutation({
    mutationFn: (directory: { name: string; path: string; enabled: boolean }) => 
      axios.post('/api/config/tv/library-paths', directory).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tv-config'])
      setNewLibraryPath({ name: '', path: '' })
      setIsAddingLibrary(false)
    },
  })

  // Mutation for deleting paths
  const deleteLibraryPathMutation = useMutation({
    mutationFn: (index: number) => 
      axios.delete(`/api/config/tv/library-paths/${index}`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tv-config'])
    },
  })

  const handleSave = () => {
    if (editableConfig) {
      updateConfigMutation.mutate(editableConfig)
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setEditableConfig(JSON.parse(JSON.stringify(originalConfig)))
      setIsDirty(false)
    }
  }

  const handleLibraryPathChange = (index: number, field: 'name' | 'path', value: string) => {
    if (!editableConfig || !originalConfig) return
    const updatedPaths = [...editableConfig.library_paths]
    updatedPaths[index] = { ...updatedPaths[index], [field]: value }
    setEditableConfig({ ...editableConfig, library_paths: updatedPaths })
    
    // Track changed fields
    const fieldKey = `library_paths_${index}_${field}`
    const originalPaths = originalConfig.library_paths || []
    const originalValue = originalPaths[index]?.[field] || ''
    
    if (value !== originalValue) {
      setChangedFields(prev => new Set([...prev, fieldKey]))
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(fieldKey)
        return newSet
      })
    }
  }
  
  const handleLibraryPathBlur = async (index: number, field: 'name' | 'path', value: string) => {
    if (field !== 'path') return
    
    const fieldKey = `library_paths_${index}_${field}`
    setValidatingFields(prev => new Set([...prev, fieldKey]))
    setFieldErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldKey]
      return newErrors
    })
    
    try {
      const error = await validatePath(value)
      if (error) {
        setFieldErrors(prev => ({ ...prev, [fieldKey]: error }))
      }
    } finally {
      setValidatingFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(fieldKey)
        return newSet
      })
    }
  }

  const handleAddLibraryPath = () => {
    if (newLibraryPath.name.trim() && newLibraryPath.path.trim()) {
      addLibraryPathMutation.mutate({
        ...newLibraryPath,
        enabled: true
      })
    }
  }

  const isFieldChanged = (originalValue: any, currentValue: any) => {
    return JSON.stringify(originalValue) !== JSON.stringify(currentValue)
  }

  const headerActions = (
    <>
      <button
        onClick={handleReset}
        disabled={!isDirty}
        className="flex items-center px-4 py-2 text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </button>
      
      <button
        onClick={handleSave}
        disabled={!isDirty || updateConfigMutation.isPending}
        className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Save className="w-4 h-4 mr-2" />
        {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </>
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="TV Show Settings" description="Configure TV show library settings" />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-48"></div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-700 rounded w-32"></div>
              <div className="h-10 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !config) {
    return (
      <>
        <PageHeader title="TV Show Settings" description="Configure TV show library settings" />
        <div className="p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <div className="text-red-400">
              <h3 className="font-semibold mb-2">Error Loading Settings</h3>
              <p>Unable to load TV show settings. Please try again later.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!editableConfig) {
    return (
      <>
        <PageHeader title="TV Show Settings" description="Configure TV show library settings" />
        <div className="p-6">
          <div className="text-gray-500 dark:text-slate-400">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader 
        title="TV Show Settings" 
        description="Configure TV show library settings"
        actions={headerActions}
        hideTabs={true}
      />

      <div className="p-6 space-y-6">
        {/* Library Paths */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2 mb-4">
            <Folder className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Library Paths</h2>
          </div>

          <div className="space-y-4">
            <PathInput
              directories={editableConfig.library_paths || []}
              onDirectoryChange={handleLibraryPathChange}
              onDirectoryBlur={handleLibraryPathBlur}
              onDeleteDirectory={(index) => deleteLibraryPathMutation.mutate(index)}
              changedFields={changedFields}
              fieldErrors={fieldErrors}
              validatingFields={validatingFields}
              nameFieldKeyFormatter={(index) => `library_paths_${index}_name`}
              pathFieldKeyFormatter={(index) => `library_paths_${index}_path`}
              namePlaceholder="Library name"
              pathPlaceholder="/path/to/library"
              showBrowseButton={true}
            />

            {isAddingLibrary ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Library Name (e.g., 4K TV Shows)"
                  value={newLibraryPath.name}
                  onChange={(e) => setNewLibraryPath({ ...newLibraryPath, name: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="/path/to/your/tv-shows"
                  value={newLibraryPath.path}
                  onChange={(e) => setNewLibraryPath({ ...newLibraryPath, path: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddLibraryPath}
                  disabled={addLibraryPathMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addLibraryPathMutation.isPending ? 'Adding...' : 'Add'}
                </button>
                <button onClick={() => setIsAddingLibrary(false)} className="px-4 py-2 text-gray-600 dark:text-slate-300">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingLibrary(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-md transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add Library Path</span>
              </button>
            )}
          </div>
        </div>

        {/* Quality Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2 mb-4">
            <HardDrive className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Profiles</h2>
          </div>
          <p className="text-gray-600 dark:text-slate-400">Coming soon: a component to manage quality profiles.</p>
        </div>
        
        {/* Unsaved Changes Warning */}
        {isDirty && (
          <div className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-800 dark:text-yellow-400 text-sm">
                ⚠️ You have unsaved changes. Don't forget to save!
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <Save className="w-5 h-5 mr-2" />
            Settings saved successfully!
          </div>
        </div>
      )}
    </>
  )
}

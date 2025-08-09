import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { FloppyDisk as Save, ArrowCounterClockwise as RotateCcw, Gear as SettingsIcon, User, Shield, Folder as FolderIcon, Sun, Moon, Monitor, Plus } from '@phosphor-icons/react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'
// import SidebarNavigation from '../components/SidebarNavigation'
import PathInput from '../components/PathInput'
import { useTheme, Theme } from '../contexts/ThemeContext'
import { validatePath } from '../utils/pathValidation'

interface AppConfig {
  log_level: string
  authentication: string
  timezone: string
  date_time_format: string
  tmdb_api_key: string
  theme: Theme
  download_paths: MediaDirectory[]
  auto_match_threshold: number
}

interface MediaDirectory {
  name: string
  path: string
  enabled: boolean
}

export default function Settings() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const { setTheme } = useTheme()
  const [formData, setFormData] = useState<AppConfig | null>(null)
  const [isAddingDownloadPath, setIsAddingDownloadPath] = useState(false)
  const [newDownloadPath, setNewDownloadPath] = useState({ name: '', path: '' })
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set())

  const { data: settings, isLoading } = useQuery<AppConfig>({
    queryKey: ['settings'],
    queryFn: () => axios.get('/api/settings/').then(res => res.data)
  })

  // Update form data when settings load
  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings)
      if (settings.theme) {
        setTheme(settings.theme)
      }
    }
  }, [settings, formData, setTheme])

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<AppConfig>) => 
      axios.put('/api/settings/', updates).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setChangedFields(new Set())
      setFieldErrors({})
    }
  })

  // Download paths mutations
  const addDownloadPathMutation = useMutation({
    mutationFn: (directory: { name: string; path: string; enabled: boolean }) => 
      axios.post('/api/settings/download-paths', directory).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setNewDownloadPath({ name: '', path: '' })
      setIsAddingDownloadPath(false)
    },
  })

  const deleteDownloadPathMutation = useMutation({
    mutationFn: (index: number) => 
      axios.delete(`/api/settings/download-paths/${index}`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })


  const handleInputChange = (field: keyof AppConfig, value: string | boolean | number) => {
    if (!formData || !settings) return
    
    const fieldKey = String(field)
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    
    // Mark field as changed if value differs from original
    const originalValue = settings[field]
    if (JSON.stringify(originalValue) !== JSON.stringify(value)) {
      setChangedFields(prev => new Set([...prev, fieldKey]))
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(fieldKey)
        return newSet
      })
    }
    
    // Update theme context immediately when theme changes
    if (field === 'theme') {
      setTheme(value as Theme)
    }
  }

  const handleSave = () => {
    if (!formData || changedFields.size === 0) return
    updateMutation.mutate(formData)
  }

  const handleReset = () => {
    if (settings) {
      setFormData(settings)
      setChangedFields(new Set())
      setFieldErrors({})
    }
  }

  const handleAddDownloadPath = () => {
    if (newDownloadPath.name.trim() && newDownloadPath.path.trim()) {
      addDownloadPathMutation.mutate({
        ...newDownloadPath,
        enabled: true
      })
    }
  }

  const handleDownloadPathChange = (index: number, field: 'name' | 'path', value: string) => {
    if (!formData || !settings) return
    const updatedPaths = [...formData.download_paths]
    updatedPaths[index] = { ...updatedPaths[index], [field]: value }
    const newData = { ...formData, download_paths: updatedPaths }
    setFormData(newData)
    
    // Mark download_paths as changed if they differ from original
    const fieldKey = `download_paths_${index}_${field}`
    const originalPaths = settings.download_paths || []
    const originalValue = originalPaths[index]?.[field] || ''
    
    if (value !== originalValue) {
      setChangedFields(prev => new Set([...prev, fieldKey]))
      setChangedFields(prev => new Set([...prev, 'download_paths']))
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev)
        newSet.delete(fieldKey)
        // Check if any other download path fields are changed
        const hasOtherChanges = Array.from(prev).some(key => 
          key.startsWith('download_paths_') && key !== fieldKey
        )
        if (!hasOtherChanges) {
          newSet.delete('download_paths')
        }
        return newSet
      })
    }
  }
  
  const handleDownloadPathBlur = async (index: number, field: 'name' | 'path', value: string) => {
    if (field !== 'path') return
    
    const fieldKey = `download_paths_${index}_${field}`
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


  const settingsTabs = [
    { name: 'General', href: '/settings/general', icon: SettingsIcon },
    { name: 'Users', href: '/settings/users', icon: User },
    { name: 'Security', href: '/settings/security', icon: Shield },
  ]

  const hasChanges = changedFields.size > 0
  const hasErrors = Object.keys(fieldErrors).length > 0

  const headerActions = (
    <>
      <button
        onClick={handleReset}
        disabled={!hasChanges}
        className="flex items-center px-4 py-2 text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </button>
      
      <button
        onClick={handleSave}
        disabled={!hasChanges || hasErrors || updateMutation.isPending}
        className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Save className="w-4 h-4 mr-2" />
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </>
  )

  if (isLoading || !formData) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Settings" 
          description="Configure your Caddyy instance"
          tabs={settingsTabs}
        />
        <div className="text-gray-500 dark:text-slate-400 px-6">Loading settings...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader 
        title="Settings" 
        description="Configure your Caddyy instance"
        actions={headerActions}
        hideTabs={true}
      />

      <div className="p-6 space-y-6">
        {renderTabContent()}
        
        {hasChanges && (
          <div className="bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-blue-800 dark:text-blue-400 text-sm">
                💙 You have unsaved changes. Click Save to apply them!
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
  
  function renderTabContent() {
    switch (location.pathname) {
      case '/settings/users':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
              <p className="text-gray-500 dark:text-slate-400 mt-1">Manage user accounts and permissions</p>
            </div>
            <div className="p-6">
              <p className="text-gray-500 dark:text-slate-400">User management features coming soon...</p>
            </div>
          </div>
        )
      
      case '/settings/security':
        return (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
              <p className="text-gray-500 dark:text-slate-400 mt-1">Configure security and authentication options</p>
            </div>
            <div className="p-6">
              <p className="text-gray-500 dark:text-slate-400">Security settings coming soon...</p>
            </div>
          </div>
        )
      
      default: // /settings/general
        return (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Application Settings</h2>
              <p className="text-gray-500 dark:text-slate-400 mt-1">Basic configuration for your Caddyy instance</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Theme
                </label>
                <div className="flex items-center gap-2">
                  {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleInputChange('theme', t)}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                        formData!.theme === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                      }`}>
                      {t === 'system' && <Monitor className="w-4 h-4" />}
                      {t === 'light' && <Sun className="w-4 h-4" />}
                      {t === 'dark' && <Moon className="w-4 h-4" />}
                      <span className="capitalize">{t}</span>
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">
                  Choose how the interface appears. System matches your device preference.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Log Level
                </label>
                <select
                  value={formData!.log_level}
                  onChange={(e) => handleInputChange('log_level', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="DEBUG">Debug</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Error</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Authentication
                </label>
                <select
                  value={formData!.authentication}
                  onChange={(e) => handleInputChange('authentication', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="None">None</option>
                  <option value="Basic" disabled>Basic (Coming Soon)</option>
                </select>
                <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">
                  Basic authentication will be available in a future update
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Timezone
                </label>
                <select
                  value={formData!.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Date/Time Format
                </label>
                <select
                  value={formData!.date_time_format}
                  onChange={(e) => handleInputChange('date_time_format', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="YYYY-MM-DD HH:mm:ss">2024-03-15 14:30:00</option>
                  <option value="MM/DD/YYYY hh:mm A">03/15/2024 02:30 PM</option>
                  <option value="DD/MM/YYYY HH:mm">15/03/2024 14:30</option>
                  <option value="YYYY-MM-DD hh:mm A">2024-03-15 02:30 PM</option>
                  <option value="MMM DD, YYYY HH:mm">Mar 15, 2024 14:30</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Auto-Match Threshold: {Math.round((formData!.auto_match_threshold || 0.8) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={formData!.auto_match_threshold || 0.8}
                  onChange={(e) => handleInputChange('auto_match_threshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">
                  Shows with confidence above this threshold will be auto-selected during TV import
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  TMDB API Key
                </label>
                <input
                  type="password"
                  value={formData!.tmdb_api_key}
                  onChange={(e) => handleInputChange('tmdb_api_key', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                  placeholder="Enter your TMDB API key"
                />
                <p className="text-gray-500 dark:text-slate-500 text-xs mt-1">
                  Get your API key from{' '}
                  <a 
                    href="https://www.themoviedb.org/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    TMDB Settings
                  </a>
                  . Required for movie and TV show metadata.
                </p>
              </div>

              {/* Download Paths Section */}
              <div className="border-t pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FolderIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Download Paths</h3>
                </div>
                <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
                  Configure where downloads are saved (used by both movies and TV shows)
                </p>

                <div className="space-y-4">
                  <PathInput
                    directories={formData!.download_paths || []}
                    onDirectoryChange={handleDownloadPathChange}
                    onDirectoryBlur={handleDownloadPathBlur}
                    onDeleteDirectory={(index) => deleteDownloadPathMutation.mutate(index)}
                    changedFields={changedFields}
                    fieldErrors={fieldErrors}
                    validatingFields={validatingFields}
                    nameFieldKeyFormatter={(index) => `download_paths_${index}_name`}
                    pathFieldKeyFormatter={(index) => `download_paths_${index}_path`}
                    namePlaceholder="Download client name"
                    pathPlaceholder="/path/to/downloads"
                    showBrowseButton={true}
                  />

                  {isAddingDownloadPath ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Download Client Name (e.g., SABnzbd)"
                        value={newDownloadPath.name}
                        onChange={(e) => setNewDownloadPath({ ...newDownloadPath, name: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="/downloads/completed"
                        value={newDownloadPath.path}
                        onChange={(e) => setNewDownloadPath({ ...newDownloadPath, path: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleAddDownloadPath}
                        disabled={addDownloadPathMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {addDownloadPathMutation.isPending ? 'Adding...' : 'Add'}
                      </button>
                      <button onClick={() => setIsAddingDownloadPath(false)} className="px-4 py-2 text-gray-600 dark:text-slate-300">Cancel</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingDownloadPath(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-md transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Download Path</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
    }
  }
}

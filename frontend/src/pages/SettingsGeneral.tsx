import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { Save, RotateCcw, Settings as SettingsIcon, User, Shield, Folder as FolderIcon } from 'lucide-react'
import axios from 'axios'
import PageHeader from '../components/PageHeader'

interface AppConfig {
  log_level: string
  authentication: string
  timezone: string
  date_time_format: string
}

export default function Settings() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isDirty, setIsDirty] = useState(false)
  const [formData, setFormData] = useState<AppConfig | null>(null)

  const { data: settings, isLoading } = useQuery<AppConfig>({
    queryKey: ['settings'],
    queryFn: () => axios.get('/api/settings/').then(res => res.data)
  })

  // Update form data when settings load
  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings)
    }
  }, [settings, formData])

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<AppConfig>) => 
      axios.put('/api/settings/', updates).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsDirty(false)
    }
  })

  const handleInputChange = (field: keyof AppConfig, value: string | boolean) => {
    if (!formData) return
    
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    setIsDirty(JSON.stringify(newData) !== JSON.stringify(settings))
  }

  const handleSave = () => {
    if (!formData || !settings) return
    updateMutation.mutate(formData)
  }

  const handleReset = () => {
    if (settings) {
      setFormData(settings)
      setIsDirty(false)
    }
  }

  const settingsTabs = [
    { name: 'General', href: '/settings/general', icon: SettingsIcon },
    { name: 'Paths', href: '/settings/paths', icon: FolderIcon },
    { name: 'Users', href: '/settings/users', icon: User },
    { name: 'Security', href: '/settings/security', icon: Shield },
  ]

  const headerActions = (
    <>
      <button
        onClick={handleReset}
        disabled={!isDirty}
        className="flex items-center px-4 py-2 text-slate-300 bg-slate-700 rounded-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </button>
      
      <button
        onClick={handleSave}
        disabled={!isDirty || updateMutation.isPending}
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
        <div className="text-slate-400 px-6">Loading settings...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader 
        title="Settings" 
        description="Configure your Caddyy instance"
        tabs={settingsTabs}
        actions={headerActions}
      />

      <div className="p-6 space-y-6">
        {renderTabContent()}
        
        {isDirty && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-400 text-sm">
                ⚠️ You have unsaved changes. Don't forget to save!
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
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">User Management</h2>
              <p className="text-slate-400 mt-1">Manage user accounts and permissions</p>
            </div>
            <div className="p-6">
              <p className="text-slate-400">User management features coming soon...</p>
            </div>
          </div>
        )
      
      case '/settings/security':
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Security Settings</h2>
              <p className="text-slate-400 mt-1">Configure security and authentication options</p>
            </div>
            <div className="p-6">
              <p className="text-slate-400">Security settings coming soon...</p>
            </div>
          </div>
        )
      
      default: // /settings/general
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Application Settings</h2>
              <p className="text-slate-400 mt-1">Basic configuration for your Caddyy instance</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Log Level
                </label>
                <select
                  value={formData.log_level}
                  onChange={(e) => handleInputChange('log_level', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DEBUG">Debug</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Error</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Authentication
                </label>
                <select
                  value={formData.authentication}
                  onChange={(e) => handleInputChange('authentication', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="None">None</option>
                  <option value="Basic" disabled>Basic (Coming Soon)</option>
                </select>
                <p className="text-slate-500 text-xs mt-1">
                  Basic authentication will be available in a future update
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date/Time Format
                </label>
                <select
                  value={formData.date_time_format}
                  onChange={(e) => handleInputChange('date_time_format', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="YYYY-MM-DD HH:mm:ss">2024-03-15 14:30:00</option>
                  <option value="MM/DD/YYYY hh:mm A">03/15/2024 02:30 PM</option>
                  <option value="DD/MM/YYYY HH:mm">15/03/2024 14:30</option>
                  <option value="YYYY-MM-DD hh:mm A">2024-03-15 02:30 PM</option>
                  <option value="MMM DD, YYYY HH:mm">Mar 15, 2024 14:30</option>
                </select>
              </div>
            </div>
          </div>
        )
    }
  }
}

import { useState, useEffect } from 'react'
import { Film, Folder, HardDrive, Settings as SettingsIcon } from 'lucide-react'

interface MovieSettings {
  paths: {
    movies: string
    downloads: string
    completed: string
  }
  quality: {
    preferred: string[]
    cutoff: string
  }
  naming: {
    format: string
    replaceSpaces: boolean
  }
}

export default function MoviesSettings() {
  const [settings, setSettings] = useState<MovieSettings>({
    paths: {
      movies: '/media/movies',
      downloads: '/downloads/movies',
      completed: '/downloads/completed/movies'
    },
    quality: {
      preferred: ['1080p', '720p'],
      cutoff: '1080p'
    },
    naming: {
      format: '{Movie Title} ({Release Year})',
      replaceSpaces: false
    }
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Simulate loading settings
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
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
        <Film className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Movie Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Paths Section */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Folder className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Paths</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Movies Library Path
              </label>
              <input
                type="text"
                value={settings.paths.movies}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  paths: { ...prev.paths, movies: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Downloads Path
              </label>
              <input
                type="text"
                value={settings.paths.downloads}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  paths: { ...prev.paths, downloads: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Completed Downloads Path
              </label>
              <input
                type="text"
                value={settings.paths.completed}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  paths: { ...prev.paths, completed: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quality Section */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <HardDrive className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Quality</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quality Cutoff
              </label>
              <select
                value={settings.quality.cutoff}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  quality: { ...prev.quality, cutoff: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>
        </div>

        {/* Naming Section */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">File Naming</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Naming Format
              </label>
              <input
                type="text"
                value={settings.naming.format}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  naming: { ...prev.naming, format: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="replaceSpaces"
                checked={settings.naming.replaceSpaces}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  naming: { ...prev.naming, replaceSpaces: e.target.checked }
                }))}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="replaceSpaces" className="ml-2 text-sm text-slate-300">
                Replace spaces with dots
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

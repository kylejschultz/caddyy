import { useState } from 'react'
import { FolderOpen, X, Folder as FolderIcon } from '@phosphor-icons/react'
import { FileBrowser } from './FileBrowser'

interface MediaDirectory {
  name: string
  path: string
  enabled: boolean
}

interface PathInputProps {
  directories: MediaDirectory[]
  onDirectoryChange: (index: number, field: 'name' | 'path', value: string) => void
  onDirectoryBlur?: (index: number, field: 'name' | 'path', value: string) => void
  onDeleteDirectory: (index: number) => void
  changedFields?: Set<string>
  fieldErrors?: Record<string, string>
  validatingFields?: Set<string>
  nameFieldKeyFormatter?: (index: number) => string
  pathFieldKeyFormatter?: (index: number) => string
  namePlaceholder?: string
  pathPlaceholder?: string
  showBrowseButton?: boolean
}

export default function PathInput({
  directories,
  onDirectoryChange,
  onDirectoryBlur,
  onDeleteDirectory,
  changedFields = new Set(),
  fieldErrors = {},
  validatingFields = new Set(),
  nameFieldKeyFormatter = (index) => `${index}_name`,
  pathFieldKeyFormatter = (index) => `${index}_path`,
  namePlaceholder = "Name",
  pathPlaceholder = "/path/to/directory",
  showBrowseButton = true
}: PathInputProps) {
  const [showFileBrowser, setShowFileBrowser] = useState(false)
  const [browserTargetIndex, setBrowserTargetIndex] = useState<number | null>(null)

  const handleBrowseFolder = (index: number) => {
    setBrowserTargetIndex(index)
    setShowFileBrowser(true)
  }

  const handleFileBrowserSelect = (selectedPath: string) => {
    if (browserTargetIndex !== null) {
      onDirectoryChange(browserTargetIndex, 'path', selectedPath)
    }
    setShowFileBrowser(false)
    setBrowserTargetIndex(null)
  }

  return (
    <>
      <div className="space-y-4">
        {directories.map((dir, index) => {
          const nameFieldKey = nameFieldKeyFormatter(index)
          const pathFieldKey = pathFieldKeyFormatter(index)
          const nameChanged = changedFields.has(nameFieldKey)
          const pathChanged = changedFields.has(pathFieldKey)
          const pathError = fieldErrors[pathFieldKey]
          const pathValidating = validatingFields.has(pathFieldKey)
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={dir.name}
                  onChange={(e) => onDirectoryChange(index, 'name', e.target.value)}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-slate-700 border rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    nameChanged 
                      ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                      : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={namePlaceholder}
                />
                <input
                  type="text"
                  value={dir.path}
                  onChange={(e) => onDirectoryChange(index, 'path', e.target.value)}
                  onBlur={(e) => onDirectoryBlur?.(index, 'path', e.target.value)}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-slate-700 border rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                    pathError 
                      ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-500/10 focus:ring-red-500' 
                      : pathChanged 
                      ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10 focus:ring-blue-500' 
                      : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500'
                  }`}
                  placeholder={pathPlaceholder}
                />
                {showBrowseButton && (
                  <button 
                    onClick={() => handleBrowseFolder(index)}
                    className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Browse for folder"
                  >
                    <FolderOpen className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => onDeleteDirectory(index)}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  title="Delete path"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {pathError && (
                <div className="text-red-600 dark:text-red-400 text-xs ml-2">
                  {pathError}
                </div>
              )}
              {pathValidating && (
                <div className="text-gray-500 dark:text-slate-400 text-xs ml-2">
                  Validating path...
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* File Browser Modal */}
      {showFileBrowser && showBrowseButton && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 w-full max-w-2xl max-h-[70vh] rounded-lg overflow-hidden relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <FolderIcon className="w-4 h-4 text-blue-500" />
                <h3 className="text-md font-medium text-white">Select Directory</h3>
              </div>
              <button
                onClick={() => setShowFileBrowser(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
              <FileBrowser
                title=""
                onSelectPath={handleFileBrowserSelect}
                showFiles={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

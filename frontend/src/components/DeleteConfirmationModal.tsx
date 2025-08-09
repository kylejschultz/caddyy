import { useState } from 'react'
import { X, Warning as AlertTriangle, Trash as Trash2, Database } from '@phosphor-icons/react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteFromDisk: boolean) => void
  title: string
  itemName: string
  itemType: 'show' | 'movie'
  hasFiles?: boolean
  folderPath?: string
  totalSize?: number
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  hasFiles = false,
  folderPath,
  totalSize
}: DeleteConfirmationModalProps) {
  const [deleteFromDisk, setDeleteFromDisk] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(deleteFromDisk)
    setDeleteFromDisk(false) // Reset for next time
    onClose()
  }

  const handleCancel = () => {
    setDeleteFromDisk(false) // Reset for next time
    onClose()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            You are about to remove "{itemName}" from your collection. Please choose how you want to proceed:
          </p>

          <div className="space-y-3 mb-6">
            {/* Remove from Caddyy only */}
            <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 border-gray-200 dark:border-slate-600">
              <input
                type="radio"
                name="deleteOption"
                checked={!deleteFromDisk}
                onChange={() => setDeleteFromDisk(false)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Remove from Caddyy only
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Keep all files on disk. The {itemType} will only be removed from Caddyy's database and you can re-import it later.
                </p>
              </div>
            </label>

            {/* Delete files from disk */}
            {hasFiles && (
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 border-gray-200 dark:border-slate-600">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteFromDisk}
                  onChange={() => setDeleteFromDisk(true)}
                  className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Delete from disk
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Permanently delete all files from your computer.
                    <br />
                    <span className="text-red-600 dark:text-red-400 font-medium">This action cannot be undone.</span>
                  </p>
                </div>
              </label>
            )}
          </div>

          {deleteFromDisk && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    Warning: This will permanently delete the entire folder from your computer!
                  </p>
                  {folderPath && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1 font-mono break-all">
                      {folderPath}
                    </p>
                  )}
                  {totalSize != null && totalSize > 0 && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      <strong>{formatFileSize(totalSize)}</strong> will be freed from disk
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              deleteFromDisk
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {deleteFromDisk ? 'Delete Forever' : 'Remove from Caddyy'}
          </button>
        </div>
      </div>
    </div>
  )
}

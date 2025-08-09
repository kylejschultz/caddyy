import React, { useState, useEffect } from 'react';
import { CaretLeft as ChevronLeft, Folder, File, CaretUp as ChevronUp } from '@phosphor-icons/react';

interface FileSystemItem {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  modified_time?: string;
  permissions?: string;
}

interface DirectoryListing {
  current_path: string;
  parent_path?: string;
  items: FileSystemItem[];
}

interface FileBrowserProps {
  onSelectPath?: (path: string) => void;
  selectedPath?: string;
  showFiles?: boolean;
  title?: string;
}

export function FileBrowser({ 
  onSelectPath, 
  selectedPath, 
  showFiles = false, 
  title = "Browse Folders" 
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roots, setRoots] = useState<Array<{ name: string; path: string }>>([]);

  // Load filesystem roots on mount
  useEffect(() => {
    const loadRoots = async () => {
      try {
        const response = await fetch('/api/filesystem/roots');
        const data = await response.json();
        setRoots(data.roots || []);
        
        // Set initial path to home if available
        const homeRoot = data.roots?.find((root: any) => root.name.includes('Home'));
        if (homeRoot) {
          setCurrentPath(homeRoot.path);
        }
      } catch (err) {
        console.error('Failed to load filesystem roots:', err);
      }
    };
    
    loadRoots();
  }, []);

  // Load directory contents when path changes
  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/filesystem/browse?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load directory');
      }
      
      const data: DirectoryListing = await response.json();
      setListing(data);
      setCurrentPath(data.current_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleItemClick = (item: FileSystemItem) => {
    if (item.is_directory) {
      navigateToPath(item.path);
    }
  };

  const handleSelectPath = () => {
    if (onSelectPath && currentPath) {
      onSelectPath(currentPath);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Current path with select button */}
      <div className="px-4 py-3 border-b border-slate-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-slate-300 flex-1 min-w-0">
            <span className="font-medium">Current:</span>
            <span className="ml-2 font-mono bg-slate-600 px-2 py-1 rounded truncate">
              {currentPath}
            </span>
          </div>
          {onSelectPath && (
            <button
              onClick={handleSelectPath}
              disabled={!currentPath}
              className="ml-3 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0"
            >
              Select Folder
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading && (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-400 bg-red-900/20">
            <p>{error}</p>
            <button
              onClick={() => loadDirectory(currentPath)}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {listing && !loading && (
          <div>
            {/* Parent directory */}
            {listing.parent_path && (
              <div
                onClick={() => navigateToPath(listing.parent_path!)}
                className="flex items-center px-4 py-2 hover:bg-slate-600 cursor-pointer border-b border-slate-700"
              >
                <ChevronUp className="w-4 h-4 text-slate-400 mr-3" />
                <span className="text-sm text-slate-300">.. (Parent Directory)</span>
              </div>
            )}

            {/* Directory contents */}
            {listing.items
              .filter(item => showFiles || item.is_directory)
              .map((item, index) => {
                const adjustedIndex = listing.parent_path ? index + 1 : index;
                return (
                  <div
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                    className={`flex items-center px-4 py-2 hover:bg-slate-600 border-b border-slate-700 last:border-b-0 ${
                      adjustedIndex % 2 === 1 ? 'bg-slate-800/50' : ''
                    } ${
                      item.is_directory ? 'cursor-pointer' : ''
                    } ${selectedPath === item.path ? 'bg-blue-900/30 border-l-4 border-blue-500' : ''}`}
                  >
                    {item.is_directory ? (
                      <Folder className="w-5 h-5 text-blue-500 mr-3" />
                    ) : (
                      <File className="w-5 h-5 text-slate-500 mr-3" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white truncate">
                          {item.name}
                        </span>
                        
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          {!item.is_directory && item.size && (
                            <span>{formatFileSize(item.size)}</span>
                          )}
                          {item.modified_time && (
                            <span>{formatDate(item.modified_time)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {listing.items.filter(item => showFiles || item.is_directory).length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Folder className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                <p>This folder is empty</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { FileBrowser } from '../components/FileBrowser';
import { Plus, Trash as Trash2, Folder, X, Download, PencilSimple as Edit3, CaretDown as ChevronDown, FilmSlate as Film, Monitor, FunnelSimple as Filter } from '@phosphor-icons/react';

interface MediaPath {
  id?: number;
  index?: number; // For YAML config (array index)
  media_type: 'movies' | 'tv' | 'downloads';
  path: string;
  name: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function SettingsPaths() {
  const [mediaPaths, setMediaPaths] = useState<MediaPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<{
    index?: number;
    media_type: 'movies' | 'tv' | 'downloads';
    name: string;
    path: string;
  } | null>(null);
  const [showLightFileBrowser, setShowLightFileBrowser] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'movies' | 'tv' | 'downloads'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDockerInfo, setShowDockerInfo] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showAddDropdown && !target.closest('.add-dropdown-container')) {
        setShowAddDropdown(false);
      }
      if (showFilterDropdown && !target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddDropdown, showFilterDropdown]);

  // Load media paths from YAML config
  useEffect(() => {
    const fetchMediaPaths = async () => {
      setLoading(true);
      try {
        const allPaths: MediaPath[] = [];
        
        // Fetch movies library paths
        const moviesLibResponse = await fetch('/api/config/movies/library-paths');
        if (moviesLibResponse.ok) {
          const moviesLibPaths = await moviesLibResponse.json();
          moviesLibPaths.forEach((path: any, index: number) => {
            allPaths.push({
              index,
              media_type: 'movies',
              path: path.path,
              name: path.name,
              enabled: path.enabled
            });
          });
        }
        
        // Fetch movies download paths
        const moviesDownResponse = await fetch('/api/config/movies/download-paths');
        if (moviesDownResponse.ok) {
          const moviesDownPaths = await moviesDownResponse.json();
          moviesDownPaths.forEach((path: any, index: number) => {
            allPaths.push({
              index,
              media_type: 'downloads',
              path: path.path,
              name: path.name,
              enabled: path.enabled
            });
          });
        }
        
        // Fetch TV library paths
        const tvLibResponse = await fetch('/api/config/tv/library-paths');
        if (tvLibResponse.ok) {
          const tvLibPaths = await tvLibResponse.json();
          tvLibPaths.forEach((path: any, index: number) => {
            allPaths.push({
              index,
              media_type: 'tv',
              path: path.path,
              name: path.name,
              enabled: path.enabled
            });
          });
        }
        
        // Fetch TV download paths (only if not already added from movies)
        const tvDownResponse = await fetch('/api/config/tv/download-paths');
        if (tvDownResponse.ok) {
          const tvDownPaths = await tvDownResponse.json();
          tvDownPaths.forEach((path: any, index: number) => {
            // Check if this download path already exists (shared between movies and TV)
            const existingPath = allPaths.find(p => p.path === path.path && p.media_type === 'downloads');
            if (!existingPath) {
              allPaths.push({
                index,
                media_type: 'downloads',
                path: path.path,
                name: path.name,
                enabled: path.enabled
              });
            }
          });
        }
        
        setMediaPaths(allPaths);
      } catch (error) {
        console.error('Error fetching media paths:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMediaPaths();
  }, []);

  const handleAddPath = (media_type: 'movies' | 'tv' | 'downloads') => {
    setEditModalData({
      media_type,
      name: `${media_type === 'movies' ? 'Movies' : media_type === 'tv' ? 'TV Shows' : 'Downloads'} Library`,
      path: ''
    });
    setShowEditModal(true);
  };

  const handleEditPath = (path: MediaPath) => {
    setEditModalData({
      index: path.index,
      media_type: path.media_type,
      name: path.name,
      path: path.path
    });
    setShowEditModal(true);
  };

  // Removed unused handlePathSelected block

  const handleRemovePath = async (index: number) => {
    if (!confirm('Are you sure you want to remove this media path?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/config/paths/media-directories/${index}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete media path');
      }

      // Refresh the media paths from config
      const fetchResponse = await fetch('/api/config/paths/media-directories');
      if (fetchResponse.ok) {
        const paths = await fetchResponse.json();
        const pathsWithIndex = paths.map((path: MediaPath, idx: number) => ({
          ...path,
          index: idx
        }));
        setMediaPaths(pathsWithIndex);
      }
      
      alert('Media path removed successfully!');

    } catch (error) {
      console.error('Error removing path:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove path. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleSaveEditModal = async () => {
    if (!editModalData || !editModalData.name.trim() || !editModalData.path.trim()) {
      alert('Please provide both name and path');
      return;
    }

    setLoading(true);
    
    try {
      const requestData = {
        name: editModalData.name.trim(),
        path: editModalData.path,
        media_type: editModalData.media_type,
        enabled: true
      };

      let response;
      if (editModalData.index !== undefined) {
        // Update existing path
        response = await fetch(`/api/config/paths/media-directories/${editModalData.index}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      } else {
        // Create new path
        response = await fetch('/api/config/paths/media-directories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save media path');
      }

      // Refresh the media paths from config
      const fetchResponse = await fetch('/api/config/paths/media-directories');
      if (fetchResponse.ok) {
        const paths = await fetchResponse.json();
        const pathsWithIndex = paths.map((path: MediaPath, idx: number) => ({
          ...path,
          index: idx
        }));
        setMediaPaths(pathsWithIndex);
      }

      setShowEditModal(false);
      setEditModalData(null);

      alert(`Path ${editModalData.index !== undefined ? 'updated' : 'added'} successfully!`);

    } catch (error) {
      console.error('Error saving path:', error);
      alert(error instanceof Error ? error.message : 'Failed to save path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLightFileBrowserSelect = (selectedPath: string) => {
    if (editModalData) {
      setEditModalData({
        ...editModalData,
        path: selectedPath
      });
    }
    setShowLightFileBrowser(false);
  };

  const tabs = [
    { name: 'General', href: '/settings/general' },
    { name: 'Paths', href: '/settings/paths' },
    { name: 'Users', href: '/settings/users' },
    { name: 'Security', href: '/settings/security' },
  ];


  return (
    <>
      <div>
        <PageHeader title="Settings" tabs={tabs} />
        <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="flex justify-between items-center relative">
          {/* Filter Dropdown */}
          <div className="relative filter-dropdown-container">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="inline-flex items-center px-3 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              {filterType === 'all' ? 'All Types' : 
               filterType === 'movies' ? 'Movies Only' :
               filterType === 'tv' ? 'TV Shows Only' : 'Downloads Only'}
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {showFilterDropdown && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setShowFilterDropdown(false);
                    }}
                    className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                      filterType === 'all' 
                        ? 'bg-slate-700 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Folder className="w-4 h-4 mr-3 text-slate-400" />
                    All Types
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('movies');
                      setShowFilterDropdown(false);
                    }}
                    className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                      filterType === 'movies' 
                        ? 'bg-slate-700 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Film className="w-4 h-4 mr-3 text-blue-400" />
                    Movies Only
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('tv');
                      setShowFilterDropdown(false);
                    }}
                    className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                      filterType === 'tv' 
                        ? 'bg-slate-700 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-4 h-4 mr-3 text-green-400" />
                    TV Shows Only
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('downloads');
                      setShowFilterDropdown(false);
                    }}
                    className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                      filterType === 'downloads' 
                        ? 'bg-slate-700 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Download className="w-4 h-4 mr-3 text-orange-400" />
                    Downloads Only
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Path Dropdown */}
          <div className="relative add-dropdown-container">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Media Path
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {showAddDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleAddPath('movies');
                      setShowAddDropdown(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Film className="w-4 h-4 mr-3 text-blue-400" />
                    Movie Directory
                  </button>
                  <button
                    onClick={() => {
                      handleAddPath('tv');
                      setShowAddDropdown(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Monitor className="w-4 h-4 mr-3 text-green-400" />
                    TV Show Directory
                  </button>
                  <button
                    onClick={() => {
                      handleAddPath('downloads');
                      setShowAddDropdown(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4 mr-3 text-orange-400" />
                    Download Directory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Media Paths Section */}
        <div>
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-medium text-white">Media Directories</h3>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg">
            {(() => {
              // Filter and sort paths
              let filteredPaths = mediaPaths;
              if (filterType !== 'all') {
                filteredPaths = mediaPaths.filter(p => p.media_type === filterType);
              }
              
              // Sort by type when showing all, otherwise by name
              if (filterType === 'all') {
                filteredPaths = filteredPaths.sort((a, b) => {
                  const typeOrder = { movies: 0, tv: 1, downloads: 2 };
                  const typeComparison = typeOrder[a.media_type] - typeOrder[b.media_type];
                  if (typeComparison !== 0) return typeComparison;
                  return a.name.localeCompare(b.name);
                });
              } else {
                filteredPaths = filteredPaths.sort((a, b) => a.name.localeCompare(b.name));
              }
              
              return filteredPaths.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Folder className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-base font-medium mb-2">
                    {mediaPaths.length === 0 
                      ? 'No media directories configured'
                      : `No ${filterType === 'movies' ? 'movie' : filterType === 'tv' ? 'TV show' : 'download'} directories found`
                    }
                  </p>
                  <p className="text-sm text-slate-500">
                    {mediaPaths.length === 0 
                      ? 'Use the "Add Media Path" button above to configure your movie, TV show, and download directories.'
                      : `Try selecting a different filter or add a new ${filterType === 'movies' ? 'movie' : filterType === 'tv' ? 'TV show' : 'download'} directory.`
                    }
                  </p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {filteredPaths.map((path) => {
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'movies':
                          return <Film className="w-5 h-5 text-blue-400" />;
                        case 'tv':
                          return <Monitor className="w-5 h-5 text-green-400" />;
                        case 'downloads':
                          return <Download className="w-5 h-5 text-orange-400" />;
                        default:
                          return <Folder className="w-5 h-5 text-slate-400" />;
                      }
                    };

                    const getTypeLabel = (type: string) => {
                      switch (type) {
                        case 'movies':
                          return 'Movie';
                        case 'tv':
                          return 'TV Show';
                        case 'downloads':
                          return 'Download';
                        default:
                          return 'Media';
                      }
                    };

                    return (
                      <div key={path.index} className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:bg-slate-650 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {getTypeIcon(path.media_type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="text-sm font-medium text-white truncate">{path.name}</p>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-600 text-slate-300">
                                  {getTypeLabel(path.media_type)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 font-mono truncate">{path.path}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEditPath(path)}
                              className="text-slate-400 hover:text-blue-400 transition-colors p-2 rounded-md hover:bg-slate-600"
                              title="Edit path"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemovePath(path.index!)}
                              className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-md hover:bg-slate-600"
                              title="Remove path"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Docker Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg">
          <button 
            className="w-full text-left px-4 py-3 text-sm font-medium text-blue-400 bg-slate-700 hover:bg-slate-600 hover:text-white transition-colors flex items-center justify-between"
            onClick={() => setShowDockerInfo(!showDockerInfo)}
          >
            Docker Volume Mounting
            <ChevronDown className={`w-4 h-4 transform ${showDockerInfo ? 'rotate-180' : 'rotate-0'}`} />
          </button>
          {showDockerInfo && (
            <div className="p-4">
              <p className="text-sm text-slate-300 mb-3">
                When running Caddyy in Docker, you'll need to mount these directories as volumes:
              </p>
              <div className="bg-slate-700 rounded p-3 font-mono text-sm">
                <div className="text-slate-300 mb-2"># Example docker-compose.yml volumes:</div>
                <div className="text-slate-200">  - /host/path/to/downloads:/media/downloads</div>
                <div className="text-slate-200">  - /host/path/to/tv-shows:/media/tv</div>
                <div className="text-slate-200">  - /host/path/to/movies:/media/movies</div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-lg overflow-hidden relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <Edit3 className="w-5 h-5 text-blue-500" />
                <div>
                  <h2 className="text-lg font-medium text-white">
                    {editModalData.index !== undefined ? 'Edit' : 'Add'} {editModalData.media_type === 'movies' ? 'Movie' : editModalData.media_type === 'tv' ? 'TV Show' : 'Download'} Path
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editModalData.name}
                  onChange={(e) => setEditModalData({ ...editModalData, name: e.target.value })}
                  className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Enter a friendly name for this path"
                />
              </div>

              {/* Path Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Directory Path
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editModalData.path}
                    onChange={(e) => setEditModalData({ ...editModalData, path: e.target.value })}
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 pr-10 focus:outline-none focus:border-blue-500 font-mono text-sm"
                    placeholder="/path/to/your/media/directory"
                  />
                  <button
                    onClick={() => setShowLightFileBrowser(true)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                    title="Browse for directory"
                  >
                    <Folder className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditModal}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editModalData.index !== undefined ? 'Update Path' : 'Add Path'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Light File Browser Modal */}
      {showLightFileBrowser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 w-full max-w-2xl max-h-[70vh] rounded-lg overflow-hidden relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <Folder className="w-4 h-4 text-blue-500" />
                <h3 className="text-md font-medium text-white">Select Directory</h3>
              </div>
              <button
                onClick={() => setShowLightFileBrowser(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
              <FileBrowser
                onSelectPath={handleLightFileBrowserSelect}
                showFiles={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

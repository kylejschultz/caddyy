import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import PageHeader from '../components/PageHeader'
import { HardDrive, FilmSlate, Television as Tv, Plus, FolderOpen, CaretDown, MagnifyingGlass } from '@phosphor-icons/react'

interface Library {
  id: number
  name: string
  media_type: 'movies' | 'tv'
  enabled: boolean
  sort_order: number
  tags: string[]
  folders: { id: number; name: string; path: string; enabled: boolean; priority: number }[]
}

interface FolderUsage { folder_id: number; free_bytes: number; total_bytes: number }

type ViewMode = 'cards' | 'table'

type SortKey = 'title' | 'year' | 'rating' | 'size' | 'episodes'

type Item = { id:number; title:string; poster_url?:string; year?:number; rating?:number; folder_path?:string; path?:string }

export default function LibraryView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: library, isLoading, error } = useQuery<Library>({
    queryKey: ['library', id],
    queryFn: async () => {
      const res = await axios.get(`/api/libraries/${id}`)
      return res.data as Library
    },
    enabled: !!id
  })

  // Fetch folder usage for disks
  const { data: usage } = useQuery<FolderUsage[]>({
    queryKey: ['library-usage', id],
    queryFn: async () => {
      const res = await axios.get(`/api/libraries/${id}/folders/usage`)
      return res.data as FolderUsage[]
    },
    enabled: !!id
  })

  // Fetch collection scoped to library
  const { data: itemsRaw } = useQuery<Item[]>({
    queryKey: ['library-items', id, library?.media_type],
    queryFn: async () => {
      if (!id) return []
      const path = `/api/libraries/${id}/${library?.media_type === 'movies' ? 'collection/movies' : 'collection/tv'}`
      const res = await axios.get(path)
      return res.data as Array<Item>
    },
    enabled: !!id && !!library
  })

// View state (sorting, pagination, mode)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [sortBy, setSortBy] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [pageSize, setPageSize] = useState<number>(24)
  const [page, setPage] = useState<number>(1)
  const [query, setQuery] = useState('')

  // Clickable header sorting helpers
  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const SortIndicator = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return null
    return <span className="ml-1 text-slate-400">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }
  // Column visibility (persisted)
  type ColumnKey = 'year' | 'rating' | 'size' | 'episodes' | 'location' | 'status' | 'progress' | 'seasons' | 'missing' | 'completion' | 'network'
  const defaultCols: Record<ColumnKey, boolean> = { year: true, rating: true, size: true, episodes: true, location: true, status: true, progress: false, seasons: false, missing: false, completion: false, network: false }
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('libraryView.columns')
      if (saved) return { ...defaultCols, ...JSON.parse(saved) }
    } catch {}
    return defaultCols
  })
  useEffect(() => {
    try { localStorage.setItem('libraryView.columns', JSON.stringify(visibleCols)) } catch {}
  }, [visibleCols])

  const itemsFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return itemsRaw || []
    return (itemsRaw || []).filter(it => it.title.toLowerCase().includes(q))
  }, [itemsRaw, query])

  const itemsSorted = useMemo(() => {
    const arr = [...(itemsFiltered || [])]
    arr.sort((a,b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'year':
          return ((a.year||0) - (b.year||0)) * dir
        case 'rating':
          return ((((a as any).rating)||0) - (((b as any).rating)||0)) * dir
        case 'size': {
          const as = ((a as any).total_size)||0
          const bs = ((b as any).total_size)||0
          return (as - bs) * dir
        }
        case 'episodes': {
          const ad = ((a as any).downloaded_episodes)||0
          const at = ((a as any).total_episodes)||0
          const bd = ((b as any).downloaded_episodes)||0
          const bt = ((b as any).total_episodes)||0
          const ap = at>0 ? ad/at : 0
          const bp = bt>0 ? bd/bt : 0
          return (ap - bp) * dir
        }
        default:
          return a.title.localeCompare(b.title) * dir
      }
    })
    return arr
  }, [itemsFiltered, sortBy, sortDir])

  const totalPages = useMemo(() => {
    if (!itemsSorted) return 1
    return Math.max(1, Math.ceil(itemsSorted.length / pageSize))
  }, [itemsSorted, pageSize])

  useEffect(() => { setPage(1) }, [sortBy, sortDir, pageSize, id])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return (itemsSorted || []).slice(start, start + pageSize)
  }, [itemsSorted, page, pageSize])

  const headerActions = (
    <div className="flex items-center gap-2">
      {library?.media_type === 'tv' ? (
        <>
          <Link to="/shows/add" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <Plus className="w-4 h-4" /> Add Shows
          </Link>
          <Link to="/shows/import" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
            <FolderOpen className="w-4 h-4" /> Import
          </Link>
        </>
      ) : (
        <Link to="/movies" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          <Plus className="w-4 h-4" /> Browse Movies
        </Link>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading library..." description="Please wait" />
        <div className="p-6">Loading...</div>
      </>
    )
  }

  if (error || !library) {
    return (
      <>
        <PageHeader title="Library not found" description="The requested library does not exist" />
        <div className="p-6">
          <button onClick={() => navigate('/settings/libraries')} className="px-4 py-2 bg-slate-800 text-white rounded">Back to Libraries</button>
        </div>
      </>
    )
  }

  const sortedFolders = [...(library.folders || [])].sort((a,b)=>a.priority-b.priority)
  const usageById = new Map((usage||[]).map(u => [u.folder_id, u]))

  const formatBytes = (num?: number) => {
    if (!num || num <= 0) return '0 B'
    const k=1024; const units=['B','KB','MB','GB','TB','PB']
    const i = Math.floor(Math.log(num)/Math.log(k))
    return `${(num/Math.pow(k,i)).toFixed(1)} ${units[i]}`
  }

  return (
    <>
      <PageHeader 
        title={library.name}
        description={library.media_type === 'tv' ? 'TV Library' : 'Movies Library'}
        actions={headerActions}
      />

      <div className="p-6 space-y-6">
        {/* Disks with usage */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-300" />
              <h3 className="text-white font-semibold">Disks</h3>
            </div>
            <div className="text-xs text-slate-400">{sortedFolders.length} configured</div>
          </div>
          {sortedFolders.length === 0 ? (
            <div className="text-slate-400">No disks configured. Add disks in Settings → Libraries.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedFolders.map(f => {
                const u = usageById.get(f.id)
                const total = u?.total_bytes || 0
                const free = u?.free_bytes || 0
                const used = total>0 ? Math.max(0, total - free) : 0
                const pct = total>0 ? Math.min(100, Math.round((used/total)*100)) : 0
                return (
                  <div key={f.id} className="rounded border border-slate-700/60 p-3 bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">
                        {f.name} {f.priority === 0 && <span className="text-xs ml-2 px-2 py-0.5 rounded bg-slate-700 text-slate-300">Primary</span>}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded ${pct>85?'bg-red-500/20 text-red-300':pct>70?'bg-yellow-500/20 text-yellow-300':'bg-emerald-500/20 text-emerald-300'}`}>{pct}%</div>
                    </div>
                    <div className="text-slate-400 text-xs font-mono mt-1 truncate">{f.path}</div>
                    <div className="mt-2 h-2 rounded bg-slate-700 overflow-hidden">
                      <div className={`h-full ${pct>85?'bg-red-500':pct>70?'bg-yellow-500':'bg-emerald-500'}`} style={{width: `${pct}%`}} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <div>Used: <span className="text-slate-200">{formatBytes(used)}</span></div>
                      <div>Free: <span className="text-slate-200">{formatBytes(free)}</span></div>
                      <div>Total: <span className="text-slate-200">{formatBytes(total)}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Collection controls */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {library.media_type === 'tv' ? <Tv className="w-4 h-4 text-slate-300" /> : <FilmSlate className="w-4 h-4 text-slate-300" />}
              <h3 className="text-white font-semibold">In Collection</h3>
              <span className="text-xs text-slate-400 ml-2">{itemsSorted?.length || 0} items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center bg-slate-800 rounded-md border border-slate-700 overflow-hidden mr-2 h-9">
                <button onClick={() => setViewMode('cards')} className={`px-3 h-9 text-sm inline-flex items-center ${viewMode==='cards'?'bg-blue-600 text-white':'text-slate-300 hover:bg-slate-700'}`}>Cards</button>
                <button onClick={() => setViewMode('table')} className={`px-3 h-9 text-sm inline-flex items-center ${viewMode==='table'?'bg-blue-600 text-white':'text-slate-300 hover:bg-slate-700'}`}>Table</button>
              </div>
              <div className="relative h-9">
                <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-9 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-md pl-9 pr-3 w-56 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              {/* Columns selector (table view only) */}
              {viewMode === 'table' && (
              <div className="relative h-9">
                <details className="group">
                  <summary className="list-none inline-flex items-center px-3 h-9 rounded-md bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer select-none">
                    Columns <CaretDown className="w-4 h-4 ml-1 text-slate-400" />
                  </summary>
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded shadow-lg p-2 z-10">
                    {(['year','rating','size','episodes','location','status','progress','seasons','missing','completion','network'] as ColumnKey[]).map(key => (
                      <label key={key} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={visibleCols[key]}
                          onChange={(e)=>setVisibleCols(prev=>({ ...prev, [key]: e.target.checked }))}
                        />
                        <span className="capitalize text-slate-200 text-sm">{key}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
              )}
            </div>
          </div>

          {/* Views */}
          {!itemsSorted || itemsSorted.length === 0 ? (
            <div className="text-slate-400">No items found for this library yet.</div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {pageItems.map((it) => {
                const href = library.media_type === 'tv' ? `/tv/${(it as any).tmdb_id || it.id}` : `/movie/${(it as any).tmdb_id || it.id}`
                return (
                <Link to={href} key={it.id} className="group bg-slate-900/40 border border-slate-700/60 rounded-lg overflow-hidden hover:border-slate-500/60">
                  <div className="aspect-[2/3] bg-slate-700 relative">
                    {it.poster_url ? (
                      <img src={it.poster_url} alt={it.title} className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-60" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {library.media_type === 'tv' ? <Tv className="w-8 h-8 text-slate-400" /> : <FilmSlate className="w-8 h-8 text-slate-400" />}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                      {/* Top badges */}
                      <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          {(it as any).show_status ? (
                            <span className="px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700/60 text-slate-200">
                              {(it as any).show_status}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center">
                          {typeof (it as any).monitored === 'boolean' ? (
                            (it as any).monitored ? (
                              <span className="px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700/60 text-slate-200">
                                {String(((it as any).monitoring_option || '')).replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Monitored'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700/60 text-slate-200">
                                Not Monitored
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                      {/* Bottom details */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-xs text-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700/60">
                            {(it as any).seasons_count ?? 0} seasons
                          </span>
                          {typeof (it as any).downloaded_episodes === 'number' &&
                           typeof (it as any).total_episodes === 'number' &&
                           (it as any).total_episodes > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700/60">
                              {(it as any).downloaded_episodes}/{(it as any).total_episodes} eps
                            </span>
                          ) : null}
                        </div>
                        {typeof (it as any).completion_pct === 'number' ? (
                          <div className="h-2 rounded bg-slate-800 overflow-hidden">
                            <div
                              className={`${
                                ((it as any).completion_pct as number) > 85
                                  ? 'bg-emerald-500'
                                  : ((it as any).completion_pct as number) > 50
                                  ? 'bg-blue-500'
                                  : 'bg-slate-500'
                              } h-full`}
                              style={{ width: `${(it as any).completion_pct}%` }}
                            />
                          </div>
                        ) : null}
                        {typeof (it as any).total_size === 'number' && (it as any).total_size > 0 ? (
                          <div className="text-[10px] text-slate-300">{formatBytes((it as any).total_size)}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-white text-sm truncate">{it.title}</div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{typeof it.year === 'number' ? it.year : ''}</span>
                      {typeof (it as any).rating === 'number' && <span>★ {(it as any).rating.toFixed ? (it as any).rating.toFixed(1) : (it as any).rating}</span>}
                    </div>
                  </div>
                </Link>
              )})}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <button
                        type="button"
                        onClick={() => handleSort('title')}
                        aria-sort={sortBy === 'title' ? sortDir : 'none'}
                        className="inline-flex items-center gap-1 hover:text-white"
                      >
                        Title <SortIndicator col="title" />
                      </button>
                    </th>
                    {visibleCols.year && (
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleSort('year')}
                          aria-sort={sortBy === 'year' ? sortDir : 'none'}
                          className="inline-flex items-center gap-1 hover:text-white"
                        >
                          Year <SortIndicator col="year" />
                        </button>
                      </th>
                    )}
                    {visibleCols.rating && (
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleSort('rating')}
                          aria-sort={sortBy === 'rating' ? sortDir : 'none'}
                          className="inline-flex items-center gap-1 hover:text-white"
                        >
                          Rating <SortIndicator col="rating" />
                        </button>
                      </th>
                    )}
                    {visibleCols.size && (
                      <th className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('size')}
                          aria-sort={sortBy === 'size' ? sortDir : 'none'}
                          className="inline-flex items-center gap-1 hover:text-white float-right"
                        >
                          Size <SortIndicator col="size" />
                        </button>
                      </th>
                    )}
                    {visibleCols.episodes && (
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleSort('episodes')}
                          aria-sort={sortBy === 'episodes' ? sortDir : 'none'}
                          className="inline-flex items-center gap-1 hover:text-white"
                        >
                          Episodes <SortIndicator col="episodes" />
                        </button>
                      </th>
                    )}
                    {visibleCols.seasons && <th className="px-3 py-2">Seasons</th>}
                    {visibleCols.missing && <th className="px-3 py-2">Missing</th>}
                    {visibleCols.completion && <th className="px-3 py-2">Complete</th>}
                    {visibleCols.progress && <th className="px-3 py-2">Progress</th>}
                    {visibleCols.status && <th className="px-3 py-2">Status</th>}
                    {visibleCols.network && <th className="px-3 py-2">Network</th>}
                    {visibleCols.location && <th className="px-3 py-2 text-left">Location</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((it) => {
                    const loc = (it as any).folder_path || (it as any).path || ''
                    const href = library.media_type === 'tv' ? `/tv/${(it as any).tmdb_id || it.id}` : `/movie/${(it as any).tmdb_id || it.id}`
                    const totalSize = (it as any).total_size as number | undefined
                    const downloaded = (it as any).downloaded_episodes as number | undefined
                    const totalEp = (it as any).total_episodes as number | undefined
                    const pct = downloaded && totalEp && totalEp>0 ? Math.round((downloaded/totalEp)*100) : 0
                    const diskName = (() => {
                      if (!loc) return ''
                      const match = sortedFolders.find(f => loc.startsWith(f.path))
                      return match ? match.name : ''
                    })()
                    return (
                      <tr
                        key={it.id}
                        className="border-t border-slate-700/50 hover:bg-slate-800/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                        onClick={() => navigate(href)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(href) } }}
                        role="link"
                        tabIndex={0}
                      >
                        <td className="px-3 py-2 text-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-12 bg-slate-700 rounded overflow-hidden">
                              {it.poster_url && <img src={it.poster_url} alt={it.title} className="w-full h-full object-cover" />}
                            </div>
                            <span className="font-medium text-slate-200 group-hover:text-white underline-offset-2">{it.title}</span>
                          </div>
                        </td>
                        {visibleCols.year && (
                          <td className="px-3 py-2 text-center text-slate-300">{typeof it.year === 'number' ? it.year : ''}</td>
                        )}
                        {visibleCols.rating && (
                          <td className="px-3 py-2 text-center text-slate-300">{typeof (it as any).rating === 'number' ? ((it as any).rating.toFixed ? (it as any).rating.toFixed(1) : (it as any).rating) : ''}</td>
                        )}
                        {visibleCols.size && (
                          <td className="px-3 py-2 text-right text-slate-300">
                            {library.media_type === 'tv'
                              ? (typeof downloaded === 'number' && downloaded > 0
                                  ? (typeof totalSize === 'number' ? formatBytes(totalSize) : '0 B')
                                  : '--')
                              : (typeof totalSize === 'number' ? formatBytes(totalSize) : '')}
                          </td>
                        )}
                        {visibleCols.episodes && (
                          <td className="px-3 py-2">
                            {typeof downloaded === 'number' && typeof totalEp === 'number' && totalEp>0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded bg-slate-700 overflow-hidden min-w-[120px]">
                                  <div className={`${pct>85?'bg-emerald-500':pct>50?'bg-blue-500':'bg-slate-500'} h-full`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="text-xs text-slate-300 whitespace-nowrap">{downloaded}/{totalEp}</div>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm">—</span>
                            )}
                          </td>
                        )}
                        {visibleCols.seasons && (
                          <td className="px-3 py-2 text-center text-slate-300">{(it as any).seasons_count ?? ''}</td>
                        )}
                        {visibleCols.missing && (
                          <td className="px-3 py-2 text-center text-slate-300">{(it as any).missing_episodes ?? ''}</td>
                        )}
                        {visibleCols.completion && (
                          <td className="px-3 py-2 text-center text-slate-300">{typeof (it as any).completion_pct === 'number' ? `${(it as any).completion_pct}%` : ''}</td>
                        )}
                        {visibleCols.progress && (
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-200">{(it as any).status ?? ''}</span>
                          </td>
                        )}
                        {visibleCols.status && (
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-200">{(it as any).show_status ?? ''}</span>
                          </td>
                        )}
                        {visibleCols.network && (
                          <td className="px-3 py-2 text-center text-slate-300">
                            {Array.isArray((it as any).networks_detailed) && (it as any).networks_detailed.some((n: any) => n.logo_url) ? (
                              <div className="flex items-center justify-center gap-1">
                                {(it as any).networks_detailed.slice(0,3).map((n: any, idx: number) => (
                                  n.logo_url ? (
                                  <span key={idx} title={n.name} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-black/5 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10">
                                  <img src={n.logo_url} alt={n.name} className="h-4 w-auto object-contain opacity-90 dark:invert dark:brightness-150 dark:saturate-0" />
                                    </span>
                                  ) : null
                                ))}
                                {((it as any).networks_detailed.length || 0) > 3 && (
                                  <span className="text-xs text-slate-400">+{(it as any).networks_detailed.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              Array.isArray((it as any).networks) ? (it as any).networks.join(', ') : ((it as any).network || '')
                            )}
                          </td>
                        )}
                        {visibleCols.location && (
                          <td className="px-3 py-2 text-slate-300 truncate max-w-[420px]" title={loc}>
                            {diskName ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700/60 text-slate-200 text-xs">
                                {diskName}
                              </span>
                            ) : (
                              <span className="font-mono">{loc}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination / Footer */}
          <div className="mt-4 border-t border-slate-700/50 pt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-slate-400">
              <span>Page {page} / {totalPages}</span>
              <div className="relative h-8">
                <select value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value))} className="h-8 appearance-none bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md pl-2 pr-7 focus:outline-none focus:ring-1 focus:ring-blue-600">
                  <option value={12}>12 / page</option>
                  <option value={24}>24 / page</option>
                  <option value={48}>48 / page</option>
                </select>
                <CaretDown className="w-4 h-4 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 disabled:opacity-50 hover:bg-slate-800">Prev</button>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 disabled:opacity-50 hover:bg-slate-800">Next</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

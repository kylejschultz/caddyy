import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { Plus, Trash as Trash2 } from '@phosphor-icons/react'

interface Library {
  id: number
  name: string
  media_type: 'movies' | 'tv'
  enabled: boolean
  sort_order: number
  tags: string[]
  folders: LibraryFolder[]
}

interface LibraryFolder {
  id: number
  name: string
  path: string
  enabled: boolean
  priority: number
}

export default function LibrariesSettings() {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLibraries = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/libraries')
      const data = await res.json()
      setLibraries(data)
    } catch (e) {
      setError('Failed to load libraries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLibraries() }, [])

  return (
    <>
      <PageHeader title="Libraries" description="Create and manage libraries for Movies and TV" />
      <div className="p-6 space-y-6">
        {loading && <div className="text-slate-400">Loading...</div>}
        {error && <div className="text-red-400">{error}</div>}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Libraries</h2>
              <CreateLibraryWizard onCreated={fetchLibraries} />
            </div>

            {libraries.length === 0 ? (
              <div className="text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded-lg p-6">
                No libraries yet. Use "Create Library" to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {libraries.sort((a,b)=>a.sort_order-b.sort_order).map(lib => (
                  <LibraryCard key={lib.id} library={lib} onChange={fetchLibraries} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function CreateLibraryWizard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [mediaType, setMediaType] = useState<'movies'|'tv'>('movies')
  const [folders, setFolders] = useState<Array<{name:string; path:string}>>([{name:'', path:''}])
  const [saving, setSaving] = useState(false)

  const addFolderField = () => setFolders(prev => [...prev, {name:'', path:''}])
  const updateFolderField = (i: number, field: 'name'|'path', value: string) => {
    setFolders(prev => prev.map((f, idx)=> idx===i ? {...f, [field]: value} : f))
  }
  const removeFolderField = (i: number) => setFolders(prev => prev.filter((_,idx)=> idx!==i))

  const canSave = name.trim() && folders.some(f=>f.name.trim() && f.path.trim())

  const handleCreate = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      // Create library
      const res = await fetch('/api/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), media_type: mediaType, enabled: true })
      })
      if (!res.ok) throw new Error('Failed to create library')
      const lib = await res.json()

      // Add folders; first one is priority 0 (primary), subsequent increment
      for (let i=0;i<folders.length;i++) {
        const f = folders[i]
        if (!f.name.trim() || !f.path.trim()) continue
        await fetch(`/api/libraries/${lib.id}/folders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: f.name.trim(), path: f.path.trim(), enabled: true, priority: i })
        })
      }

      setOpen(false)
      setName('')
      setFolders([{name:'', path:''}])
      onCreated()
    } catch (e) {
      // noop simple handling
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> Create Library
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white text-lg font-semibold">Create Library</h3>
              <button className="text-slate-400 hover:text-white" onClick={()=>setOpen(false)}>Close</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Library Name</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Movies, 4K Movies, Anime TV" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Media Type</label>
                <div className="flex gap-3">
                  {(['movies','tv'] as const).map(mt => (
                    <label key={mt} className={`px-3 py-2 rounded border cursor-pointer ${mediaType===mt?'bg-slate-800 border-blue-500 text-white':'bg-slate-800 border-slate-700 text-slate-300'}`}>
                      <input type="radio" className="hidden" checked={mediaType===mt} onChange={()=>setMediaType(mt)} />
                      {mt.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Folders</label>
                  <button onClick={addFolderField} className="text-blue-400 hover:text-blue-300 text-sm">Add Folder</button>
                </div>
                {folders.map((f, i)=> (
                  <div key={i} className="flex items-center gap-2">
                    <input className="w-48 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={f.name} onChange={e=>updateFolderField(i,'name',e.target.value)} placeholder={i===0?'Primary folder name':'Folder name'} />
                    <input className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={f.path} onChange={e=>updateFolderField(i,'path',e.target.value)} placeholder="/path/to/folder" />
                    <button className="p-2 text-slate-400 hover:text-red-400" onClick={()=>removeFolderField(i)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <p className="text-xs text-slate-400">First folder becomes the primary (default) location. You can add more and re-order later.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="px-4 py-2 text-slate-300" onClick={()=>setOpen(false)}>Cancel</button>
                <button disabled={!canSave||saving} onClick={handleCreate} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50">{saving?'Creating...':'Create Library'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LibraryCard({ library, onChange }: { library: Library, onChange: () => void }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">{library.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{library.media_type.toUpperCase()}</span>
          </div>
          {library.folders && library.folders.length > 0 ? (
            <div className="text-sm text-slate-300">Primary: <span className="font-mono">{[...library.folders].sort((a,b)=>a.priority-b.priority)[0].path}</span></div>
          ) : (
            <div className="text-sm text-slate-400">No folders yet</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EditLibraryButton library={library} onChange={onChange} />
          <DeleteLibraryButton libraryId={library.id} onDeleted={onChange} />
        </div>
      </div>
    </div>
  )
}

function DeleteLibraryButton({ libraryId, onDeleted }: { libraryId: number; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)
  const removeLibrary = async () => {
    if (!confirm('Delete library?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/libraries/${libraryId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete library')
      onDeleted()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button onClick={removeLibrary} disabled={busy} className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50">Delete</button>
  )
}

function EditLibraryButton({ library, onChange }: { library: Library; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(library.name)
  const [enabled, setEnabled] = useState(library.enabled)
  const [sortOrder, setSortOrder] = useState(library.sort_order)
  const [folders, setFolders] = useState(library.folders.map(f => ({ ...f })))
  const [saving, setSaving] = useState(false)

  const addFolder = () => setFolders(prev => [...prev, { id: -Date.now(), name: '', path: '', enabled: true, priority: prev.length } as any])
  const updateFolder = (i: number, field: keyof LibraryFolder, value: any) => {
    setFolders(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
  }
  const removeFolder = (i: number) => setFolders(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update library core fields
      await fetch(`/api/libraries/${library.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled, sort_order: sortOrder })
      })

      // Sync folders (create/update)
      const existingIds = new Set(library.folders.map(f => f.id))
      for (let i = 0; i < folders.length; i++) {
        const f = folders[i]
        const payload = { name: f.name, path: f.path, enabled: f.enabled, priority: i }
        if (existingIds.has(f.id)) {
          await fetch(`/api/libraries/${library.id}/folders/${f.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        } else {
          await fetch(`/api/libraries/${library.id}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        }
      }

      // Delete removed folders
      const currentIds = new Set(folders.filter(f => f.id && f.id > 0).map(f => f.id))
      for (const old of library.folders) {
        if (!currentIds.has(old.id)) {
          await fetch(`/api/libraries/${library.id}/folders/${old.id}`, { method: 'DELETE' })
        }
      }

      onChange()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 text-sm text-white bg-slate-600 hover:bg-slate-500 rounded">Edit</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white text-lg font-semibold">Edit Library</h3>
              <button className="text-slate-400 hover:text-white" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Name</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="lib-enabled" type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} className="rounded border-slate-600 text-blue-600" />
                  <label htmlFor="lib-enabled" className="text-sm text-slate-300">Enabled</label>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Sort Order</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={sortOrder} onChange={e=>setSortOrder(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Disks</label>
                  <button onClick={addFolder} className="text-blue-400 hover:text-blue-300 text-sm">Add Disk</button>
                </div>
                {folders.map((f, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                    <input className="md:col-span-2 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={f.name} onChange={e=>updateFolder(i,'name',e.target.value)} placeholder={i===0?'Primary disk name':'Disk name'} />
                    <input className="md:col-span-3 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" value={f.path} onChange={e=>updateFolder(i,'path',e.target.value)} placeholder="/mount/point" />
                    <div className="flex items-center gap-2">
                      <input id={`disk-enabled-${i}`} type="checkbox" checked={f.enabled} onChange={e=>updateFolder(i,'enabled',e.target.checked)} className="rounded border-slate-600 text-blue-600" />
                      <label htmlFor={`disk-enabled-${i}`} className="text-sm text-slate-300">Enabled</label>
                      <button className="p-2 text-slate-400 hover:text-red-400" onClick={()=>removeFolder(i)}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400">Disks are scanned and selectable per library. First disk (priority 0) is primary.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="px-4 py-2 text-slate-300" onClick={() => setOpen(false)}>Cancel</button>
                <button disabled={saving} onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50">{saving?'Saving...':'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


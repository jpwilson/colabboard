'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { CanvasObject } from '@/lib/board-sync'

interface ModelBrowserProps {
  open: boolean
  onClose: () => void
  onPlaceModel: (obj: CanvasObject) => void
  nextZIndex: number
}

interface SketchfabResult {
  uid: string
  name: string
  thumbnail: string
  viewCount: number
  likeCount: number
}

interface UserUpload {
  id: string
  file_name: string
  storage_path: string
  file_size: number
  source: string
  created_at: string
}

export function ModelBrowser({ open, onClose, onPlaceModel, nextZIndex }: ModelBrowserProps) {
  const [tab, setTab] = useState<'search' | 'uploads'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SketchfabResult[]>([])
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UserUpload[]>([])
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadsLoaded, setUploadsLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const placeOnBoard = useCallback((url: string, name: string) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    onPlaceModel({
      id,
      type: 'model3d',
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 300,
      width: 300,
      height: 300,
      fill: 'transparent',
      modelUrl: url,
      text: name,
      z_index: nextZIndex,
      updated_at: now,
    })
  }, [onPlaceModel, nextZIndex])

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/models/upload')
      if (!res.ok) throw new Error('Failed to load uploads')
      const data = await res.json()
      setUploads(data.uploads || [])
      setUploadCount(data.count ?? 0)
      setUploadsLoaded(true)
    } catch {
      setError('Failed to load uploads')
    }
  }, [])

  // Load user uploads when tab switches
  useEffect(() => {
    if (open && tab === 'uploads' && !uploadsLoaded) {
      loadUploads()
    }
  }, [open, tab, uploadsLoaded, loadUploads])

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/models/search?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results || [])
      if (data.results?.length === 0) setError('No downloadable models found. Try different search terms.')
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }, [query])

  const handleImport = useCallback(async (model: SketchfabResult) => {
    setImporting(model.uid)
    setError(null)
    try {
      const res = await fetch('/api/models/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: model.uid, name: model.name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }
      const data = await res.json()
      placeOnBoard(data.url, data.name)
      setUploadsLoaded(false) // Refresh uploads count
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }, [placeOnBoard])

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/models/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }
      const data = await res.json()
      placeOnBoard(data.url, data.name)
      setUploadsLoaded(false) // Refresh list
      loadUploads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [placeOnBoard, loadUploads])

  const handleDeleteUpload = useCallback(async (upload: UserUpload) => {
    try {
      const res = await fetch('/api/models/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: upload.id, storage_path: upload.storage_path }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setUploads((prev) => prev.filter((u) => u.id !== upload.id))
      setUploadCount((prev) => prev - 1)
    } catch {
      setError('Failed to delete model')
    }
  }, [])

  const placeUploadOnBoard = useCallback((upload: UserUpload) => {
    // Reconstruct the public URL from storage_path
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const url = `${supabaseUrl}/storage/v1/object/public/3d-models/${upload.storage_path}`
    placeOnBoard(url, upload.file_name)
  }, [placeOnBoard])

  if (!open) return null

  return (
    <div className="fixed left-4 bottom-20 z-[9998] w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl"
      style={{ maxHeight: '500px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          <span className="text-sm font-semibold text-slate-700">3D Models</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setTab('search')}
          className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
            tab === 'search' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Search Sketchfab
        </button>
        <button
          onClick={() => setTab('uploads')}
          className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
            tab === 'uploads' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          My Uploads ({uploadCount}/10)
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">dismiss</button>
        </div>
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <div className="flex flex-col" style={{ maxHeight: '400px' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="flex gap-2 px-3 py-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 500K+ 3D models..."
              className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-600 disabled:opacity-50"
            >
              {searching ? '...' : 'Search'}
            </button>
          </form>

          <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ maxHeight: '340px', scrollbarWidth: 'thin' }}>
            {results.length === 0 && !searching && (
              <p className="py-6 text-center text-xs text-slate-400">
                Search for 3D models to add to your board
              </p>
            )}
            {searching && (
              <div className="flex items-center justify-center py-8">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {results.map((model) => (
                <button
                  key={model.uid}
                  onClick={() => handleImport(model)}
                  disabled={importing !== null}
                  className="group relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 transition hover:border-indigo-300 hover:shadow-md disabled:opacity-50"
                >
                  {model.thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={model.thumbnail} alt={model.name} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-slate-100 text-slate-300">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                    </div>
                  )}
                  <div className="px-2 py-1.5">
                    <p className="truncate text-left text-[10px] font-medium text-slate-600">{model.name}</p>
                  </div>
                  {importing === model.uid && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/0 opacity-0 transition group-hover:bg-indigo-500/10 group-hover:opacity-100">
                    <span className="rounded-full bg-indigo-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow">
                      Add to board
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Uploads tab */}
      {tab === 'uploads' && (
        <div className="flex flex-col" style={{ maxHeight: '400px' }}>
          {/* Upload button */}
          <div className="px-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || uploadCount >= 10}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-3 py-3 text-xs font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                  Uploading...
                </>
              ) : uploadCount >= 10 ? (
                'Upload limit reached (10/10)'
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Upload .glb or .gltf (50MB max)
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ maxHeight: '300px', scrollbarWidth: 'thin' }}>
            {!uploadsLoaded && (
              <div className="flex items-center justify-center py-8">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              </div>
            )}
            {uploadsLoaded && uploads.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                No uploads yet. Upload a .glb or .gltf file to get started.
              </p>
            )}
            <div className="space-y-1.5">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <svg className="h-4 w-4 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-600">{upload.file_name}</p>
                    <p className="text-[10px] text-slate-400">
                      {(upload.file_size / 1024 / 1024).toFixed(1)}MB
                      {' · '}
                      {upload.source}
                    </p>
                  </div>
                  <button
                    onClick={() => placeUploadOnBoard(upload)}
                    className="shrink-0 rounded bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    title="Place on board"
                  >
                    Place
                  </button>
                  <button
                    onClick={() => handleDeleteUpload(upload)}
                    className="shrink-0 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

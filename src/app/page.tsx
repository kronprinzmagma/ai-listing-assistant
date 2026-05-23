'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Revoke object URLs when component unmounts to prevent memory leak
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previews])

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const arr = Array.from(newFiles)
    const combined = [...files, ...arr].slice(0, 5)
    setFiles(combined)
    // Revoke old previews before creating new ones to prevent memory leak
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url))
      return combined.map((f) => URL.createObjectURL(f))
    })
  }, [files])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (files.length === 0) { setError('Bitte mindestens 1 Foto hochladen.'); return }
    setError('')
    setLoading(true)
    const fd = new FormData()
    files.forEach((f) => fd.append('photos', f))
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Fehler beim Upload.'); setLoading(false); return }
    router.push(`/session/${data.sessionId}/analyze`)
  }

  return (
    <div className="container">
      <div className="steps">
        <div className="step active">1</div>
        <div className="step-line" />
        <div className="step">2</div>
        <div className="step-line" />
        <div className="step">3</div>
        <div className="step-line" />
        <div className="step">4</div>
        <div className="step-line" />
        <div className="step">5</div>
      </div>

      <h1>Verkaufshilfe</h1>
      <p>Lade 1–5 Fotos deines Gegenstands hoch. Wir erstellen automatisch ein Inserat für ricardo.ch.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
          <p style={{ marginBottom: 0 }}>
            {files.length === 0
              ? 'Fotos hierher ziehen oder klicken zum Auswählen'
              : `${files.length} Foto${files.length > 1 ? 's' : ''} ausgewählt (max. 5)`}
          </p>
        </div>

        {previews.length > 0 && (
          <div className="photo-grid">
            {previews.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Foto ${i + 1}`} className="photo-thumb" />
            ))}
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={files.length === 0 || loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Wird hochgeladen…' : 'Weiter →'}
      </button>
    </div>
  )
}

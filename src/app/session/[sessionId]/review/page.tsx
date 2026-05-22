'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Listing, ListingLocale } from '@/types/session'

const CONDITIONS_DE = ['neu', 'wie neu', 'gut', 'akzeptabel']
const CONDITIONS_FR = ['neuf', 'comme neuf', 'bon état', 'acceptable']

function ListingForm({
  locale,
  data,
  onChange,
}: {
  locale: 'de' | 'fr'
  data: ListingLocale
  onChange: (updated: ListingLocale) => void
}) {
  const conditions = locale === 'de' ? CONDITIONS_DE : CONDITIONS_FR
  const titleLen = data.title.length

  return (
    <div>
      <div className="field-group">
        <label>Titel {locale === 'fr' ? '(FR)' : '(DE)'}</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          maxLength={60}
        />
        <div className={`char-count${titleLen > 60 ? ' over' : ''}`}>{titleLen}/60</div>
      </div>

      <div className="field-group">
        <label>Beschreibung {locale === 'fr' ? '(FR)' : '(DE)'}</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="field-group">
        <label>Kategorie</label>
        <input
          type="text"
          value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
        />
      </div>

      <div className="field-group">
        <label>Zustand</label>
        <select
          value={data.condition}
          onChange={(e) => onChange({ ...data, condition: e.target.value })}
        >
          {conditions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          {!conditions.includes(data.condition) && (
            <option value={data.condition}>{data.condition}</option>
          )}
        </select>
      </div>

      <div className="field-group">
        <label>Preis (CHF)</label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={data.price}
          onChange={(e) => onChange({ ...data, price: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div className="field-group">
        <label>Lieferkonditionen</label>
        <input
          type="text"
          value={data.shipping}
          onChange={(e) => onChange({ ...data, shipping: e.target.value })}
        />
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [listing, setListing] = useState<Listing | null>(null)
  const [tab, setTab] = useState<'de' | 'fr'>('de')
  const [saving, setSaving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [publishError, setPublishError] = useState('')

  useEffect(() => {
    fetch(`/api/listing?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.session?.listing) setListing(data.session.listing)
        if (data.session?.approved) setApproved(data.session.approved)
        if (data.session?.publishedUrl) setPublishedUrl(data.session.publishedUrl)
      })
      .catch(() => setError('Inserat konnte nicht geladen werden.'))
  }, [sessionId])

  const handleChange = (locale: 'de' | 'fr', updated: ListingLocale) => {
    if (!listing) return
    setListing({ ...listing, [locale]: updated })
  }

  const handleApprove = async () => {
    if (!listing) return
    setSaving(true)
    const res = await fetch('/api/listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, listing, approved: true }),
    })
    if (res.ok) setApproved(true)
    else setError('Fehler beim Speichern.')
    setSaving(false)
  }

  const handleSave = async () => {
    if (!listing) return
    setSaving(true)
    await fetch('/api/listing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, listing }),
    })
    setSaving(false)
  }

  const handlePublish = async () => {
    setPublishing(true)
    setPublishError('')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (res.ok) {
        setPublishedUrl(data.url)
      } else {
        setPublishError(data.error ?? 'Fehler beim Publizieren.')
      }
    } catch {
      setPublishError('Netzwerkfehler beim Publizieren.')
    }
    setPublishing(false)
  }

  if (approved) {
    return (
      <div className="container">
        <div className="card">
          <div className="success-box">
            <div className="success-icon">✅</div>
            <h2>Inserat freigegeben!</h2>
            {publishedUrl ? (
              <>
                <p>Das Inserat wurde auf Ricardo.ch publiziert.</p>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Inserat auf Ricardo.ch ansehen
                </a>
                <Link href={`/session/${sessionId}/orders`} className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
                  Bestellungen anzeigen
                </Link>
              </>
            ) : (
              <>
                <p>Das Inserat wurde gespeichert. Jetzt auf Ricardo.ch publizieren.</p>
                {publishError && <div className="alert alert-error">{publishError}</div>}
                <button
                  className="btn btn-primary"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? 'Wird publiziert…' : 'Auf Ricardo.ch publizieren'}
                </button>
              </>
            )}
            <Link href="/" className="btn btn-secondary">Neues Inserat</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="steps">
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step active">5</div>
      </div>

      <h1>Inserat prüfen</h1>
      <p>Bearbeite die Felder bei Bedarf und gib das Inserat frei.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {!listing && !error && (
        <div className="card">
          <div className="loading-box">
            <div className="spinner" />
          </div>
        </div>
      )}

      {listing && (
        <>
          <div className="card">
            <div className="tabs">
              <button className={`tab${tab === 'de' ? ' active' : ''}`} onClick={() => setTab('de')}>
                Deutsch
              </button>
              <button className={`tab${tab === 'fr' ? ' active' : ''}`} onClick={() => setTab('fr')}>
                Français
              </button>
            </div>

            <ListingForm
              locale={tab}
              data={listing[tab]}
              onChange={(updated) => handleChange(tab, updated)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              className="btn btn-success"
              onClick={handleApprove}
              disabled={saving}
              style={{ flex: 2 }}
            >
              {saving ? 'Wird freigegeben…' : 'Inserat freigeben ✓'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Listing } from '@/types/session'

export default function ListingPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setListing(data.listing)
      })
      .catch(() => setError('Fehler bei der Inserat-Generierung.'))
  }, [sessionId])

  return (
    <div className="container">
      <div className="steps">
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step active">4</div>
        <div className="step-line" />
        <div className="step">5</div>
      </div>

      <h1>Inserat wird erstellt</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {!listing && !error && (
        <div className="card">
          <div className="loading-box">
            <div className="spinner" />
            <p style={{ marginBottom: 0 }}>Inserat auf Deutsch und Französisch wird generiert…</p>
          </div>
        </div>
      )}

      {listing && (
        <>
          <div className="card">
            <p style={{ color: '#16a34a', fontWeight: 600, marginBottom: 0 }}>
              Inserat erfolgreich generiert!
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => router.push(`/session/${sessionId}/review`)}
          >
            Inserat prüfen →
          </button>
        </>
      )}
    </div>
  )
}

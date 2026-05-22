'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AnalysisResult } from '@/types/session'

export default function AnalyzePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setAnalysis(data.analysis)
      })
      .catch(() => setError('Fehler bei der Bildanalyse.'))
  }, [sessionId])

  return (
    <div className="container">
      <div className="steps">
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step active">2</div>
        <div className="step-line" />
        <div className="step">3</div>
        <div className="step-line" />
        <div className="step">4</div>
        <div className="step-line" />
        <div className="step">5</div>
      </div>

      <h1>Bildanalyse</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {!analysis && !error && (
        <div className="card">
          <div className="loading-box">
            <div className="spinner" />
            <p style={{ marginBottom: 0 }}>Fotos werden analysiert…</p>
          </div>
        </div>
      )}

      {analysis && (
        <>
          <div className="card">
            <h2>Erkannter Gegenstand</h2>
            <div className="info-row">
              <span className="info-label">Objekt</span>
              <span className="info-value">{analysis.object}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Zustand</span>
              <span className="info-value">{analysis.condition}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Kategorie</span>
              <span className="info-value">{analysis.category}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Titel-Entwurf</span>
              <span className="info-value">{analysis.titleDraft}</span>
            </div>
          </div>
          <div className="card">
            <h2>Beschreibungs-Entwurf</h2>
            <p style={{ marginBottom: 0 }}>{analysis.descriptionDraft}</p>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => router.push(`/session/${sessionId}/questions`)}
          >
            Weiter →
          </button>
        </>
      )}
    </div>
  )
}

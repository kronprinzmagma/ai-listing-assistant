'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Question } from '@/types/session'

export default function QuestionsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setQuestions(data.questions)
        setLoading(false)
      })
      .catch(() => { setError('Fehler beim Laden der Fragen.'); setLoading(false) })
  }, [sessionId])

  const handleSubmit = async () => {
    setSubmitting(true)
    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answers }),
    })
    if (res.ok) {
      router.push(`/session/${sessionId}/listing`)
    } else {
      setError('Fehler beim Speichern der Antworten.')
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <div className="steps">
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step done">✓</div>
        <div className="step-line done" />
        <div className="step active">3</div>
        <div className="step-line" />
        <div className="step">4</div>
        <div className="step-line" />
        <div className="step">5</div>
      </div>

      <h1>Rückfragen</h1>
      <p>Beantworte die folgenden Fragen, damit das Inserat vollständig wird.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="card">
          <div className="loading-box">
            <div className="spinner" />
            <p style={{ marginBottom: 0 }}>Fragen werden generiert…</p>
          </div>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="card">
          {questions.map((q, i) => (
            <div key={q.id} className="field-group">
              <label>{i + 1}. {q.text}</label>
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Deine Antwort…"
              />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Wird gespeichert…' : 'Inserat erstellen →'}
        </button>
      )}
    </div>
  )
}

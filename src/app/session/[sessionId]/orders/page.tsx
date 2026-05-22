'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { RicardoOrder } from '../../../../packages/ricardo-mcp/src/schemas/ricardo'

export default function OrdersPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [orders, setOrders] = useState<RicardoOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/orders?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders)
        setLoading(false)
      })
      .catch(() => {
        setError('Bestellungen konnten nicht geladen werden.')
        setLoading(false)
      })
  }, [sessionId])

  return (
    <div className="container">
      <h1>Bestellungen</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {loading && (
        <div className="card">
          <div className="loading-box"><div className="spinner" /></div>
        </div>
      )}
      {!loading && !error && (
        <div className="card">
          {orders.length === 0 ? (
            <p>Keine offenen Bestellungen.</p>
          ) : (
            <ul>
              {orders.map((order) => (
                <li key={order.id}>{order.id}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Link href={`/session/${sessionId}/review`} className="btn btn-secondary">
          Zurück zum Inserat
        </Link>
        <Link href="/" className="btn btn-secondary">Neues Inserat</Link>
      </div>
    </div>
  )
}

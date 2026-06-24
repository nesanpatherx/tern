'use client'

import { useState } from 'react'

export default function PipedriveRefreshButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<{ name: string; status: string; mqls?: number; sqls?: number; pipeline?: number }[]>([])

  const refresh = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/pipedrive-refresh', { method: 'POST' })
      const data = await res.json()
      if (data.results) {
        setResults(data.results)
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={refresh}
        disabled={state === 'loading'}
        className="px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {state === 'loading' ? 'Refreshing…' : state === 'done' ? 'Pipedrive ✓' : 'Refresh Pipedrive'}
      </button>

      {state === 'done' && results.length > 0 && (
        <div
          className="absolute right-0 top-9 z-50 p-3 text-xs space-y-1 min-w-[220px]"
          style={{ background: '#1a1a18', border: '1px solid #4a4a48' }}
        >
          {results.map(r => (
            <div key={r.name} className="flex justify-between gap-4">
              <span style={{ color: '#999' }}>{r.name}</span>
              <span style={{ color: r.status === 'ok' ? '#22c55e' : '#eb5c32' }}>
                {r.status === 'ok' ? `${r.mqls} open · £${(r.pipeline ?? 0).toLocaleString()}` : r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

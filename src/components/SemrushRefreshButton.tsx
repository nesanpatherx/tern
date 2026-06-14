'use client'

import { useState } from 'react'

type Result = { name: string; domain: string; status: string }

export default function SemrushRefreshButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<Result[]>([])
  const [summary, setSummary] = useState('')

  const handleRefresh = async () => {
    setState('loading')
    setResults([])
    setSummary('')

    try {
      const res = await fetch('/api/semrush-refresh', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setState('error')
        setSummary(data.error ?? 'Unknown error')
        return
      }

      setState('done')
      setSummary(`${data.refreshed} / ${data.total} companies updated`)
      setResults(data.results ?? [])

      // Reload the page after 2s so the table shows fresh data
      setTimeout(() => window.location.reload(), 2000)
    } catch (e) {
      setState('error')
      setSummary(String(e))
    }
  }

  return (
    <div>
      <button
        onClick={handleRefresh}
        disabled={state === 'loading'}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        style={{
          background: state === 'done' ? '#22c55e' : '#1a1a18',
          color: '#ffffff',
          border: '1px solid transparent',
        }}
      >
        {state === 'loading' && (
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {state === 'idle' && 'Refresh SEMrush'}
        {state === 'loading' && 'Fetching…'}
        {state === 'done' && '✓ Done'}
        {state === 'error' && 'Error — retry'}
      </button>

      {summary && (
        <div
          className="mt-2 text-xs px-3 py-2"
          style={{
            background: state === 'error' ? '#fff8f5' : '#f7f4f0',
            color: state === 'error' ? '#eb5c32' : '#4a4a48',
            border: '1px solid #d9d9d9',
          }}
        >
          {summary}
          {results.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {results.map(r => (
                <li key={r.domain} className="flex gap-2">
                  <span style={{ color: r.status === 'ok' ? '#22c55e' : '#eb5c32' }}>
                    {r.status === 'ok' ? '✓' : '✗'}
                  </span>
                  <span>{r.name}</span>
                  {r.status !== 'ok' && <span style={{ color: '#999' }}>{r.status}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

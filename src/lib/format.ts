export function fmtNum(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return Math.round(n).toLocaleString()
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  return `${(n * 100).toFixed(1)}%`
}

export function fmtPos(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  return n.toFixed(1)
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  } catch {
    return d
  }
}

export function authorityColor(score: number | null | undefined): string {
  if (!score) return 'text-slate-400'
  if (score >= 50) return 'text-emerald-600 font-semibold'
  if (score >= 30) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

export function positionColor(pos: number | null | undefined): string {
  if (!pos) return 'text-slate-400'
  if (pos <= 10) return 'text-emerald-600 font-semibold'
  if (pos <= 20) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

export function ctrColor(ctr: number | null | undefined): string {
  if (!ctr) return 'text-slate-400'
  if (ctr >= 0.05) return 'text-emerald-600 font-semibold'
  if (ctr >= 0.02) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

export function fmtCurrency(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}K`
  return `£${Math.round(n).toLocaleString()}`
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

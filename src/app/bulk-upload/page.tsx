export const dynamic = 'force-dynamic'

import BulkUploadForm from '@/components/BulkUploadForm'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function getPortcos() {
  if (!supabase) return []
  const { data } = await supabase.from('portcos').select('id, name, domain').order('sort_order', { ascending: true }).order('name')
  return data ?? []
}

export default async function BulkUploadPage() {
  const portcos = await getPortcos()

  return (
    <div className="min-h-screen" style={{ background: '#f7f4f0' }}>
      <header
        className="px-6 flex items-center justify-between h-14 sticky top-0 z-10"
        style={{ background: '#1a1a18', borderBottom: '2px solid #eb5c32' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base leading-none select-none">
            <span style={{ color: '#eb5c32', fontWeight: 600 }}>Tern</span>
            <span style={{ color: '#ffffff', fontWeight: 300 }}>Capital</span>
          </span>
          <span className="text-xs hidden sm:inline" style={{ color: '#999999', borderLeft: '1px solid #4a4a48', paddingLeft: '12px' }}>
            Bulk upload
          </span>
        </div>
        <Link
          href="/"
          className="px-4 py-1.5 text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          ← Back to dashboard
        </Link>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: '#1a1a18' }}>Bulk upload</h1>
          <p className="text-sm mt-1" style={{ color: '#999999' }}>
            Drop all your CSVs at once — we'll auto-detect the source type and match each file to the right company.
          </p>
        </div>

        <BulkUploadForm portcos={portcos} />
      </main>
    </div>
  )
}

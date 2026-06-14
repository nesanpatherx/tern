import { Suspense } from 'react'
import Link from 'next/link'
import UploadForm from '@/components/UploadForm'

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#0D1B2A] font-bold text-sm">T</span>
          </div>
          <div>
            <div className="font-semibold text-lg leading-tight">Tern Capital</div>
            <div className="text-slate-400 text-xs">Upload Data</div>
          </div>
        </div>
        <Link
          href="/"
          className="text-slate-300 hover:text-white text-sm transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Upload Metrics Data</h1>
          <p className="text-sm text-slate-500 mb-6">
            Select a portfolio company and data source, then upload the exported CSV file.
          </p>
          <Suspense>
            <UploadForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

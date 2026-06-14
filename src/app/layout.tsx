import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Tern Capital — Portfolio Dashboard',
  description: 'Digital metrics dashboard for Tern Capital portfolio companies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} min-h-screen`} style={{ background: '#f7f4f0', color: '#1a1a18' }}>
        {children}
      </body>
    </html>
  )
}

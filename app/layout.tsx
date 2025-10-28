import './globals.css'
import type { Metadata } from 'next'
import GoogleOneTap from '@/components/GoogleOneTap'
import { inter } from './fonts'

export const metadata: Metadata = {
  title: 'BelleRouges',
  // Optional: set metadataBase if relative URLs ever get used elsewhere
  // metadataBase: new URL('https://www.bellerouges.com'),
  manifest: '/my-favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/my-favicon/favicon-16x16.png?v=3', sizes: '16x16', type: 'image/png' },
      { url: '/my-favicon/favicon-32x32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/my-favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/my-favicon/favicon.ico' },
    ],
    apple: [{ url: '/my-favicon/apple-touch-icon.png', sizes: '180x180' }],
    // shortcut: ['/my-favicon/favicon.ico'], // ← remove this to avoid emitting it first
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head />
      <body className={`${inter.className} bg-[var(--oyster)]`}>
        <GoogleOneTap />
        {children}
      </body>
    </html>
  )
}

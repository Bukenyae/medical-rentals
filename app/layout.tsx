import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import GoogleOneTap from '@/components/GoogleOneTap'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BelleRouges',
  // Optional: set metadataBase if relative URLs ever get used elsewhere
  // metadataBase: new URL('https://www.bellerouges.com'),
  manifest: '/my-favicon/site.webmanifest',
  icons: {
    // Put tiny sizes first for best tab legibility
    icon: [
      { url: '/my-favicon/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/my-favicon/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/my-favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/my-favicon/favicon.ico' }, // keep one .ico ref only
    ],
    apple: [{ url: '/my-favicon/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/my-favicon/favicon.ico'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoogleOneTap />
        {children}
      </body>
    </html>
  )
}

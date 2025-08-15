import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import GoogleOneTap from '@/components/GoogleOneTap'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BelleRouges',
  manifest: '/my-favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/my-favicon/favicon.ico' },
      { url: '/my-favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/my-favicon/favicon.svg', type: 'image/svg+xml' },
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

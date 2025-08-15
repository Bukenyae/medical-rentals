import './globals.css'
import { Inter } from 'next/font/google'
import GoogleOneTap from '@/components/GoogleOneTap'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Belle Rouge Properties',
  description: 'Flexible short-term rentals for medical staff, academics, military members, students, and young professionals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="msapplication-TileColor" content="#0A0A0A" />
        <meta name="msapplication-config" content="/my-favicon/browserconfig.xml" />
        <link rel="mask-icon" href="/my-favicon/safari-pinned-tab.svg" color="#0A0A0A" />
      </head>
      <body className={inter.className}>
        <GoogleOneTap />
        {children}
      </body>
    </html>
  )
}
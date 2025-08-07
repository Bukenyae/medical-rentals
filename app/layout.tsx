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
      <body className={inter.className}>
        <GoogleOneTap />
        {children}
      </body>
    </html>
  )
}
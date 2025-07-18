import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/hooks/useAuth'
import Script from 'next/script'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Optimize font loading
  preload: true,
})

export const metadata = {
  title: 'Medical Rental Property Platform',
  description: 'Comprehensive platform for managing short-term rental properties near medical facilities',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=1, user-scalable=yes, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Medical Rentals',
  },
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
    url: true,
  },
  applicationName: 'Medical Rentals',
  referrer: 'origin-when-cross-origin',
  keywords: ['medical rentals', 'short-term rentals', 'hospital proximity', 'medical travel'],
  authors: [{ name: 'Medical Rentals Team' }],
  colorScheme: 'light',
  creator: 'Medical Rentals',
  publisher: 'Medical Rentals',
  metadataBase: new URL('https://medical-rentals.example.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
    },
  },
  openGraph: {
    title: 'Medical Rental Property Platform',
    description: 'Comprehensive platform for managing short-term rental properties near medical facilities',
    url: 'https://medical-rentals.example.com',
    siteName: 'Medical Rentals',
    images: [
      {
        url: '/icons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Medical Rentals Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
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
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('Service Worker registration successful with scope: ', registration.scope);
                      
                      // Check for updates on page load
                      registration.addEventListener('updatefound', function() {
                        // An updated service worker has appeared in registration.installing!
                        const newWorker = registration.installing;
                        
                        newWorker.addEventListener('statechange', function() {
                          // Has service worker state changed?
                          if (newWorker.state === 'installed') {
                            // There is a new service worker available, show the notification
                            if (navigator.serviceWorker.controller) {
                              console.log('New content is available; please refresh.');
                              // Optional: Show a toast notification to inform the user
                              if ('Notification' in window && Notification.permission === 'granted') {
                                navigator.serviceWorker.ready.then(registration => {
                                  registration.showNotification('Medical Rentals', {
                                    body: 'New content is available. Click to refresh.',
                                    icon: '/icons/icon-192x192.png',
                                    badge: '/icons/icon-192x192.png',
                                    data: { url: window.location.href },
                                    requireInteraction: true
                                  });
                                });
                              }
                            } else {
                              // At this point, everything has been precached.
                              console.log('Content is cached for offline use.');
                            }
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.error('Service Worker registration failed: ', err);
                    });
                    
                  // Handle service worker updates
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    console.log('Controller changed - reloading content');
                  });
                  
                  // Request notification permission for better offline experience
                  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    // Wait for user interaction before requesting permission
                    window.addEventListener('click', function requestNotificationPermission() {
                      Notification.requestPermission();
                      window.removeEventListener('click', requestNotificationPermission);
                    }, { once: true });
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
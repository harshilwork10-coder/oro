import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
    title: 'Oro Buddy - Discover Local Deals',
    description: 'Find deals at restaurants, retail stores, and salons near you',
    manifest: '/app/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Oro Buddy'
    }
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0a0a0a'
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="apple-touch-icon" href="/app/icon-192.png" />
            </head>
            <body className="bg-stone-950 text-white antialiased">
                {children}
            </body>
        </html>
    )
}


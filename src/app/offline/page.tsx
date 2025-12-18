'use client'

import Link from 'next/link'
import { WifiOff, RefreshCw, Home } from 'lucide-react'

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
                    <WifiOff className="w-12 h-12 text-gray-500" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-3">
                    You're Offline
                </h1>

                <p className="text-gray-400 mb-8">
                    It looks like you've lost your internet connection.
                    Some features may not be available until you're back online.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>

                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Go to Dashboard
                    </Link>
                </div>

                <p className="text-gray-500 text-sm mt-8">
                    Oro will automatically reconnect when your connection is restored.
                </p>
            </div>
        </div>
    )
}

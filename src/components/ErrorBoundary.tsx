'use client'

/**
 * Global Error Boundary — Catches React render crashes
 *
 * Instead of a white screen, shows a recovery UI.
 * Logs errors for debugging.
 *
 * Usage in layout.tsx:
 *   <ErrorBoundary><YourApp /></ErrorBoundary>
 */

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo })
        // Log to console (in production, send to error tracking service)
        console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-8 max-w-md w-full text-center">
                        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-stone-400 text-sm mb-6">
                            An unexpected error occurred. Your data is safe.
                        </p>

                        {/* Error details (collapsed) */}
                        {this.state.error && (
                            <details className="text-left mb-6 bg-stone-800 rounded-xl p-3">
                                <summary className="text-xs text-stone-500 cursor-pointer flex items-center gap-1">
                                    <Bug className="h-3 w-3" /> Error Details
                                </summary>
                                <pre className="text-xs text-red-400 mt-2 overflow-x-auto whitespace-pre-wrap">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    this.setState({ hasError: false, error: null, errorInfo: null })
                                    window.location.reload()
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium"
                            >
                                <RefreshCw className="h-4 w-4" /> Reload
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium"
                            >
                                <Home className="h-4 w-4" /> Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Page-level error fallback — lighter weight for individual pages
 */
export function PageErrorFallback({ error, reset }: { error: string; reset: () => void }) {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                <p className="text-stone-400 text-sm mb-4">{error || 'Failed to load data'}</p>
                <button onClick={reset} className="px-4 py-2 bg-blue-600 rounded-xl text-sm hover:bg-blue-500">
                    <RefreshCw className="h-3 w-3 inline mr-1" /> Try Again
                </button>
            </div>
        </div>
    )
}

export default ErrorBoundary

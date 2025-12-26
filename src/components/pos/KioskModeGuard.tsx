'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { Maximize, Download, Lock, Eye, EyeOff, X } from 'lucide-react'

interface KioskModeGuardProps {
    children: ReactNode
    onExitRequested?: () => void
}

/**
 * KioskModeGuard - Wraps POS in fullscreen kiosk mode
 * 
 * Features:
 * - Auto-enters fullscreen on first interaction
 * - Shows Install App button for PWA installation
 * - Requires owner PIN to exit fullscreen
 * - Blocks Escape key and shows PIN prompt instead
 */
export default function KioskModeGuard({ children, onExitRequested }: KioskModeGuardProps) {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showInstallBanner, setShowInstallBanner] = useState(false)
    const [installPrompt, setInstallPrompt] = useState<any>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [exitPin, setExitPin] = useState('')
    const [pinError, setPinError] = useState('')
    const [showPin, setShowPin] = useState(false)
    const [verifying, setVerifying] = useState(false)

    // Check if in standalone mode (PWA)
    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
        }

        // Listen for fullscreen changes
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // PWA install prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e)
            setShowInstallBanner(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [])

    // Block Escape key when in fullscreen - show PIN modal instead
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                e.preventDefault()
                e.stopPropagation()
                setShowExitModal(true)
            }
            // Also block F11 unless PIN verified
            if (e.key === 'F11') {
                e.preventDefault()
                setShowExitModal(true)
            }
        }

        document.addEventListener('keydown', handleKeyDown, true)
        return () => document.removeEventListener('keydown', handleKeyDown, true)
    }, [isFullscreen])

    // Enter fullscreen
    const enterFullscreen = useCallback(async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen()
            }
        } catch (err) {
            console.error('Fullscreen failed:', err)
        }
    }, [])

    // Exit fullscreen (only after PIN verified)
    const exitFullscreen = useCallback(async () => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen()
            }
        } catch (err) {
            console.error('Exit fullscreen failed:', err)
        }
    }, [])

    // Verify owner PIN to exit
    const handleVerifyPin = async () => {
        if (!exitPin || exitPin.length < 4) {
            setPinError('PIN must be at least 4 digits')
            return
        }

        setVerifying(true)
        setPinError('')

        try {
            // Verify PIN against owner/manager credentials
            const res = await fetch('/api/pos/verify-owner-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: exitPin })
            })

            const data = await res.json()

            if (data.success) {
                setShowExitModal(false)
                setExitPin('')
                await exitFullscreen()
                onExitRequested?.()
            } else {
                setPinError(data.error || 'Invalid PIN')
            }
        } catch (err) {
            setPinError('Verification failed')
        } finally {
            setVerifying(false)
        }
    }

    // Install PWA
    const handleInstall = async () => {
        if (!installPrompt) {
            alert('To install: Tap Share (iOS) or Menu → Install App (Android/Chrome)')
            return
        }
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setIsInstalled(true)
            setShowInstallBanner(false)
            setInstallPrompt(null)
        }
    }

    return (
        <div className="relative">
            {/* Fullscreen Prompt Banner - shown when not fullscreen */}
            {!isFullscreen && !isInstalled && (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2 px-4 z-[200] flex items-center justify-center gap-4">
                    <span className="text-sm font-medium">
                        📺 For best experience, use fullscreen mode
                    </span>
                    <button
                        onClick={enterFullscreen}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Maximize className="w-4 h-4" />
                        Go Fullscreen
                    </button>
                    {!isInstalled && installPrompt && (
                        <button
                            onClick={handleInstall}
                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Install App
                        </button>
                    )}
                </div>
            )}

            {/* Install Banner (when in fullscreen but not installed) */}
            {isFullscreen && showInstallBanner && !isInstalled && (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2 px-4 z-[200] flex items-center justify-center gap-4">
                    <span className="text-sm font-medium">
                        📲 Install as app for offline access
                    </span>
                    <button
                        onClick={handleInstall}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Install Now
                    </button>
                    <button
                        onClick={() => setShowInstallBanner(false)}
                        className="p-1 hover:bg-white/20 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Fullscreen Lock Indicator */}
            {isFullscreen && (
                <div className="fixed bottom-4 right-4 z-[200] flex items-center gap-2 bg-stone-800/90 backdrop-blur-sm text-stone-400 px-3 py-1.5 rounded-full text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Kiosk Mode</span>
                </div>
            )}

            {/* Exit Fullscreen PIN Modal */}
            {showExitModal && (
                <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-orange-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Exit Kiosk Mode</h2>
                            <p className="text-stone-400 mt-2 text-sm">
                                Enter owner, manager, or support PIN to exit fullscreen
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    value={exitPin}
                                    onChange={(e) => {
                                        setExitPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                                        setPinError('')
                                    }}
                                    placeholder="Enter PIN"
                                    autoFocus
                                    className="w-full px-4 py-4 bg-stone-800 border border-stone-600 rounded-xl text-white text-center text-2xl tracking-widest font-mono placeholder:text-stone-500 placeholder:text-base placeholder:tracking-normal focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleVerifyPin()
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-white"
                                >
                                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {pinError && (
                                <p className="text-red-400 text-sm text-center">{pinError}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowExitModal(false)
                                        setExitPin('')
                                        setPinError('')
                                    }}
                                    className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerifyPin}
                                    disabled={verifying || exitPin.length < 4}
                                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 disabled:text-stone-400 text-white rounded-xl font-medium transition-colors"
                                >
                                    {verifying ? 'Verifying...' : 'Exit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className={!isFullscreen && !isInstalled ? 'pt-12' : ''}>
                {children}
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Check } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    prompt(): Promise<void>
}

declare global {
    interface WindowEventMap {
        'beforeinstallprompt': BeforeInstallPromptEvent
    }
}

export default function PWAInstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        // Check if dismissed before
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (dismissed) {
            const dismissedDate = new Date(dismissed)
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSinceDismissed < 7) return // Don't show for 7 days
        }

        // Check iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
        setIsIOS(isIOSDevice)

        // Listen for the beforeinstallprompt event (Chrome/Edge/Android)
        const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)

        // For iOS, show prompt after a short delay if not installed
        if (isIOSDevice) {
            setTimeout(() => setShowPrompt(true), 2000)
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        }
    }, [])

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt()
            const result = await deferredPrompt.userChoice
            if (result.outcome === 'accepted') {
                setShowPrompt(false)
                setIsInstalled(true)
            }
            setDeferredPrompt(null)
        }
    }

    const handleDismiss = () => {
        setShowPrompt(false)
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    }

    if (!showPrompt || isInstalled) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white relative">
                    <button
                        onClick={handleDismiss}
                        className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Install App</h2>
                            <p className="text-white/80 text-sm">Quick access from your home screen</p>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="p-6">
                    <div className="space-y-3 mb-6">
                        {[
                            'Works offline',
                            'Faster loading',
                            'Push notifications',
                            'Full-screen experience'
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-gray-700">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    {isIOS ? (
                        // iOS Instructions
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                                <strong>To install on iPhone/iPad:</strong>
                            </p>
                            <ol className="text-sm text-gray-600 space-y-2">
                                <li>1. Tap the <strong>Share</strong> button (□↑) at the bottom</li>
                                <li>2. Scroll and tap <strong>"Add to Home Screen"</strong></li>
                                <li>3. Tap <strong>"Add"</strong> in the top right</li>
                            </ol>
                        </div>
                    ) : (
                        // Android/Chrome Install Button
                        <button
                            onClick={handleInstall}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                        >
                            <Download className="w-5 h-5" />
                            Install Now
                        </button>
                    )}

                    <button
                        onClick={handleDismiss}
                        className="w-full mt-3 py-3 text-gray-500 text-sm hover:text-gray-700"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    )
}

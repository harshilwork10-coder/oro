'use client'

import { useState, useEffect } from 'react'
import { MapPin, Tag, Store, User, Search, Navigation, Loader2, X, Share, Plus } from 'lucide-react'
import Link from 'next/link'

interface StoreData {
    id: string
    name: string
    description: string | null
    address: string | null
    type: string
    distance: number | null
    logo: string | null
    dealsCount: number
}

interface Deal {
    id: string
    name: string
    discountType: string
    discountValue: number
    store: {
        id: string
        name: string
        type: string
        logo: string | null
        distance: number | null
    }
}

export default function OroPlus() {
    const [activeTab, setActiveTab] = useState<'discover' | 'deals'>('discover')
    const [stores, setStores] = useState<StoreData[]>([])
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // PWA Install Prompt
    const [showInstallBanner, setShowInstallBanner] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    // Check if already installed or should show install banner
    useEffect(() => {
        // Check if already installed as PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        setIsInstalled(isStandalone)

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        setIsIOS(iOS)

        // Check if dismissed before
        const dismissed = localStorage.getItem('oro_install_dismissed')

        // Show banner if not installed and not dismissed
        if (!isStandalone && !dismissed) {
            setTimeout(() => setShowInstallBanner(true), 3000) // Show after 3 seconds
        }

        // Listen for Android/Chrome install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowInstallBanner(true)
        })
    }, [])

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setShowInstallBanner(false)
            }
            setDeferredPrompt(null)
        }
    }

    const dismissBanner = () => {
        setShowInstallBanner(false)
        localStorage.setItem('oro_install_dismissed', 'true')
    }

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => // Debug log removed
            )
        }
    }, [])

    // Fetch stores and deals
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const params = location ? `?lat=${location.lat}&lng=${location.lng}` : ''

                const [storesRes, dealsRes] = await Promise.all([
                    fetch(`/api/public/stores${params}`),
                    fetch(`/api/public/deals${params}`)
                ])

                if (storesRes.ok) {
                    const data = await storesRes.json()
                    setStores(data.stores || [])
                }
                if (dealsRes.ok) {
                    const data = await dealsRes.json()
                    setDeals(data.deals || [])
                }
            } catch (e) {
                console.error('Error fetching data:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [location])

    const getTypeEmoji = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'RESTAURANT': return '🍽️'
            case 'RETAIL': return '🛒'
            case 'SALON': return '💇'
            case 'GROCERY': return '🥬'
            case 'CONVENIENCE': return '🏪'
            default: return '🏬'
        }
    }

    const filteredStores = stores.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.type?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-950 flex flex-col">
            {/* Install App Banner */}
            {showInstallBanner && !isInstalled && (
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top">
                    <div className="flex-1">
                        <p className="text-white font-semibold text-sm">📱 Add Oro Buddy to your phone!</p>
                        {isIOS ? (
                            <p className="text-orange-100 text-xs flex items-center gap-1">
                                Tap <Share className="w-3 h-3 inline" /> then "Add to Home Screen"
                            </p>
                        ) : (
                            <p className="text-orange-100 text-xs">Install for quick access to deals</p>
                        )}
                    </div>
                    {!isIOS && deferredPrompt && (
                        <button
                            onClick={handleInstall}
                            className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold text-sm flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Install
                        </button>
                    )}
                    <button onClick={dismissBanner} className="p-1 text-white/70 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 bg-stone-900/95 backdrop-blur-sm border-b border-stone-800 px-4 py-3 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">O</span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">Oro Buddy</h1>
                        <p className="text-xs text-stone-400">
                            {location ? '📍 Near you' : 'Discover local deals'}
                        </p>
                    </div>
                    {!location && (
                        <button
                            onClick={() => navigator.geolocation?.getCurrentPosition(
                                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                            )}
                            className="p-2 rounded-lg bg-stone-800 text-orange-400"
                        >
                            <Navigation className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search stores or categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                        <p className="text-stone-400">Finding stores near you...</p>
                    </div>
                ) : activeTab === 'discover' ? (
                    /* Stores Tab */
                    <div className="p-4 space-y-3">
                        {filteredStores.length === 0 ? (
                            <div className="text-center py-16">
                                <Store className="w-16 h-16 mx-auto text-stone-700 mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">No stores yet</h2>
                                <p className="text-stone-400">Be the first store in your area!</p>
                            </div>
                        ) : (
                            filteredStores.map(store => (
                                <Link
                                    key={store.id}
                                    href={`/app/store/${store.id}`}
                                    className="block bg-stone-800/50 rounded-xl p-4 border border-stone-700 hover:border-orange-500/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        {store.logo ? (
                                            <img src={store.logo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-stone-700 flex items-center justify-center text-2xl">
                                                {getTypeEmoji(store.type)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">{store.name}</h3>
                                            <p className="text-sm text-stone-400 truncate">{store.address || 'Address not available'}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-700 text-stone-300">
                                                    {getTypeEmoji(store.type)} {store.type}
                                                </span>
                                                {store.dealsCount > 0 && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                                        🏷️ {store.dealsCount} deal{store.dealsCount > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {store.distance !== null && (
                                            <div className="text-right">
                                                <span className="text-orange-400 font-semibold">{store.distance}</span>
                                                <span className="text-stone-500 text-xs"> mi</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                ) : (
                    /* Deals Tab */
                    <div className="p-4 space-y-3">
                        {deals.length === 0 ? (
                            <div className="text-center py-16">
                                <Tag className="w-16 h-16 mx-auto text-stone-700 mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">No deals available</h2>
                                <p className="text-stone-400">Check back soon for offers!</p>
                            </div>
                        ) : (
                            deals.map(deal => (
                                <div
                                    key={deal.id}
                                    className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-xl p-4 border border-green-500/30"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            {deal.store.logo ? (
                                                <img src={deal.store.logo} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-stone-700 flex items-center justify-center text-xl">
                                                    {getTypeEmoji(deal.store.type)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm text-stone-400">{deal.store.name}</p>
                                                <h3 className="font-semibold text-white">{deal.name}</h3>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-block px-3 py-1 rounded-full bg-green-500 text-white font-bold text-sm">
                                                {deal.discountValue}% OFF
                                            </div>
                                            {deal.store.distance !== null && (
                                                <p className="text-xs text-stone-500 mt-1">{deal.store.distance} mi</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 px-6 py-2 safe-area-bottom">
                <div className="flex justify-around">
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${activeTab === 'discover' ? 'text-orange-400' : 'text-stone-500'
                            }`}
                    >
                        <MapPin className="w-6 h-6" />
                        <span className="text-xs mt-1">Discover</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('deals')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${activeTab === 'deals' ? 'text-orange-400' : 'text-stone-500'
                            }`}
                    >
                        <Tag className="w-6 h-6" />
                        <span className="text-xs mt-1">Deals</span>
                    </button>
                    <Link
                        href="/app/favorites"
                        className="flex flex-col items-center py-2 px-4 rounded-xl text-stone-500"
                    >
                        <Store className="w-6 h-6" />
                        <span className="text-xs mt-1">Saved</span>
                    </Link>
                    <Link
                        href="/app/profile"
                        className="flex flex-col items-center py-2 px-4 rounded-xl text-stone-500"
                    >
                        <User className="w-6 h-6" />
                        <span className="text-xs mt-1">Me</span>
                    </Link>
                </div>
            </nav>
        </div>
    )
}


'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Clock, Tag, ExternalLink, Share, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface StoreDetail {
    id: string
    name: string
    description: string | null
    phone: string | null
    address: string | null
    type: string
    hours: Record<string, string> | null
    logo: string | null
    banner: string | null
    latitude: number | null
    longitude: number | null
}

interface Deal {
    id: string
    name: string
    description: string | null
    discountType: string
    discountValue: number
    endDate: string | null
    products: { name: string; originalPrice: number; salePrice: number }[]
}

export default function StorePage() {
    const params = useParams()
    const [store, setStore] = useState<StoreDetail | null>(null)
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStore = async () => {
            try {
                // In real implementation, fetch from /api/public/stores/[id]
                // For now, we'll fetch from stores list and filter
                const res = await fetch(`/api/public/stores`)
                if (res.ok) {
                    const data = await res.json()
                    const foundStore = data.stores.find((s: any) => s.id === params.id)
                    if (foundStore) {
                        setStore(foundStore)
                    }
                }
            } catch (e) {
                console.error('Error fetching store:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchStore()
    }, [params.id])

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

    const openMaps = () => {
        if (store?.latitude && store?.longitude) {
            window.open(`https://maps.google.com/?q=${store.latitude},${store.longitude}`, '_blank')
        } else if (store?.address) {
            window.open(`https://maps.google.com/?q=${encodeURIComponent(store.address)}`, '_blank')
        }
    }

    const shareStore = async () => {
        if (navigator.share) {
            await navigator.share({
                title: store?.name,
                text: `Check out ${store?.name} on Oro Plus!`,
                url: window.location.href
            })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!store) {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6">
                <p className="text-white text-xl mb-4">Store not found</p>
                <Link href="/app" className="text-orange-400">← Back to app</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-950">
            {/* Header with Back Button */}
            <header className="sticky top-0 bg-stone-900/95 backdrop-blur-sm px-4 py-3 flex items-center gap-4 z-10 border-b border-stone-800">
                <Link href="/app" className="p-2 rounded-lg bg-stone-800">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </Link>
                <h1 className="text-lg font-semibold text-white truncate flex-1">{store.name}</h1>
                <button onClick={shareStore} className="p-2 rounded-lg bg-stone-800">
                    <Share className="w-5 h-5 text-white" />
                </button>
            </header>

            {/* Banner / Logo */}
            <div className="relative">
                {store.banner ? (
                    <img src={store.banner} alt="" className="w-full h-48 object-cover" />
                ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center">
                        {store.logo ? (
                            <img src={store.logo} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                        ) : (
                            <span className="text-6xl">{getTypeEmoji(store.type)}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Store Info */}
            <div className="p-4 space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-xs">
                            {getTypeEmoji(store.type)} {store.type}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{store.name}</h2>
                    {store.description && (
                        <p className="text-stone-400 mt-2">{store.description}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={openMaps}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-semibold"
                    >
                        <MapPin className="w-5 h-5" />
                        Directions
                    </button>
                    {store.phone && (
                        <a
                            href={`tel:${store.phone}`}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 text-white font-semibold"
                        >
                            <Phone className="w-5 h-5" />
                            Call
                        </a>
                    )}
                </div>

                {/* Address */}
                {store.address && (
                    <div className="flex items-start gap-3 p-4 bg-stone-800/50 rounded-xl">
                        <MapPin className="w-5 h-5 text-stone-400 mt-0.5" />
                        <div>
                            <p className="text-sm text-stone-400">Address</p>
                            <p className="text-white">{store.address}</p>
                        </div>
                    </div>
                )}

                {/* Hours */}
                {store.hours && (
                    <div className="p-4 bg-stone-800/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-5 h-5 text-stone-400" />
                            <p className="text-sm text-stone-400">Hours</p>
                        </div>
                        <div className="space-y-1">
                            {Object.entries(store.hours).map(([day, hours]) => (
                                <div key={day} className="flex justify-between text-sm">
                                    <span className="text-stone-400 capitalize">{day}</span>
                                    <span className="text-white">{hours}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Deals Section */}
                {deals.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-green-400" />
                            Current Deals
                        </h3>
                        <div className="space-y-3">
                            {deals.map(deal => (
                                <div
                                    key={deal.id}
                                    className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-xl p-4 border border-green-500/30"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-white">{deal.name}</h4>
                                        <span className="px-2 py-1 rounded-full bg-green-500 text-white text-sm font-bold">
                                            {deal.discountValue}% OFF
                                        </span>
                                    </div>
                                    {deal.description && (
                                        <p className="text-sm text-stone-400">{deal.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

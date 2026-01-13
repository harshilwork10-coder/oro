'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    Save,
    Check,
    Lock,
    Scissors,
    AlertCircle
} from 'lucide-react'

interface ServicePrice {
    id: string
    name: string
    category: string
    defaultPrice: number
    myPrice: number
    duration: number
}

export default function MyPricesPage() {
    const { data: session } = useSession()
    const [services, setServices] = useState<ServicePrice[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [canSetPrices, setCanSetPrices] = useState(true) // From user session

    useEffect(() => {
        fetchMyServices()
    }, [])

    const fetchMyServices = async () => {
        try {
            const res = await fetch('/api/employee/my-prices')
            if (res.ok) {
                const data = await res.json()
                setServices(data.services || [])
                setCanSetPrices(data.canSetPrices ?? true)
            }
        } catch (error) {
            console.error('Failed to fetch services:', error)
        } finally {
            setLoading(false)
        }
    }

    // Demo data
    useEffect(() => {
        if (services.length === 0 && !loading) {
            setServices([
                { id: '1', name: "Women's Haircut", category: 'Haircuts', defaultPrice: 65, myPrice: 75, duration: 45 },
                { id: '2', name: "Men's Haircut", category: 'Haircuts', defaultPrice: 35, myPrice: 40, duration: 30 },
                { id: '3', name: 'Full Color', category: 'Color', defaultPrice: 120, myPrice: 135, duration: 90 },
                { id: '4', name: 'Highlights', category: 'Color', defaultPrice: 150, myPrice: 165, duration: 120 },
                { id: '5', name: 'Blowout', category: 'Styling', defaultPrice: 45, myPrice: 50, duration: 30 },
                { id: '6', name: 'Updo/Special Event', category: 'Styling', defaultPrice: 85, myPrice: 95, duration: 60 },
            ])
        }
    }, [loading, services.length])

    const updatePrice = (id: string, newPrice: number) => {
        setServices(prev => prev.map(s =>
            s.id === id ? { ...s, myPrice: newPrice } : s
        ))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await fetch('/api/employee/my-prices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ services })
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (error) {
            console.error('Failed to save:', error)
        } finally {
            setSaving(false)
        }
    }

    // Group services by category
    const groupedServices = services.reduce((acc, service) => {
        if (!acc[service.category]) acc[service.category] = []
        acc[service.category].push(service)
        return acc
    }, {} as Record<string, ServicePrice[]>)

    if (!canSetPrices) {
        return (
            <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-gray-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Price Setting Not Available</h2>
                    <p className="text-gray-400">
                        Your compensation plan doesn't include custom pricing.
                        Contact your manager if you believe this is an error.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Prices</h1>
                    <p className="text-gray-400">
                        Set your custom service prices, {session?.user?.name || 'Stylist'}
                    </p>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-blue-300 font-medium">Booth Renter Pricing</p>
                        <p className="text-blue-200/70 text-sm">
                            As a booth renter, you can set your own prices. Default prices are shown for reference.
                        </p>
                    </div>
                </div>

                {/* Services by Category */}
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                    <div key={category} className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-orange-400" />
                            {category}
                        </h3>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                            {categoryServices.map((service, index) => (
                                <div
                                    key={service.id}
                                    className={`p-4 flex items-center justify-between ${index < categoryServices.length - 1 ? 'border-b border-gray-800' : ''
                                        }`}
                                >
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{service.name}</p>
                                        <p className="text-gray-500 text-sm">
                                            {service.duration} min • Default: ${service.defaultPrice}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-400" />
                                        <input
                                            type="number"
                                            value={service.myPrice}
                                            onChange={(e) => updatePrice(service.id, Number(e.target.value))}
                                            className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-right font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Save Button */}
                <div className="mt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${saved
                                ? 'bg-green-600 text-white'
                                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/25'
                            }`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : saved ? (
                            <>
                                <Check className="w-5 h-5" />
                                Prices Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save My Prices
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

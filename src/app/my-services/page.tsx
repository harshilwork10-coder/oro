'use client'

import { useState, useEffect } from 'react'
import { Scissors, DollarSign, Save, Plus, Trash2, Loader2, AlertCircle, Check } from 'lucide-react'

interface Service {
    id: string
    name: string
    description: string | null
    duration: number
    price: number
    category: string | null
}

interface EmployeeService {
    id: string
    serviceId: string
    serviceName: string
    description: string | null
    category: string
    basePrice: number
    baseDuration: number
    employeePrice: number
    employeeDuration: number
    isActive: boolean
}

export default function MyServicesPage() {
    const [allServices, setAllServices] = useState<Service[]>([])
    const [myServices, setMyServices] = useState<EmployeeService[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [canSetPrices, setCanSetPrices] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch all franchise services
            const servicesRes = await fetch('/api/services')
            const servicesData = await servicesRes.json()
            const services = servicesData.data || servicesData || []
            setAllServices(services)

            // Fetch employee's custom pricing
            const myServicesRes = await fetch('/api/employees/services')
            const myServicesData = await myServicesRes.json()

            if (myServicesData.error?.includes('not available for franchise')) {
                setCanSetPrices(false)
            } else {
                setMyServices(myServicesData.services || [])
            }
        } catch (err) {
            console.error('Failed to fetch services:', err)
            setError('Failed to load services')
        } finally {
            setLoading(false)
        }
    }

    const handleSetPrice = async (serviceId: string, price: string, duration?: string) => {
        setSaving(serviceId)
        setError(null)
        setSuccess(null)

        try {
            const res = await fetch('/api/employees/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId,
                    price: parseFloat(price),
                    duration: duration ? parseInt(duration) : null
                })
            })

            const data = await res.json()

            if (!res.ok) {
                if (data.error?.includes('not available for franchise')) {
                    setCanSetPrices(false)
                    setError('Per-barber pricing is not available for franchise locations.')
                } else {
                    setError(data.error || 'Failed to save price')
                }
                return
            }

            setSuccess(`Price saved for this service!`)
            await fetchData() // Refresh data
        } catch (err) {
            setError('Failed to save price')
        } finally {
            setSaving(null)
        }
    }

    const handleRemovePrice = async (serviceId: string) => {
        setSaving(serviceId)
        setError(null)

        try {
            await fetch('/api/employees/services', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceId })
            })

            setSuccess('Custom price removed. Using base price.')
            await fetchData()
        } catch (err) {
            setError('Failed to remove price')
        } finally {
            setSaving(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <div className="flex items-center gap-3 text-orange-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xl">Loading services...</span>
                </div>
            </div>
        )
    }

    // Get my prices as a map for easy lookup
    const myPricesMap = new Map(myServices.map(s => [s.serviceId, s]))

    // Group services by category
    const servicesByCategory = allServices.reduce((acc, service) => {
        const category = service.category || 'Uncategorized'
        if (!acc[category]) acc[category] = []
        acc[category].push(service)
        return acc
    }, {} as Record<string, Service[]>)

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Scissors className="h-8 w-8 text-orange-500" />
                        My Services & Prices
                    </h1>
                    <p className="text-stone-400 mt-2">
                        Set your own prices for services. Customers will see your prices when booking with you.
                    </p>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-400">
                        <Check className="h-5 w-5" />
                        {success}
                    </div>
                )}

                {/* Franchise restriction notice */}
                {!canSetPrices && (
                    <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-8">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-400">Franchise Pricing</h3>
                                <p className="text-stone-300 mt-1">
                                    Your location uses franchise-set pricing. Contact your owner to change service prices.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Services List */}
                {Object.entries(servicesByCategory).map(([category, services]) => (
                    <div key={category} className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                            {category}
                        </h2>

                        <div className="space-y-3">
                            {services.map(service => {
                                const myPrice = myPricesMap.get(service.id)
                                const hasCustomPrice = !!myPrice

                                return (
                                    <ServicePriceCard
                                        key={service.id}
                                        service={service}
                                        myPrice={myPrice}
                                        hasCustomPrice={hasCustomPrice}
                                        canSetPrices={canSetPrices}
                                        saving={saving === service.id}
                                        onSave={(price, duration) => handleSetPrice(service.id, price, duration)}
                                        onRemove={() => handleRemovePrice(service.id)}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}

                {allServices.length === 0 && (
                    <div className="text-center py-12 text-stone-500">
                        <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No services available yet.</p>
                        <p className="text-sm mt-2">Ask your owner to add services.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// Individual service card component
function ServicePriceCard({
    service,
    myPrice,
    hasCustomPrice,
    canSetPrices,
    saving,
    onSave,
    onRemove
}: {
    service: Service
    myPrice?: EmployeeService
    hasCustomPrice: boolean
    canSetPrices: boolean
    saving: boolean
    onSave: (price: string, duration?: string) => void
    onRemove: () => void
}) {
    const [editing, setEditing] = useState(false)
    const [price, setPrice] = useState(myPrice?.employeePrice?.toString() || service.price.toString())
    const [duration, setDuration] = useState(myPrice?.employeeDuration?.toString() || service.duration.toString())

    const handleSave = () => {
        onSave(price, duration)
        setEditing(false)
    }

    return (
        <div className={`p-4 rounded-xl border ${hasCustomPrice ? 'bg-orange-500/5 border-orange-500/30' : 'bg-stone-900/50 border-stone-800'}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{service.name}</h3>
                        {hasCustomPrice && (
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                                Custom Price
                            </span>
                        )}
                    </div>
                    {service.description && (
                        <p className="text-sm text-stone-500 mt-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-stone-400">
                        <span>Base: ${Number(service.price).toFixed(2)}</span>
                        <span>•</span>
                        <span>{service.duration} min</span>
                    </div>
                </div>

                {canSetPrices && (
                    <div className="flex items-center gap-3">
                        {editing ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-24 bg-stone-800 border border-stone-700 rounded-lg pl-7 pr-2 py-2 text-white text-sm"
                                            placeholder="Price"
                                        />
                                    </div>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-20 bg-stone-800 border border-stone-700 rounded-lg px-2 py-2 text-white text-sm"
                                        placeholder="Min"
                                    />
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="p-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg"
                                >
                                    ✕
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-emerald-400">
                                        ${Number(myPrice?.employeePrice || service.price).toFixed(2)}
                                    </div>
                                    {hasCustomPrice && (
                                        <div className="text-xs text-stone-500">Your price</div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setEditing(true)}
                                    className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg"
                                    title="Edit price"
                                >
                                    <DollarSign className="h-4 w-4" />
                                </button>
                                {hasCustomPrice && (
                                    <button
                                        onClick={onRemove}
                                        disabled={saving}
                                        className="p-2 bg-stone-800 hover:bg-red-500/20 text-stone-400 hover:text-red-400 rounded-lg"
                                        title="Use base price"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {!canSetPrices && (
                    <div className="text-xl font-bold text-emerald-400">
                        ${Number(service.price).toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    )
}

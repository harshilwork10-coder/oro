'use client'

import { useState, useEffect } from 'react'
import { X, Check, Search, DollarSign, Clock, Scissors } from 'lucide-react'

interface Service {
    id: string
    name: string
    price: number
    duration: number
    isAllowed: boolean
}

interface AssignServicesModalProps {
    isOpen: boolean
    onClose: () => void
    employeeId: string
    employeeName: string
}

export default function AssignServicesModal({
    isOpen,
    onClose,
    employeeId,
    employeeName
}: AssignServicesModalProps) {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [canSetOwnPrices, setCanSetOwnPrices] = useState(false)

    useEffect(() => {
        if (isOpen && employeeId) {
            fetchServices()
        }
    }, [isOpen, employeeId])

    const fetchServices = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/employees/${employeeId}/allowed-services`)
            if (res.ok) {
                const data = await res.json()
                setServices(data.services)
                setCanSetOwnPrices(data.canSetOwnPrices || false)
            }
        } catch (error) {
            console.error('Error fetching services:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleService = (serviceId: string) => {
        setServices(prev => prev.map(s =>
            s.id === serviceId ? { ...s, isAllowed: !s.isAllowed } : s
        ))
    }

    const selectAll = () => {
        setServices(prev => prev.map(s => ({ ...s, isAllowed: true })))
    }

    const deselectAll = () => {
        setServices(prev => prev.map(s => ({ ...s, isAllowed: false })))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const allowedServiceIds = services.filter(s => s.isAllowed).map(s => s.id)

            const res = await fetch(`/api/employees/${employeeId}/allowed-services`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceIds: allowedServiceIds,
                    canSetOwnPrices
                })
            })

            if (res.ok) {
                onClose()
            }
        } catch (error) {
            console.error('Error saving services:', error)
        } finally {
            setSaving(false)
        }
    }

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    )

    const allowedCount = services.filter(s => s.isAllowed).length

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-orange-400" />
                            Assign Services
                        </h2>
                        <p className="text-gray-400 text-sm">{employeeName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Search and Quick Actions */}
                <div className="p-4 border-b border-gray-800 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">
                            {allowedCount} of {services.length} selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={selectAll}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Select All
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                                onClick={deselectAll}
                                className="text-sm text-gray-400 hover:text-gray-300"
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Custom Pricing Toggle */}
                <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <p className="text-white text-sm font-medium">Allow Custom Pricing</p>
                            <p className="text-gray-400 text-xs">Let this barber set their own prices (commission or chair rental)</p>
                        </div>
                        <div
                            onClick={() => setCanSetOwnPrices(!canSetOwnPrices)}
                            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${canSetOwnPrices ? 'bg-green-500' : 'bg-gray-600'
                                }`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${canSetOwnPrices ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                        </div>
                    </label>
                </div>

                {/* Service List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            No services found
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredServices.map(service => (
                                <div
                                    key={service.id}
                                    onClick={() => toggleService(service.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${service.isAllowed
                                        ? 'bg-green-500/10 border border-green-500/30'
                                        : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${service.isAllowed
                                            ? 'bg-green-500'
                                            : 'border-2 border-gray-600'
                                            }`}>
                                            {service.isAllowed && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{service.name}</p>
                                            <div className="flex items-center gap-3 text-gray-500 text-xs">
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    ${service.price}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {service.duration} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Save Services
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

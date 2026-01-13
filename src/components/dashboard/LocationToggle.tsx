'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, Check, Loader2 } from 'lucide-react'

interface Location {
    id: string
    name: string
    slug?: string
}

export default function LocationToggle() {
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
    const [availableLocations, setAvailableLocations] = useState<Location[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchCurrentLocation()
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchCurrentLocation = async () => {
        try {
            const res = await fetch('/api/employees/current-location')
            const data = await res.json()
            setCurrentLocation(data.currentLocation)
            setAvailableLocations(data.availableLocations || [])
        } catch (error) {
            console.error('Failed to fetch location:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLocationChange = async (location: Location) => {
        if (location.id === currentLocation?.id) {
            setIsOpen(false)
            return
        }

        setUpdating(true)
        try {
            const res = await fetch('/api/employees/current-location', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId: location.id })
            })

            if (res.ok) {
                setCurrentLocation(location)
            }
        } catch (error) {
            console.error('Failed to update location:', error)
        } finally {
            setUpdating(false)
            setIsOpen(false)
        }
    }

    // Don't show if only one location or no locations
    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-400">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        )
    }

    if (availableLocations.length <= 1) {
        // Show single location or nothing if no locations
        if (availableLocations.length === 1) {
            return (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-300">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span>{availableLocations[0].name}</span>
                </div>
            )
        }
        return null
    }

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/50 hover:bg-stone-800 border border-stone-700 text-sm text-stone-300 transition-colors"
            >
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="max-w-[120px] truncate">
                    {currentLocation?.name || 'Select Location'}
                </span>
                {updating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-stone-700">
                        <p className="text-xs text-stone-500 uppercase tracking-wider">Working At</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {availableLocations.map(location => (
                            <button
                                key={location.id}
                                onClick={() => handleLocationChange(location)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors
                                    ${location.id === currentLocation?.id
                                        ? 'bg-orange-500/10 text-orange-400'
                                        : 'text-stone-300 hover:bg-stone-800'
                                    }`}
                            >
                                {location.id === currentLocation?.id && (
                                    <Check className="h-4 w-4 text-orange-500" />
                                )}
                                <span className={location.id === currentLocation?.id ? '' : 'pl-6'}>
                                    {location.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

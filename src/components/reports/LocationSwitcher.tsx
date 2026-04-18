'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2 } from 'lucide-react'

interface Location {
    id: string
    name: string
}

export function LocationSwitcher() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [locations, setLocations] = useState<Location[]>([])
    const [currentLocation, setCurrentLocation] = useState<string>(searchParams.get('locationId') || 'ALL')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadLocations = async () => {
            try {
                const res = await fetch('/api/franchisor/locations')
                if (res.ok) {
                    const data = await res.json()
                    const locs = Array.isArray(data) ? data : (data.locations || [])
                    setLocations(locs)
                }
            } catch (e) {
                console.error("Failed to load locations", e)
            } finally {
                setLoading(false)
            }
        }
        loadLocations()
    }, [])

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value
        setCurrentLocation(val)

        const params = new URLSearchParams(searchParams.toString())
        if (val === 'ALL') {
            params.delete('locationId')
        } else {
            params.set('locationId', val)
        }
        
        router.push(`?${params.toString()}`)
    }

    if (loading || locations.length <= 1) return null

    return (
        <div className="relative flex items-center bg-stone-900 border border-stone-800 rounded-lg overflow-hidden h-10 px-3">
            <Building2 className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
            <select
                value={currentLocation}
                onChange={handleSelect}
                className="bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-stone-200 cursor-pointer appearance-none pr-6 w-48"
            >
                <option value="ALL" className="bg-stone-900 text-stone-200">
                    All Locations (Consolidated)
                </option>
                {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-stone-900 text-stone-200">
                        {loc.name}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { MapPin, Users, DollarSign, TrendingUp, Building2 } from 'lucide-react'

type Location = {
    id: string
    name: string
    address: string | null
    franchise: {
        name: string
    }
    _count?: {
        users: number
    }
}

export default function MyLocationsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (session?.user?.role === 'FRANCHISEE') {
            fetchMyLocations()
        }
    }, [session])

    async function fetchMyLocations() {
        try {
            const res = await fetch('/api/franchisee/my-locations')
            if (res.ok) {
                const data = await res.json()
                setLocations(data)
            }
        } catch (error) {
            console.error('Error fetching locations:', error)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    if (session?.user?.role !== 'FRANCHISEE') {
        redirect('/dashboard')
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-orange-500" />
                    My Locations
                </h1>
                <p className="text-stone-400 mt-2">
                    Locations you own and operate under your franchise agreement.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Total Locations</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{locations.length}</p>
                        </div>
                        <div className="h-14 w-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Building2 className="h-7 w-7 text-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Total Employees</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">
                                {locations.reduce((sum, loc) => sum + (loc._count?.users || 0), 0)}
                            </p>
                        </div>
                        <div className="h-14 w-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Users className="h-7 w-7 text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Status</p>
                            <p className="text-xl font-bold text-emerald-400 mt-2">Active</p>
                        </div>
                        <div className="h-14 w-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <TrendingUp className="h-7 w-7 text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Locations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.length === 0 ? (
                    <div className="col-span-full glass-panel p-12 rounded-2xl text-center">
                        <MapPin className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400 font-medium">No locations assigned yet</p>
                        <p className="text-stone-500 text-sm mt-1">
                            Contact your franchisor to get started.
                        </p>
                    </div>
                ) : (
                    locations.map(location => (
                        <div
                            key={location.id}
                            className="glass-panel p-6 rounded-2xl hover:border-orange-500/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                    <MapPin className="h-6 w-6 text-orange-500" />
                                </div>
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded">
                                    Active
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-stone-100 mb-1 group-hover:text-orange-400 transition-colors">
                                {location.name}
                            </h3>
                            <p className="text-sm text-stone-400 mb-4">
                                {location.address || 'No address set'}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                                <span className="text-sm text-purple-400 font-medium">
                                    {location.franchise.name}
                                </span>
                                <span className="text-sm text-stone-400">
                                    {location._count?.users || 0} employees
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}


'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, MapPin, Check, Loader2, Save } from 'lucide-react'

interface PulseUser {
    id: string
    name: string
    email: string
    role: string
    hasPulseAccess: boolean
    pulseLocationIds: string[] | null
}

interface Location {
    id: string
    name: string
}

export default function PulseAccessSettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [users, setUsers] = useState<PulseUser[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [changes, setChanges] = useState<Record<string, string[] | null>>({})

    useEffect(() => {
        if (status === 'authenticated') {
            fetchData()
        }
    }, [status])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/pulse/location-access')
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users || [])
                setLocations(data.locations || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleLocation = (userId: string, locationId: string, currentLocations: string[] | null) => {
        const current = changes[userId] ?? currentLocations

        if (current === null) {
            // Currently "all", switch to only this location
            setChanges({ ...changes, [userId]: [locationId] })
        } else if (current.includes(locationId)) {
            // Remove this location
            const updated = current.filter(id => id !== locationId)
            setChanges({ ...changes, [userId]: updated.length === 0 ? null : updated })
        } else {
            // Add this location
            setChanges({ ...changes, [userId]: [...current, locationId] })
        }
    }

    const setAllLocations = (userId: string) => {
        setChanges({ ...changes, [userId]: null })
    }

    const saveUser = async (userId: string) => {
        setSaving(userId)
        try {
            const locationIds = changes[userId] ?? users.find(u => u.id === userId)?.pulseLocationIds

            await fetch('/api/pulse/location-access', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, locationIds })
            })

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, pulseLocationIds: locationIds ?? null } : u
            ))

            // Clear changes for this user
            const { [userId]: _, ...rest } = changes
            setChanges(rest)
        } catch (error) {
            console.error('Failed to save:', error)
        } finally {
            setSaving(null)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-stone-900 to-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    const getEffectiveLocations = (user: PulseUser) => {
        return changes[user.id] ?? user.pulseLocationIds
    }

    const hasChanges = (userId: string) => {
        return userId in changes
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-900 to-black p-4 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-stone-400" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white">Pulse Location Access</h1>
                    <p className="text-sm text-stone-400">Control which stores each user can see</p>
                </div>
            </div>

            {users.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                    <p className="text-stone-400">No users with Pulse access</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {users.map(user => {
                        const effectiveLocations = getEffectiveLocations(user)
                        const isAllLocations = effectiveLocations === null

                        return (
                            <div key={user.id} className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                                {/* User Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-orange-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{user.name || 'Unknown'}</p>
                                            <p className="text-xs text-stone-400">{user.email}</p>
                                        </div>
                                    </div>

                                    {hasChanges(user.id) && (
                                        <button
                                            onClick={() => saveUser(user.id)}
                                            disabled={saving === user.id}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
                                        >
                                            {saving === user.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            Save
                                        </button>
                                    )}
                                </div>

                                {/* Location Selection */}
                                <div className="space-y-2">
                                    {/* All Locations Option */}
                                    <button
                                        onClick={() => setAllLocations(user.id)}
                                        className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-2 ${isAllLocations
                                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                                : 'border-stone-600 hover:border-stone-500 text-stone-400'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isAllLocations ? 'border-emerald-500 bg-emerald-500' : 'border-stone-500'
                                            }`}>
                                            {isAllLocations && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <MapPin className="h-4 w-4" />
                                        All Locations
                                    </button>

                                    {/* Individual Locations */}
                                    {locations.map(location => {
                                        const isSelected = !isAllLocations && effectiveLocations?.includes(location.id)

                                        return (
                                            <button
                                                key={location.id}
                                                onClick={() => toggleLocation(user.id, location.id, user.pulseLocationIds)}
                                                className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-2 ${isSelected
                                                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                                                        : isAllLocations
                                                            ? 'border-stone-700 text-stone-500 opacity-50'
                                                            : 'border-stone-600 hover:border-stone-500 text-stone-400'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-stone-500'
                                                    }`}>
                                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                                <MapPin className="h-4 w-4" />
                                                {location.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

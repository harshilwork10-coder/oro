'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Users, Clock } from 'lucide-react'

type Activity = {
    id: string
    type: 'client_added' | 'location_added' | 'agent_added'
    title: string
    description: string
    status: string | null
    timestamp: string
}

export default function ActivityFeed() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)

    async function fetchActivity() {
        try {
            const res = await fetch('/api/admin/activity')
            if (res.ok) {
                const data = await res.json()
                setActivities(data.activities)
            }
        } catch (error) {
            console.error('Error fetching activity:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchActivity()
        // Refresh every 30 seconds
        const interval = setInterval(fetchActivity, 30000)
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-4">Recent Activity</h2>
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-stone-800/50 rounded-lg"></div>
                    ))}
                </div>
            </div>
        )
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'client_added': return Building2
            case 'location_added': return MapPin
            case 'agent_added': return Users
            default: return Clock
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'client_added': return 'purple'
            case 'location_added': return 'emerald'
            case 'agent_added': return 'orange'
            default: return 'stone'
        }
    }

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()

        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return `${days}d ago`
    }

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-100">Recent Activity</h2>
                <button
                    onClick={fetchActivity}
                    className="text-xs text-stone-400 hover:text-purple-400 transition-colors">
                    Refresh
                </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {activities.map((activity) => {
                    const Icon = getIcon(activity.type)
                    const color = getColor(activity.type)

                    return (
                        <div key={activity.id} className="p-4 bg-stone-900/30 rounded-xl border border-stone-800/50 hover:border-stone-700 transition-all">
                            <div className="flex items-start gap-3">
                                <div className={`h-10 w-10 bg-${color}-500/20 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`h-5 w-5 text-${color}-400`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-stone-100">{activity.title}</p>
                                    <p className="text-xs text-stone-400 mt-1">{activity.description}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs text-stone-500">{formatTime(activity.timestamp)}</span>
                                        {activity.status && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${activity.status === 'APPROVED'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {activity.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {activities.length === 0 && (
                    <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-stone-700 mx-auto mb-3" />
                        <p className="text-stone-400">No recent activity</p>
                    </div>
                )}
            </div>
        </div>
    )
}

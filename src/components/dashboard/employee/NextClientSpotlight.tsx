'use client'

import { Calendar, Clock, MapPin, User, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Appointment {
    id: string
    client: {
        firstName: string
        lastName: string
        image?: string
    }
    service: {
        name: string
        duration: number
    }
    startTime: string
    status: string
}

export default function NextClientSpotlight() {
    const [nextAppt, setNextAppt] = useState<Appointment | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchNext = async () => {
            try {
                // Fetch today's appointments and find the next one
                const res = await fetch('/api/appointments?startDate=' + new Date().toISOString())
                if (res.ok) {
                    const data = await res.json()
                    // Filter for future appointments today
                    const now = new Date()
                    const upcoming = data
                        .filter((a: any) => new Date(a.startTime) > now && a.status !== 'CANCELLED' && a.status !== 'COMPLETED')
                        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

                    if (upcoming.length > 0) {
                        setNextAppt(upcoming[0])
                    }
                }
            } catch (error) {
                console.error('Error fetching next appointment:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchNext()
    }, [])

    if (loading) return <div className="animate-pulse h-64 bg-stone-900/50 rounded-2xl"></div>

    if (!nextAppt) {
        return (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                <div className="h-16 w-16 bg-stone-800 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-stone-500" />
                </div>
                <h3 className="text-xl font-bold text-stone-200">All Caught Up!</h3>
                <p className="text-stone-500 mt-2 max-w-xs">No more appointments scheduled for today. Great job!</p>
            </div>
        )
    }

    return (
        <div className="glass-panel p-0 rounded-2xl overflow-hidden relative group">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-stone-900/50 z-0" />

            <div className="relative z-10 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider border border-orange-500/20">
                        Up Next
                    </span>
                    <div className="flex items-center text-stone-400 text-sm">
                        <Clock className="h-4 w-4 mr-1.5" />
                        {format(new Date(nextAppt.startTime), 'h:mm a')}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Client Avatar */}
                    <div className="relative">
                        <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-600 flex items-center justify-center shadow-xl shadow-black/20 ring-4 ring-stone-800">
                            {nextAppt.client.image ? (
                                <img src={nextAppt.client.image} alt="Client" className="h-full w-full object-cover rounded-2xl" />
                            ) : (
                                <span className="text-3xl font-bold text-stone-300">
                                    {nextAppt.client.firstName[0]}{nextAppt.client.lastName[0]}
                                </span>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-stone-900 rounded-lg p-1.5 border border-stone-700">
                            <User className="h-4 w-4 text-stone-400" />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {nextAppt.client.firstName} {nextAppt.client.lastName}
                        </h2>
                        <p className="text-lg text-orange-400 font-medium mb-4">
                            {nextAppt.service.name}
                        </p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="px-3 py-1.5 bg-stone-800/50 rounded-lg border border-stone-700/50 text-xs text-stone-400 flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1.5 text-stone-500" />
                                {nextAppt.service.duration} mins
                            </div>
                            <div className="px-3 py-1.5 bg-stone-800/50 rounded-lg border border-stone-700/50 text-xs text-stone-400 flex items-center">
                                <User className="h-3.5 w-3.5 mr-1.5 text-stone-500" />
                                Regular Client
                            </div>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="w-full md:w-auto mt-4 md:mt-0">
                        <button className="w-full md:w-auto px-6 py-3 bg-white text-stone-950 rounded-xl font-bold hover:bg-stone-200 transition-colors shadow-lg shadow-white/5 flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Check In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

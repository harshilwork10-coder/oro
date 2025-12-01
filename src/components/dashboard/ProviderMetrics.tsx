'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { Users, Building2, MapPin } from "lucide-react"

type Metrics = {
    totals: {
        clients: number
        locations: number
        agents: number
    }
    byAgent: Array<{
        agentId: string
        agentName: string
        clientsCount: number
        locationsCount: number
    }>
    recentClients: Array<{
        id: string
        name: string
        type: string
        status: string
        createdAt: string
    }>
}

export default function ProviderMetricsView() {
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [loading, setLoading] = useState(true)

    async function fetchMetrics() {
        try {
            const response = await fetch('/api/admin/metrics')
            if (response.ok) {
                const data = await response.json()
                setMetrics(data)
            }
        } catch (error) {
            console.error('Error fetching metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMetrics()
    }, [])

    if (loading || !metrics) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    const { totals, byAgent, recentClients } = metrics

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100">Platform Overview</h1>
                <p className="text-stone-400 mt-2">Manage your clients and agents</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Clients */}
                <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-stone-400 uppercase tracking-wider">Total Clients</p>
                            <p className="text-4xl font-bold text-purple-400 mt-2">{totals.clients}</p>
                            <p className="text-xs text-stone-500 mt-1">Business owners</p>
                        </div>
                        <Building2 className="h-12 w-12 text-purple-400 opacity-20" />
                    </div>
                </div>

                {/* Total Locations */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-stone-400 uppercase tracking-wider">Total Locations</p>
                            <p className="text-4xl font-bold text-emerald-400 mt-2">{totals.locations}</p>
                            <p className="text-xs text-stone-500 mt-1">Across all clients</p>
                        </div>
                        <MapPin className="h-12 w-12 text-emerald-400 opacity-20" />
                    </div>
                </div>

                {/* Total Agents */}
                <div className="glass-panel p-6 rounded-2xl border border-orange-500/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm text-stone-400 uppercase tracking-wider">Sales Agents</p>
                            <p className="text-4xl font-bold text-orange-400 mt-2">{totals.agents}</p>
                            <p className="text-xs text-stone-500 mt-1">Active team members</p>
                        </div>
                        <Users className="h-12 w-12 text-orange-400 opacity-20" />
                    </div>
                </div>
            </div>

            {/* Agent Performance */}
            {byAgent.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-xl font-bold text-stone-100 mb-4">Agent Performance</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-800">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-400">Agent</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-400">Clients</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-400">Locations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byAgent.map((agent) => (
                                    <tr key={agent.agentId} className="border-b border-stone-800/50 hover:bg-stone-900/30">
                                        <td className="py-3 px-4 text-stone-200">{agent.agentName}</td>
                                        <td className="py-3 px-4 text-right text-purple-400 font-medium">{agent.clientsCount}</td>
                                        <td className="py-3 px-4 text-right text-emerald-400 font-medium">{agent.locationsCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent Clients */}
            {recentClients.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-xl font-bold text-stone-100 mb-4">Recent Clients</h2>
                    <div className="space-y-3">
                        {recentClients.map((client) => (
                            <div key={client.id} className="flex items-center justify-between p-4 bg-stone-900/30 rounded-xl border border-stone-800/50">
                                <div>
                                    <p className="text-stone-100 font-medium">{client.name}</p>
                                    <p className="text-xs text-stone-500 mt-1">{new Date(client.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                    {client.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import {
    Users, DollarSign, TrendingUp, Activity,
    BarChart3, Calendar, Phone, Mail, MapPin
} from 'lucide-react'
import Link from 'next/link'

export default function CRMDashboardPage() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        pipelineValue: 0,
        conversionRate: 0,
        activeTerritories: 0
    })
    const [recentLeads, setRecentLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/crm/stats')
                if (res.ok) {
                    const data = await res.json()
                    setStats({
                        totalLeads: data.totalLeads,
                        pipelineValue: data.pipelineValue,
                        conversionRate: data.conversionRate,
                        activeTerritories: data.activeTerritories
                    })
                    setRecentLeads(data.recentLeads.map((lead: any) => ({
                        id: lead.id,
                        name: lead.name,
                        company: lead.company,
                        status: lead.status,
                        value: lead.estimatedValue || 0,
                        date: new Date(lead.createdAt).toLocaleDateString()
                    })))
                }
            } catch (error) {
                console.error('Error fetching stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">CRM Dashboard</h1>
                    <p className="text-stone-400 mt-1">Overview of your franchise sales pipeline</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/crm/leads/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" /> Add Lead
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Users className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <p className="text-stone-400 text-sm font-medium">Total Leads</p>
                    <h3 className="text-2xl font-bold text-white">{stats.totalLeads}</h3>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+8%</span>
                    </div>
                    <p className="text-stone-400 text-sm font-medium">Pipeline Value</p>
                    <h3 className="text-2xl font-bold text-white">${stats.pipelineValue.toLocaleString()}</h3>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+2.4%</span>
                    </div>
                    <p className="text-stone-400 text-sm font-medium">Conversion Rate</p>
                    <h3 className="text-2xl font-bold text-white">{stats.conversionRate}%</h3>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full">Active</span>
                    </div>
                    <p className="text-stone-400 text-sm font-medium">Territories Sold</p>
                    <h3 className="text-2xl font-bold text-white">{stats.activeTerritories}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Leads */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">Recent Leads</h2>
                        <Link href="/dashboard/crm/leads" className="text-sm text-purple-400 hover:text-purple-300 font-medium">View All</Link>
                    </div>
                    <div className="divide-y divide-white/10">
                        {recentLeads.map((lead) => (
                            <div key={lead.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{lead.name}</p>
                                        <p className="text-xs text-stone-400">{lead.company}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="font-medium text-white">${lead.value.toLocaleString()}</p>
                                        <p className="text-xs text-stone-400">{lead.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                        lead.status === 'NEGOTIATION' ? 'bg-purple-100 text-purple-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {lead.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white/5 border border-white/10 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex gap-4">
                            <div className="mt-1 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-200"><span className="font-bold">Call with John Smith</span> regarding franchise fees.</p>
                                <p className="text-xs text-stone-400 mt-1">2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="mt-1 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-200"><span className="font-bold">Sent Proposal</span> to Sarah Jones.</p>
                                <p className="text-xs text-stone-400 mt-1">5 hours ago</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="mt-1 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                <DollarSign className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-200"><span className="font-bold">Deposit Received</span> from Mike Brown.</p>
                                <p className="text-xs text-stone-400 mt-1">Yesterday</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

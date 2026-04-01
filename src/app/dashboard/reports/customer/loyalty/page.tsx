'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Award,
    ArrowLeft,
    RefreshCw,
    Search,
    User,
    FileDown,
    Trophy,
    TrendingUp,
    TrendingDown,
    Activity
} from 'lucide-react'
import jsPDF from 'jspdf'
import Link from 'next/link'

interface LoyaltyCustomer {
    id: string
    name: string
    phone: string
    pointsBalance: number
    lifetimePoints: number
}

interface LoyaltySummary {
    date: string
    pointsIssuedToday: { count: number; total: number }
    pointsRedeemedToday: { count: number; total: number }
    netPointsToday: number
    topRuleHits: { description: string; count: number; totalPoints: number }[]
    activeMemberCount: number
    totalOutstandingPoints: number
}

export default function LoyaltyPointsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [customers, setCustomers] = useState<LoyaltyCustomer[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [summary, setSummary] = useState<LoyaltySummary | null>(null)

    useEffect(() => {
        fetchData()
        fetchSummary()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/reports/loyalty-points')
            if (res.ok) {
                const data = await res.json()
                setCustomers(data.customers || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchSummary = async () => {
        try {
            const res = await fetch('/api/reports/loyalty-summary')
            if (res.ok) {
                const data = await res.json()
                setSummary(data)
            }
        } catch (error) {
            console.error('Failed to fetch summary:', error)
        }
    }

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    )

    const totalPoints = customers.reduce((sum, c) => sum + c.pointsBalance, 0)

    const exportCSV = () => {
        const headers = ['Customer', 'Phone', 'Current Balance', 'Lifetime Points']
        const csvContent = [
            headers.join(','),
            ...filtered.map(c => [
                `"${c.name}"`,
                `"${c.phone || ''}"`,
                c.pointsBalance,
                c.lifetimePoints
            ].join(','))
        ].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `loyalty_points_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        let yPos = 20
        doc.setFontSize(18)
        doc.text('Loyalty Points Report', 20, yPos)
        yPos += 10
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos)
        yPos += 10

        const headers = ['Customer', 'Phone', 'Balance', 'Lifetime']
        const xPos = [20, 80, 130, 170]
        doc.setFont('helvetica', 'bold')
        headers.forEach((h, i) => doc.text(h, xPos[i], yPos))
        yPos += 7
        doc.line(20, yPos - 5, 190, yPos - 5)

        doc.setFont('helvetica', 'normal')
        filtered.forEach(c => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(c.name.substring(0, 25), xPos[0], yPos)
            doc.text(c.phone || '-', xPos[1], yPos)
            doc.text(String(c.pointsBalance), xPos[2], yPos)
            doc.text(String(c.lifetimePoints), xPos[3], yPos)
            yPos += 7
        })
        doc.save(`loyalty_points_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/customer" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            Loyalty Points Report
                        </h1>
                        <p className="text-gray-400 mt-1">Customer points balances</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToPDF} className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white" title="Export PDF">
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={exportCSV} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white" title="Export Excel">
                        <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Search & Summary */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
                </div>
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg px-4 py-2">
                    <p className="text-yellow-300 text-xs">Total Outstanding</p>
                    <p className="text-lg font-bold text-yellow-400">{totalPoints.toLocaleString()} pts</p>
                </div>
            </div>

            {/* Daily Operational Summary */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <p className="text-emerald-300 text-xs font-medium">Points Issued Today</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{summary.pointsIssuedToday.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{summary.pointsIssuedToday.count} transaction{summary.pointsIssuedToday.count !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <p className="text-red-300 text-xs font-medium">Points Redeemed Today</p>
                        </div>
                        <p className="text-2xl font-bold text-red-400">{summary.pointsRedeemedToday.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{summary.pointsRedeemedToday.count} redemption{summary.pointsRedeemedToday.count !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <p className="text-blue-300 text-xs font-medium">Net Points Today</p>
                        </div>
                        <p className={`text-2xl font-bold ${summary.netPointsToday >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                            {summary.netPointsToday >= 0 ? '+' : ''}{summary.netPointsToday.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Issued minus redeemed</p>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-purple-400" />
                            <p className="text-purple-300 text-xs font-medium">Active Members</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-400">{summary.activeMemberCount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Last 90 days</p>
                    </div>
                </div>
            )}

            {/* Top Rule Hits */}
            {summary && summary.topRuleHits.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Earn Sources Today</h3>
                    <div className="space-y-2">
                        {summary.topRuleHits.slice(0, 5).map((hit, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm text-gray-400 truncate flex-1">{hit.description}</span>
                                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                    <span className="text-xs text-gray-500">{hit.count}x</span>
                                    <span className="text-sm font-medium text-yellow-400">+{hit.totalPoints.toLocaleString()} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Phone</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Current Balance</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Lifetime Points</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No loyalty members found</td></tr>
                        ) : (
                            filtered.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="text-white">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{customer.phone || '-'}</td>
                                    <td className="px-4 py-3 text-right text-yellow-400 font-medium">{customer.pointsBalance.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">{customer.lifetimePoints.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

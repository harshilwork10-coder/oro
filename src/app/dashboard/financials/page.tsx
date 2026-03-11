'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    DollarSign,
    CreditCard,
    FileText,
    TrendingUp,
    ArrowRightLeft,
    Users,
    ArrowRight,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'

function fmtCurrency(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function FinancialsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/reports/eod-summary')
                .then(r => r.json())
                .then(d => { setData(d.data); setLoading(false) })
                .catch(() => setLoading(false))
        }
    }, [status])

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    const revenue = data?.revenue?.total || 0
    const refunds = data?.refunds?.total || 0
    const voids = data?.voids?.count || 0
    const netSales = revenue - refunds

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-stone-100">Financial Management</h1>
                <p className="text-stone-400 mt-2">Track revenue, fees, and financial analytics</p>
            </div>

            {/* Today's KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl">
                    <p className="text-sm text-stone-400">Today&apos;s Revenue</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{loading ? '...' : fmtCurrency(revenue)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl">
                    <p className="text-sm text-stone-400">Net Sales</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{loading ? '...' : fmtCurrency(netSales)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl">
                    <p className="text-sm text-stone-400">Refunds</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{loading ? '...' : fmtCurrency(refunds)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl">
                    <p className="text-sm text-stone-400">Transactions</p>
                    <p className="text-2xl font-bold text-stone-100 mt-1">{loading ? '...' : (data?.revenue?.transactions || 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/dashboard/reports/financial-summary" className="glass-panel p-6 rounded-2xl flex items-start gap-4 hover:border-emerald-500/50 transition-all group">
                    <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-100">Financial Summary</h3>
                        <p className="text-sm text-stone-400 mt-1">Consolidated financial overview</p>
                    </div>
                </Link>

                <Link href="/dashboard/reports/pnl" className="glass-panel p-6 rounded-2xl flex items-start gap-4 hover:border-purple-500/50 transition-all group">
                    <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                        <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-100">P&amp;L Statement</h3>
                        <p className="text-sm text-stone-400 mt-1">Revenue, costs, and profit breakdown</p>
                    </div>
                </Link>

                <Link href="/dashboard/reports/revenue" className="glass-panel p-6 rounded-2xl flex items-start gap-4 hover:border-amber-500/50 transition-all group">
                    <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                        <DollarSign className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-100">Revenue Analytics</h3>
                        <p className="text-sm text-stone-400 mt-1">Daily revenue trends and breakdowns</p>
                    </div>
                </Link>
            </div>
            {/* Configuration Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/dashboard/financials/split-payouts" className="glass-panel p-6 rounded-xl hover:border-emerald-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
                            <ArrowRightLeft className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-100">Split Payouts</h3>
                            <p className="text-sm text-stone-500">Configure automated royalty & fee distribution</p>
                        </div>
                        <ArrowRight className="ml-auto h-5 w-5 text-stone-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                </Link>

                <Link href="/dashboard/financials/commissions" className="glass-panel p-6 rounded-xl hover:border-blue-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-100">Commission Rules</h3>
                            <p className="text-sm text-stone-500">Manage staff compensation tiers</p>
                        </div>
                        <ArrowRight className="ml-auto h-5 w-5 text-stone-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                </Link>
            </div>
        </div>
    )
}


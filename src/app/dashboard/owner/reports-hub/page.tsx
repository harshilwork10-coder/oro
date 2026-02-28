'use client'

import Link from 'next/link'
import {
    ArrowLeft, Zap, BarChart3, Layers, Clock, ShieldAlert, Activity,
    TrendingUp, AlertTriangle, CreditCard, FileSpreadsheet, DollarSign, Users
} from 'lucide-react'

const reports = [
    { href: '/dashboard/reports/flash-report', icon: Zap, name: 'Flash Report', desc: 'Daily sales summary with auto-alerts', color: 'text-amber-400 bg-amber-400/10' },
    { href: '/dashboard/reports/realtime-sales', icon: Activity, name: 'Live Sales Ticker', desc: 'Real-time revenue tracker', color: 'text-emerald-400 bg-emerald-400/10' },
    { href: '/dashboard/reports/sales-velocity', icon: TrendingUp, name: 'Sales Velocity', desc: 'Items ranked by sell-through speed', color: 'text-blue-400 bg-blue-400/10' },
    { href: '/dashboard/reports/abc-analysis', icon: Layers, name: 'ABC Analysis', desc: 'Inventory classification by revenue', color: 'text-purple-400 bg-purple-400/10' },
    { href: '/dashboard/reports/hourly-heatmap', icon: Clock, name: 'Hourly Heatmap', desc: 'Busiest hours & days', color: 'text-orange-400 bg-orange-400/10' },
    { href: '/dashboard/reports/loss-prevention', icon: ShieldAlert, name: 'Loss Prevention', desc: 'Security risk dashboard', color: 'text-red-400 bg-red-400/10' },
    { href: '/dashboard/reports/anomaly-detection', icon: AlertTriangle, name: 'Anomaly Detection', desc: 'Unusual cashier patterns', color: 'text-rose-400 bg-rose-400/10' },
    { href: '/dashboard/reports/year-over-year', icon: BarChart3, name: 'Year-over-Year', desc: 'Compare to last year', color: 'text-cyan-400 bg-cyan-400/10' },
    { href: '/dashboard/owner/reports', icon: FileSpreadsheet, name: 'Classic Reports', desc: 'Daily sales, tax, employee reports', color: 'text-stone-400 bg-stone-400/10' },
    { href: '/dashboard/owner/accounting-export', icon: DollarSign, name: 'QuickBooks / Xero', desc: 'Accounting journal export', color: 'text-green-400 bg-green-400/10' },
    { href: '/dashboard/owner/customer-segments', icon: Users, name: 'Customer Segments', desc: 'VIP, Regular, Occasional', color: 'text-indigo-400 bg-indigo-400/10' },
    { href: '/dashboard/reports/sales/payment-breakdown', icon: CreditCard, name: 'Payment Breakdown', desc: 'Cash vs Card vs EBT', color: 'text-pink-400 bg-pink-400/10' },
]

export default function ReportsHubPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">📊 Retail Reports Hub</h1>
                    <p className="text-stone-400">All reports & analytics in one place</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {reports.map(r => (
                    <Link
                        key={r.href}
                        href={r.href}
                        className="group bg-stone-900/80 border border-stone-700 rounded-2xl p-5 hover:border-stone-500 hover:bg-stone-800/80 transition-all"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${r.color}`}>
                            <r.icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-lg group-hover:text-white">{r.name}</h3>
                        <p className="text-sm text-stone-400 mt-1">{r.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    )
}

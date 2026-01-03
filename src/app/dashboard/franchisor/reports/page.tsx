'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, DollarSign, Package, Users, UserCog, Clock,
    Receipt, TrendingUp, TrendingDown, BarChart3, FileText,
    Store, MapPin, RefreshCw, Download, Filter, Calendar,
    CreditCard, Wallet, Gift, Shield, AlertTriangle, Eye
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Report categories matching their existing system
const reportCategories = [
    {
        id: 'sales',
        name: 'Sales Reports',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        reports: [
            { name: 'Sales by Location', href: '/dashboard/franchisor/reports/sales-by-location', desc: 'Compare sales across all stores' },
            { name: 'Daily Closeout', href: '/dashboard/reports/z-report', desc: 'End of day summary' },
            { name: 'Sales by Employee', href: '/dashboard/reports/sales/by-employee', desc: 'Performance by cashier' },
            { name: 'Sales by Category', href: '/dashboard/reports/sales/by-category', desc: 'Revenue by product category' },
            { name: 'Payment Breakdown', href: '/dashboard/reports/sales/payment-methods', desc: 'Cash vs Card vs Other' },
            { name: 'Hourly Sales', href: '/dashboard/franchisor/reports/hourly-sales', desc: 'Peak hours analysis' },
            { name: 'Tax Report', href: '/dashboard/owner/tax-report', desc: 'Tax collected by location' },
            { name: 'Discount Report', href: '/dashboard/franchisor/reports/discounts', desc: 'All discounts applied' },
            { name: 'Voids & Refunds', href: '/dashboard/reports/drawer-activity', desc: 'Deleted tickets and voids' },
            { name: 'Transaction Log', href: '/dashboard/franchisor/reports/transactions', desc: 'Every transaction detail' },
        ]
    },
    {
        id: 'product',
        name: 'Product/Inventory',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        reports: [
            { name: 'Best/Worst Sellers', href: '/dashboard/reports/inventory/top-sellers', desc: 'Top and bottom performers' },
            { name: 'Low Stock Report', href: '/dashboard/reports/inventory/low-stock', desc: 'Items needing reorder' },
            { name: 'Inventory Valuation', href: '/dashboard/reports/inventory/valuation', desc: 'Total inventory value by location' },
            { name: 'Stock Movement', href: '/dashboard/franchisor/reports/stock-movement', desc: 'All inventory changes' },
            { name: 'Cost of Goods Sold', href: '/dashboard/reports/cogs', desc: 'COGS analysis' },
            { name: 'Gift Cards', href: '/dashboard/reports/sales/gift-cards', desc: 'Gift card sales & redemptions' },
        ]
    },
    {
        id: 'customers',
        name: 'Customers',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        reports: [
            { name: 'Top Spenders', href: '/dashboard/reports/customer/top-spenders', desc: 'Highest spending customers' },
            { name: 'Customer Analysis', href: '/dashboard/reports/customer/analysis', desc: 'Customer behavior insights' },
            { name: 'Loyalty Points', href: '/dashboard/reports/customer/loyalty', desc: 'Points earned & redeemed' },
            { name: 'Store Credit', href: '/dashboard/reports/customer/store-credit', desc: 'Outstanding store credits' },
            { name: 'Retention Report', href: '/dashboard/reports/retention', desc: 'Customer return rates' },
        ]
    },
    {
        id: 'employees',
        name: 'Employees',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        reports: [
            { name: 'Time Clock', href: '/dashboard/reports/employee/time-clock', desc: 'Hours worked by employee' },
            { name: 'Sales Performance', href: '/dashboard/reports/employee/performance', desc: 'Sales by employee' },
            { name: 'Commission Report', href: '/dashboard/reports/employee/commission', desc: 'Commissions earned' },
            { name: 'Tips Report', href: '/dashboard/reports/tips', desc: 'Tips collected' },
            { name: 'Payroll Forecast', href: '/dashboard/reports/employee/payroll', desc: 'Estimated payroll' },
        ]
    },
    {
        id: 'common',
        name: 'System & Audit',
        icon: Shield,
        color: 'from-red-500 to-rose-600',
        reports: [
            { name: 'Audit Log', href: '/dashboard/franchisor/reports/audit-log', desc: 'All system actions' },
            { name: 'Drawer Activity', href: '/dashboard/reports/drawer-activity', desc: 'Cash drawer opens/closes' },
            { name: 'Device Management', href: '/dashboard/settings/terminals', desc: 'POS terminals status' },
            { name: 'Royalty Report', href: '/dashboard/reports/royalties', desc: 'Royalty charges' },
        ]
    }
]

export default function FranchisorReportsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [locations, setLocations] = useState<any[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>('all')
    const [quickStats, setQuickStats] = useState<any>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch locations
            const locRes = await fetch('/api/franchise/locations')
            const locData = await locRes.json()
            setLocations(locData.locations || [])

            // Fetch quick stats
            const statsRes = await fetch('/api/franchisor/dashboard')
            const statsData = await statsRes.json()
            setQuickStats(statsData)
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-amber-500" />
                            Franchisor Reports
                        </h1>
                        <p className="text-stone-400">View reports across all your locations</p>
                    </div>
                </div>

                {/* Location Filter */}
                <div className="flex items-center gap-4">
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2"
                    >
                        <option value="all">📍 All Locations</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 bg-stone-800 rounded-xl hover:bg-stone-700"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Bar */}
            {quickStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-stone-800/50 rounded-xl p-4">
                        <p className="text-stone-400 text-sm">Today's Sales</p>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(quickStats.todaySales || 0)}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-xl p-4">
                        <p className="text-stone-400 text-sm">Transactions</p>
                        <p className="text-2xl font-bold">{quickStats.todayTransactions || 0}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-xl p-4">
                        <p className="text-stone-400 text-sm">Active Stores</p>
                        <p className="text-2xl font-bold text-blue-400">{locations.length}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-xl p-4">
                        <p className="text-stone-400 text-sm">Employees Working</p>
                        <p className="text-2xl font-bold">{quickStats.employeesWorking || 0}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-xl p-4">
                        <p className="text-stone-400 text-sm">Alerts</p>
                        <p className="text-2xl font-bold text-amber-400">{quickStats.alerts || 0}</p>
                    </div>
                </div>
            )}

            {/* Report Categories */}
            <div className="space-y-8">
                {reportCategories.map((category) => {
                    const Icon = category.icon
                    return (
                        <div key={category.id}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color}`}>
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold">{category.name}</h2>
                                <span className="text-sm text-stone-500">({category.reports.length} reports)</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {category.reports.map((report, idx) => (
                                    <Link
                                        key={idx}
                                        href={report.href + (selectedLocation !== 'all' ? `?locationId=${selectedLocation}` : '')}
                                        className="group bg-stone-800/30 border border-stone-700/50 rounded-xl p-4 hover:bg-stone-800 hover:border-amber-500/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold group-hover:text-amber-400 transition-colors">
                                                {report.name}
                                            </h3>
                                            <Eye className="h-4 w-4 text-stone-500 group-hover:text-amber-400" />
                                        </div>
                                        <p className="text-xs text-stone-500 mt-1">{report.desc}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 pt-8 border-t border-stone-800">
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/dashboard/owner/exports"
                        className="flex items-center gap-2 bg-stone-800 px-4 py-2 rounded-xl hover:bg-stone-700"
                    >
                        <Download className="h-4 w-4" />
                        Export Data
                    </Link>
                    <Link
                        href="/dashboard/reports/z-report"
                        className="flex items-center gap-2 bg-green-600/20 border border-green-500/30 px-4 py-2 rounded-xl hover:bg-green-600/30"
                    >
                        <Receipt className="h-4 w-4 text-green-400" />
                        Run Z-Report
                    </Link>
                    <Link
                        href="/dashboard/owner/tax-report"
                        className="flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 px-4 py-2 rounded-xl hover:bg-amber-600/30"
                    >
                        <FileText className="h-4 w-4 text-amber-400" />
                        Tax Report
                    </Link>
                </div>
            </div>
        </div>
    )
}


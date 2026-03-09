'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    ArrowLeft,
    FileText,
    CreditCard,
    Receipt,
    TrendingUp,
    Percent,
    Gift,
    Tag,
    RefreshCw,
    Calendar,
    ChevronRight,
    Search,
    Scissors,
    Users,
    Clock,
    Star,
    Package,
    Cigarette,
    Ticket,
    Zap
} from 'lucide-react'
import Link from 'next/link'

// ─── Report type with group + color ─────────────────────────────────────────
interface ReportItem {
    id: string
    name: string
    description: string
    icon: any
    href: string
    status: 'available' | 'coming-soon'
    priority?: boolean
    group: string
    color: string // tailwind color key: green, blue, purple, etc.
}

// ─── Retail-specific sales reports ─────────────────────────────────────────
const retailSalesReports: ReportItem[] = [
    {
        id: 'daily-sales',
        name: 'Daily Sales / Z-Report',
        description: 'End of day sales summary with all transactions',
        icon: FileText,
        href: '/dashboard/reports/z-report',
        status: 'available',
        priority: true,
        group: 'Essential',
        color: 'emerald'
    },
    {
        id: 'cash-card',
        name: 'Cash vs Card Breakdown',
        description: 'Revenue split by payment method',
        icon: CreditCard,
        href: '/dashboard/reports/sales/cash-card',
        status: 'available',
        priority: true,
        group: 'Essential',
        color: 'blue'
    },
    {
        id: 'sales-by-employee',
        name: 'Sales by Employee',
        description: 'Revenue and transaction count per employee',
        icon: Users,
        href: '/dashboard/reports/employee/sales',
        status: 'available',
        priority: true,
        group: 'Essential',
        color: 'violet'
    },
    {
        id: 'product-sales',
        name: 'Product Sales',
        description: 'Top-selling products, units sold, revenue by SKU',
        icon: Package,
        href: '/dashboard/reports/sales/products',
        status: 'available',
        group: 'Product & Inventory',
        color: 'cyan'
    },
    {
        id: 'tobacco-scan',
        name: 'Tobacco Scan',
        description: 'Age-verified tobacco & nicotine sales log',
        icon: Cigarette,
        href: '/dashboard/reports/tobacco-scan',
        status: 'available',
        group: 'Product & Inventory',
        color: 'stone'
    },
    {
        id: 'lottery-sales',
        name: 'Lottery Sales',
        description: 'Ticket sales, pack activity, and lottery payouts',
        icon: Ticket,
        href: '/dashboard/reports/lottery',
        status: 'available',
        group: 'Product & Inventory',
        color: 'amber'
    },
    {
        id: 'deals-promotions',
        name: 'Deals & Promotions',
        description: 'Active deals performance and savings applied',
        icon: Tag,
        href: '/dashboard/reports/deals',
        status: 'available',
        group: 'Product & Inventory',
        color: 'orange'
    },
    {
        id: 'tax-summary',
        name: 'Tax Summary',
        description: 'Sales tax collected for filing',
        icon: Percent,
        href: '/dashboard/reports/tax',
        status: 'available',
        group: 'Financial',
        color: 'teal'
    },
    {
        id: 'refunds-voids',
        name: 'Refunds & Voids',
        description: 'Voided transactions and refunds issued',
        icon: RefreshCw,
        href: '/dashboard/reports/transactions?filter=refunds',
        status: 'available',
        group: 'Financial',
        color: 'red'
    },
    {
        id: 'cc-batch',
        name: 'Credit Card Batch',
        description: 'Transaction time, auth code — for disputes',
        icon: CreditCard,
        href: '/dashboard/reports/sales/cc-batch',
        status: 'coming-soon',
        group: 'Financial',
        color: 'indigo'
    },
    {
        id: 'gift-cards',
        name: 'Gift Card Report',
        description: 'Sold, redeemed, outstanding balance',
        icon: Gift,
        href: '/dashboard/reports/sales/gift-cards',
        status: 'coming-soon',
        group: 'Financial',
        color: 'pink'
    },
]

// ─── Salon-specific sales reports ──────────────────────────────────────────
const salonSalesReports: ReportItem[] = [
    {
        id: 'daily-sales',
        name: 'Daily Sales / Z-Report',
        description: 'End of day sales summary with all transactions',
        icon: FileText,
        href: '/dashboard/reports/z-report',
        status: 'available',
        priority: true,
        group: 'Essential',
        color: 'emerald'
    },
    {
        id: 'cash-card',
        name: 'Cash vs Card Breakdown',
        description: 'Revenue split by payment method with tip breakdown',
        icon: CreditCard,
        href: '/dashboard/reports/sales/cash-card',
        status: 'available',
        priority: true,
        group: 'Essential',
        color: 'blue'
    },
    {
        id: 'sales-by-employee',
        name: 'Sales by Employee',
        description: 'Revenue and transaction count per employee',
        icon: Users,
        href: '/dashboard/reports/employee/sales',
        status: 'available',
        priority: true,
        group: 'Essential',
        color: 'violet'
    },
    {
        id: 'service-sales',
        name: 'Service Sales',
        description: 'Sales breakdown by service category',
        icon: Scissors,
        href: '/dashboard/reports/sales/services',
        status: 'coming-soon',
        group: 'Service & Staff',
        color: 'pink'
    },
    {
        id: 'appointment-revenue',
        name: 'Appointment Revenue',
        description: 'Revenue from appointments vs walk-ins',
        icon: Calendar,
        href: '/dashboard/reports/sales/appointments',
        status: 'coming-soon',
        group: 'Service & Staff',
        color: 'rose'
    },
    {
        id: 'commission-report',
        name: 'Commission Payouts',
        description: 'Stylist commissions and payout history',
        icon: DollarSign,
        href: '/dashboard/reports/employee/payouts',
        status: 'available',
        group: 'Service & Staff',
        color: 'amber'
    },
    {
        id: 'tips-report',
        name: 'Tips Report',
        description: 'Tips collected by stylist/employee',
        icon: DollarSign,
        href: '/dashboard/reports/tips',
        status: 'available',
        group: 'Service & Staff',
        color: 'lime'
    },
    {
        id: 'product-sales',
        name: 'Product Sales',
        description: 'Retail product sales and top sellers',
        icon: Receipt,
        href: '/dashboard/reports/sales/products',
        status: 'coming-soon',
        group: 'Product & Promos',
        color: 'cyan'
    },
    {
        id: 'deals-promotions',
        name: 'Deals & Promotions',
        description: 'Active deals performance and savings',
        icon: Tag,
        href: '/dashboard/reports/deals',
        status: 'available',
        group: 'Product & Promos',
        color: 'orange'
    },
    {
        id: 'tax-summary',
        name: 'Tax Summary',
        description: 'Sales tax collected for filing',
        icon: Percent,
        href: '/dashboard/reports/tax',
        status: 'available',
        group: 'Financial',
        color: 'teal'
    },
    {
        id: 'refunds-voids',
        name: 'Refunds & Voids',
        description: 'Voided transactions and refunds issued',
        icon: RefreshCw,
        href: '/dashboard/reports/transactions?filter=refunds',
        status: 'available',
        group: 'Financial',
        color: 'red'
    },
    {
        id: 'cc-batch',
        name: 'Credit Card Batch',
        description: 'Transaction time, auth code — for disputes',
        icon: CreditCard,
        href: '/dashboard/reports/sales/cc-batch',
        status: 'coming-soon',
        group: 'Financial',
        color: 'indigo'
    },
    {
        id: 'gift-cards',
        name: 'Gift Card Report',
        description: 'Sold, redeemed, outstanding balance',
        icon: Gift,
        href: '/dashboard/reports/sales/gift-cards',
        status: 'coming-soon',
        group: 'Financial',
        color: 'pink'
    },
]

// ─── Color mapping ─────────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20 hover:border-emerald-400/50', glow: 'group-hover:shadow-emerald-500/10' },
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/20 hover:border-blue-400/50', glow: 'group-hover:shadow-blue-500/10' },
    violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400', border: 'border-violet-500/20 hover:border-violet-400/50', glow: 'group-hover:shadow-violet-500/10' },
    cyan: { bg: 'bg-cyan-500/10', icon: 'text-cyan-400', border: 'border-cyan-500/20 hover:border-cyan-400/50', glow: 'group-hover:shadow-cyan-500/10' },
    stone: { bg: 'bg-stone-500/10', icon: 'text-stone-400', border: 'border-stone-500/20 hover:border-stone-400/50', glow: 'group-hover:shadow-stone-500/10' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400', border: 'border-amber-500/20 hover:border-amber-400/50', glow: 'group-hover:shadow-amber-500/10' },
    orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20 hover:border-orange-400/50', glow: 'group-hover:shadow-orange-500/10' },
    teal: { bg: 'bg-teal-500/10', icon: 'text-teal-400', border: 'border-teal-500/20 hover:border-teal-400/50', glow: 'group-hover:shadow-teal-500/10' },
    red: { bg: 'bg-red-500/10', icon: 'text-red-400', border: 'border-red-500/20 hover:border-red-400/50', glow: 'group-hover:shadow-red-500/10' },
    indigo: { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', border: 'border-indigo-500/20 hover:border-indigo-400/50', glow: 'group-hover:shadow-indigo-500/10' },
    pink: { bg: 'bg-pink-500/10', icon: 'text-pink-400', border: 'border-pink-500/20 hover:border-pink-400/50', glow: 'group-hover:shadow-pink-500/10' },
    rose: { bg: 'bg-rose-500/10', icon: 'text-rose-400', border: 'border-rose-500/20 hover:border-rose-400/50', glow: 'group-hover:shadow-rose-500/10' },
    lime: { bg: 'bg-lime-500/10', icon: 'text-lime-400', border: 'border-lime-500/20 hover:border-lime-400/50', glow: 'group-hover:shadow-lime-500/10' },
}

// ─── Group icons ───────────────────────────────────────────────────────────
const groupIcons: Record<string, any> = {
    'Essential': Zap,
    'Product & Inventory': Package,
    'Product & Promos': Tag,
    'Service & Staff': Scissors,
    'Financial': DollarSign,
}

export default function SalesReportsPage() {
    const { data: session } = useSession()
    const industryType = (session?.user as any)?.industryType || 'SERVICE'
    const isRetail = industryType === 'RETAIL'

    const salesReports = isRetail ? retailSalesReports : salonSalesReports
    const [searchTerm, setSearchTerm] = useState('')

    const filteredReports = salesReports.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group reports by their group property
    const priorityReports = filteredReports.filter(r => r.priority)
    const groupedReports: Record<string, ReportItem[]> = {}
    filteredReports.filter(r => !r.priority).forEach(report => {
        if (!groupedReports[report.group]) groupedReports[report.group] = []
        groupedReports[report.group].push(report)
    })

    return (
        <div className="p-4 md:p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports"
                        className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 transition-colors border border-stone-700/50"
                    >
                        <ArrowLeft className="w-5 h-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Sales Reports
                            <span className="text-xs font-medium bg-stone-700/80 text-stone-300 px-2.5 py-1 rounded-full border border-stone-600/50">
                                {isRetail ? 'Retail' : 'Salon'}
                            </span>
                        </h1>
                        <p className="text-stone-500 mt-1 ml-14">
                            {filteredReports.length} reports available
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-stone-800/80 border border-stone-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 w-full md:w-72 transition-all"
                    />
                </div>
            </div>

            {/* Priority Reports — large cards */}
            {priorityReports.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">Most Used</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {priorityReports.map((report) => {
                            const Icon = report.icon
                            const colors = colorMap[report.color] || colorMap.emerald
                            return (
                                <Link
                                    key={report.id}
                                    href={report.href}
                                    className={`group relative p-5 rounded-2xl border ${colors.border} bg-stone-900/50 hover:bg-stone-800/80 transition-all duration-300 shadow-lg ${colors.glow} hover:shadow-xl`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${colors.bg}`}>
                                            <Icon className={`w-6 h-6 ${colors.icon}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white text-base group-hover:text-emerald-300 transition-colors">
                                                {report.name}
                                            </h3>
                                            <p className="text-sm text-stone-500 mt-1 leading-relaxed">
                                                {report.description}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="absolute top-5 right-4 w-5 h-5 text-stone-600 group-hover:text-stone-400 group-hover:translate-x-0.5 transition-all" />
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Grouped Report Sections */}
            {Object.entries(groupedReports).map(([groupName, reports]) => {
                const GroupIcon = groupIcons[groupName] || FileText
                return (
                    <div key={groupName}>
                        <div className="flex items-center gap-2 mb-4">
                            <GroupIcon className="w-4 h-4 text-stone-500" />
                            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">{groupName}</h2>
                            <div className="flex-1 h-px bg-stone-800 ml-2" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {reports.map((report) => {
                                const Icon = report.icon
                                const isAvailable = report.status === 'available'
                                const colors = colorMap[report.color] || colorMap.emerald

                                return (
                                    <Link
                                        key={report.id}
                                        href={isAvailable ? report.href : '#'}
                                        className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                                            ${isAvailable
                                                ? `${colors.border} bg-stone-900/30 hover:bg-stone-800/60 ${colors.glow} hover:shadow-lg`
                                                : 'border-stone-800/50 bg-stone-900/20 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        <div className={`p-2.5 rounded-lg shrink-0 ${isAvailable ? colors.bg : 'bg-stone-800/50'}`}>
                                            <Icon className={`w-5 h-5 ${isAvailable ? colors.icon : 'text-stone-600'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-medium truncate ${isAvailable ? 'text-stone-200 group-hover:text-white' : 'text-stone-500'}`}>
                                                    {report.name}
                                                </h3>
                                                {!isAvailable && (
                                                    <span className="shrink-0 text-[10px] font-medium bg-stone-700/50 text-stone-500 px-2 py-0.5 rounded-full border border-stone-700/50">
                                                        SOON
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-500 mt-0.5 truncate">{report.description}</p>
                                        </div>
                                        {isAvailable && (
                                            <ChevronRight className="w-4 h-4 text-stone-600 shrink-0 group-hover:text-stone-400 group-hover:translate-x-0.5 transition-all" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

'use client'

import { useSession } from 'next-auth/react'
import {
    DollarSign,
    Package,
    Users,
    UserCog,
    ChevronRight,
    TrendingUp,
    CreditCard,
    FileText,
    BarChart3,
    Ticket,
    Cigarette,
    Calendar,
    Star,
    Zap
} from 'lucide-react'
import Link from 'next/link'

interface ReportCategory {
    id: string
    name: string
    description: string
    icon: any
    color: string
    accent: string
    count: number
    href: string
}

const retailReportCategories: ReportCategory[] = [
    {
        id: 'sales',
        name: 'Sales Reports',
        description: 'Daily sales, cash vs card, product sales, tobacco scan, lottery, refunds',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        accent: 'emerald',
        count: 10,
        href: '/dashboard/reports/sales'
    },
    {
        id: 'inventory',
        name: 'Inventory Reports',
        description: 'Stock levels, reorder alerts, top sellers, dead stock, item activity',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        accent: 'blue',
        count: 5,
        href: '/dashboard/reports/inventory'
    },
    {
        id: 'customer',
        name: 'Customer Reports',
        description: 'Customer list, loyalty points, top spenders, visit frequency',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        accent: 'purple',
        count: 4,
        href: '/dashboard/reports/customer'
    },
    {
        id: 'employee',
        name: 'Employee Reports',
        description: 'Hours & wages, sales by employee, shift summaries',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        accent: 'orange',
        count: 3,
        href: '/dashboard/reports/employee'
    },
    {
        id: 'tobacco',
        name: 'Tobacco & Age-Restricted',
        description: 'Tobacco scan compliance, age-verified sales, regulatory reporting',
        icon: Cigarette,
        color: 'from-stone-500 to-zinc-600',
        accent: 'stone',
        count: 2,
        href: '/dashboard/reports/tobacco-scan'
    },
    {
        id: 'lottery',
        name: 'Lottery Reports',
        description: 'Lottery ticket sales, pack activity, payout tracking',
        icon: Ticket,
        color: 'from-yellow-500 to-amber-600',
        accent: 'amber',
        count: 2,
        href: '/dashboard/reports/lottery'
    },
]

const salonReportCategories: ReportCategory[] = [
    {
        id: 'sales',
        name: 'Sales Reports',
        description: 'Daily sales, service sales, stylist performance, commissions, tips',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        accent: 'emerald',
        count: 13,
        href: '/dashboard/reports/sales'
    },
    {
        id: 'inventory',
        name: 'Inventory Reports',
        description: 'Stock levels, reorder reports, top sellers, item activity',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        accent: 'blue',
        count: 5,
        href: '/dashboard/reports/inventory'
    },
    {
        id: 'customer',
        name: 'Customer Reports',
        description: 'Customer list, loyalty points, top spenders, A/R summary',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        accent: 'purple',
        count: 4,
        href: '/dashboard/reports/customer'
    },
    {
        id: 'employee',
        name: 'Employee Reports',
        description: 'Barber earnings, utilization, payout history, hours & wages',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        accent: 'orange',
        count: 7,
        href: '/dashboard/reports/employee'
    },
    {
        id: 'appointments',
        name: 'Appointment Reports',
        description: 'Booking trends, no-shows, revenue by appointment type',
        icon: Calendar,
        color: 'from-pink-500 to-rose-600',
        accent: 'pink',
        count: 3,
        href: '/dashboard/reports/appointments'
    },
    {
        id: 'nps',
        name: 'NPS & Reviews',
        description: 'Net Promoter Score trends, customer satisfaction, review activity',
        icon: Star,
        color: 'from-indigo-500 to-blue-600',
        accent: 'indigo',
        count: 2,
        href: '/dashboard/reports/nps'
    },
]

const accentBorderMap: Record<string, string> = {
    emerald: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    blue: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
    purple: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    orange: 'hover:border-orange-500/50 hover:shadow-orange-500/10',
    stone: 'hover:border-stone-500/50 hover:shadow-stone-500/10',
    amber: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    pink: 'hover:border-pink-500/50 hover:shadow-pink-500/10',
    indigo: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
}

export default function ReportsPage() {
    const { data: session } = useSession()
    const industryType = (session?.user as any)?.industryType || 'SERVICE'
    const isRetail = industryType === 'RETAIL'

    const reportCategories = isRetail ? retailReportCategories : salonReportCategories

    // Quick access links differ by vertical
    const quickLinks = isRetail ? [
        { href: '/dashboard/reports/z-report', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'hover:border-emerald-500/50', label: 'Z-Report' },
        { href: '/dashboard/reports/tobacco-scan', icon: Cigarette, color: 'text-stone-400', bg: 'bg-stone-500/10', borderColor: 'hover:border-stone-500/50', label: 'Tobacco Scan' },
        { href: '/dashboard/reports/daily', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', borderColor: 'hover:border-purple-500/50', label: 'Daily Sales' },
        { href: '/dashboard/reports/inventory/low-stock', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10', borderColor: 'hover:border-orange-500/50', label: 'Low Stock' },
    ] : [
        { href: '/dashboard/reports/z-report', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'hover:border-emerald-500/50', label: 'Z-Report' },
        { href: '/dashboard/reports/sales/cc-batch', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', borderColor: 'hover:border-blue-500/50', label: 'CC Batch' },
        { href: '/dashboard/reports/daily', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', borderColor: 'hover:border-purple-500/50', label: 'Daily Sales' },
        { href: '/dashboard/reports/tips', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'hover:border-amber-500/50', label: 'Tips Report' },
    ]

    return (
        <div className="p-4 md:p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/20">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        Reports
                        <span className="text-xs font-medium bg-stone-700/80 text-stone-300 px-2.5 py-1 rounded-full border border-stone-600/50">
                            {isRetail ? 'Retail' : 'Salon'}
                        </span>
                    </h1>
                    <p className="text-stone-500 mt-1 ml-14">Select a category to view reports</p>
                </div>
            </div>

            {/* Quick Access */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">Quick Access</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickLinks.map((link) => {
                        const Icon = link.icon
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`group flex items-center gap-3 bg-stone-900/50 border border-stone-800 rounded-xl p-4 ${link.borderColor} hover:bg-stone-800/60 hover:shadow-lg transition-all duration-200`}
                            >
                                <div className={`p-2 rounded-lg ${link.bg}`}>
                                    <Icon className={`w-5 h-5 ${link.color}`} />
                                </div>
                                <span className="text-stone-300 text-sm font-medium group-hover:text-white transition-colors">{link.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-stone-800" />
                <span className="text-xs text-stone-600 uppercase tracking-widest">All Categories</span>
                <div className="h-px flex-1 bg-stone-800" />
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {reportCategories.map((category) => {
                    const Icon = category.icon
                    const accent = accentBorderMap[category.accent] || accentBorderMap.emerald
                    return (
                        <Link
                            key={category.id}
                            href={category.href}
                            className={`group relative bg-stone-900/50 border border-stone-800 rounded-2xl p-6 ${accent} hover:bg-stone-800/60 hover:shadow-xl transition-all duration-300 overflow-hidden`}
                        >
                            {/* Subtle gradient glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-2xl transition-opacity duration-500`} />

                            <div className="relative flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color} shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                                            {category.name}
                                        </h3>
                                        <p className="text-stone-500 text-sm mt-1 leading-relaxed max-w-sm">
                                            {category.description}
                                        </p>
                                        <span className="inline-flex items-center gap-1.5 mt-3 text-xs text-stone-500 bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-700/50">
                                            <BarChart3 className="w-3 h-3" />
                                            {category.count} reports
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-stone-400 group-hover:translate-x-1 transition-all mt-1" />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

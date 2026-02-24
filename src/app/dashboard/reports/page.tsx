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
    Star
} from 'lucide-react'
import Link from 'next/link'

const retailReportCategories = [
    {
        id: 'sales',
        name: 'Sales Reports',
        description: 'Daily sales, cash vs card, product sales, tobacco scan, lottery, refunds',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        count: 10,
        href: '/dashboard/reports/sales'
    },
    {
        id: 'inventory',
        name: 'Inventory Reports',
        description: 'Stock levels, reorder alerts, top sellers, dead stock, item activity',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        count: 5,
        href: '/dashboard/reports/inventory'
    },
    {
        id: 'customer',
        name: 'Customer Reports',
        description: 'Customer list, loyalty points, top spenders, visit frequency',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        count: 4,
        href: '/dashboard/reports/customer'
    },
    {
        id: 'employee',
        name: 'Employee Reports',
        description: 'Hours & wages, sales by employee, shift summaries',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        count: 3,
        href: '/dashboard/reports/employee'
    },
    {
        id: 'tobacco',
        name: 'Tobacco & Age-Restricted',
        description: 'Tobacco scan compliance, age-verified sales, regulatory reporting',
        icon: Cigarette,
        color: 'from-stone-500 to-zinc-600',
        count: 2,
        href: '/dashboard/reports/tobacco-scan'
    },
    {
        id: 'lottery',
        name: 'Lottery Reports',
        description: 'Lottery ticket sales, pack activity, payout tracking',
        icon: Ticket,
        color: 'from-yellow-500 to-amber-600',
        count: 2,
        href: '/dashboard/reports/lottery'
    },
]

const salonReportCategories = [
    {
        id: 'sales',
        name: 'Sales Reports',
        description: 'Daily sales, service sales, stylist performance, commissions, tips',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        count: 13,
        href: '/dashboard/reports/sales'
    },
    {
        id: 'inventory',
        name: 'Inventory Reports',
        description: 'Stock levels, reorder reports, top sellers, item activity',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        count: 5,
        href: '/dashboard/reports/inventory'
    },
    {
        id: 'customer',
        name: 'Customer Reports',
        description: 'Customer list, loyalty points, top spenders, A/R summary',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        count: 4,
        href: '/dashboard/reports/customer'
    },
    {
        id: 'employee',
        name: 'Employee Reports',
        description: 'Barber earnings, utilization, payout history, hours & wages',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        count: 7,
        href: '/dashboard/reports/employee'
    },
    {
        id: 'appointments',
        name: 'Appointment Reports',
        description: 'Booking trends, no-shows, revenue by appointment type',
        icon: Calendar,
        color: 'from-pink-500 to-rose-600',
        count: 3,
        href: '/dashboard/reports/appointments'
    },
    {
        id: 'nps',
        name: 'NPS & Reviews',
        description: 'Net Promoter Score trends, customer satisfaction, review activity',
        icon: Star,
        color: 'from-indigo-500 to-blue-600',
        count: 2,
        href: '/dashboard/reports/nps'
    },
]

export default function ReportsPage() {
    const { data: session } = useSession()
    const industryType = (session?.user as any)?.industryType || 'SERVICE'
    const isRetail = industryType === 'RETAIL'

    const reportCategories = isRetail ? retailReportCategories : salonReportCategories

    // Quick access links differ by vertical
    const quickLinks = isRetail ? [
        { href: '/dashboard/reports/z-report', icon: FileText, color: 'text-green-400', borderColor: 'hover:border-green-500/50', label: 'Z-Report' },
        { href: '/dashboard/reports/tobacco-scan', icon: Cigarette, color: 'text-stone-400', borderColor: 'hover:border-stone-500/50', label: 'Tobacco Scan' },
        { href: '/dashboard/reports/daily', icon: TrendingUp, color: 'text-purple-400', borderColor: 'hover:border-purple-500/50', label: 'Daily Sales' },
        { href: '/dashboard/reports/inventory/low-stock', icon: Package, color: 'text-orange-400', borderColor: 'hover:border-orange-500/50', label: 'Low Stock' },
    ] : [
        { href: '/dashboard/reports/z-report', icon: FileText, color: 'text-green-400', borderColor: 'hover:border-green-500/50', label: 'Z-Report' },
        { href: '/dashboard/reports/sales/cc-batch', icon: CreditCard, color: 'text-blue-400', borderColor: 'hover:border-blue-500/50', label: 'CC Batch' },
        { href: '/dashboard/reports/daily', icon: TrendingUp, color: 'text-purple-400', borderColor: 'hover:border-purple-500/50', label: 'Daily Sales' },
        { href: '/dashboard/reports/tips', icon: DollarSign, color: 'text-orange-400', borderColor: 'hover:border-orange-500/50', label: 'Tips Report' },
    ]

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-purple-400" />
                        Reports
                        <span className="text-xs font-normal bg-stone-700 text-stone-300 px-2 py-1 rounded-full">
                            {isRetail ? 'Retail' : 'Salon'}
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1">Select a category to view reports</p>
                </div>
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportCategories.map((category) => {
                    const Icon = category.icon
                    return (
                        <Link
                            key={category.id}
                            href={category.href}
                            className="group relative bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 hover:bg-gray-800 transition-all duration-300"
                        >
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-5 group-hover:opacity-10 rounded-xl transition-opacity`} />

                            <div className="relative flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg bg-gradient-to-br ${category.color}`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                                            {category.name}
                                        </h3>
                                        <p className="text-gray-400 text-sm mt-1">
                                            {category.description}
                                        </p>
                                        <span className="inline-block mt-3 text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                                            {category.count} reports
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Quick Access */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickLinks.map((link) => {
                        const Icon = link.icon
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${link.borderColor} transition-colors`}
                            >
                                <Icon className={`w-5 h-5 ${link.color}`} />
                                <span className="text-white text-sm">{link.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    Package,
    Users,
    UserCog,
    ChevronRight,
    ChevronDown,
    TrendingUp,
    CreditCard,
    FileText,
    BarChart3,
    Ticket,
    Cigarette,
    Calendar,
    Star,
    Zap,
    ShieldCheck,
    Building2,
    PieChart,
    Megaphone,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { LocationSwitcher } from '@/components/reports/LocationSwitcher'

interface ReportLink {
    name: string
    href: string
}

interface ReportCategory {
    id: string
    name: string
    description: string
    icon: any
    color: string
    accent: string
    reports: ReportLink[]
}

const retailReportCategories: ReportCategory[] = [
    {
        id: 'sales',
        name: 'Sales Reports',
        description: 'Daily sales, cash vs card, payment methods, refunds, gift cards, EBT',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        accent: 'emerald',
        reports: [
            { name: 'Daily Sales', href: '/dashboard/reports/daily' },
            { name: 'Z-Report', href: '/dashboard/reports/z-report' },
            { name: 'Flash Report', href: '/dashboard/reports/flash-report' },
            { name: 'Realtime Sales', href: '/dashboard/reports/realtime-sales' },
            { name: 'Cash vs Card Breakdown', href: '/dashboard/reports/sales/cash-card' },
            { name: 'Payment Breakdown', href: '/dashboard/reports/sales/payment-breakdown' },
            { name: 'Credit Card Batch', href: '/dashboard/reports/sales/cc-batch' },
            { name: 'Gift Card Report', href: '/dashboard/reports/sales/gift-cards' },
            { name: 'Transactions', href: '/dashboard/reports/transactions' },
            { name: 'Revenue', href: '/dashboard/reports/revenue' },
            { name: 'Tips Report', href: '/dashboard/reports/tips' },
            { name: 'Refunds & Voids', href: '/dashboard/reports/sales' },
            { name: 'EBT / SNAP', href: '/dashboard/reports/ebt-snap' },
            { name: 'Drawer Activity', href: '/dashboard/reports/drawer-activity' },
        ]
    },
    {
        id: 'inventory',
        name: 'Inventory Reports',
        description: 'Stock levels, reorder alerts, top sellers, dead stock, valuations, purchases',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        accent: 'blue',
        reports: [
            { name: 'Inventory Overview', href: '/dashboard/reports/inventory' },
            { name: 'Reorder Alerts', href: '/dashboard/reports/inventory/reorder' },
            { name: 'Top Sellers', href: '/dashboard/reports/inventory/top-sellers' },
            { name: 'Inventory Valuation', href: '/dashboard/reports/inventory-valuation' },
            { name: 'Dead Stock', href: '/dashboard/reports/dead-stock' },
            { name: 'Reorder Report', href: '/dashboard/reports/reorder' },
            { name: 'Stock Adjustments', href: '/dashboard/reports/stock-adjustments' },
            { name: 'Purchase Orders', href: '/dashboard/reports/purchase-orders' },
            { name: 'Waste & Damage', href: '/dashboard/reports/waste-damage' },
            { name: 'Price Changes', href: '/dashboard/reports/price-changes' },
        ]
    },
    {
        id: 'customer',
        name: 'Customer Reports',
        description: 'Customer list, loyalty points, top spenders, A/R summary, retention',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        accent: 'purple',
        reports: [
            { name: 'Customer List', href: '/dashboard/reports/customer/list' },
            { name: 'Loyalty Points', href: '/dashboard/reports/customer/loyalty' },
            { name: 'Top Spenders', href: '/dashboard/reports/customer/top-spenders' },
            { name: 'A/R Summary', href: '/dashboard/reports/customer/ar-summary' },
            { name: 'Customer Retention', href: '/dashboard/reports/customer/retention' },
            { name: 'Retention Analysis', href: '/dashboard/reports/retention' },
        ]
    },
    {
        id: 'employee',
        name: 'Employee Reports',
        description: 'Hours & wages, sales by employee, payouts, earnings, utilization, audit',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        accent: 'orange',
        reports: [
            { name: 'Employee Overview', href: '/dashboard/reports/employee' },
            { name: 'Hours & Wages', href: '/dashboard/reports/employee/hours-wages' },
            { name: 'Sales by Employee', href: '/dashboard/reports/employee/sales' },
            { name: 'Payouts', href: '/dashboard/reports/employee/payouts' },
            { name: 'Earnings', href: '/dashboard/reports/employee/earnings' },
            { name: 'Utilization', href: '/dashboard/reports/employee/utilization' },
            { name: 'Employee Audit', href: '/dashboard/reports/employee-audit' },
            { name: 'Labor Report', href: '/dashboard/reports/labor' },
        ]
    },
    {
        id: 'tobacco',
        name: 'Tobacco & Age-Restricted',
        description: 'Tobacco scan compliance, age-verified sales, tobacco deals',
        icon: Cigarette,
        color: 'from-stone-500 to-zinc-600',
        accent: 'stone',
        reports: [
            { name: 'Tobacco Scan', href: '/dashboard/owner/tobacco-scan' },
            { name: 'Tobacco Deals', href: '/dashboard/owner/tobacco-scan/deals' },
            { name: 'Age-Restricted Sales', href: '/dashboard/reports/age-restricted' },
        ]
    },
    {
        id: 'lottery',
        name: 'Lottery Reports',
        description: 'Lottery ticket sales, pack activity, payout tracking',
        icon: Ticket,
        color: 'from-yellow-500 to-amber-600',
        accent: 'amber',
        reports: [
            { name: 'Lottery Sales', href: '/dashboard/reports/lottery' },
        ]
    },
    {
        id: 'deals',
        name: 'Deals & Promotions',
        description: 'Deals performance, promo effectiveness, marketing ROI',
        icon: Megaphone,
        color: 'from-pink-500 to-rose-600',
        accent: 'pink',
        reports: [
            { name: 'Deals & Promotions', href: '/dashboard/reports/deals' },
            { name: 'Promo Effectiveness', href: '/dashboard/reports/promo-effectiveness' },
            { name: 'Marketing Report', href: '/dashboard/reports/marketing' },
        ]
    },
    {
        id: 'financial',
        name: 'Financial & Analytics',
        description: 'P&L, financial summary, COGS, gross margin, break-even, ABC analysis',
        icon: PieChart,
        color: 'from-teal-500 to-cyan-600',
        accent: 'teal',
        reports: [
            { name: 'P&L Statement', href: '/dashboard/reports/pnl' },
            { name: 'Financial Summary', href: '/dashboard/reports/financial-summary' },
            { name: 'COGS Report', href: '/dashboard/reports/cogs' },
            { name: 'Gross Margin', href: '/dashboard/reports/gross-margin' },
            { name: 'Break-Even Analysis', href: '/dashboard/reports/break-even' },
            { name: 'ABC Analysis', href: '/dashboard/reports/abc-analysis' },
            { name: 'Sales Velocity', href: '/dashboard/reports/sales-velocity' },
            { name: 'Hourly Heatmap', href: '/dashboard/reports/hourly-heatmap' },
        ]
    },
    {
        id: 'multi-location',
        name: 'Multi-Location & Franchise',
        description: 'Store comparison, same-store sales, territory, benchmarking, royalties',
        icon: Building2,
        color: 'from-sky-500 to-blue-600',
        accent: 'sky',
        reports: [
            { name: 'Sales by Category', href: '/dashboard/reports/sales-by-category' },
            { name: 'Sales by SKU', href: '/dashboard/reports/sales-by-sku' },
            { name: 'Sales by Brand', href: '/dashboard/reports/sales-by-brand' },
            { name: 'Sales by Hour', href: '/dashboard/reports/sales-by-hour' },
            { name: 'Sales by Vendor', href: '/dashboard/reports/sales-by-vendor' },
            { name: 'Store Comparison', href: '/dashboard/reports/store-comparison' },
            { name: 'Same-Store Sales', href: '/dashboard/reports/same-store-sales' },
            { name: 'Year-over-Year', href: '/dashboard/reports/year-over-year' },
            { name: 'Benchmarking', href: '/dashboard/reports/benchmarking' },
            { name: 'Territory Report', href: '/dashboard/reports/territory' },
            { name: 'Franchisee Performance', href: '/dashboard/reports/franchisee-performance' },
            { name: 'Royalties', href: '/dashboard/reports/royalties' },
        ]
    },
    {
        id: 'security',
        name: 'Security & Compliance',
        description: 'Loss prevention, anomaly detection, risk analysis, discount audit, compliance',
        icon: ShieldCheck,
        color: 'from-red-500 to-rose-600',
        accent: 'red',
        reports: [
            { name: 'Loss Prevention', href: '/dashboard/reports/loss-prevention' },
            { name: 'Anomaly Detection', href: '/dashboard/reports/anomaly-detection' },
            { name: 'Risk Analysis', href: '/dashboard/reports/risk-analysis' },
            { name: 'Compliance Report', href: '/dashboard/reports/compliance' },
            { name: 'Discount Audit', href: '/dashboard/reports/audit/discounts' },
        ]
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
        reports: [
            { name: 'Daily Sales', href: '/dashboard/reports/daily' },
            { name: 'Z-Report', href: '/dashboard/reports/z-report' },
            { name: 'Flash Report', href: '/dashboard/reports/flash-report' },
            { name: 'Realtime Sales', href: '/dashboard/reports/realtime-sales' },
            { name: 'Cash vs Card Breakdown', href: '/dashboard/reports/sales/cash-card' },
            { name: 'Payment Breakdown', href: '/dashboard/reports/sales/payment-breakdown' },
            { name: 'Credit Card Batch', href: '/dashboard/reports/sales/cc-batch' },
            { name: 'Gift Card Report', href: '/dashboard/reports/sales/gift-cards' },
            { name: 'Transactions', href: '/dashboard/reports/transactions' },
            { name: 'Revenue', href: '/dashboard/reports/revenue' },
            { name: 'Tips Report', href: '/dashboard/reports/tips' },
            { name: 'Drawer Activity', href: '/dashboard/reports/drawer-activity' },
            { name: 'Deals & Promotions', href: '/dashboard/reports/deals' },
        ]
    },
    {
        id: 'inventory',
        name: 'Inventory Reports',
        description: 'Stock levels, reorder reports, top sellers, item activity',
        icon: Package,
        color: 'from-blue-500 to-cyan-600',
        accent: 'blue',
        reports: [
            { name: 'Inventory Overview', href: '/dashboard/reports/inventory' },
            { name: 'Reorder Alerts', href: '/dashboard/reports/inventory/reorder' },
            { name: 'Top Sellers', href: '/dashboard/reports/inventory/top-sellers' },
            { name: 'Inventory Valuation', href: '/dashboard/reports/inventory-valuation' },
            { name: 'Dead Stock', href: '/dashboard/reports/dead-stock' },
        ]
    },
    {
        id: 'customer',
        name: 'Customer Reports',
        description: 'Customer list, loyalty points, top spenders, A/R summary',
        icon: Users,
        color: 'from-purple-500 to-violet-600',
        accent: 'purple',
        reports: [
            { name: 'Customer List', href: '/dashboard/reports/customer/list' },
            { name: 'Loyalty Points', href: '/dashboard/reports/customer/loyalty' },
            { name: 'Top Spenders', href: '/dashboard/reports/customer/top-spenders' },
            { name: 'A/R Summary', href: '/dashboard/reports/customer/ar-summary' },
        ]
    },
    {
        id: 'employee',
        name: 'Employee Reports',
        description: 'Barber earnings, utilization, payout history, hours & wages',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        accent: 'orange',
        reports: [
            { name: 'Employee Overview', href: '/dashboard/reports/employee' },
            { name: 'Hours & Wages', href: '/dashboard/reports/employee/hours-wages' },
            { name: 'Sales by Employee', href: '/dashboard/reports/employee/sales' },
            { name: 'Payouts', href: '/dashboard/reports/employee/payouts' },
            { name: 'Earnings', href: '/dashboard/reports/employee/earnings' },
            { name: 'Utilization', href: '/dashboard/reports/employee/utilization' },
            { name: 'Employee Audit', href: '/dashboard/reports/employee-audit' },
        ]
    },
    {
        id: 'appointments',
        name: 'Appointment Reports',
        description: 'Booking trends, no-shows, revenue by appointment type',
        icon: Calendar,
        color: 'from-pink-500 to-rose-600',
        accent: 'pink',
        reports: [
            { name: 'No-Shows', href: '/dashboard/reports/appointments/no-shows' },
        ]
    },
    {
        id: 'nps',
        name: 'NPS & Reviews',
        description: 'Net Promoter Score trends, customer satisfaction, review activity',
        icon: Star,
        color: 'from-indigo-500 to-blue-600',
        accent: 'indigo',
        reports: [
            { name: 'NPS Dashboard', href: '/dashboard/reports/nps' },
        ]
    },
    {
        id: 'financial',
        name: 'Financial & Analytics',
        description: 'P&L, financial summary, COGS, gross margin, break-even analysis',
        icon: PieChart,
        color: 'from-teal-500 to-cyan-600',
        accent: 'teal',
        reports: [
            { name: 'P&L Statement', href: '/dashboard/reports/pnl' },
            { name: 'Financial Summary', href: '/dashboard/reports/financial-summary' },
            { name: 'COGS Report', href: '/dashboard/reports/cogs' },
            { name: 'Gross Margin', href: '/dashboard/reports/gross-margin' },
            { name: 'Break-Even Analysis', href: '/dashboard/reports/break-even' },
            { name: 'ABC Analysis', href: '/dashboard/reports/abc-analysis' },
            { name: 'Sales Velocity', href: '/dashboard/reports/sales-velocity' },
            { name: 'Hourly Heatmap', href: '/dashboard/reports/hourly-heatmap' },
        ]
    },
    {
        id: 'security',
        name: 'Security & Compliance',
        description: 'Loss prevention, anomaly detection, risk analysis, discount audit',
        icon: ShieldCheck,
        color: 'from-red-500 to-rose-600',
        accent: 'red',
        reports: [
            { name: 'Loss Prevention', href: '/dashboard/reports/loss-prevention' },
            { name: 'Anomaly Detection', href: '/dashboard/reports/anomaly-detection' },
            { name: 'Risk Analysis', href: '/dashboard/reports/risk-analysis' },
            { name: 'Compliance Report', href: '/dashboard/reports/compliance' },
            { name: 'Discount Audit', href: '/dashboard/reports/audit/discounts' },
        ]
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
    teal: 'hover:border-teal-500/50 hover:shadow-teal-500/10',
    sky: 'hover:border-sky-500/50 hover:shadow-sky-500/10',
    red: 'hover:border-red-500/50 hover:shadow-red-500/10',
}

function CategoryCard({ category }: { category: ReportCategory }) {
    const [expanded, setExpanded] = useState(false)
    const Icon = category.icon
    const accent = accentBorderMap[category.accent] || accentBorderMap.emerald

    return (
        <div
            className={`group relative bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden ${accent} hover:bg-stone-800/60 hover:shadow-xl transition-all duration-300`}
        >
            {/* Subtle gradient glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-[0.03] group-hover:opacity-[0.08] rounded-2xl transition-opacity duration-500 pointer-events-none`} />

            {/* Header - clickable to expand */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="relative w-full flex items-start justify-between p-6 text-left"
            >
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
                            {category.reports.length} reports
                        </span>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-stone-600 group-hover:text-stone-400 transition-all mt-1 ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expandable report links */}
            {expanded && (
                <div className="relative border-t border-stone-800 bg-stone-950/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                        {category.reports.map((report) => (
                            <Link
                                key={report.href}
                                href={report.href}
                                className="flex items-center gap-3 px-6 py-3 hover:bg-stone-800/60 transition-colors group/link border-b border-stone-800/50 last:border-b-0"
                            >
                                <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover/link:text-purple-400 transition-colors flex-shrink-0" />
                                <span className="text-sm text-stone-400 group-hover/link:text-white transition-colors">
                                    {report.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ReportsPage() {
    const { data: session } = useSession()
    const industryType = (session?.user as any)?.industryType || 'SERVICE'
    const isRetail = industryType === 'RETAIL'

    const reportCategories = isRetail ? retailReportCategories : salonReportCategories
    const totalReports = reportCategories.reduce((sum, cat) => sum + cat.reports.length, 0)

    // Quick access links differ by vertical
    const quickLinks = isRetail ? [
        { href: '/dashboard/reports/z-report', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'hover:border-emerald-500/50', label: 'Z-Report' },
        { href: '/dashboard/owner/tobacco-scan', icon: Cigarette, color: 'text-stone-400', bg: 'bg-stone-500/10', borderColor: 'hover:border-stone-500/50', label: 'Tobacco Scan' },
        { href: '/dashboard/reports/daily', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', borderColor: 'hover:border-purple-500/50', label: 'Daily Sales' },
        { href: '/dashboard/reports/loss-prevention', icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10', borderColor: 'hover:border-red-500/50', label: 'Loss Prevention' },
        { href: '/dashboard/reports/pnl', icon: PieChart, color: 'text-teal-400', bg: 'bg-teal-500/10', borderColor: 'hover:border-teal-500/50', label: 'P&L' },
        { href: '/dashboard/reports/flash-report', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'hover:border-amber-500/50', label: 'Flash Report' },
    ] : [
        { href: '/dashboard/reports/z-report', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'hover:border-emerald-500/50', label: 'Z-Report' },
        { href: '/dashboard/reports/sales/cc-batch', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', borderColor: 'hover:border-blue-500/50', label: 'CC Batch' },
        { href: '/dashboard/reports/daily', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', borderColor: 'hover:border-purple-500/50', label: 'Daily Sales' },
        { href: '/dashboard/reports/tips', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'hover:border-amber-500/50', label: 'Tips Report' },
        { href: '/dashboard/reports/pnl', icon: PieChart, color: 'text-teal-400', bg: 'bg-teal-500/10', borderColor: 'hover:border-teal-500/50', label: 'P&L' },
        { href: '/dashboard/reports/flash-report', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'hover:border-amber-500/50', label: 'Flash Report' },
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
                        <span className="text-xs font-medium bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30">
                            {totalReports} reports
                        </span>
                    </h1>
                    <p className="text-stone-500 mt-1 ml-14">Click any category to see all reports</p>
                </div>
                <div className="hidden sm:block"><LocationSwitcher /></div>
            </div>

            {/* Quick Access */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">Quick Access</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                {reportCategories.map((category) => (
                    <CategoryCard key={category.id} category={category} />
                ))}
            </div>
        </div>
    )
}

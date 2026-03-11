'use client'

import Link from 'next/link'
import {
    ArrowLeft, Zap, BarChart3, Layers, Clock, ShieldAlert, Activity,
    TrendingUp, AlertTriangle, CreditCard, FileSpreadsheet, DollarSign, Users,
    Truck, Tag, ScanBarcode, Warehouse, ShoppingCart, ClipboardList, FileText,
    Package, ShieldCheck, Ticket, Trash2, Megaphone, ArrowUpDown, Percent, UserCheck
} from 'lucide-react'

const categories = [
    {
        title: '⚡ Daily Operations',
        subtitle: 'Quick snapshots and live data',
        reports: [
            { href: '/dashboard/reports/flash-report', icon: Zap, name: 'Flash Report', desc: 'Daily sales summary with auto-alerts', color: 'text-amber-400 bg-amber-400/10' },
            { href: '/dashboard/reports/realtime-sales', icon: Activity, name: 'Live Sales Ticker', desc: 'Real-time revenue tracker', color: 'text-emerald-400 bg-emerald-400/10' },
            { href: '/dashboard/reports/hourly-heatmap', icon: Clock, name: 'Hourly Heatmap', desc: 'Busiest hours & days', color: 'text-orange-400 bg-orange-400/10' },
            { href: '/dashboard/reports/sales-by-hour', icon: Clock, name: 'Sales by Hour & Day', desc: 'Peak hours for staffing', color: 'text-amber-400 bg-amber-400/10' },
            { href: '/dashboard/reports/year-over-year', icon: BarChart3, name: 'Year-over-Year', desc: 'Compare to last year', color: 'text-cyan-400 bg-cyan-400/10' },
        ]
    },
    {
        title: '📈 Sales Intelligence',
        subtitle: 'Revenue analysis by every dimension',
        reports: [
            { href: '/dashboard/reports/sales-by-category', icon: BarChart3, name: 'By Category', desc: 'Revenue & margin per category', color: 'text-blue-400 bg-blue-400/10' },
            { href: '/dashboard/reports/sales-by-vendor', icon: Truck, name: 'By Vendor', desc: 'Supplier performance ranking', color: 'text-orange-400 bg-orange-400/10' },
            { href: '/dashboard/reports/sales-by-brand', icon: Tag, name: 'By Brand', desc: 'Brand-level sales & margin', color: 'text-violet-400 bg-violet-400/10' },
            { href: '/dashboard/reports/sales-by-sku', icon: ScanBarcode, name: 'By SKU / Barcode', desc: 'Scan-level item lookup', color: 'text-cyan-400 bg-cyan-400/10' },
            { href: '/dashboard/reports/sales-velocity', icon: TrendingUp, name: 'Sales Velocity', desc: 'Ranked by sell-through speed', color: 'text-blue-400 bg-blue-400/10' },
            { href: '/dashboard/reports/abc-analysis', icon: Layers, name: 'ABC Analysis', desc: 'Revenue-based classification', color: 'text-purple-400 bg-purple-400/10' },
            { href: '/dashboard/reports/gross-margin', icon: Percent, name: 'Gross Margin', desc: 'Per-item profitability & alerts', color: 'text-emerald-400 bg-emerald-400/10' },
        ]
    },
    {
        title: '📦 Inventory & Supply',
        subtitle: 'Stock levels, orders, and adjustments',
        reports: [
            { href: '/dashboard/reports/inventory-valuation', icon: Warehouse, name: 'Inventory Valuation', desc: 'Total stock at cost & retail', color: 'text-indigo-400 bg-indigo-400/10' },
            { href: '/dashboard/reports/reorder', icon: ShoppingCart, name: 'Reorder Report', desc: 'Below reorder point — act now', color: 'text-red-400 bg-red-400/10' },
            { href: '/dashboard/reports/stock-adjustments', icon: ClipboardList, name: 'Stock Adjustments', desc: 'Damage, theft, restock log', color: 'text-teal-400 bg-teal-400/10' },
            { href: '/dashboard/reports/purchase-orders', icon: FileText, name: 'Purchase Orders', desc: 'POs by status & supplier', color: 'text-sky-400 bg-sky-400/10' },
            { href: '/dashboard/reports/waste-damage', icon: Trash2, name: 'Waste / Damage', desc: 'Loss tracking by reason', color: 'text-rose-400 bg-rose-400/10' },
            { href: '/dashboard/reports/price-changes', icon: ArrowUpDown, name: 'Price Changes Audit', desc: 'Before → after price log', color: 'text-amber-400 bg-amber-400/10' },
        ]
    },
    {
        title: '🛡️ Compliance & Security',
        subtitle: 'Age verification, loss prevention, anomalies',
        reports: [
            { href: '/dashboard/reports/age-restricted', icon: ShieldCheck, name: 'Age-Restricted Log', desc: 'ID scan vs override tracking', color: 'text-red-400 bg-red-400/10' },
            { href: '/dashboard/reports/ebt-snap', icon: CreditCard, name: 'EBT / SNAP Report', desc: 'Government benefit payments', color: 'text-green-400 bg-green-400/10' },
            { href: '/dashboard/reports/lottery', icon: Ticket, name: 'Lottery Report', desc: 'Sales, payouts & pack tracking', color: 'text-yellow-400 bg-yellow-400/10' },
            { href: '/dashboard/reports/tobacco-scan', icon: Package, name: 'Tobacco Scan Data', desc: 'Manufacturer rebate submissions', color: 'text-amber-400 bg-amber-400/10' },
            { href: '/dashboard/reports/employee-audit', icon: UserCheck, name: 'Employee Activity Audit', desc: 'Risk-scored employee behavior log', color: 'text-orange-400 bg-orange-400/10' },
            { href: '/dashboard/reports/loss-prevention', icon: ShieldAlert, name: 'Loss Prevention', desc: 'Security risk dashboard', color: 'text-red-400 bg-red-400/10' },
            { href: '/dashboard/reports/anomaly-detection', icon: AlertTriangle, name: 'Anomaly Detection', desc: 'Unusual cashier patterns', color: 'text-rose-400 bg-rose-400/10' },
        ]
    },
    {
        title: '💰 Financial & Promotion',
        subtitle: 'Payments, exports, promotions',
        reports: [
            { href: '/dashboard/reports/promo-effectiveness', icon: Megaphone, name: 'Promotion Effectiveness', desc: 'How your deals perform', color: 'text-pink-400 bg-pink-400/10' },
            { href: '/dashboard/reports/sales/payment-breakdown', icon: CreditCard, name: 'Payment Breakdown', desc: 'Cash vs Card vs EBT', color: 'text-pink-400 bg-pink-400/10' },
            { href: '/dashboard/owner/accounting-export', icon: DollarSign, name: 'QuickBooks / Xero', desc: 'Accounting journal export', color: 'text-green-400 bg-green-400/10' },
            { href: '/dashboard/owner/reports', icon: FileSpreadsheet, name: 'Classic Reports', desc: 'Daily sales, tax, employee', color: 'text-stone-400 bg-stone-400/10' },
            { href: '/dashboard/owner/customer-segments', icon: Users, name: 'Customer Segments', desc: 'VIP, Regular, Occasional', color: 'text-indigo-400 bg-indigo-400/10' },
        ]
    },
]

export default function ReportsHubPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">📊 Retail Reports Hub</h1>
                        <p className="text-stone-400">All {categories.reduce((s, c) => s + c.reports.length, 0)} reports & analytics in one place</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {categories.map(cat => (
                        <div key={cat.title}>
                            <div className="mb-4">
                                <h2 className="text-xl font-bold">{cat.title}</h2>
                                <p className="text-sm text-stone-500">{cat.subtitle}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {cat.reports.map(r => (
                                    <Link
                                        key={r.href}
                                        href={r.href}
                                        className="group bg-stone-900/80 backdrop-blur border border-stone-700/50 rounded-2xl p-5 hover:border-stone-500 hover:bg-stone-800/80 hover:scale-[1.02] transition-all"
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
                    ))}
                </div>
            </div>
        </div>
    )
}

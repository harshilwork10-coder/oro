'use client'

import Link from 'next/link'
import {
    Sparkles, AlertTriangle, CheckSquare, Bell, DollarSign, Lock,
    Shield, FileText, Calendar, Receipt, Gift, Heart, Users,
    ArrowLeftRight, Tag, Truck, ArrowRight, ClipboardList, Landmark,
    FileSpreadsheet
} from 'lucide-react'

const operationsCategories = [
    {
        title: 'Daily Operations',
        color: 'from-orange-500 to-amber-500',
        cards: [
            { name: 'Daily Briefing', href: '/dashboard/owner/briefing', icon: Sparkles, desc: 'AI-powered daily summary' },
            { name: 'Exceptions', href: '/dashboard/owner/exceptions', icon: AlertTriangle, desc: 'Voids, overrides, no-sales' },
            { name: 'Approval Queue', href: '/dashboard/owner/approval-queue', icon: CheckSquare, desc: 'Pending approvals' },
            { name: 'Notifications', href: '/dashboard/owner/notifications', icon: Bell, desc: 'Alerts & system messages' },
        ]
    },
    {
        title: 'Cash & Safe',
        color: 'from-emerald-500 to-green-500',
        cards: [
            { name: 'Cash Management', href: '/dashboard/owner/cash', icon: DollarSign, desc: 'Drawer counts & drops' },
            { name: 'Safe Management', href: '/dashboard/owner/safe-management', icon: Lock, desc: 'Safe counts & transfers' },
        ]
    },
    {
        title: 'Loss Prevention',
        color: 'from-red-500 to-rose-500',
        cards: [
            { name: 'LP Audit', href: '/dashboard/owner/lp-audit', icon: Shield, desc: 'Loss prevention review' },
            { name: 'ID Verification Logs', href: '/dashboard/owner/id-logs', icon: FileText, desc: 'Age check records' },
            { name: 'Sales Rules', href: '/dashboard/owner/sales-rules', icon: ClipboardList, desc: 'Item restrictions & limits' },
        ]
    },
    {
        title: 'Financial',
        color: 'from-blue-500 to-indigo-500',
        cards: [
            { name: 'Vendor Invoices', href: '/dashboard/reports/invoices', icon: FileText, desc: 'Upload, match & post vendor invoices' },
            { name: 'Invoice Match (PO)', href: '/dashboard/inventory/invoice-match', icon: FileSpreadsheet, desc: 'Match POs against vendor invoices' },
            { name: 'Tax Report', href: '/dashboard/owner/tax-report', icon: Landmark, desc: 'Sales tax summary' },
            { name: 'Month Close', href: '/dashboard/owner/month-close', icon: Calendar, desc: 'End-of-month reconciliation' },
            { name: 'Accounting Export', href: '/dashboard/owner/accounting-export', icon: Receipt, desc: 'QuickBooks, Xero export' },
        ]
    },
    {
        title: 'Inventory Operations',
        color: 'from-purple-500 to-violet-500',
        cards: [
            { name: 'Transfers', href: '/dashboard/owner/transfers', icon: ArrowLeftRight, desc: 'Move stock between locations' },
            { name: 'Bulk Pricing', href: '/dashboard/inventory/bulk-price-update', icon: Tag, desc: 'Mass price changes' },
            { name: 'Vendors', href: '/dashboard/owner/vendors', icon: Truck, desc: 'Supplier management' },
        ]
    },
    {
        title: 'Customer Programs',
        color: 'from-pink-500 to-rose-500',
        cards: [
            { name: 'Gift Cards', href: '/dashboard/owner/gift-cards', icon: Gift, desc: 'Issue & manage gift cards' },
            { name: 'Loyalty Program', href: '/dashboard/owner/loyalty', icon: Heart, desc: 'Points & rewards' },
            { name: 'Customer Segments', href: '/dashboard/owner/customer-segments', icon: Users, desc: 'Customer groups & targeting' },
            { name: 'Employee Discounts', href: '/dashboard/owner/employee-discounts', icon: Tag, desc: 'Staff discount rules' },
        ]
    },
]

export default function OperationsPage() {
    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Operations
                </h1>
                <p className="text-stone-400 mt-2">All owner-level operational tools in one place.</p>
            </div>

            <div className="space-y-8">
                {operationsCategories.map((category) => (
                    <div key={category.title}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${category.color}`} />
                            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">{category.title}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {category.cards.map((card) => {
                                const CardIcon = card.icon
                                return (
                                    <Link
                                        key={card.href}
                                        href={card.href}
                                        className="glass-panel p-4 rounded-xl hover:border-orange-500/30 transition-all group flex items-start gap-3"
                                    >
                                        <div className="h-10 w-10 bg-stone-800/80 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/10 transition-colors">
                                            <CardIcon className="h-5 w-5 text-stone-400 group-hover:text-orange-400 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-stone-200 group-hover:text-orange-200 transition-colors">{card.name}</p>
                                            <p className="text-xs text-stone-500 mt-0.5">{card.desc}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-orange-400 mt-1 flex-shrink-0 transition-colors" />
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

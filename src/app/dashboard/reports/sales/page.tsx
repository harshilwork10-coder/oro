'use client'

import { useState, useEffect } from 'react'
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
    Download,
    Calendar,
    ChevronRight,
    Search
} from 'lucide-react'
import Link from 'next/link'

const salesReports = [
    {
        id: 'daily-sales',
        name: 'Daily Sales / Z-Report',
        description: 'End of day sales summary with all transactions',
        icon: FileText,
        href: '/dashboard/reports/z-report',
        status: 'available'
    },
    {
        id: 'weekly-summary',
        name: 'Weekly Summary',
        description: 'Week over week comparison and trends',
        icon: TrendingUp,
        href: '/dashboard/reports/revenue',
        status: 'available'
    },
    {
        id: 'tax-summary',
        name: 'Tax Summary',
        description: 'Sales tax collected for filing',
        icon: Percent,
        href: '/dashboard/reports/tax',
        status: 'available'
    },
    {
        id: 'payment-breakdown',
        name: 'Payment Type Breakdown',
        description: 'Cash vs card vs other payment methods',
        icon: DollarSign,
        href: '/dashboard/reports/sales/payment-breakdown',
        status: 'available'
    },
    {
        id: 'cc-batch',
        name: 'Credit Card Batch Report',
        description: 'Transaction time, auth code, last 4, amount - for processor disputes',
        icon: CreditCard,
        href: '/dashboard/reports/sales/cc-batch',
        status: 'available',
        priority: true
    },
    {
        id: 'refunds-voids',
        name: 'Refunds & Voids',
        description: 'Voided transactions and refunds issued',
        icon: RefreshCw,
        href: '/dashboard/reports/transactions?filter=refunds',
        status: 'available'
    },
    {
        id: 'gift-cards',
        name: 'Gift Card Report',
        description: 'Sold, redeemed, outstanding balance',
        icon: Gift,
        href: '/dashboard/reports/sales/gift-cards',
        status: 'available'
    },
    {
        id: 'cogs',
        name: 'Cost of Goods Sold (COGS)',
        description: 'Product cost vs revenue analysis',
        icon: Receipt,
        href: '/dashboard/reports/cogs',
        status: 'available'
    },
    {
        id: 'deals-promotions',
        name: 'Deals & Promotions',
        description: 'Active deals performance and savings',
        icon: Tag,
        href: '/dashboard/reports/deals',
        status: 'available'
    }
]

export default function SalesReportsPage() {
    const { data: session } = useSession()
    const [searchTerm, setSearchTerm] = useState('')

    const filteredReports = salesReports.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Sales Reports
                        </h1>
                        <p className="text-gray-400 mt-1">9 reports available</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 w-64"
                    />
                </div>
            </div>

            {/* Reports List */}
            <div className="space-y-3">
                {filteredReports.map((report) => {
                    const Icon = report.icon
                    const isAvailable = report.status === 'available'

                    return (
                        <Link
                            key={report.id}
                            href={isAvailable ? report.href : '#'}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${report.priority
                                ? 'bg-blue-900/20 border-blue-500/50 hover:border-blue-400'
                                : isAvailable
                                    ? 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:bg-gray-800'
                                    : 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${report.priority ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
                                    <Icon className={`w-5 h-5 ${report.priority ? 'text-blue-400' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{report.name}</h3>
                                        {report.priority && (
                                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">PRIORITY</span>
                                        )}
                                        {!isAvailable && (
                                            <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">Coming Soon</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-0.5">{report.description}</p>
                                </div>
                            </div>
                            {isAvailable && (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}


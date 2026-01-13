'use client'

import { useState } from 'react'
import {
    Users,
    ArrowLeft,
    Award,
    TrendingUp,
    FileText,
    DollarSign,
    ChevronRight,
    Search
} from 'lucide-react'
import Link from 'next/link'

const customerReports = [
    {
        id: 'customer-list',
        name: 'Customer List',
        description: 'All registered customers with contact info',
        icon: Users,
        href: '/dashboard/reports/customer/list',
        status: 'available'
    },
    {
        id: 'loyalty-points',
        name: 'Loyalty Points Report',
        description: 'Customer points balances and redemption history',
        icon: Award,
        href: '/dashboard/reports/customer/loyalty',
        status: 'available'
    },
    {
        id: 'top-spenders',
        name: 'Top Spenders',
        description: 'Customers ranked by total spending',
        icon: TrendingUp,
        href: '/dashboard/reports/customer/top-spenders',
        status: 'available'
    },
    {
        id: 'ar-summary',
        name: 'A/R Summary (Store Accounts)',
        description: 'Customers with open balances and house accounts',
        icon: DollarSign,
        href: '/dashboard/reports/customer/ar-summary',
        status: 'available'
    },
    {
        id: 'retention',
        name: 'Client Retention',
        description: 'Track returning clients and rebooking rates',
        icon: TrendingUp,
        href: '/dashboard/reports/customer/retention',
        status: 'available'
    }
]

export default function CustomerReportsPage() {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredReports = customerReports.filter(report =>
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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            Customer Reports
                        </h1>
                        <p className="text-gray-400 mt-1">4 reports available</p>
                    </div>
                </div>

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
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isAvailable
                                ? 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:bg-gray-800'
                                : 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-gray-700">
                                    <Icon className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{report.name}</h3>
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


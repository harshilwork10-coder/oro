'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    UserCog,
    ArrowLeft,
    Clock,
    DollarSign,
    FileText,
    ChevronRight,
    Search,
    Star,
    Wallet,
    Activity,
    Users,
    TrendingUp
} from 'lucide-react'
import Link from 'next/link'

// ─── Retail employee reports — no barber/stylist language ──────────────────
const retailEmployeeReports = [
    {
        id: 'sales-by-employee',
        name: 'Sales by Employee',
        description: 'Revenue and transaction count per employee — who is your top performer?',
        icon: TrendingUp,
        href: '/dashboard/reports/employee/sales',
        status: 'available',
        priority: true
    },
    {
        id: 'hours-wages',
        name: 'Hours & Wages',
        description: 'Employee time entries and calculated pay for the period',
        icon: Clock,
        href: '/dashboard/reports/employee/hours-wages',
        status: 'available',
        priority: true
    },
    {
        id: 'shift-summary',
        name: 'Shift Summary',
        description: 'Daily shift details with drawer open/close amounts',
        icon: FileText,
        href: '/dashboard/reports/z-report',
        status: 'available'
    },
    {
        id: 'employee-performance',
        name: 'Employee Performance',
        description: 'Average transaction value, items per transaction, units sold by employee',
        icon: Star,
        href: '/dashboard/reports/employee/sales',
        status: 'available'
    },
    {
        id: 'drawer-activity',
        name: 'Drawer Activity',
        description: 'Cash drawer opens, overages, and shortages per employee',
        icon: Wallet,
        href: '/dashboard/reports/drawer-activity',
        status: 'available'
    },
]

// ─── Salon employee reports — barber/stylist specific ─────────────────────
const salonEmployeeReports = [
    {
        id: 'earnings-statement',
        name: 'Barber Earnings Statement',
        description: 'Detailed breakdown of earnings per barber (services, commission, tips, refunds)',
        icon: DollarSign,
        href: '/dashboard/reports/employee/earnings',
        status: 'available',
        priority: true
    },
    {
        id: 'payout-history',
        name: 'Payout History',
        description: 'Track all payouts to barbers/stylists with status',
        icon: Wallet,
        href: '/dashboard/reports/employee/payouts',
        status: 'available',
        priority: true
    },
    {
        id: 'utilization',
        name: 'Barber Utilization',
        description: 'Chair efficiency: clocked hours vs services, revenue per hour, idle time',
        icon: Activity,
        href: '/dashboard/reports/employee/utilization',
        status: 'available',
        priority: true
    },
    {
        id: 'stylist-performance',
        name: 'Stylist Performance',
        description: 'Revenue, client count, and average ticket by stylist',
        icon: Star,
        href: '/dashboard/reports/employee/sales',
        status: 'available'
    },
    {
        id: 'hours-wages',
        name: 'Hours & Wages',
        description: 'Employee time entries and calculated pay',
        icon: Clock,
        href: '/dashboard/reports/employee/hours-wages',
        status: 'available'
    },
    {
        id: 'sales-by-employee',
        name: 'Sales by Employee',
        description: 'Revenue and transaction count per employee',
        icon: FileText,
        href: '/dashboard/reports/employee/sales',
        status: 'available'
    },
    {
        id: 'shift-summary',
        name: 'Shift Summary',
        description: 'Daily shift details with drawer counts',
        icon: FileText,
        href: '/dashboard/reports/z-report',
        status: 'available'
    },
]

export default function EmployeeReportsPage() {
    const { data: session } = useSession()
    const industryType = (session?.user as any)?.industryType || 'SERVICE'
    const isRetail = industryType === 'RETAIL'

    const employeeReports = isRetail ? retailEmployeeReports : salonEmployeeReports
    const [searchTerm, setSearchTerm] = useState('')

    const filteredReports = employeeReports.filter(report =>
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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                                <UserCog className="w-6 h-6 text-white" />
                            </div>
                            Employee Reports
                            <span className="text-xs font-normal bg-stone-700 text-stone-300 px-2 py-1 rounded-full">
                                {isRetail ? 'Retail' : 'Salon'}
                            </span>
                        </h1>
                        <p className="text-gray-400 mt-1">{filteredReports.length} reports available</p>
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
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${(report as any).priority
                                ? 'bg-orange-900/10 border-orange-500/40 hover:border-orange-400'
                                : isAvailable
                                    ? 'bg-gray-800/50 border-gray-700 hover:border-orange-500/50 hover:bg-gray-800'
                                    : 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${(report as any).priority ? 'bg-orange-500/20' : 'bg-gray-700'}`}>
                                    <Icon className={`w-5 h-5 ${(report as any).priority ? 'text-orange-400' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{report.name}</h3>
                                        {(report as any).priority && (
                                            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">PRIORITY</span>
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

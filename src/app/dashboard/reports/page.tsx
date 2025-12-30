'use client'

import { useState } from 'react'
import {
    DollarSign,
    Package,
    Users,
    UserCog,
    ChevronRight,
    TrendingUp,
    CreditCard,
    FileText,
    BarChart3
} from 'lucide-react'
import Link from 'next/link'

const reportCategories = [
    {
        id: 'sales',
        name: 'Sales Reports',
        description: 'Daily sales, tax summary, payment breakdown, credit card batches',
        icon: DollarSign,
        color: 'from-green-500 to-emerald-600',
        count: 9,
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
        description: 'Hours & wages, sales by employee, shift summary',
        icon: UserCog,
        color: 'from-orange-500 to-amber-600',
        count: 3,
        href: '/dashboard/reports/employee'
    }
]

export default function ReportsPage() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-purple-400" />
                        Reports
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
                    <Link
                        href="/dashboard/reports/z-report"
                        className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-green-500/50 transition-colors"
                    >
                        <FileText className="w-5 h-5 text-green-400" />
                        <span className="text-white text-sm">Z-Report</span>
                    </Link>
                    <Link
                        href="/dashboard/reports/sales/cc-batch"
                        className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                    >
                        <CreditCard className="w-5 h-5 text-blue-400" />
                        <span className="text-white text-sm">CC Batch</span>
                    </Link>
                    <Link
                        href="/dashboard/reports/daily"
                        className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                    >
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        <span className="text-white text-sm">Daily Sales</span>
                    </Link>
                    <Link
                        href="/dashboard/reports/inventory/low-stock"
                        className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-orange-500/50 transition-colors"
                    >
                        <Package className="w-5 h-5 text-orange-400" />
                        <span className="text-white text-sm">Low Stock</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}


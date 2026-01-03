'use client'

import { useState } from 'react'
import {
    Package,
    ArrowLeft,
    AlertTriangle,
    TrendingUp,
    RotateCcw,
    FileText,
    ShoppingCart,
    ChevronRight,
    Search,
    PackageX
} from 'lucide-react'
import Link from 'next/link'

const inventoryReports = [
    {
        id: 'dead-stock',
        name: 'Dead Stock Alert',
        description: 'Products not sold in 90+ days - identify capital tied up in slow-moving inventory',
        icon: PackageX,
        href: '/dashboard/reports/dead-stock',
        status: 'available',
        featured: true
    },
    {
        id: 'stock-levels',
        name: 'Stock Levels / Low Stock Alerts',
        description: 'Current inventory levels and items below reorder point',
        icon: AlertTriangle,
        href: '/dashboard/inventory/retail',
        status: 'available'
    },
    {
        id: 'reorder',
        name: 'Reorder Report',
        description: 'Items that need to be reordered based on min stock levels',
        icon: RotateCcw,
        href: '/dashboard/reports/inventory/reorder',
        status: 'available'
    },
    {
        id: 'top-sellers',
        name: 'Top Sellers',
        description: 'Best selling products by quantity and revenue',
        icon: TrendingUp,
        href: '/dashboard/reports/inventory/top-sellers',
        status: 'available'
    },
    {
        id: 'item-activity',
        name: 'Item Activity Report',
        description: 'Sales and stock movement for specific items',
        icon: FileText,
        href: '/dashboard/reports/inventory/item-activity',
        status: 'coming'
    },
    {
        id: 'purchase-orders',
        name: 'Purchase Orders',
        description: 'Pending and completed purchase orders from vendors',
        icon: ShoppingCart,
        href: '/dashboard/reports/inventory/purchase-orders',
        status: 'coming'
    }
]

export default function InventoryReportsPage() {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredReports = inventoryReports.filter(report =>
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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            Inventory Reports
                        </h1>
                        <p className="text-gray-400 mt-1">6 reports available</p>
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
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${(report as any).featured
                                    ? 'bg-gradient-to-r from-red-900/30 to-orange-900/20 border-red-500/50 hover:border-red-400'
                                    : isAvailable
                                        ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800'
                                        : 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${(report as any).featured ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gray-700'}`}>
                                    <Icon className={`w-5 h-5 ${(report as any).featured ? 'text-white' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{report.name}</h3>
                                        {(report as any).featured && (
                                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">NEW</span>
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


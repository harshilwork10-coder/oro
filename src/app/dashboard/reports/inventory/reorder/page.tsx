'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    RotateCcw,
    ArrowLeft,
    AlertTriangle,
    Package,
    RefreshCw,
    ShoppingCart
} from 'lucide-react'
import Link from 'next/link'

interface ReorderItem {
    id: string
    name: string
    barcode: string
    category: string
    currentStock: number
    minStock: number
    maxStock: number
    suggestedOrder: number
    vendor: string
    cost: number
}

export default function ReorderReportPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<ReorderItem[]>([])

    useEffect(() => {
        fetchReorderItems()
    }, [])

    const fetchReorderItems = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/reports/reorder')
            if (res.ok) {
                const data = await res.json()
                setItems(data.items || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalValue = items.reduce((sum, item) => sum + (item.suggestedOrder * item.cost), 0)

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/inventory" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                                <RotateCcw className="w-6 h-6 text-white" />
                            </div>
                            Reorder Report
                        </h1>
                        <p className="text-gray-400 mt-1">Items below minimum stock level</p>
                    </div>
                </div>
                <button onClick={fetchReorderItems} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                    <p className="text-red-300 text-sm">Items Need Reorder</p>
                    <p className="text-2xl font-bold text-red-400">{items.length}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Units Needed</p>
                    <p className="text-2xl font-bold text-white">{items.reduce((s, i) => s + i.suggestedOrder, 0)}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Est. Order Value</p>
                    <p className="text-2xl font-bold text-green-400">${totalValue.toFixed(2)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Vendor</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Current</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Min</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Order Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Unit Cost</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-green-400">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                All items are in stock!
                            </td></tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                            <div>
                                                <p className="text-white font-medium">{item.name}</p>
                                                <p className="text-gray-500 text-xs">{item.barcode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{item.vendor || '-'}</td>
                                    <td className="px-4 py-3 text-right text-red-400 font-medium">{item.currentStock}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">{item.minStock}</td>
                                    <td className="px-4 py-3 text-right text-blue-400 font-medium">{item.suggestedOrder}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">${item.cost.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-medium">${(item.suggestedOrder * item.cost).toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

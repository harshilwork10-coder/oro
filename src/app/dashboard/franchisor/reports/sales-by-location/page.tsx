'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Store, RefreshCw, Download, TrendingUp, TrendingDown,
    DollarSign, CreditCard, Wallet, Receipt, Printer
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationSales {
    locationId: string
    locationName: string
    totalSales: number
    cashSales: number
    cardSales: number
    transactionCount: number
    avgTicket: number
    taxCollected: number
    tipsCollected: number
}

export default function SalesByLocationPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today')
    const [data, setData] = useState<{
        salesByLocation: LocationSales[]
        totals: any
        dateRange: any
    } | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/franchisor/sales-by-location?period=${period}`)
            const json = await res.json()
            setData(json)
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [period])

    const printReport = () => {
        window.print()
    }

    // Calculate percentage of total for each location
    const getPercentage = (value: number) => {
        if (!data?.totals.totalSales) return 0
        return ((value / data.totals.totalSales) * 100).toFixed(1)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6 print:bg-white print:text-black">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/franchisor/reports" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Store className="h-8 w-8 text-amber-500" />
                            Sales by Location
                        </h1>
                        <p className="text-stone-400">Compare sales performance across all your stores</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={printReport}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-xl"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Sales by Location Report</h1>
                <p className="text-gray-600">{new Date().toLocaleDateString()}</p>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 mb-6 print:hidden">
                {(['today', 'week', 'month', 'year'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${period === p
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                ))}
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="ml-auto p-2 bg-stone-800 rounded-xl hover:bg-stone-700"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary Cards */}
            {data?.totals && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 print:grid-cols-5">
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100">
                        <p className="text-stone-400 text-sm print:text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-green-400 print:text-green-600">
                            {formatCurrency(data.totals.totalSales)}
                        </p>
                    </div>
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-emerald-400" />
                            <p className="text-stone-400 text-sm print:text-gray-600">Cash</p>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(data.totals.cashSales)}</p>
                    </div>
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-400" />
                            <p className="text-stone-400 text-sm print:text-gray-600">Card</p>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(data.totals.cardSales)}</p>
                    </div>
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100">
                        <p className="text-stone-400 text-sm print:text-gray-600">Transactions</p>
                        <p className="text-xl font-bold">{data.totals.transactionCount}</p>
                    </div>
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100">
                        <p className="text-stone-400 text-sm print:text-gray-600">Tax Collected</p>
                        <p className="text-xl font-bold text-amber-400 print:text-amber-600">
                            {formatCurrency(data.totals.taxCollected)}
                        </p>
                    </div>
                </div>
            )}

            {/* Sales Table */}
            {data?.salesByLocation && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden print:bg-white print:border-gray-300">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-800 print:bg-gray-200">
                                <tr>
                                    <th className="text-left py-4 px-6 font-semibold">#</th>
                                    <th className="text-left py-4 px-6 font-semibold">Location</th>
                                    <th className="text-right py-4 px-6 font-semibold">Total Sales</th>
                                    <th className="text-right py-4 px-6 font-semibold">% Share</th>
                                    <th className="text-right py-4 px-6 font-semibold">Cash</th>
                                    <th className="text-right py-4 px-6 font-semibold">Card</th>
                                    <th className="text-right py-4 px-6 font-semibold">Transactions</th>
                                    <th className="text-right py-4 px-6 font-semibold">Avg Ticket</th>
                                    <th className="text-right py-4 px-6 font-semibold">Tax</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.salesByLocation.map((loc, idx) => (
                                    <tr
                                        key={loc.locationId}
                                        className="border-t border-stone-800 hover:bg-stone-800/50 print:border-gray-200"
                                    >
                                        <td className="py-4 px-6 text-stone-500">{idx + 1}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-amber-400" />
                                                <span className="font-medium">{loc.locationName}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-green-400 print:text-green-600">
                                            {formatCurrency(loc.totalSales)}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 bg-stone-700 rounded-full h-2 print:bg-gray-300">
                                                    <div
                                                        className="bg-amber-500 h-2 rounded-full"
                                                        style={{ width: `${getPercentage(loc.totalSales)}%` }}
                                                    />
                                                </div>
                                                <span className="text-stone-400 text-sm w-12">
                                                    {getPercentage(loc.totalSales)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right text-emerald-400">
                                            {formatCurrency(loc.cashSales)}
                                        </td>
                                        <td className="py-4 px-6 text-right text-blue-400">
                                            {formatCurrency(loc.cardSales)}
                                        </td>
                                        <td className="py-4 px-6 text-right">{loc.transactionCount}</td>
                                        <td className="py-4 px-6 text-right">{formatCurrency(loc.avgTicket)}</td>
                                        <td className="py-4 px-6 text-right text-amber-400">
                                            {formatCurrency(loc.taxCollected)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-stone-800 font-bold print:bg-gray-200">
                                <tr>
                                    <td className="py-4 px-6"></td>
                                    <td className="py-4 px-6">TOTAL ({data.salesByLocation.length} locations)</td>
                                    <td className="py-4 px-6 text-right text-green-400 print:text-green-600">
                                        {formatCurrency(data.totals.totalSales)}
                                    </td>
                                    <td className="py-4 px-6 text-right">100%</td>
                                    <td className="py-4 px-6 text-right text-emerald-400">
                                        {formatCurrency(data.totals.cashSales)}
                                    </td>
                                    <td className="py-4 px-6 text-right text-blue-400">
                                        {formatCurrency(data.totals.cardSales)}
                                    </td>
                                    <td className="py-4 px-6 text-right">{data.totals.transactionCount}</td>
                                    <td className="py-4 px-6 text-right">
                                        {formatCurrency(data.totals.transactionCount > 0
                                            ? data.totals.totalSales / data.totals.transactionCount
                                            : 0
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-right text-amber-400">
                                        {formatCurrency(data.totals.taxCollected)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* No Data State */}
            {!loading && (!data?.salesByLocation || data.salesByLocation.length === 0) && (
                <div className="text-center py-12 text-stone-500">
                    <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sales data for this period</p>
                </div>
            )}

            {/* Print Footer */}
            <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
                <p>Generated: {new Date().toLocaleString()}</p>
            </div>
        </div>
    )
}


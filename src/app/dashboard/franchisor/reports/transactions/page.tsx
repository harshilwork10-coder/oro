'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Receipt, RefreshCw, Search, Filter,
    Store, User, CreditCard, Wallet, ChevronLeft, ChevronRight,
    Eye, Printer
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
    id: string
    invoiceNumber: string
    dateTime: string
    location: string
    employee: string
    customer: string
    subtotal: number
    tax: number
    total: number
    tip: number
    paymentMethod: string
    status: string
    itemCount: number
    itemPreview: string
}

export default function TransactionLogPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
    const [page, setPage] = useState(1)
    const [data, setData] = useState<{
        transactions: Transaction[]
        pagination: { page: number; totalPages: number; totalCount: number }
    } | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/franchisor/transactions?period=${period}&page=${page}`)
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
    }, [period, page])

    const getPaymentIcon = (method: string) => {
        if (method === 'CASH') return <Wallet className="h-4 w-4 text-green-400" />
        return <CreditCard className="h-4 w-4 text-blue-400" />
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            COMPLETED: 'bg-green-500/20 text-green-400',
            REFUNDED: 'bg-red-500/20 text-red-400',
            VOIDED: 'bg-stone-500/20 text-stone-400',
            PENDING: 'bg-amber-500/20 text-amber-400'
        }
        return (
            <span className={`px-2 py-1 rounded text-xs ${colors[status] || 'bg-stone-500/20'}`}>
                {status}
            </span>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/franchisor/reports" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Receipt className="h-8 w-8 text-amber-500" />
                            Transaction Log
                        </h1>
                        <p className="text-stone-400">View every transaction across all locations</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex gap-2">
                    {(['today', 'week', 'month'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => { setPeriod(p); setPage(1); }}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${period === p
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="ml-auto p-2 bg-stone-800 rounded-xl hover:bg-stone-700"
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Bar */}
            {data && (
                <div className="bg-stone-800/50 rounded-xl p-4 mb-6 flex items-center justify-between">
                    <p className="text-stone-400">
                        Showing <span className="text-white font-bold">{data.transactions.length}</span> of{' '}
                        <span className="text-white font-bold">{data.pagination.totalCount}</span> transactions
                    </p>
                </div>
            )}

            {/* Transactions Table */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-stone-800">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                                <th className="text-left py-3 px-4 font-semibold">Date/Time</th>
                                <th className="text-left py-3 px-4 font-semibold">Location</th>
                                <th className="text-left py-3 px-4 font-semibold">Employee</th>
                                <th className="text-left py-3 px-4 font-semibold">Customer</th>
                                <th className="text-left py-3 px-4 font-semibold">Items</th>
                                <th className="text-right py-3 px-4 font-semibold">Total</th>
                                <th className="text-center py-3 px-4 font-semibold">Payment</th>
                                <th className="text-center py-3 px-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.transactions.map(tx => (
                                <tr key={tx.id} className="border-t border-stone-800 hover:bg-stone-800/50">
                                    <td className="py-3 px-4">
                                        <span className="font-mono text-amber-400">{tx.invoiceNumber || tx.id.slice(-8)}</span>
                                    </td>
                                    <td className="py-3 px-4 text-stone-400">
                                        {new Date(tx.dateTime).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-stone-500" />
                                            {tx.location}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-stone-500" />
                                            {tx.employee}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">{tx.customer}</td>
                                    <td className="py-3 px-4">
                                        <span className="text-stone-400">{tx.itemCount} items</span>
                                        <p className="text-xs text-stone-500 truncate max-w-40">{tx.itemPreview}</p>
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-green-400">
                                        {formatCurrency(tx.total)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {getPaymentIcon(tx.paymentMethod)}
                                            <span className="text-xs">{tx.paymentMethod}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {getStatusBadge(tx.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data?.pagination && data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-stone-800">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-800 rounded-xl disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>
                        <span className="text-stone-400">
                            Page {page} of {data.pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                            disabled={page === data.pagination.totalPages}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-800 rounded-xl disabled:opacity-50"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!loading && (!data?.transactions || data.transactions.length === 0) && (
                <div className="text-center py-12 text-stone-500">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found for this period</p>
                </div>
            )}
        </div>
    )
}

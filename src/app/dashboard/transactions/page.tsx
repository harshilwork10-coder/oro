'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Eye, Download, Loader2, ArrowLeft, LayoutGrid, ShoppingCart } from 'lucide-react'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'
import Link from 'next/link'

// Convert CUID to numeric-only ID for PAX compatibility
function toNumericId(id: string): string {
    // Extract only digits from the ID, or convert chars to their char codes
    let numeric = ''
    for (const char of id) {
        if (/\d/.test(char)) {
            numeric += char
        } else {
            // Convert letter to 2-digit number (a=10, b=11, etc)
            numeric += (char.toLowerCase().charCodeAt(0) - 87).toString().padStart(2, '0')
        }
    }
    // Return last 10 digits (fits in most systems)
    return numeric.slice(-10)
}

export default function TransactionHistoryPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
    const [dateRange, setDateRange] = useState('all') // all, today, 7days, 30days
    const [filterType, setFilterType] = useState('all') // all, card, invoice, phone

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            let url = `/api/franchise/transactions?page=${page}&limit=10&search=${encodeURIComponent(search)}&filterType=${filterType}`

            // Date filtering logic
            const now = new Date()
            let startDate

            if (dateRange === 'today') {
                startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
            } else if (dateRange === '7days') {
                const d = new Date()
                d.setDate(d.getDate() - 7)
                startDate = d.toISOString()
            } else if (dateRange === '30days') {
                const d = new Date()
                d.setDate(d.getDate() - 30)
                startDate = d.toISOString()
            }

            if (startDate) {
                url += `&startDate=${startDate}`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setTransactions(data.transactions)
                setTotalPages(data.pagination.pages)
            }
        } catch (error) {
            console.error('Error fetching transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTransactions()
        }, 300)
        return () => clearTimeout(timer)
    }, [page, search, dateRange, filterType])

    const getSearchPlaceholder = () => {
        switch (filterType) {
            case 'card': return 'Search by card last 4 digits...'
            case 'invoice': return 'Search by invoice number...'
            case 'phone': return 'Search by phone number...'
            default: return 'Search by customer, email, or transaction ID...'
        }
    }

    return (
        <div className="min-h-screen bg-stone-950 p-8">
            <TransactionDetailModal
                isOpen={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
                onUpdate={fetchTransactions}
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard/pos/retail"
                                className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                            >
                                <ShoppingCart className="h-4 w-4" />
                                POS
                            </Link>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-stone-100 tracking-tight">Transaction History</h1>
                            <p className="text-stone-400 mt-1">View and manage past sales and receipts</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors">
                        <Download className="h-4 w-4" />
                        Export Report
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex gap-2">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-3 py-2.5 border border-stone-700 rounded-xl bg-stone-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm font-medium text-stone-200"
                            >
                                <option value="all">All Fields</option>
                                <option value="card">💳 Card Last 4</option>
                                <option value="invoice">📄 Invoice #</option>
                                <option value="phone">📱 Phone</option>
                            </select>
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder={getSearchPlaceholder()}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-stone-700 rounded-xl bg-stone-800 text-stone-200 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                            {[
                                { id: 'all', label: 'All Time' },
                                { id: 'today', label: 'Today' },
                                { id: '7days', label: 'Last 7 Days' },
                                { id: '30days', label: 'Last 30 Days' },
                            ].map((range) => (
                                <button
                                    key={range.id}
                                    onClick={() => setDateRange(range.id)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${dateRange === range.id
                                        ? 'bg-orange-500 text-white shadow-md'
                                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-stone-800/50 border-b border-stone-700">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-stone-400">Transaction ID</th>
                                    <th className="px-6 py-4 font-medium text-stone-400">Date</th>
                                    <th className="px-6 py-4 font-medium text-stone-400">Customer</th>
                                    <th className="px-6 py-4 font-medium text-stone-400">Amount</th>
                                    <th className="px-6 py-4 font-medium text-stone-400">Payment</th>
                                    <th className="px-6 py-4 font-medium text-stone-400">Status</th>
                                    <th className="px-6 py-4 font-medium text-stone-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-stone-400">
                                            No transactions found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-stone-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-stone-500">
                                                #{tx.invoiceNumber || toNumericId(tx.id)}
                                            </td>
                                            <td className="px-6 py-4 text-stone-200">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-xs text-stone-500">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {tx.customer ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">
                                                            {tx.customer.name[0]}
                                                        </div>
                                                        <span className="text-stone-200 font-medium">{tx.customer.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-stone-500 italic">Walk-in</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-stone-100">
                                                ${Number(tx.total).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-stone-400 capitalize">
                                                {tx.paymentMethod.toLowerCase().replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                    tx.status === 'REFUNDED' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-stone-700 text-stone-300'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedTransaction(tx)}
                                                    className="text-stone-500 hover:text-orange-400 transition-colors p-2 hover:bg-orange-500/10 rounded-lg"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-stone-800 flex items-center justify-between bg-stone-800/50">
                        <p className="text-sm text-stone-400">
                            Page <span className="font-medium text-stone-200">{page}</span> of <span className="font-medium text-stone-200">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-stone-700 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-stone-400" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-stone-700 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


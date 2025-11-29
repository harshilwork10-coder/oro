'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Eye, Download, Loader2 } from 'lucide-react'
import TransactionDetailModal from '@/components/transactions/TransactionDetailModal'

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
        <div className="min-h-screen bg-gray-50/50 p-8">
            <TransactionDetailModal
                isOpen={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                transaction={selectedTransaction}
                onUpdate={fetchTransactions}
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transaction History</h1>
                        <p className="text-gray-500 mt-1">View and manage past sales and receipts</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                        <Download className="h-4 w-4" />
                        Export Report
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex gap-2">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-gray-700"
                            >
                                <option value="all">All Fields</option>
                                <option value="card">💳 Card Last 4</option>
                                <option value="invoice">📄 Invoice #</option>
                                <option value="phone">📱 Phone</option>
                            </select>
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder={getSearchPlaceholder()}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                        ? 'bg-gray-900 text-white shadow-md'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-gray-500">Transaction ID</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Date</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Customer</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Amount</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Payment</th>
                                    <th className="px-6 py-4 font-medium text-gray-500">Status</th>
                                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            No transactions found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-gray-500">
                                                #{tx.id.slice(-8).toUpperCase()}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{new Date(tx.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {tx.customer ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                                                            {tx.customer.name[0]}
                                                        </div>
                                                        <span className="text-gray-900 font-medium">{tx.customer.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Walk-in</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                ${Number(tx.total).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 capitalize">
                                                {tx.paymentMethod.toLowerCase().replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    tx.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedTransaction(tx)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
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
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <p className="text-sm text-gray-500">
                            Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

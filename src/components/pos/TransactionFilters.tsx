'use client'

import { useState } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'

interface FilterValues {
    quickFilter: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
    dateFrom: string
    dateTo: string
    customerFilter: string
    minAmount: string
    maxAmount: string
    paymentMethodFilter: string
    statusFilter: string[]
}

interface Props {
    filters: FilterValues
    onFiltersChange: (filters: FilterValues) => void
    onApply: () => void
}

export default function TransactionFilters({ filters, onFiltersChange, onApply }: Props) {
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleQuickFilter = (quick: FilterValues['quickFilter']) => {
        const today = new Date()
        let from = new Date()
        let to = new Date()

        switch (quick) {
            case 'TODAY':
                // from and to are already today
                break
            case 'YESTERDAY':
                from.setDate(today.getDate() - 1)
                to.setDate(today.getDate() - 1)
                break
            case 'WEEK':
                from.setDate(today.getDate() - 7)
                break
            case 'MONTH':
                from.setDate(today.getDate() - 30)
                break
            case 'CUSTOM':
                // User will set custom dates
                break
        }

        onFiltersChange({
            ...filters,
            quickFilter: quick,
            dateFrom: from.toISOString().split('T')[0],
            dateTo: to.toISOString().split('T')[0]
        })

        if (quick !== 'CUSTOM') {
            onApply()
        }
    }

    const toggleStatus = (status: string) => {
        const newStatuses = filters.statusFilter.includes(status)
            ? filters.statusFilter.filter(s => s !== status)
            : [...filters.statusFilter, status]

        onFiltersChange({ ...filters, statusFilter: newStatuses })
    }

    const clearFilters = () => {
        const today = new Date().toISOString().split('T')[0]
        onFiltersChange({
            quickFilter: 'TODAY',
            dateFrom: today,
            dateTo: today,
            customerFilter: '',
            minAmount: '',
            maxAmount: '',
            paymentMethodFilter: 'ALL',
            statusFilter: ['COMPLETED']
        })
        onApply()
    }

    return (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4 space-y-4">
            {/* Quick Filters & Advanced Toggle */}
            <div className="flex flex-wrap gap-2">
                {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as const).map(quick => (
                    <button
                        key={quick}
                        onClick={() => handleQuickFilter(quick)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filters.quickFilter === quick
                            ? 'bg-orange-600 text-white'
                            : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                            }`}
                    >
                        {quick === 'TODAY' && 'Today'}
                        {quick === 'YESTERDAY' && 'Yesterday'}
                        {quick === 'WEEK' && 'Last 7 Days'}
                        {quick === 'MONTH' && 'Last 30 Days'}
                    </button>
                ))}

                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${showAdvanced
                        ? 'bg-stone-700 text-white'
                        : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                        }`}
                >
                    <Filter className="h-4 w-4" />
                    Advanced Filters
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-stone-800">
                    {/* Custom Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-stone-500 mb-1">From Date</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value, quickFilter: 'CUSTOM' })}
                                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-stone-500 mb-1">To Date</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value, quickFilter: 'CUSTOM' })}
                                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* Customer Search */}
                    <div>
                        <label className="block text-xs text-stone-500 mb-1">Customer Name</label>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={filters.customerFilter}
                            onChange={(e) => onFiltersChange({ ...filters, customerFilter: e.target.value })}
                            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-500 focus:ring-1 focus:ring-orange-500"
                        />
                    </div>

                    {/* Amount Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-stone-500 mb-1">Min Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={filters.minAmount}
                                    onChange={(e) => onFiltersChange({ ...filters, minAmount: e.target.value })}
                                    className="w-full pl-7 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-stone-500 mb-1">Max Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                                <input
                                    type="number"
                                    placeholder="999.99"
                                    value={filters.maxAmount}
                                    onChange={(e) => onFiltersChange({ ...filters, maxAmount: e.target.value })}
                                    className="w-full pl-7 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs text-stone-500 mb-1">Payment Method</label>
                        <select
                            value={filters.paymentMethodFilter}
                            onChange={(e) => onFiltersChange({ ...filters, paymentMethodFilter: e.target.value })}
                            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-orange-500"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="CASH">Cash Only</option>
                            <option value="CARD">Card Only</option>
                            <option value="SPLIT">Split Payment</option>
                        </select>
                    </div>

                    {/* Status Checkboxes */}
                    <div>
                        <label className="block text-xs text-stone-500 mb-2">Transaction Status</label>
                        <div className="flex flex-wrap gap-2">
                            {['COMPLETED', 'REFUNDED', 'VOID', 'DELETED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.statusFilter.includes(status)
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-stone-800 text-stone-400 hover:text-white'
                                        }`}
                                >
                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={clearFilters}
                            className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={onApply}
                            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors text-sm"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}


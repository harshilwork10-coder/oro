'use client'

import { useState } from 'react'
import { X, Receipt, Calendar, User, CreditCard, Trash2, XCircle, RotateCcw, Loader2 } from 'lucide-react'

interface TransactionDetailModalProps {
    isOpen: boolean
    onClose: () => void
    transaction: any
    onUpdate?: () => void
}

export default function TransactionDetailModal({ isOpen, onClose, transaction, onUpdate }: TransactionDetailModalProps) {
    const [showConfirmation, setShowConfirmation] = useState<'delete' | 'void' | null>(null)
    const [showRefund, setShowRefund] = useState(false)
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [processing, setProcessing] = useState(false)

    if (!isOpen || !transaction) return null

    const handleDelete = async () => {
        setProcessing(true)
        try {
            const res = await fetch(`/api/pos/transaction/${transaction.id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                onUpdate?.()
                onClose()
            }
        } catch (error) {
            console.error('Error deleting transaction:', error)
        } finally {
            setProcessing(false)
            setShowConfirmation(null)
        }
    }

    const handleVoid = async () => {
        setProcessing(true)
        try {
            const res = await fetch(`/api/pos/transaction/${transaction.id}/void`, {
                method: 'POST',
            })
            if (res.ok) {
                onUpdate?.()
                onClose()
            }
        } catch (error) {
            console.error('Error voiding transaction:', error)
        } finally {
            setProcessing(false)
            setShowConfirmation(null)
        }
    }

    const handleRefund = async () => {
        setProcessing(true)
        try {
            const itemsToRefund = selectedItems.length > 0
                ? selectedItems
                : transaction.lineItems.map((item: any) => item.id)

            const res = await fetch(`/api/pos/transaction/${transaction.id}/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsToRefund })
            })
            if (res.ok) {
                onUpdate?.()
                onClose()
            }
        } catch (error) {
            console.error('Error processing refund:', error)
        } finally {
            setProcessing(false)
            setShowRefund(false)
        }
    }

    const toggleItem = (itemId: string) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        )
    }

    const calculateRefundTotal = () => {
        if (selectedItems.length === 0) return Number(transaction.total)
        return transaction.lineItems
            .filter((item: any) => selectedItems.includes(item.id))
            .reduce((sum: number, item: any) => sum + Number(item.total), 0)
    }

    // Confirmation Dialog
    if (showConfirmation) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        {showConfirmation === 'delete' ? (
                            <div className="bg-red-100 p-3 rounded-lg">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                        ) : (
                            <div className="bg-orange-100 p-3 rounded-lg">
                                <XCircle className="h-6 w-6 text-orange-600" />
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-gray-900">
                                {showConfirmation === 'delete' ? 'Delete Transaction' : 'Void Transaction'}
                            </h3>
                            <p className="text-sm text-gray-500">This action cannot be undone</p>
                        </div>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Are you sure you want to {showConfirmation} transaction #{transaction.id.slice(-8).toUpperCase()}?
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfirmation(null)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={showConfirmation === 'delete' ? handleDelete : handleVoid}
                            disabled={processing}
                            className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 ${showConfirmation === 'delete'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `${showConfirmation === 'delete' ? 'Delete' : 'Void'}`
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Refund Dialog
    if (showRefund) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <RotateCcw className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Process Refund</h2>
                                <p className="text-blue-200 text-sm">Select items to refund</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowRefund(false)}
                            className="text-blue-200 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="space-y-3 mb-6">
                            {transaction.lineItems.map((item: any) => (
                                <label
                                    key={item.id}
                                    className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedItems.includes(item.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item.id)}
                                        onChange={() => toggleItem(item.id)}
                                        className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                            {item.type === 'SERVICE' ? item.service?.name : item.product?.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Qty: {item.quantity} × ${Number(item.price).toFixed(2)}
                                        </p>
                                    </div>
                                    <p className="font-bold text-gray-900">
                                        ${Number(item.total).toFixed(2)}
                                    </p>
                                </label>
                            ))}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">
                                    {selectedItems.length === 0
                                        ? 'Full Refund'
                                        : `Partial Refund (${selectedItems.length} items)`}
                                </span>
                                <span className="text-2xl font-bold text-gray-900">
                                    ${calculateRefundTotal().toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
                        <button
                            onClick={() => setShowRefund(false)}
                            disabled={processing}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRefund}
                            disabled={processing}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-4 w-4" />
                                    Process Refund
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <Receipt className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                            <p className="text-gray-400 text-sm">#{transaction.id.slice(-8).toUpperCase()}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Status & Date */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <div className="flex-1 min-w-[200px] bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Date & Time</span>
                            </div>
                            <p className="font-semibold text-gray-900">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                                {new Date(transaction.createdAt).toLocaleTimeString()}
                            </p>
                        </div>
                        <div className="flex-1 min-w-[200px] bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <CreditCard className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Payment</span>
                            </div>
                            <p className="font-semibold text-gray-900">
                                {transaction.paymentMethod.replace('_', ' ')}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {transaction.status}
                            </span>
                        </div>
                    </div>

                    {/* Customer & Staff */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Customer</h3>
                            {transaction.customer ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                        {transaction.customer.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{transaction.customer.name}</p>
                                        <p className="text-sm text-gray-500">{transaction.customer.email || transaction.customer.phone}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Walk-in Customer</p>
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Processed By</h3>
                            {transaction.employee ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                        {transaction.employee.name?.[0] || 'S'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{transaction.employee.name || 'Staff'}</p>
                                        <p className="text-sm text-gray-500">Employee</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Unknown</p>
                            )}
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mb-8">
                        <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Order Items</h3>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Item</th>
                                        <th className="px-4 py-3 font-medium text-center">Qty</th>
                                        <th className="px-4 py-3 font-medium text-right">Price</th>
                                        <th className="px-4 py-3 font-medium text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transaction.lineItems.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">
                                                    {item.type === 'SERVICE' ? item.service?.name : item.product?.name}
                                                </p>
                                                {item.staff && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <User className="h-3 w-3" />
                                                        {item.staff.name}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-600">
                                                {item.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">
                                                ${Number(item.price).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                ${Number(item.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>${Number(transaction.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(transaction.discount) > 0 && (
                            <div className="flex justify-between text-orange-600">
                                <span>Discount</span>
                                <span>-${Number(transaction.discount).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(transaction.cardFee) > 0 && (
                            <div className="flex justify-between text-blue-600">
                                <span>Card Processing Fee</span>
                                <span>+${Number(transaction.cardFee).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-600">
                            <span>Tax</span>
                            <span>${Number(transaction.tax).toFixed(2)}</span>
                        </div>
                        {Number(transaction.tip) > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Tip</span>
                                <span>+${Number(transaction.tip).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                            <span className="font-bold text-gray-900 text-lg">Total</span>
                            <span className="font-bold text-gray-900 text-xl">${Number(transaction.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 flex justify-between gap-3 bg-gray-50 rounded-b-2xl">
                    <div className="flex gap-2">
                        {transaction.status === 'COMPLETED' && (
                            <>
                                <button
                                    onClick={() => setShowRefund(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Refund
                                </button>
                                <button
                                    onClick={() => setShowConfirmation('void')}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Void
                                </button>
                                <button
                                    onClick={() => setShowConfirmation('delete')}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                    <button
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                        onClick={() => alert('Receipt printing not implemented yet')}
                    >
                        <Receipt className="h-4 w-4" />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    )
}


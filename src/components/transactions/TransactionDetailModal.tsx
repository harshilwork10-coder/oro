'use client'

import { X, Receipt, Calendar, User, CreditCard, Clock } from 'lucide-react'

interface TransactionDetailModalProps {
    isOpen: boolean
    onClose: () => void
    transaction: any
}

export default function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
    if (!isOpen || !transaction) return null

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
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                        Close
                    </button>
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

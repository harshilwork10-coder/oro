import { useState, useEffect } from 'react'
import { X, RotateCcw, Ban, Trash2, CheckSquare, Square, Printer, CreditCard, Banknote, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { generateReceipt } from '@/lib/receipt-generator'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'
import { useBranding } from '@/components/providers/BrandProvider'

interface TransactionLine {
    id: string
    type: string
    quantity: number
    price: number
    discount: number
    total: number
    service?: { name: string }
    product?: { name: string }
}

interface Transaction {
    id: string
    total: number
    subtotal: number
    tax: number
    paymentMethod: string
    createdAt: string
    status: string
    lineItems: TransactionLine[]
    client?: {
        firstName: string
        lastName: string
    }
    cardLast4?: string
    invoiceNumber?: string
}

interface Props {
    transaction: Transaction
    onClose: () => void
    onSuccess: () => void
    canProcessRefunds?: boolean
    canVoid?: boolean
    canDelete?: boolean
}

type ActionType = 'none' | 'refund' | 'void' | 'delete'

export default function TransactionActionsModal({ transaction, onClose, onSuccess }: Props) {
    const [action, setAction] = useState<ActionType>('none')
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
    const [isProcessing, setIsProcessing] = useState(false)
    const [refundMethod, setRefundMethod] = useState<string>('CASH')
    const [showPaxModal, setShowPaxModal] = useState(false)
    const [paxVerificationPending, setPaxVerificationPending] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [voidReason, setVoidReason] = useState<string>('')
    const [refundReason, setRefundReason] = useState<string>('')
    const { logoUrl, primaryColor } = useBranding()

    useEffect(() => {
        if (transaction.paymentMethod === 'CARD') {
            setRefundMethod('CARD')
        } else {
            setRefundMethod('CASH')
        }
    }, [transaction.paymentMethod])

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message })
    }

    const toggleItemSelection = (itemId: string, quantity: number) => {
        const newSelected = new Set(selectedItems)
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId)
        } else {
            newSelected.add(itemId)
            setItemQuantities({ ...itemQuantities, [itemId]: quantity })
        }
        setSelectedItems(newSelected)
    }

    const selectAllItems = () => {
        const allIds = transaction.lineItems.map(item => item.id)
        const newQuantities: Record<string, number> = {}
        transaction.lineItems.forEach(item => {
            newQuantities[item.id] = item.quantity
        })
        setSelectedItems(new Set(allIds))
        setItemQuantities(newQuantities)
    }

    const calculateRefundAmount = () => {
        let total = 0
        selectedItems.forEach(itemId => {
            const item = transaction.lineItems.find(i => i.id === itemId)
            if (item) {
                const qty = itemQuantities[itemId] || item.quantity
                const pricePerUnit = item.total / item.quantity
                total += pricePerUnit * qty
            }
        })
        return total
    }

    // ... (existing code)

    const handlePrint = () => {
        const receiptData = {
            id: transaction.id,
            total: transaction.total,
            subtotal: transaction.subtotal,
            tax: transaction.tax,
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt,
            lineItems: transaction.lineItems.map((item: TransactionLine) => ({
                name: item.service?.name || item.product?.name || 'Item',
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                total: item.total
            })),
            branding: {
                logoUrl,
                primaryColor
            }
        }
        generateReceipt(receiptData)
    }

    const handleRefund = async () => {
        if (selectedItems.size === 0) {
            showToast('error', 'Please select at least one item to refund')
            return
        }

        if (!refundReason) {
            showToast('error', 'Please select a reason for the refund')
            return
        }

        // If CARD refund and original was card payment, verify card matches
        if (refundMethod === 'CARD' && (transaction.paymentMethod === 'CREDIT_CARD' || transaction.paymentMethod === 'DEBIT_CARD')) {
            setPaxVerificationPending(true)
            setShowPaxModal(true)
            return
        }

        // Process cash refund or card-to-cash refund immediately
        await processRefund()
    }

    const processRefund = async (paxResponse?: any) => {
        setIsProcessing(true)
        try {
            const refundItems = Array.from(selectedItems).map(itemId => ({
                lineItemId: itemId,
                quantity: itemQuantities[itemId]
            }))

            const res = await fetch('/api/pos/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalTransactionId: transaction.id,
                    refundType: selectedItems.size === transaction.lineItems.length ? 'FULL' : 'PARTIAL',
                    items: refundItems,
                    reason: refundReason,
                    refundMethod,
                    cardLast4: paxResponse?.cardLast4
                })
            })

            if (res.ok) {
                showToast('success', '✓ Refund processed successfully')
                setTimeout(() => { onSuccess(); onClose() }, 1500)
            } else {
                const error = await res.json()
                showToast('error', `Refund failed: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Refund error:', error)
            showToast('error', 'Failed to process refund')
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePaxSuccess = (response: any) => {
        setShowPaxModal(false)

        if (paxVerificationPending) {
            // Verify card matches original transaction
            const originalCardLast4 = transaction.cardLast4
            const currentCardLast4 = response.cardLast4

            if (originalCardLast4 && currentCardLast4 !== originalCardLast4) {
                showToast('error', `Different card detected! Use card ending in ${originalCardLast4}`)
                setPaxVerificationPending(false)
                setAction('none')
                return
            }

            // Card matches - process refund
            setPaxVerificationPending(false)
            processRefund(response)
        }
    }

    const handleVoid = async () => {
        setIsProcessing(true)
        try {
            const res = await fetch('/api/pos/void', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: transaction.id,
                    reason: voidReason || 'No reason provided'
                })
            })

            if (res.ok) {
                showToast('success', '✓ Transaction voided successfully')
                setTimeout(() => { onSuccess(); onClose() }, 1500)
            } else {
                const error = await res.json()
                showToast('error', `Void failed: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Void error:', error)
            showToast('error', 'Failed to void transaction')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDelete = async () => {
        setIsProcessing(true)
        try {
            const res = await fetch(`/api/pos/transaction/${transaction.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                showToast('success', '✓ Transaction deleted')
                setTimeout(() => { onSuccess(); onClose() }, 1500)
            } else {
                const error = await res.json()
                showToast('error', `Delete failed: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Delete error:', error)
            showToast('error', 'Failed to delete transaction')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success'
                        ? <CheckCircle className="h-5 w-5" />
                        : <AlertCircle className="h-5 w-5" />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}
            <div className="w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-stone-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Transaction Actions</h2>
                        <p className="text-stone-400 text-sm mt-1">
                            Invoice #{transaction.id.slice(-8).toUpperCase()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {action === 'none' && (
                        <div className="space-y-4">
                            {/* Transaction Details */}
                            <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-stone-500">Date</p>
                                        <p className="text-white">{new Date(transaction.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-stone-500">Total</p>
                                        <p className="text-white text-lg font-bold">{formatCurrency(transaction.total)}</p>
                                    </div>
                                    <div>
                                        <p className="text-stone-500">Payment</p>
                                        <p className="text-white">{transaction.paymentMethod}</p>
                                    </div>
                                    <div>
                                        <p className="text-stone-500">Status</p>
                                        <p className="text-white">{transaction.status}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="flex flex-col items-center gap-2 p-4 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 rounded-xl transition-colors"
                                >
                                    <Printer className="h-6 w-6 text-blue-400" />
                                    <span className="text-blue-400 font-medium">Print</span>
                                </button>

                                <button
                                    onClick={() => setAction('refund')}
                                    disabled={transaction.status !== 'COMPLETED'}
                                    className="flex flex-col items-center gap-2 p-4 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw className="h-6 w-6 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Refund</span>
                                </button>

                                <button
                                    onClick={() => setAction('void')}
                                    disabled={transaction.status !== 'COMPLETED'}
                                    className="flex flex-col items-center gap-2 p-4 bg-orange-900/20 hover:bg-orange-900/30 border border-orange-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Ban className="h-6 w-6 text-orange-400" />
                                    <span className="text-orange-400 font-medium">Void</span>
                                </button>

                                <button
                                    onClick={() => setAction('delete')}
                                    className="flex flex-col items-center gap-2 p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 rounded-xl transition-colors"
                                >
                                    <Trash2 className="h-6 w-6 text-red-400" />
                                    <span className="text-red-400 font-medium">Delete</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {action === 'refund' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Select Items to Refund</h3>
                                <button
                                    onClick={selectAllItems}
                                    className="text-sm text-emerald-400 hover:text-emerald-300"
                                >
                                    Select All
                                </button>
                            </div>

                            {/* Items List */}
                            <div className="space-y-2">
                                {transaction.lineItems.map((item) => {
                                    const isSelected = selectedItems.has(item.id)
                                    const itemName = item.service?.name || item.product?.name || 'Item'

                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                                                ? 'bg-emerald-900/20 border-emerald-500/50'
                                                : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                                                }`}
                                            onClick={() => toggleItemSelection(item.id, item.quantity)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {isSelected ? (
                                                        <CheckSquare className="h-5 w-5 text-emerald-400" />
                                                    ) : (
                                                        <Square className="h-5 w-5 text-stone-600" />
                                                    )}
                                                    <div>
                                                        <p className="text-white font-medium">{itemName}</p>
                                                        <p className="text-stone-500 text-sm">
                                                            {item.quantity} x {formatCurrency(item.price)}
                                                            {item.discount > 0 && ` (-${item.discount}%)`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-white font-bold">
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>

                                            {isSelected && item.quantity > 1 && (
                                                <div className="mt-3 flex items-center gap-3 pl-8">
                                                    <label className="text-stone-400 text-sm">Quantity:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={item.quantity}
                                                        value={itemQuantities[item.id] || item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value)
                                                            if (val >= 1 && val <= item.quantity) {
                                                                setItemQuantities({
                                                                    ...itemQuantities,
                                                                    [item.id]: val
                                                                })
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-20 px-3 py-1 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                                    />
                                                    <span className="text-stone-500 text-sm">of {item.quantity}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Refund Reason Selection */}
                            <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                                <label className="block text-sm text-stone-400 mb-2">Reason for refund *</label>
                                <select
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="Customer Request">Customer Request</option>
                                    <option value="Defective Product">Defective Product</option>
                                    <option value="Wrong Item Charged">Wrong Item Charged</option>
                                    <option value="Service Not Performed">Service Not Performed</option>
                                    <option value="Customer Dissatisfaction">Customer Dissatisfaction</option>
                                    <option value="Price Adjustment">Price Adjustment</option>
                                    <option value="Duplicate Charge">Duplicate Charge</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Refund Method Selection */}
                            <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                                <h4 className="text-white font-medium mb-3">Refund Method</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setRefundMethod('CASH')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${refundMethod === 'CASH'
                                            ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400'
                                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                                            }`}
                                    >
                                        <Banknote className="h-5 w-5" />
                                        <span className="font-medium">Cash</span>
                                    </button>
                                    <button
                                        onClick={() => setRefundMethod('CARD')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${refundMethod === 'CARD'
                                            ? 'bg-blue-900/20 border-blue-500 text-blue-400'
                                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                                            }`}
                                    >
                                        <CreditCard className="h-5 w-5" />
                                        <span className="font-medium">Card</span>
                                    </button>
                                </div>
                            </div>

                            {/* Refund Amount */}
                            {selectedItems.size > 0 && (
                                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-400">Refund Amount</span>
                                        <span className="text-2xl font-bold text-emerald-400">
                                            {formatCurrency(calculateRefundAmount())}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {action === 'void' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-orange-500/20 mx-auto flex items-center justify-center">
                                    <Ban className="h-8 w-8 text-orange-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mt-3">Void Transaction?</h3>
                                <p className="text-stone-400 text-sm mt-1">
                                    This will void the entire transaction. It cannot be refunded after voiding.
                                </p>
                            </div>

                            {/* Void Reason Dropdown */}
                            <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                                <label className="block text-sm text-stone-400 mb-2">Reason for voiding *</label>
                                <select
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="Customer Request">Customer Request</option>
                                    <option value="Wrong Amount">Wrong Amount</option>
                                    <option value="Duplicate Transaction">Duplicate Transaction</option>
                                    <option value="Employee Error">Employee Error</option>
                                    <option value="Test Transaction">Test Transaction</option>
                                    <option value="Fraud Prevention">Fraud Prevention</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {action === 'delete' && (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 mx-auto flex items-center justify-center">
                                <Trash2 className="h-8 w-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Transaction?</h3>
                            <p className="text-stone-400">
                                This will permanently delete the transaction. This action cannot be undone.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-stone-800 flex justify-between">
                    {action !== 'none' && (
                        <button
                            onClick={() => setAction('none')}
                            className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                        >
                            ← Back
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        {action === 'refund' && (
                            <button
                                onClick={handleRefund}
                                disabled={selectedItems.size === 0 || !refundReason || isProcessing}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-bold transition-colors disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Process Refund'}
                            </button>
                        )}
                        {action === 'void' && (
                            <button
                                onClick={handleVoid}
                                disabled={!voidReason || isProcessing}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-bold transition-colors disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Void Transaction'}
                            </button>
                        )}
                        {action === 'delete' && (
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-bold transition-colors disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Deleting...' : 'Delete Transaction'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* PAX Card Verification Modal */}
            {showPaxModal && (
                <PaxPaymentModal
                    isOpen={showPaxModal}
                    onClose={() => {
                        setShowPaxModal(false)
                        setPaxVerificationPending(false)
                    }}
                    onSuccess={handlePaxSuccess}
                    amount={calculateRefundAmount()}
                    invoiceNumber={transaction.invoiceNumber || Date.now().toString().slice(-6)}
                />
            )}
        </div>
    )
}

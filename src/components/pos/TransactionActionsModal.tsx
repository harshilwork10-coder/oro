import { useState, useEffect } from 'react'
import { X, RotateCcw, Ban, Trash2, CheckSquare, Square, Printer, CreditCard, Banknote, CheckCircle, AlertCircle, MessageSquare, ArrowLeftRight, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { generateReceipt } from '@/lib/receipt-generator'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'
import { useBranding } from '@/components/providers/BrandProvider'
import { normalizeTransactionForPrint } from '@/lib/print-utils'

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
        phone?: string
    }
    cardLast4?: string
    invoiceNumber?: string
    totalCash?: number    // Cash price (for dual pricing)
    totalCard?: number    // Card price (for dual pricing)
}

interface Props {
    transaction: Transaction
    onClose: () => void
    onSuccess: () => void
    canProcessRefunds?: boolean
    canVoid?: boolean
    canDelete?: boolean
    cashDrawerSessionId?: string | null
    storeName?: string
    storeAddress?: string
    storePhone?: string
    cashierName?: string
}

type ActionType = 'none' | 'refund' | 'void' | 'delete' | 'sms' | 'exchange'

export default function TransactionActionsModal({ transaction, onClose, onSuccess, cashDrawerSessionId, storeName, storeAddress, storePhone, cashierName }: Props) {
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
    const [phoneNumber, setPhoneNumber] = useState<string>('')
    const [managerPinVerified, setManagerPinVerified] = useState(false)
    const [showManagerPinPrompt, setShowManagerPinPrompt] = useState(false)
    const [managerPin, setManagerPin] = useState('')
    const { logoUrl, primaryColor } = useBranding()

    useEffect(() => {
        if (transaction.client?.phone) { // NEW: Pre-fill phone number
            setPhoneNumber(transaction.client.phone)
        }

        if (transaction.paymentMethod === 'CARD') {
            setRefundMethod('CARD')
        } else {
            setRefundMethod('CASH')
        }
    }, [transaction.paymentMethod, transaction.client])

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

    const handlePrint = async () => {
        try {
            // Use print agent for thermal receipt printing
            const { printReceipt, isPrintAgentAvailable } = await import('@/lib/print-agent')
            const agentAvailable = await isPrintAgentAvailable()

            if (!agentAvailable) {
                showToast('error', 'Print Agent not running. Start ORO Print Agent on this computer.')
                return
            }

            // === USE SHARED NORMALIZER (single source of truth) ===
            // This ensures reprint produces identical output to immediate print
            const receiptData = normalizeTransactionForPrint(
                transaction as any,
                {
                    showDualPricing: !!(transaction.totalCash && transaction.totalCard &&
                        Number(transaction.totalCash) !== Number(transaction.totalCard)),
                    storeName: storeName || 'Store',
                    storeAddress: storeAddress || undefined,
                    storePhone: storePhone || undefined
                },
                cashierName || ''
            )

            const result = await printReceipt(receiptData)
            if (result.success) {
                showToast('success', 'Receipt printed!')
            } else {
                showToast('error', result.error || 'Print failed')
            }
        } catch (error: any) {
            console.error('[PRINT] Reprint error:', error)
            showToast('error', 'Print failed: ' + (error.message || 'Unknown error'))
        }
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
                    cardLast4: paxResponse?.cardLast4,
                    cashDrawerSessionId,
                    managerPinVerified
                })
            })

            if (res.ok) {
                const data = await res.json()
                const creditMsg = data.storeCreditCode ? ` — Store Credit: ${data.storeCreditCode}` : ''
                showToast('success', `✓ Refund processed${creditMsg}`)

                // Print refund receipt
                try {
                    const { printReceipt, isPrintAgentAvailable } = await import('@/lib/print-agent')
                    const agentAvailable = await isPrintAgentAvailable()
                    if (agentAvailable) {
                        const refundAmount = calculateRefundAmount()
                        const refundedItems = Array.from(selectedItems).map(itemId => {
                            const item = transaction.lineItems.find(i => i.id === itemId)
                            return {
                                name: item?.service?.name || item?.product?.name || 'Item',
                                quantity: itemQuantities[itemId] || item?.quantity || 1,
                                price: item ? item.total / item.quantity : 0,
                                total: item ? (item.total / item.quantity) * (itemQuantities[itemId] || item.quantity) : 0
                            }
                        })
                        const creditFooter = data.storeCreditCode ? `\nStore Credit Code: ${data.storeCreditCode}` : ''
                        await printReceipt({
                            storeName: storeName || undefined,
                            cashier: cashierName || undefined,
                            header: refundMethod === 'STORE_CREDIT' ? '*** STORE CREDIT ISSUED ***' : '*** REFUND ***',
                            items: refundedItems,
                            subtotal: refundAmount,
                            tax: 0,
                            total: refundAmount,
                            date: new Date().toLocaleString(),
                            footer: `Orig Invoice: #${transaction.invoiceNumber || transaction.id.slice(-8)}\nReason: ${refundReason}\nMethod: ${refundMethod}${creditFooter}`,
                            openDrawer: refundMethod === 'CASH',
                        }).catch(console.error)
                    }
                } catch (e) { console.error('Refund receipt print error:', e) }

                setTimeout(() => { onSuccess(); onClose() }, 1500)
            } else {
                const error = await res.json()
                if (error.requiresManagerPin) {
                    setShowManagerPinPrompt(true)
                } else {
                    showToast('error', `Refund failed: ${error.error || 'Unknown error'}`)
                }
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
                    reason: voidReason || 'No reason provided',
                    cashDrawerSessionId
                })
            })

            if (res.ok) {
                showToast('success', '✓ Transaction voided successfully')

                // Print void receipt slip
                try {
                    const { printReceipt, isPrintAgentAvailable } = await import('@/lib/print-agent')
                    const agentAvailable = await isPrintAgentAvailable()
                    if (agentAvailable) {
                        await printReceipt({
                            storeName: storeName || undefined,
                            cashier: cashierName || undefined,
                            header: '*** VOID ***',
                            items: transaction.lineItems.map(item => ({
                                name: item.service?.name || item.product?.name || 'Item',
                                quantity: item.quantity,
                                price: item.price,
                                total: item.total
                            })),
                            subtotal: transaction.subtotal,
                            tax: transaction.tax,
                            total: transaction.total,
                            date: new Date().toLocaleString(),
                            footer: `VOIDED Invoice: #${transaction.invoiceNumber || transaction.id.slice(-8)}\nReason: ${voidReason}`,
                            openDrawer: false,
                        }).catch(console.error)
                    }
                } catch (e) { console.error('Void receipt print error:', e) }

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

    const handleSendSms = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            showToast('error', 'Please enter a valid phone number')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/pos/sms-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: transaction.id,
                    phone: phoneNumber
                })
            })

            if (res.ok) {
                showToast('success', '✓ SMS Receipt sent!')
                setTimeout(() => { setAction('none') }, 1500)
            } else {
                const error = await res.json()
                showToast('error', `Send failed: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('SMS error:', error)
            showToast('error', 'Failed to send SMS')
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
                            Invoice #{transaction.invoiceNumber || transaction.id.slice(-8)}
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
                            {/* Detailed Transaction View */}
                            <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                                {/* Header Grid */}
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-b border-stone-800 pb-4">
                                    <div>
                                        <p className="text-stone-500">Date</p>
                                        <p className="text-white">{new Date(transaction.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-stone-500">Payment</p>
                                        <p className="text-white">{transaction.paymentMethod}</p>
                                        {(transaction as any).splitTenders && (transaction as any).splitTenders.length > 0 && (
                                            <div className="text-xs text-stone-400 mt-1">
                                                {(transaction as any).splitTenders.map((t: any, i: number) => (
                                                    <div key={i}>{t.method}: {formatCurrency(t.amount)}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-stone-500">Status</p>
                                        <p className="text-white">
                                            {transaction.status}
                                            {transaction.status === 'PARTIALLY_REFUNDED' && (
                                                <span className="ml-2 text-xs bg-orange-900/50 text-orange-400 px-2 py-0.5 rounded-full inline-block">Partial Refund</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-stone-500">Customer</p>
                                        <p className="text-white">
                                            {transaction.client ? `${transaction.client.firstName} ${transaction.client.lastName}` : 'Walk-In'}
                                        </p>
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div className="space-y-3 mb-4">
                                    <h4 className="text-stone-400 text-xs font-bold uppercase tracking-wider">Itemized Details</h4>
                                    {transaction.lineItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-start text-sm">
                                            <div>
                                                <span className="text-white font-medium">{item.service?.name || item.product?.name || 'Item'}</span>
                                                <div className="text-stone-500">
                                                    {item.quantity} x {formatCurrency(item.price)}
                                                    {item.discount > 0 && ` (-${item.discount}%)`}
                                                </div>
                                            </div>
                                            <span className="text-white font-medium">{formatCurrency(item.total)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Financial Summary */}
                                <div className="border-t border-stone-800 pt-3 space-y-1 text-sm">
                                    <div className="flex justify-between text-stone-400">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(transaction.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-stone-400">
                                        <span>Tax</span>
                                        <span>{formatCurrency(transaction.tax)}</span>
                                    </div>
                                    {((transaction as any).tipAmount || 0) > 0 && (
                                        <div className="flex justify-between text-stone-400">
                                            <span>Tip</span>
                                            <span>{formatCurrency((transaction as any).tipAmount)}</span>
                                        </div>
                                    )}
                                    
                                    {/* Dual Pricing Info Details */}
                                    {transaction.totalCash !== undefined && transaction.totalCard !== undefined && transaction.totalCash !== transaction.totalCard && (
                                        <div className="mt-2 pt-2 border-t border-stone-800/50">
                                            <div className="flex justify-between text-xs text-stone-500">
                                                <span>Cash Price (incl. tax/tip)</span>
                                                <span>{formatCurrency(transaction.totalCash)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-stone-500">
                                                <span>Card Price (incl. tax/tip)</span>
                                                <span>{formatCurrency(transaction.totalCard)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-white font-bold text-lg pt-2 mt-2 border-t border-stone-800">
                                        <span>Total</span>
                                        <span>{formatCurrency(transaction.total)}</span>
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
                                    onClick={() => setAction('sms')}
                                    className="flex flex-col items-center gap-2 p-4 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-500/30 rounded-xl transition-colors"
                                >
                                    <MessageSquare className="h-6 w-6 text-purple-400" />
                                    <span className="text-purple-400 font-medium">SMS</span>
                                </button>

                                <button
                                    onClick={() => setAction('refund')}
                                    disabled={
                                        !['COMPLETED', 'PARTIALLY_REFUNDED'].includes(transaction.status) ||
                                        !!(transaction as any).originalTransactionId
                                    }
                                    className="flex flex-col items-center gap-2 p-4 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-500/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw className="h-6 w-6 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">
                                        {(transaction as any).originalTransactionId ? 'Refund (N/A)' :
                                         transaction.status === 'REFUNDED' ? 'Already Refunded' :
                                         transaction.status === 'VOIDED' ? 'Voided' : 'Refund'}
                                    </span>
                                </button>

                                {/* EXCHANGE DISABLED — Route returns 503 until rewritten for financial compliance */}
                                <button
                                    disabled={true}
                                    className="flex flex-col items-center gap-2 p-4 bg-stone-900/50 border border-stone-800 rounded-xl opacity-40 cursor-not-allowed"
                                    title="Exchange is being upgraded for financial compliance"
                                >
                                    <ArrowLeftRight className="h-6 w-6 text-stone-500" />
                                    <span className="text-stone-500 font-medium text-xs">Coming Soon</span>
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
                                <div className="grid grid-cols-3 gap-3">
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
                                    <button
                                        onClick={() => setRefundMethod('STORE_CREDIT')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${refundMethod === 'STORE_CREDIT'
                                            ? 'bg-amber-900/20 border-amber-500 text-amber-400'
                                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                                            }`}
                                    >
                                        <Wallet className="h-5 w-5" />
                                        <span className="font-medium">Store Credit</span>
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

                    {action === 'sms' && (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 mx-auto flex items-center justify-center">
                                <MessageSquare className="h-8 w-8 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Send SMS Receipt</h3>

                            <div className="bg-stone-950 rounded-xl p-6 border border-stone-800 max-w-sm mx-auto">
                                <label className="block text-left text-stone-400 text-sm mb-2">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="(555) 555-5555"
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white text-lg text-center tracking-widest focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <p className="text-stone-500 text-xs mt-3">
                                    Sends a digital receipt with itemized list
                                </p>
                            </div>

                            {/* Numeric Keypad */}
                            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mt-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            if (phoneNumber.length < 10) {
                                                setPhoneNumber(prev => prev + key)
                                            }
                                        }}
                                        className="py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-2xl font-bold transition-colors active:scale-95"
                                    >
                                        {key}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPhoneNumber('')}
                                    className="py-4 bg-stone-800 hover:bg-red-900/30 text-red-400 rounded-xl text-lg font-bold transition-colors active:scale-95"
                                >
                                    CLR
                                </button>
                                <button
                                    onClick={() => {
                                        if (phoneNumber.length < 10) {
                                            setPhoneNumber(prev => prev + '0')
                                        }
                                    }}
                                    className="py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-2xl font-bold transition-colors active:scale-95"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => setPhoneNumber(prev => prev.slice(0, -1))}
                                    className="py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
                                >
                                    <MessageSquare className="h-6 w-6 rotate-180 hidden" /> {/* Buffer */}
                                    <span className="text-xl">⌫</span>
                                </button>
                            </div>
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

                    {/* EXCHANGE PANEL REMOVED — Route disabled for financial compliance */}

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
                        {action === 'sms' && (
                            <button
                                onClick={handleSendSms}
                                disabled={!phoneNumber || isProcessing}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-bold transition-colors disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Sending...' : 'Send SMS'}
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

            {/* Manager PIN Prompt Overlay */}
            {showManagerPinPrompt && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 rounded-2xl">
                    <div className="bg-stone-900 border border-amber-500/30 rounded-xl p-6 w-80 space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 mx-auto flex items-center justify-center mb-3">
                                <AlertCircle className="h-6 w-6 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Manager PIN Required</h3>
                            <p className="text-stone-400 text-sm mt-1">This refund exceeds the threshold. Enter a manager PIN to authorize.</p>
                        </div>
                        <input
                            type="password"
                            value={managerPin}
                            onChange={(e) => setManagerPin(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && managerPin.length >= 4) {
                                    // Verify PIN via API
                                    try {
                                        const res = await fetch('/api/pos/verify-pin', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ pin: managerPin, requiredRole: 'MANAGER' })
                                        })
                                        if (res.ok) {
                                            setManagerPinVerified(true)
                                            setShowManagerPinPrompt(false)
                                            setManagerPin('')
                                            // Re-submit refund with manager approval
                                            processRefund()
                                        } else {
                                            showToast('error', 'Invalid manager PIN')
                                            setManagerPin('')
                                        }
                                    } catch {
                                        showToast('error', 'PIN verification failed')
                                    }
                                }
                            }}
                            placeholder="Enter 4+ digit PIN"
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowManagerPinPrompt(false); setManagerPin('') }}
                                className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (managerPin.length >= 4) {
                                        try {
                                            const res = await fetch('/api/pos/verify-pin', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ pin: managerPin, requiredRole: 'MANAGER' })
                                            })
                                            if (res.ok) {
                                                setManagerPinVerified(true)
                                                setShowManagerPinPrompt(false)
                                                setManagerPin('')
                                                processRefund()
                                            } else {
                                                showToast('error', 'Invalid manager PIN')
                                                setManagerPin('')
                                            }
                                        } catch {
                                            showToast('error', 'PIN verification failed')
                                        }
                                    }
                                }}
                                disabled={managerPin.length < 4}
                                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
                            >
                                Authorize
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                    invoiceNumber={(transaction.invoiceNumber || '1').slice(-4) || '1'}
                />
            )}
        </div>
    )
}


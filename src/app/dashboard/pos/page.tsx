'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
    Search,
    Grid,
    List,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    LogOut,
    History,
    User,
    Scissors,
    ShoppingBag,
    Tag,
    RotateCcw,
    Monitor,
    ChevronRight,
    UserPlus,
    DollarSign,
    Gift
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'
import TransactionActionsModal from '@/components/pos/TransactionActionsModal'
import CustomerDiscounts from '@/components/pos/CustomerDiscounts'
import { useFeature, useBusinessConfig } from '@/hooks/useBusinessConfig'
import { QRCodeSVG } from 'qrcode.react'

// Removed hardcoded maps

// Types
interface PaymentDetails {
    gatewayTxId?: string
    authCode?: string
    cardLast4?: string
    cardType?: string
}

// Types
interface CartItem {
    id: string
    type: 'SERVICE' | 'PRODUCT'
    name: string
    price: number
    quantity: number
    originalId?: string
    bodyPart?: string
    discount?: number
}

interface MenuData {
    services: any[]
    products: any[]
    discounts: any[]
}

interface Transaction {
    id: string
    total: number
    subtotal: number
    tax: number
    status: string
    paymentMethod: string
    createdAt: string
    client?: {
        firstName: string
        lastName: string
    }
    lineItems: any[]
    invoiceNumber?: string
}

// Categories are now dynamically loaded from services - no hardcoded list

// Component to poll for tip selection from customer display
function TipPollingEffect({ onTipReceived }: { onTipReceived: (tipAmount: number) => void }) {
    useEffect(() => {
        let pollCount = 0
        const maxPolls = 120 // 2 minutes timeout

        const pollForTip = async () => {
            try {
                const res = await fetch('/api/pos/cart')
                if (res.ok) {
                    const data = await res.json()
                    if (data.status === 'TIP_SELECTED') {
                        onTipReceived(Number(data.tipAmount || 0))
                        return true // Stop polling
                    }
                }
            } catch (error) {
                console.error('Error polling for tip:', error)
            }
            return false
        }

        const interval = setInterval(async () => {
            pollCount++
            const tipReceived = await pollForTip()
            if (tipReceived || pollCount >= maxPolls) {
                clearInterval(interval)
                if (pollCount >= maxPolls) {
                    onTipReceived(0) // Timeout - no tip
                }
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [onTipReceived])

    return null
}

export default function POSPage() {
    console.log('POSPage: Rendering...')
    const { data: session } = useSession()
    const user = session?.user as any
    const { data: config } = useBusinessConfig()
    const usesVirtualKeypad = useFeature('usesVirtualKeypad')
    const [view, setView] = useState<'POS' | 'HISTORY'>('POS')
    const [cart, setCart] = useState<CartItem[]>([])
    const [menu, setMenu] = useState<MenuData>({ services: [], products: [], discounts: [] })
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [shift, setShift] = useState<any>(null)
    const [showShiftModal, setShowShiftModal] = useState(false)
    const [denominations, setDenominations] = useState({
        hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, ones: 0,
        quarters: 0, dimes: 0, nickels: 0, pennies: 0
    })
    const [shiftAmount, setShiftAmount] = useState('')
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [showDiscountModal, setShowDiscountModal] = useState(false)
    const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null)
    const [discountValue, setDiscountValue] = useState('')
    const [activeCategory, setActiveCategory] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [locationName, setLocationName] = useState<string>('')
    const [franchiseName, setFranchiseName] = useState<string>('')
    const [showPaxModal, setShowPaxModal] = useState(false)
    const [showTransactionModal, setShowTransactionModal] = useState(false)
    const [selectedTxForActions, setSelectedTxForActions] = useState<Transaction | null>(null)

    // Customer and display state
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [showDisplayModal, setShowDisplayModal] = useState(false)
    const [showOpenItemModal, setShowOpenItemModal] = useState(false)
    const [openItemPrice, setOpenItemPrice] = useState('15')
    const [showCustomerModal, setShowCustomerModal] = useState(false)

    // Tip prompt state
    const [showTipWaiting, setShowTipWaiting] = useState(false)
    const [pendingTipAmount, setPendingTipAmount] = useState(0)
    const [tipSettings, setTipSettings] = useState<{ enabled: boolean; type: string; suggestions: string }>({ enabled: true, type: 'PERCENT', suggestions: '[15,20,25]' })

    // Customer discounts state
    const [showDiscounts, setShowDiscounts] = useState(false)
    const [appliedDiscount, setAppliedDiscount] = useState(0)
    const [appliedDiscountSource, setAppliedDiscountSource] = useState<string | null>(null)
    const [checkedInCustomers, setCheckedInCustomers] = useState<any[]>([])

    // Pin pad state for cash drawer modal
    const [selectedDenom, setSelectedDenom] = useState<string | null>(null)
    const [pinPadValue, setPinPadValue] = useState('')

    // Dynamically extract categories from services data
    const serviceCategories = useMemo(() => {
        const categories = new Set<string>()

        // Extract unique categories from services
        menu.services.forEach(service => {
            if (service.category) {
                categories.add(service.category)
            }
        })

        // Always add PRODUCTS if there are products
        if (menu.products && menu.products.length > 0) {
            categories.add('PRODUCTS')
        }

        // Convert to array and sort alphabetically
        return Array.from(categories).sort()
    }, [menu.services, menu.products])

    useEffect(() => {
        fetchMenu()
        fetchTransactions()
        checkShift()
        fetchCheckedInCustomers()
        if (session?.user) {
            fetchDetails()
        }
    }, [session])

    const fetchCheckedInCustomers = async () => {
        try {
            const res = await fetch('/api/pos/checked-in')
            if (res.ok) {
                const data = await res.json()
                setCheckedInCustomers(data)
            }
        } catch (error) {
            console.error('Failed to fetch checked-in customers:', error)
        }
    }

    const fetchDetails = async () => {
        try {
            const user = session?.user as any
            if (user?.locationId) {
                const res = await fetch(`/api/locations/${user.locationId}`)
                if (res.ok) {
                    const data = await res.json()
                    setLocationName(data.name)
                }
            }
            if (user?.franchiseId) {
                const res = await fetch(`/api/franchises/${user.franchiseId}`)
                if (res.ok) {
                    const data = await res.json()
                    setFranchiseName(data.name)
                    // Load tip settings from franchise settings
                    if (data.settings) {
                        setTipSettings({
                            enabled: data.settings.tipPromptEnabled ?? true,
                            type: data.settings.tipType || 'PERCENT',
                            suggestions: data.settings.tipSuggestions || '[15,20,25]'
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching details:', error)
        }
    }

    const calculateTotal = () => {
        const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0)
        const discountedSubtotal = Math.max(0, subtotal - appliedDiscount)

        // Calculate Tax based on config
        let tax = 0
        if (config) {
            const taxableSubtotal = cart.reduce((sum, item) => {
                const price = getItemPrice(item)
                const isTaxable = (item.type === 'SERVICE' && config.taxServices) ||
                    (item.type === 'PRODUCT' && config.taxProducts)
                return isTaxable ? sum + price : sum
            }, 0)

            // Apply global discount proportionally to taxable amount
            if (subtotal > 0 && taxableSubtotal > 0) {
                const ratio = taxableSubtotal / subtotal
                const taxableDiscount = appliedDiscount * ratio
                const taxableAmount = Math.max(0, taxableSubtotal - taxableDiscount)
                tax = taxableAmount * (config.taxRate || 0)
            }
        } else {
            // Fallback to legacy 8% if config not loaded
            tax = discountedSubtotal * 0.08
        }

        const totalCash = discountedSubtotal + tax
        const totalCard = totalCash * 1.0399
        const totalWithTip = totalCash + pendingTipAmount
        return {
            subtotal,
            discount: appliedDiscount,
            tax,
            tip: pendingTipAmount,
            totalCash,
            totalCard,
            totalWithTip
        }
    }

    // Sync with Customer Display
    useEffect(() => {
        const channel = new BroadcastChannel('pos_channel')
        const totals = calculateTotal()

        const payload = {
            type: 'CART_UPDATE',
            data: {
                items: cart,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.totalCash,
                totalCard: totals.totalCard,
                status: cart.length > 0 ? 'ACTIVE' : 'IDLE',
                customerName: 'Guest' // TODO: Add customer selection
            }
        }

        // 1. Broadcast Channel
        channel.postMessage(payload)

        // 2. LocalStorage Fallback (for reliability and initial load)
        localStorage.setItem('pos_cart_sync', JSON.stringify(payload))

        return () => channel.close()
    }, [cart])

    // Auto-open Customer Display when shift is active
    // Auto-open Customer Display when shift is active
    const customerDisplayRef = useRef<Window | null>(null)

    useEffect(() => {
        if (shift?.id && !customerDisplayRef.current) {
            const kioskUrl = window.location.origin + '/kiosk'
            const windowName = 'CustomerDisplay'
            // Target second screen (assuming 1920x1080 primary)
            const windowFeatures = 'width=1920,height=1080,left=1920,top=0,menubar=no,toolbar=no,location=no,status=no'

            // Check if window is already open
            const existingWindow = window.open('', windowName)

            if (existingWindow && existingWindow.location.href !== 'about:blank' && !existingWindow.closed) {
                customerDisplayRef.current = existingWindow
                return
            }

            // Open new window
            const displayWindow = window.open(kioskUrl, windowName, windowFeatures)

            if (displayWindow) {
                customerDisplayRef.current = displayWindow
            } else {
                console.warn('Customer Display popup was blocked')
            }
        }
    }, [shift?.id])

    const fetchMenu = async () => {
        try {
            const res = await fetch('/api/pos/menu')
            if (!res.ok) throw new Error('Failed to fetch menu')
            const data = await res.json()
            setMenu({
                services: data.services || [],
                products: data.products || [],
                discounts: data.discounts || []
            })
        } catch (error) {
            console.error('Failed to fetch menu:', error)
            // Ensure menu is reset to safe state on error
            setMenu({ services: [], products: [], discounts: [] })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/pos/transaction')
            const data = await res.json()
            setTransactions(data)
        } catch (error) {
            console.error('Failed to fetch transactions:', error)
        }
    }

    const checkShift = async () => {
        // FRANCHISOR/Owner doesn't require a shift to use POS
        const user = session?.user as any
        if (user?.role === 'FRANCHISOR') {
            // Owner mode - no shift required, but still fetch if one exists
            try {
                const res = await fetch('/api/pos/shift')
                const data = await res.json()
                if (data.shift) {
                    setShift(data.shift)
                }
            } catch (error) {
                console.error('Failed to check shift:', error)
            }
            return // No shift modal for owners
        }

        // Employee mode - requires shift
        try {
            const res = await fetch('/api/pos/shift')
            const data = await res.json()
            if (data.shift) {
                setShift(data.shift)
            } else {
                setShift(null)
                setShowShiftModal(true)
            }
        } catch (error) {
            console.error('Failed to check shift:', error)
        }
    }

    const handleShiftAction = async (action: 'OPEN' | 'CLOSE' | 'DROP', amountOverride?: number) => {
        try {
            const finalAmount = amountOverride !== undefined ? amountOverride : parseFloat(shiftAmount)

            const res = await fetch('/api/pos/shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    amount: finalAmount,
                    denominations
                })
            })

            if (res.ok) {
                const data = await res.json()
                setShift(data)
                setShowShiftModal(false)
                setDenominations({
                    hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, ones: 0,
                    quarters: 0, dimes: 0, nickels: 0, pennies: 0
                })
                setShiftAmount('')
                if (action === 'CLOSE') {
                    setCart([])
                    alert('Shift Closed Successfully')
                }
            } else {
                const errorData = await res.json()
                alert(errorData.error || 'Failed to perform shift action')
            }
        } catch (error) {
            console.error('Shift action error:', error)
            alert('An error occurred')
        }
    }

    const addToCart = (item: any, type: 'SERVICE' | 'PRODUCT') => {
        // FRANCHISOR can add to cart without a shift
        const user = session?.user as any
        const isOwner = user?.role === 'FRANCHISOR'

        if (!shift && !isOwner) {
            alert('Please open a shift first')
            setShowShiftModal(true)
            return
        }
        const newItem: CartItem = {
            id: item.id,
            type,
            name: item.name,
            price: item.price,
            quantity: 1,
            discount: 0
        }

        setCart(prev => {
            const existing = prev.find(i => i.id === newItem.id)
            if (existing) {
                return prev.map(i => i.id === newItem.id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
                )
            }
            return [...prev, newItem]
        })
    }

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index))
    }

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.quantity + delta)
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const applyDiscount = (index: number, discountPercent: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                return { ...item, discount: discountPercent }
            }
            return item
        }))
        setShowDiscountModal(false)
        setSelectedCartIndex(null)
        setDiscountValue('')
    }

    const getItemPrice = (item: CartItem) => {
        const basePrice = item.price * item.quantity
        if (item.discount) {
            return basePrice * (1 - item.discount / 100)
        }
        return basePrice
    }

    const printReceipt = (transaction: Transaction) => {
        const receiptWindow = window.open('', '_blank', 'width=400,height=600')
        if (receiptWindow) {
            receiptWindow.document.write(`
                <html>
                    <head>
                        <title>Receipt</title>
                        <style>
                            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                            .total { border-top: 1px dashed black; margin-top: 10px; padding-top: 10px; font-weight: bold; }
                            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h2>AURA</h2>
                            <p>${new Date(transaction.createdAt).toLocaleString()}</p>
                            <p>Tx: ${transaction.id}</p>
                        </div>
                        <div class="items">
                            ${transaction.lineItems.map((item: any) => `
                                <div class="item">
                                    <span>${item.quantity}x ${item.name || 'Item'}</span>
                                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="total">
                            <div class="item">
                                <span>TOTAL</span>
                                <span>$${transaction.total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Thank you for your business!</p>
                        </div>
                        <script>
                            window.onload = () => { window.print(); window.close(); }
                        </script>
                    </body>
                </html>
            `)
            receiptWindow.document.close()
        }
    }

    const handleCheckout = async (paymentMethod: 'CASH' | 'CREDIT_CARD' | 'SPLIT', cashAmount?: number, cardAmount?: number, paymentDetails?: PaymentDetails) => {
        if (cart.length === 0) return

        setIsLoading(true)
        try {
            const { subtotal, tax, totalCash, totalCard, tip } = calculateTotal()
            const baseTotal = paymentMethod === 'CASH' ? totalCash : totalCard
            const total = baseTotal + tip // Include tip in final total

            // For split payments, validate totals match (with tip)
            if (paymentMethod === 'SPLIT') {
                const splitTotal = (cashAmount || 0) + (cardAmount || 0)
                if (Math.abs(splitTotal - total) > 0.01) {
                    alert(`Split amounts must equal total (${formatCurrency(total)})`)
                    setIsLoading(false)
                    return
                }
            }

            console.log('Processing Checkout:', { paymentMethod, cashAmount, cardAmount, paymentDetails, tip })

            const res = await fetch('/api/pos/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    subtotal,
                    tax,
                    tip, // Include tip amount
                    total,
                    paymentMethod,
                    cashDrawerSessionId: shift?.id,
                    cashAmount: cashAmount || 0,
                    cardAmount: cardAmount || 0,
                    ...paymentDetails // Spread optional payment details
                })
            })

            if (res.ok) {
                const transaction = await res.json()
                setCart([])
                setPendingTipAmount(0) // Reset tip after successful transaction
                setShowCheckoutModal(false)
                fetchTransactions()

                // Clear cart from customer display
                await fetch('/api/pos/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: [],
                        subtotal: 0,
                        tax: 0,
                        total: 0,
                        status: 'IDLE',
                        showTipPrompt: false,
                        tipAmount: 0
                    })
                })

                // Prompt for receipt
                if (confirm('Transaction Successful! Print Receipt?')) {
                    printReceipt(transaction)
                }
            } else {
                const error = await res.json()
                alert(error.error || 'Transaction failed')
            }
        } catch (error) {
            console.error('Checkout error:', error)
            alert('An error occurred during checkout')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefund = async (tx: Transaction) => {
        if (!confirm('Are you sure you want to refund this transaction?')) return

        try {
            const res = await fetch('/api/pos/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalTransactionId: tx.id,
                    items: tx.lineItems.map(item => ({
                        type: item.type,
                        serviceId: item.serviceId,
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    reason: 'Customer Request'
                })
            })

            if (res.ok) {
                alert('Refund Processed Successfully')
                setSelectedTx(null)
                fetchTransactions()
            }
        } catch (error) {
            console.error('Refund error:', error)
            alert('Failed to process refund')
        }
    }



    if (isLoading) return <div className="flex items-center justify-center h-screen bg-stone-950 text-orange-500">Loading POS...</div>

    // Shift Modal - Only show for non-owner roles
    const isOwner = (session?.user as any)?.role === 'FRANCHISOR'
    if (showShiftModal && !shift && !isOwner) {
        const calculateDenomTotal = () => {
            return (
                denominations.hundreds * 100 +
                denominations.fifties * 50 +
                denominations.twenties * 20 +
                denominations.tens * 10 +
                denominations.fives * 5 +
                denominations.ones * 1 +
                denominations.quarters * 0.25 +
                denominations.dimes * 0.10 +
                denominations.nickels * 0.05 +
                denominations.pennies * 0.01
            )
        }

        const totalAmount = calculateDenomTotal()

        const updateDenom = (key: string, value: string) => {
            const num = parseInt(value) || 0
            setDenominations(prev => ({ ...prev, [key]: num >= 0 ? num : 0 }))
        }

        const handlePinPadInput = (digit: string) => {
            if (!selectedDenom) return
            if (digit === 'clear') {
                setPinPadValue('')
                updateDenom(selectedDenom, '0')
            } else if (digit === 'backspace') {
                const newValue = pinPadValue.slice(0, -1)
                setPinPadValue(newValue)
                updateDenom(selectedDenom, newValue || '0')
            } else {
                const newValue = pinPadValue + digit
                setPinPadValue(newValue)
                updateDenom(selectedDenom, newValue)
            }
        }

        const selectDenom = (key: string) => {
            setSelectedDenom(key)
            setPinPadValue(denominations[key as keyof typeof denominations]?.toString() || '')
        }

        const allDenominations = [
            { label: '$100', key: 'hundreds', mult: 100, type: 'bill' },
            { label: '$50', key: 'fifties', mult: 50, type: 'bill' },
            { label: '$20', key: 'twenties', mult: 20, type: 'bill' },
            { label: '$10', key: 'tens', mult: 10, type: 'bill' },
            { label: '$5', key: 'fives', mult: 5, type: 'bill' },
            { label: '$1', key: 'ones', mult: 1, type: 'bill' },
            { label: '25¢', key: 'quarters', mult: 0.25, type: 'coin' },
            { label: '10¢', key: 'dimes', mult: 0.10, type: 'coin' },
            { label: '5¢', key: 'nickels', mult: 0.05, type: 'coin' },
            { label: '1¢', key: 'pennies', mult: 0.01, type: 'coin' },
        ]

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
                <div className={`p-6 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl my-8 flex gap-6 ${usesVirtualKeypad ? 'w-full max-w-4xl' : 'w-[600px] flex-col'}`}>
                    <div className="flex-1">
                        <div className="text-center mb-6">
                            <div className="h-14 w-14 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Banknote className="h-7 w-7 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Open Cash Drawer</h2>
                            <p className="text-stone-400 mt-1">
                                {usesVirtualKeypad
                                    ? 'Tap a denomination, then use the keypad to enter count'
                                    : 'Enter the count for each denomination'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Bills */}
                            <div>
                                <h3 className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wider">Bills</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {allDenominations.filter(d => d.type === 'bill').map(({ label, key, mult }) => (
                                        <div
                                            key={key}
                                            onClick={() => usesVirtualKeypad && selectDenom(key)}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center relative ${usesVirtualKeypad
                                                ? selectedDenom === key
                                                    ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/50 cursor-pointer'
                                                    : 'bg-stone-950 border-stone-700 hover:border-stone-600 cursor-pointer'
                                                : 'bg-stone-950 border-stone-700'
                                                }`}
                                        >
                                            <span className={`font-bold text-lg ${usesVirtualKeypad && selectedDenom === key ? 'text-emerald-400' : 'text-emerald-500'}`}>{label}</span>
                                            {usesVirtualKeypad ? (
                                                <span className="text-2xl font-bold text-white mt-1">{denominations[key as keyof typeof denominations]}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={denominations[key as keyof typeof denominations] || ''}
                                                    onChange={(e) => updateDenom(key, e.target.value)}
                                                    className="w-full text-center bg-transparent text-2xl font-bold text-white mt-1 focus:outline-none focus:ring-0 border-b border-stone-700 focus:border-emerald-500"
                                                    placeholder="0"
                                                />
                                            )}
                                            <span className="text-xs text-stone-500 mt-1">
                                                ${(denominations[key as keyof typeof denominations] * mult).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Coins */}
                            <div>
                                <h3 className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wider">Coins</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {allDenominations.filter(d => d.type === 'coin').map(({ label, key, mult }) => (
                                        <div
                                            key={key}
                                            onClick={() => usesVirtualKeypad && selectDenom(key)}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center relative ${usesVirtualKeypad
                                                ? selectedDenom === key
                                                    ? 'bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/50 cursor-pointer'
                                                    : 'bg-stone-950 border-stone-700 hover:border-stone-600 cursor-pointer'
                                                : 'bg-stone-950 border-stone-700'
                                                }`}
                                        >
                                            <span className={`font-bold text-lg ${usesVirtualKeypad && selectedDenom === key ? 'text-amber-400' : 'text-amber-500'}`}>{label}</span>
                                            {usesVirtualKeypad ? (
                                                <span className="text-2xl font-bold text-white mt-1">{denominations[key as keyof typeof denominations]}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={denominations[key as keyof typeof denominations] || ''}
                                                    onChange={(e) => updateDenom(key, e.target.value)}
                                                    className="w-full text-center bg-transparent text-2xl font-bold text-white mt-1 focus:outline-none focus:ring-0 border-b border-stone-700 focus:border-amber-500"
                                                    placeholder="0"
                                                />
                                            )}
                                            <span className="text-xs text-stone-500 mt-1">
                                                ${(denominations[key as keyof typeof denominations] * mult).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="bg-gradient-to-r from-emerald-900/20 to-emerald-900/10 border border-emerald-500/30 rounded-xl p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-medium text-stone-300">Total Starting Cash</span>
                                    <span className="text-3xl font-bold text-emerald-400">${totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            {!usesVirtualKeypad && (
                                <button
                                    onClick={() => handleShiftAction('OPEN', totalAmount)}
                                    disabled={totalAmount === 0}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                                >
                                    Open Shift
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right side - Pin Pad (Only show if enabled) */}
                    {usesVirtualKeypad && (
                        <div className="w-64 flex flex-col">
                            {/* Display */}
                            <div className={`mb-4 p-4 rounded-xl border-2 ${selectedDenom
                                ? 'bg-stone-950 border-stone-600'
                                : 'bg-stone-950/50 border-stone-800'
                                }`}>
                                <div className="text-center">
                                    {selectedDenom ? (
                                        <>
                                            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                                                {allDenominations.find(d => d.key === selectedDenom)?.label} Count
                                            </p>
                                            <p className="text-4xl font-bold text-white">
                                                {pinPadValue || '0'}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-stone-500 py-3">Select a denomination</p>
                                    )}
                                </div>
                            </div>

                            {/* Keypad */}
                            <div className="grid grid-cols-3 gap-2 flex-1">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            if (key === 'C') handlePinPadInput('clear')
                                            else if (key === '⌫') handlePinPadInput('backspace')
                                            else handlePinPadInput(key)
                                        }}
                                        disabled={!selectedDenom}
                                        className={`aspect-square rounded-xl text-2xl font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${key === 'C'
                                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30'
                                            : key === '⌫'
                                                ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30'
                                                : 'bg-stone-800 text-white hover:bg-stone-700 border border-stone-700'
                                            }`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>

                            {/* Open Shift Button */}
                            <button
                                onClick={() => handleShiftAction('OPEN', totalAmount)}
                                disabled={totalAmount === 0}
                                className="mt-4 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                            >
                                Open Shift
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const { subtotal, tax, totalCash, totalCard } = calculateTotal()

    const getFilteredItems = () => {
        if (searchQuery) {
            const allItems = [...(menu.services || []), ...(menu.products || [])]
            return allItems.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        if (!selectedCategory) return []
        if (selectedCategory === 'PRODUCTS') return menu.products || []
        return (menu.services || []).filter(s => s.category === selectedCategory)
    }

    const filteredItems = getFilteredItems()

    return (
        <div className="flex h-screen bg-stone-950 overflow-hidden">
            {/* Left Side: Content Area */}
            <div className="flex-1 flex flex-col border-r border-stone-800">
                {/* Header */}
                <div className="h-24 border-b border-stone-800 flex items-center justify-between px-6 bg-stone-900/50">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-stone-800 rounded-lg p-1.5">
                            <button
                                onClick={() => setView('POS')}
                                className={`px-8 py-3 rounded-lg text-base font-semibold transition-all ${view === 'POS' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
                            >
                                Register
                            </button>
                            <button
                                onClick={() => setView('HISTORY')}
                                className={`px-8 py-3 rounded-lg text-base font-semibold transition-all ${view === 'HISTORY' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
                            >
                                Transactions
                            </button>
                        </div>

                        {view === 'POS' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-stone-800 border-none rounded-lg pl-10 pr-4 py-2 text-stone-200 focus:ring-1 focus:ring-orange-500 w-64"
                                />
                            </div>
                        )}

                        {view === 'HISTORY' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-stone-800 border-none rounded-lg pl-10 pr-4 py-2 text-stone-200 focus:ring-1 focus:ring-orange-500 w-64"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end mr-4 text-xs text-stone-500">
                        {locationName && (
                            <div>
                                <span className="font-medium text-stone-400">Loc: </span>
                                {locationName}
                            </div>
                        )}
                        {franchiseName && (
                            <div>
                                <span className="font-medium text-stone-400">Fran: </span>
                                {franchiseName}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowDisplayModal(true)}
                        className="mr-3 p-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-blue-400 transition-colors"
                        title="Open Customer Display"
                    >
                        <Monitor className="h-5 w-5" />
                    </button>

                    {view === 'POS' && (
                        <button
                            onClick={() => {
                                if (!shift) {
                                    setShowShiftModal(true)
                                } else {
                                    // Logic to add a new customer or other POS actions
                                }
                            }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            New Customer
                        </button>
                    )}

                    {view === 'HISTORY' && (
                        <button
                            onClick={() => setShowShiftModal(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <DollarSign className="h-4 w-4" />
                            {shift ? 'Close Shift' : 'Open Shift'}
                        </button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {view === 'POS' ? (
                        <>
                            {!selectedCategory && !searchQuery ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {serviceCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className="h-32 bg-stone-900 rounded-xl border border-stone-800 hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-3 group"
                                        >
                                            <span className="font-bold text-xl text-stone-300 group-hover:text-white">{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        {selectedCategory && (
                                            <button
                                                onClick={() => setSelectedCategory(null)}
                                                className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 transition-colors"
                                            >
                                                <ChevronRight className="h-6 w-6 rotate-180" />
                                            </button>
                                        )}
                                        <h2 className="text-xl font-bold text-white">{selectedCategory || 'Search Results'}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {filteredItems.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    const isOwnerClick = (session?.user as any)?.role === 'FRANCHISOR'
                                                    if (!shift && !isOwnerClick) {
                                                        setShowShiftModal(true)
                                                    } else if (item.name === 'Open Item') {
                                                        setShowOpenItemModal(true)
                                                        setOpenItemPrice('')
                                                    } else {
                                                        addToCart(item, item.category === 'PRODUCTS' ? 'PRODUCT' : 'SERVICE')
                                                    }
                                                }}
                                                className="bg-stone-900 rounded-xl border border-stone-800 p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-500 transition-colors group"
                                            >
                                                {item.image && <img src={item.image} alt={item.name} className="h-24 w-24 object-cover rounded-full mb-2 group-hover:scale-105 transition-transform" />}
                                                <p className="font-medium text-white text-center">{item.name}</p>
                                                <div className="flex flex-col gap-0.5 items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-stone-500">Cash:</span>
                                                        <span className="text-sm font-semibold text-emerald-400">{formatCurrency(item.price)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-stone-500">Card:</span>
                                                        <span className="text-sm font-semibold text-stone-300">{formatCurrency(item.price * 1.0399)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Transaction History */
                        <div className="space-y-4">
                            {transactions.map(tx => (
                                <div
                                    key={tx.id}
                                    className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setSelectedTxForActions(tx)
                                        setShowTransactionModal(true)
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.status === 'REFUNDED' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {tx.status === 'REFUNDED' ? <RotateCcw className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {tx.client ? `${tx.client.firstName} ${tx.client.lastName}` : 'Walk-in Customer'}
                                            </p>
                                            <p className="text-sm text-stone-500">{new Date(tx.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${tx.status === 'REFUNDED' ? 'text-red-400' : 'text-white'}`}>
                                            {formatCurrency(tx.total)}
                                        </p>
                                        <p className="text-xs text-stone-500 uppercase">{tx.paymentMethod}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Cart or Transaction Details */}
            <div className="w-[400px] flex flex-col bg-stone-900 border-l border-stone-800 shadow-2xl">
                {view === 'POS' ? (
                    <>
                        {/* Cart Header */}
                        <div className="h-20 border-b border-stone-800 flex items-center justify-between px-6">
                            <h2 className="text-xl font-bold text-white">Current Order</h2>
                            <div className="flex items-center gap-2">



                                {/* Customer Button */}
                                <button
                                    onClick={() => setShowCustomerModal(true)}
                                    className={`p-2 rounded-lg transition-colors ${selectedCustomer ? 'bg-emerald-600/30 text-emerald-400' : 'hover:bg-stone-800 text-stone-400'}`}
                                    title={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Select Customer'}
                                >
                                    <User className="h-5 w-5" />
                                </button>
                                {/* Discounts Button */}
                                <button
                                    onClick={() => setShowDiscounts(true)}
                                    className={`p-2 rounded-lg transition-colors ${appliedDiscount > 0 ? 'bg-pink-600/20 text-pink-400' : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400'}`}
                                    title="Customer Discounts"
                                >
                                    <Gift className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Selected Customer Strip */}
                        {selectedCustomer && (
                            <div className="px-4 py-2 bg-emerald-900/20 border-b border-emerald-800/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-emerald-400" />
                                    <span className="text-emerald-400 text-sm font-medium">
                                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                                    </span>
                                    {selectedCustomer.loyaltyPoints > 0 && (
                                        <span className="text-amber-400 text-xs">
                                            ⭐ {selectedCustomer.loyaltyPoints} pts
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="text-emerald-400 hover:text-red-400 transition-colors text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-stone-500 space-y-4">
                                    <ShoppingBag className="h-12 w-12 opacity-20" />
                                    <p>Cart is empty</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="bg-stone-950/50 p-4 rounded-xl border border-stone-800 flex flex-col gap-2 group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-stone-200">{item.name}</p>
                                                <p className="text-sm text-stone-500">{formatCurrency(item.price)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCartIndex(idx)
                                                        setDiscountValue(item.discount?.toString() || '')
                                                        setShowDiscountModal(true)
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${item.discount ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-stone-800 text-stone-500'}`}
                                                    title="Apply Discount"
                                                >
                                                    <Tag className="h-4 w-4" />
                                                </button>
                                                <div className="flex items-center bg-stone-900 rounded-lg border border-stone-800">
                                                    <button
                                                        onClick={() => updateQuantity(idx, -1)}
                                                        className="p-1 hover:text-orange-500 transition-colors"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(idx, 1)}
                                                        className="p-1 hover:text-orange-500 transition-colors"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(idx)}
                                                    className="text-stone-600 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {item.discount && (
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-xs bg-orange-900/20 text-orange-400 px-2 py-1 rounded-md border border-orange-900/30">
                                                    -{item.discount}% Off
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totals & Actions */}
                        <div className="p-6 bg-stone-900 border-t border-stone-800 space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-stone-400">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {appliedDiscount > 0 && (
                                    <div className="flex justify-between text-pink-400">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(appliedDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-stone-400">
                                    <span>Tax (8%)</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-stone-800">
                                    <span>Total (Cash)</span>
                                    <span className="text-emerald-400">{formatCurrency(totalCash)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-stone-400">
                                    <span>Total (Card)</span>
                                    <span className="text-stone-300">{formatCurrency(totalCard)}</span>
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    // Check if tips are enabled
                                    if (tipSettings.enabled) {
                                        // Set cart to awaiting tip mode
                                        await fetch('/api/pos/cart', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                items: cart,
                                                subtotal,
                                                tax,
                                                total: totalCash,
                                                status: 'AWAITING_TIP',
                                                showTipPrompt: true,
                                                tipAmount: 0,
                                                tipType: tipSettings.type,
                                                tipSuggestions: tipSettings.suggestions
                                            })
                                        })
                                        setShowTipWaiting(true)
                                    } else {
                                        setShowCheckoutModal(true)
                                    }
                                }}
                                disabled={cart.length === 0}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/20"
                            >
                                Checkout
                            </button>
                        </div>
                    </>
                ) : (
                    /* Transaction Details */
                    selectedTx ? (
                        <div className="flex flex-col h-full">
                            <div className="h-20 border-b border-stone-800 flex items-center justify-between px-6">
                                <h2 className="text-xl font-bold text-white">Order Details</h2>
                                <button onClick={() => setSelectedTx(null)} className="text-stone-400 hover:text-white">Close</button>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto">
                                <div className="text-center mb-6">
                                    <p className="text-stone-400 text-sm">Transaction ID</p>
                                    <p className="text-xs text-stone-500 font-mono">{selectedTx.id}</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">{formatCurrency(selectedTx.total)}</h3>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${selectedTx.status === 'REFUNDED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {selectedTx.status}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {selectedTx.lineItems.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-stone-300">{item.quantity}x {item.name || 'Item'}</span>
                                            <span className="text-white">{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 border-t border-stone-800">
                                {selectedTx.status === 'COMPLETED' && (
                                    <button
                                        onClick={() => handleRefund(selectedTx)}
                                        className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Refund Order
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-stone-500">
                            <p>Select an order to view details</p>
                        </div>
                    )
                )}

                {/* Checkout Modal */}
                {showCheckoutModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-stone-800 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">Payment Method</h2>
                                <button onClick={() => setShowCheckoutModal(false)} className="text-stone-400 hover:text-white">
                                    <Trash2 className="h-6 w-6 rotate-45" />
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-2 gap-6">
                                {/* Cash Payment */}
                                <button
                                    onClick={() => {
                                        const totals = calculateTotal()
                                        fetch('/api/pos/transaction', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                items: cart,
                                                subtotal: totals.subtotal,
                                                tax: totals.tax,
                                                total: totals.totalCash,
                                                paymentMethod: 'CASH',
                                                cashDrawerSessionId: shift?.id
                                            })
                                        }).then(res => {
                                            if (res.ok) {
                                                setCart([])
                                                setShowCheckoutModal(false)
                                                alert('Cash Transaction Completed!')
                                                fetchTransactions()
                                            }
                                        })
                                    }}
                                    className="aspect-video bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
                                >
                                    <Banknote className="h-12 w-12 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xl font-bold text-emerald-100">Cash</span>
                                    <span className="text-sm text-emerald-300">{formatCurrency(totalCash)}</span>
                                </button>

                                {/* Card Payment (PAX Terminal) */}
                                <button
                                    onClick={() => {
                                        setShowCheckoutModal(false)
                                        setShowPaxModal(true)
                                    }}
                                    className="aspect-video bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
                                >
                                    <CreditCard className="h-12 w-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xl font-bold text-blue-100">Card</span>
                                    <span className="text-sm text-blue-300">{formatCurrency(totalCard)}</span>
                                </button>

                                {/* Split Payment */}
                                <button
                                    onClick={() => {
                                        const cash = prompt(`Total: ${formatCurrency(totalCard)}\n\nEnter cash amount:`)
                                        if (!cash) return

                                        const cashAmt = parseFloat(cash)
                                        if (isNaN(cashAmt) || cashAmt <= 0 || cashAmt >= totalCard) {
                                            alert('Invalid cash amount. Must be between $0 and total.')
                                            return
                                        }

                                        const cardAmt = totalCard - cashAmt;
                                        // For now, store these in window for PAX to use
                                        (window as any).splitPaymentCash = cashAmt;
                                        (window as any).splitPaymentCard = cardAmt;
                                        setShowCheckoutModal(false);
                                        setShowPaxModal(true);
                                    }}
                                    className="col-span-2 aspect-video bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
                                >
                                    <Monitor className="h-12 w-12 text-purple-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xl font-bold text-purple-100">Split Payment</span>
                                    <span className="text-sm text-purple-300">Cash + Card</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Discount Modal */}
                {showDiscountModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-stone-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Apply Discount</h3>
                                <button onClick={() => setShowDiscountModal(false)} className="text-stone-400 hover:text-white">
                                    <LogOut className="h-5 w-5 rotate-45" />
                                </button>
                            </div>
                            <div className="p-6">
                                <label className="block text-sm font-medium text-stone-400 mb-2">Discount Percentage (%)</label>
                                <div className="flex gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none text-lg"
                                        placeholder="0"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            if (selectedCartIndex !== null) {
                                                applyDiscount(selectedCartIndex, parseFloat(discountValue) || 0)
                                            }
                                        }}
                                        className="px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {[5, 10, 15, 20, 25, 30, 50, 100].map(pct => (
                                        <button
                                            key={pct}
                                            onClick={() => setDiscountValue(pct.toString())}
                                            className="py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PAX Terminal Payment Modal */}
                <PaxPaymentModal
                    isOpen={showPaxModal}
                    onClose={() => setShowPaxModal(false)}
                    onSuccess={(response) => {
                        const splitCash = (window as any).splitPaymentCash
                        const splitCard = (window as any).splitPaymentCard

                        // Extract PAX details
                        const paymentDetails: PaymentDetails = {
                            gatewayTxId: response.transactionId,
                            authCode: response.authCode,
                            cardLast4: response.cardLast4,
                            cardType: response.cardType
                        }

                        if (splitCash && splitCard) {
                            handleCheckout('SPLIT', splitCash, splitCard, paymentDetails)
                        } else {
                            handleCheckout('CREDIT_CARD', undefined, undefined, paymentDetails)
                        }
                        setShowPaxModal(false)
                    }}
                    amount={totalCard}
                    invoiceNumber={Date.now().toString().slice(-6)}
                />

                {/* Transaction Actions Modal */}
                {showTransactionModal && selectedTxForActions && (
                    <TransactionActionsModal
                        transaction={selectedTxForActions}
                        onClose={() => {
                            setShowTransactionModal(false)
                            setSelectedTxForActions(null)
                        }}
                        onSuccess={() => {
                            fetchTransactions()
                            setShowTransactionModal(false)
                            setSelectedTxForActions(null)
                        }}
                        canProcessRefunds={true}
                        canVoid={true}
                        canDelete={true}
                    />
                )}

                {/* Tip Waiting Modal */}
                {showTipWaiting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-8 max-w-md w-full text-center">
                            <div className="mb-6">
                                <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Waiting for Customer</h2>
                                <p className="text-stone-400">Please ask the customer to select a tip on their display</p>
                            </div>

                            <div className="bg-stone-800 rounded-xl p-4 mb-6">
                                <p className="text-stone-300 text-sm">Order Total</p>
                                <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalCash)}</p>
                            </div>

                            <button
                                onClick={async () => {
                                    // Cancel tip waiting and clear cart tip status
                                    await fetch('/api/pos/cart', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            items: cart,
                                            subtotal,
                                            tax,
                                            total: totalCash,
                                            status: 'ACTIVE',
                                            showTipPrompt: false,
                                            tipAmount: 0
                                        })
                                    })
                                    setShowTipWaiting(false)
                                    setPendingTipAmount(0)
                                    setShowCheckoutModal(true) // Skip to checkout
                                }}
                                className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl font-semibold transition-all"
                            >
                                Skip Tip / Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Tip Polling Effect */}
                {showTipWaiting && <TipPollingEffect onTipReceived={(tipAmount: number) => {
                    setPendingTipAmount(tipAmount)
                    setShowTipWaiting(false)
                    setShowCheckoutModal(true)
                }} />}

                {/* Custom Item Modal with Pin Pad */}
                {showOpenItemModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6 w-[400px] shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Custom Item</h3>
                                <button
                                    onClick={() => {
                                        setShowOpenItemModal(false)
                                        setOpenItemPrice('')
                                    }}
                                    className="text-stone-400 hover:text-white text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Price Display */}
                            <div className="mb-6">
                                <label className="block text-stone-400 text-sm mb-2">Price</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
                                    {usesVirtualKeypad ? (
                                        <div className="w-full pl-14 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-white text-3xl font-bold text-center min-h-[60px] flex items-center justify-center">
                                            {openItemPrice || '0.00'}
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            value={openItemPrice}
                                            onChange={(e) => setOpenItemPrice(e.target.value)}
                                            className="w-full pl-14 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-white text-3xl font-bold text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Pin Pad (Only if enabled) */}
                            {usesVirtualKeypad && (
                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                if (key === '⌫') {
                                                    setOpenItemPrice(prev => prev.slice(0, -1))
                                                } else if (key === '.') {
                                                    if (!openItemPrice.includes('.')) {
                                                        setOpenItemPrice(prev => prev + '.')
                                                    }
                                                } else {
                                                    // Prevent more than 2 decimal places
                                                    const parts = openItemPrice.split('.')
                                                    if (parts.length === 2 && parts[1].length >= 2) return
                                                    setOpenItemPrice(prev => prev + key)
                                                }
                                            }}
                                            className={`h-14 rounded-xl text-2xl font-bold transition-all active:scale-95 ${key === '⌫'
                                                ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30'
                                                : 'bg-stone-800 text-white hover:bg-stone-700 border border-stone-700'
                                                }`}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-4 gap-2 mb-6">
                                {['10', '15', '20', '25'].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setOpenItemPrice(amount)}
                                        className="py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg font-semibold text-sm border border-stone-700"
                                    >
                                        ${amount}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const price = parseFloat(openItemPrice) || 0
                                        if (price <= 0) return
                                        const newItem: CartItem = {
                                            id: `custom-${Date.now()}`,
                                            type: 'SERVICE',
                                            name: 'Custom Item',
                                            price: price,
                                            quantity: 1,
                                            discount: 0
                                        }
                                        setCart(prev => [...prev, newItem])
                                        setShowOpenItemModal(false)
                                        setOpenItemPrice('')
                                    }}
                                    disabled={!openItemPrice || parseFloat(openItemPrice) <= 0}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add ${openItemPrice || '0.00'} to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Discounts Modal */}
                {showDiscounts && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <CustomerDiscounts
                            franchiseId={user?.franchiseId || ''}
                            customerPhone={selectedCustomer?.phone}
                            customerId={selectedCustomer?.id}
                            orderTotal={calculateTotal().subtotal}
                            onDiscountApplied={(discount, source, details) => {
                                setAppliedDiscount(discount)
                                setAppliedDiscountSource(source)
                                setShowDiscounts(false)
                            }}
                            onClose={() => setShowDiscounts(false)}
                        />
                    </div>
                )}

                {/* Customer Display Modal */}
                {showDisplayModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-stone-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-stone-700">
                            <h2 className="text-xl font-bold text-white text-center mb-2">Customer Display</h2>
                            <p className="text-stone-400 text-center text-sm mb-6">Open this URL on your second tablet</p>

                            {/* Display URL */}
                            <div className="bg-stone-800 rounded-lg p-3 mb-4">
                                <p className="text-stone-500 text-xs mb-1">Display URL (Location Specific):</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-orange-400 text-sm break-all">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/kiosk/display?locationId=${user?.locationId || ''}` : ''}
                                    </code>
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/kiosk/display?locationId=${user?.locationId || ''}`
                                            navigator.clipboard.writeText(url)
                                        }}
                                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            {/* Location Sync Status */}
                            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 mb-4 text-center">
                                <p className="text-emerald-400 font-medium">✓ Location-specific sync enabled</p>
                                <p className="text-emerald-600 text-xs">Only this location's cart will show</p>
                            </div>

                            {/* QR Code */}
                            <div className="bg-white rounded-lg p-4 mb-4 flex items-center justify-center">
                                <QRCodeSVG
                                    value={typeof window !== 'undefined' ? `${window.location.origin}/kiosk/display?locationId=${user?.locationId || ''}` : ''}
                                    size={160}
                                    bgColor="#FFFFFF"
                                    fgColor="#000000"
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <p className="text-stone-500 text-xs text-center mb-4">For separate tablet: Scan QR code</p>

                            {/* Actions */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        const url = `/kiosk/display?locationId=${user?.locationId || ''}`
                                        window.open(url, '_blank', 'fullscreen=yes')
                                        setShowDisplayModal(false)
                                    }}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                                >
                                    <Monitor className="h-5 w-5" />
                                    Open on 2nd Screen (USB/HDMI)
                                </button>
                                <button
                                    onClick={() => {
                                        const url = `/kiosk/display?locationId=${user?.locationId || ''}`
                                        window.open(url, 'CustomerDisplay', 'width=1024,height=768')
                                        setShowDisplayModal(false)
                                    }}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                                >
                                    Open in Popup Window
                                </button>
                                <button
                                    onClick={() => setShowDisplayModal(false)}
                                    className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Selection Modal */}
                {showCustomerModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-stone-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-stone-700 max-h-[80vh] flex flex-col">
                            <h2 className="text-xl font-bold text-white text-center mb-2">Select Customer</h2>
                            <p className="text-stone-400 text-center text-sm mb-4">Choose a checked-in customer or search by phone</p>

                            {/* Search Input */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search by name or phone..."
                                    className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    onChange={async (e) => {
                                        const query = e.target.value
                                        if (query.length >= 3 && user?.franchiseId) {
                                            try {
                                                const res = await fetch(`/api/clients/search?query=${encodeURIComponent(query)}&franchiseId=${user.franchiseId}`)
                                                if (res.ok) {
                                                    const data = await res.json()
                                                    if (data.length > 0) {
                                                        setCheckedInCustomers(data)
                                                    }
                                                }
                                            } catch (err) {
                                                console.error('Search error:', err)
                                            }
                                        }
                                    }}
                                />
                            </div>

                            {/* Selected Customer Display */}
                            {selectedCustomer && (
                                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-emerald-400 font-medium">
                                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                                            </p>
                                            <p className="text-emerald-600 text-sm">{selectedCustomer.phone}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedCustomer(null)}
                                            className="text-emerald-400 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Customer List */}
                            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                                {checkedInCustomers.length === 0 ? (
                                    <div className="text-center py-8 text-stone-500">
                                        <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p>No checked-in customers</p>
                                        <p className="text-sm">Search by phone to find a customer</p>
                                    </div>
                                ) : (
                                    checkedInCustomers.map((customer: any) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                setSelectedCustomer(customer)
                                                setShowCustomerModal(false)
                                            }}
                                            className={`w-full p-3 rounded-lg text-left transition-colors ${selectedCustomer?.id === customer.id
                                                ? 'bg-orange-600/30 border border-orange-500'
                                                : 'bg-stone-800 hover:bg-stone-700 border border-stone-700'
                                                }`}
                                        >
                                            <p className="text-white font-medium">
                                                {customer.firstName} {customer.lastName}
                                            </p>
                                            <p className="text-stone-400 text-sm">{customer.phone}</p>
                                            {customer.loyaltyPoints > 0 && (
                                                <p className="text-amber-400 text-xs mt-1">
                                                    ⭐ {customer.loyaltyPoints} loyalty points
                                                </p>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedCustomer(null)
                                        setShowCustomerModal(false)
                                    }}
                                    className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-semibold transition-all"
                                >
                                    Clear & Close
                                </button>
                                <button
                                    onClick={() => setShowCustomerModal(false)}
                                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}

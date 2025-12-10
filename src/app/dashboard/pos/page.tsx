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
    Gift,
    X,
    Menu
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'
import TransactionActionsModal from '@/components/pos/TransactionActionsModal'
import CustomerDiscounts from '@/components/pos/CustomerDiscounts'
import { useFeature, useBusinessConfig } from '@/hooks/useBusinessConfig'
import { QRCodeSVG } from 'qrcode.react'
import Toast from '@/components/ui/Toast'
import { Printer } from 'lucide-react'

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
function TipPollingEffect({ onTipReceived, locationId }: { onTipReceived: (tipAmount: number) => void, locationId?: string }) {
    useEffect(() => {
        if (!locationId) {
            console.warn('No locationId for tip polling')
            return
        }

        let pollCount = 0
        const maxPolls = 120 // 2 minutes timeout

        const pollForTip = async () => {
            try {
                const res = await fetch(`/api/pos/display-sync?locationId=${locationId}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.status === 'TIP_SELECTED' && data.tipSelected) {
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
    }, [onTipReceived, locationId])

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

    // Close shift pinpad state (must be at top level for React hooks rules)
    const [closeShiftDenom, setCloseShiftDenom] = useState<string | null>(null)
    const [closeShiftPinpad, setCloseShiftPinpad] = useState('')

    // Toast and shift report state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [shiftReport, setShiftReport] = useState<any>(null)

    // Cash tendering state
    const [showCashTendering, setShowCashTendering] = useState(false)
    const [cashReceived, setCashReceived] = useState('')
    const [cashTenderingTotal, setCashTenderingTotal] = useState(0)
    const [cashQuickSelect, setCashQuickSelect] = useState(false) // Track if value came from quick button

    // Split payment state
    const [showSplitPayment, setShowSplitPayment] = useState(false)
    const [splitTotal, setSplitTotal] = useState(0)
    const [splitCashAmount, setSplitCashAmount] = useState('')
    const [splitCashReceived, setSplitCashReceived] = useState('')
    const [splitQuickSelect, setSplitQuickSelect] = useState(false)

    // Franchise pricing settings
    const [pricingSettings, setPricingSettings] = useState<{ pricingModel: string; cardSurchargeType: string; cardSurcharge: number; showDualPricing: boolean }>({
        pricingModel: 'STANDARD',
        cardSurchargeType: 'PERCENTAGE',
        cardSurcharge: 0,
        showDualPricing: false
    })
    const [appliedDiscount, setAppliedDiscount] = useState(0)
    const [appliedDiscountSource, setAppliedDiscountSource] = useState<string | null>(null)
    const [checkedInCustomers, setCheckedInCustomers] = useState<any[]>([])

    // Transaction search and filter state
    const [txSearchQuery, setTxSearchQuery] = useState('')
    const [txFilterStatus, setTxFilterStatus] = useState<'ALL' | 'COMPLETED' | 'REFUNDED' | 'VOIDED'>('ALL')

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

    // Sync cart to customer display - especially when cart becomes empty (cancel/delete)
    // But DON'T sync when checkout/tip modals are active (would interfere with payment flow)
    useEffect(() => {
        // Skip syncing during checkout/tip flow to prevent overriding TIP_SELECTED status
        if (showCheckoutModal || showTipWaiting) return

        const syncCartToDisplay = async () => {
            const user = session?.user as any
            if (!user?.locationId) return

            try {
                await fetch('/api/pos/display-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationId: user.locationId,
                        cart: cart.length === 0
                            ? { items: [], status: 'IDLE', subtotal: 0, tax: 0, total: 0 }
                            : {
                                items: cart.map(item => ({
                                    name: item.name,
                                    type: item.type,
                                    price: item.price,
                                    quantity: item.quantity
                                })),
                                status: 'ACTIVE',
                                subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
                            }
                    })
                })
            } catch (error) {
                console.error('Error syncing cart to display:', error)
            }
        }

        // Debounce to avoid too many requests
        const timeoutId = setTimeout(syncCartToDisplay, 300)
        return () => clearTimeout(timeoutId)
    }, [cart, session, showCheckoutModal, showTipWaiting])

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
                        // Load pricing settings
                        setPricingSettings({
                            pricingModel: data.settings.pricingModel || 'STANDARD',
                            cardSurchargeType: data.settings.cardSurchargeType || 'PERCENTAGE',
                            cardSurcharge: parseFloat(data.settings.cardSurcharge) || 0,
                            showDualPricing: data.settings.showDualPricing ?? false
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

        // Only apply card surcharge if dual pricing is enabled
        let totalCard = totalCash
        if (pricingSettings.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing) {
            if (pricingSettings.cardSurchargeType === 'PERCENTAGE') {
                totalCard = totalCash * (1 + pricingSettings.cardSurcharge / 100)
            } else {
                totalCard = totalCash + pricingSettings.cardSurcharge
            }
        }

        const totalWithTip = totalCash + pendingTipAmount
        let totalCardWithTip = totalWithTip
        if (pricingSettings.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing) {
            if (pricingSettings.cardSurchargeType === 'PERCENTAGE') {
                totalCardWithTip = totalWithTip * (1 + pricingSettings.cardSurcharge / 100)
            } else {
                totalCardWithTip = totalWithTip + pricingSettings.cardSurcharge
            }
        }

        return {
            subtotal,
            discount: appliedDiscount,
            tax,
            tip: pendingTipAmount,
            totalCash,
            totalCard,
            totalWithTip,
            totalCardWithTip
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

            // Store shift data before closing (for report)
            const preCloseShift = action === 'CLOSE' ? shift : null

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
                setShowShiftModal(false)
                setDenominations({
                    hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, ones: 0,
                    quarters: 0, dimes: 0, nickels: 0, pennies: 0
                })
                setShiftAmount('')
                setCloseShiftDenom(null)
                setCloseShiftPinpad('')

                if (action === 'CLOSE') {
                    setCart([])
                    setShift(null)
                    // Calculate variance for report
                    const expected = Number(preCloseShift?.expectedCash || preCloseShift?.startingCash || 0) + Number(preCloseShift?.cashSales || 0)
                    const variance = finalAmount - expected

                    // Store report data and show modal
                    setShiftReport({
                        startTime: preCloseShift?.startTime,
                        endTime: new Date().toISOString(),
                        openingAmount: Number(preCloseShift?.startingCash || 0),
                        cashSales: Number(preCloseShift?.cashSales || 0),
                        expected: expected,
                        counted: finalAmount,
                        variance: variance,
                        employeeName: (session?.user as any)?.name || 'Employee'
                    })
                    setToast({ message: 'Shift closed! Printing report...', type: 'success' })
                } else {
                    setShift(data)
                    setToast({ message: 'Shift opened successfully', type: 'success' })
                }
            } else {
                const errorData = await res.json()
                setToast({ message: errorData.error || 'Failed to perform shift action', type: 'error' })
            }
        } catch (error) {
            console.error('Shift action error:', error)
            setToast({ message: 'An error occurred', type: 'error' })
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

    // Close Shift Modal - Show when shift exists (with virtual pinpad)
    if (showShiftModal && shift && !isOwner) {
        const calculateClosingTotal = () => {
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

        const closingTotal = calculateClosingTotal()
        // Note: Database uses 'startingCash' not 'openingAmount'
        const openingAmount = Number(shift.startingCash || shift.openingAmount || 0)
        const cashSales = Number(shift.cashTotal || shift.cashSales || 0)
        const expectedAmount = openingAmount + cashSales
        const difference = closingTotal - expectedAmount
        const isShort = difference < -0.01
        const isOver = difference > 0.01

        const denomList = [
            { label: '$100', key: 'hundreds', mult: 100 },
            { label: '$50', key: 'fifties', mult: 50 },
            { label: '$20', key: 'twenties', mult: 20 },
            { label: '$10', key: 'tens', mult: 10 },
            { label: '$5', key: 'fives', mult: 5 },
            { label: '$1', key: 'ones', mult: 1 },
        ]

        const handlePinpadKey = (key: string) => {
            if (!closeShiftDenom) return
            if (key === 'C') {
                setCloseShiftPinpad('')
                setDenominations(prev => ({ ...prev, [closeShiftDenom]: 0 }))
            } else if (key === '⌫') {
                const newVal = closeShiftPinpad.slice(0, -1)
                setCloseShiftPinpad(newVal)
                setDenominations(prev => ({ ...prev, [closeShiftDenom]: parseInt(newVal) || 0 }))
            } else {
                const newVal = closeShiftPinpad + key
                setCloseShiftPinpad(newVal)
                setDenominations(prev => ({ ...prev, [closeShiftDenom]: parseInt(newVal) || 0 }))
            }
        }

        const selectDenom = (key: string) => {
            setCloseShiftDenom(key)
            setCloseShiftPinpad(denominations[key as keyof typeof denominations]?.toString() || '')
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="w-full max-w-4xl p-6 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl my-8 flex gap-6">
                    {/* Left: Denominations */}
                    <div className="flex-1">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold text-white">Close Shift & Count Drawer</h2>
                            <p className="text-stone-400 text-sm">Tap a denomination, then use keypad</p>
                        </div>

                        <div className="space-y-2">
                            {denomList.map(({ label, key, mult }) => (
                                <div
                                    key={key}
                                    onClick={() => selectDenom(key)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${closeShiftDenom === key
                                        ? 'bg-orange-600/30 border-2 border-orange-500'
                                        : 'bg-stone-800 border-2 border-transparent hover:border-stone-600'
                                        }`}
                                >
                                    <span className="text-emerald-400 font-bold">{label}</span>
                                    <span className="text-2xl font-bold text-white">{denominations[key as keyof typeof denominations] || 0}</span>
                                    <span className="text-stone-400 text-sm">= ${((denominations[key as keyof typeof denominations] || 0) * mult).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Summary - Only show count, NOT expected (prevent theft) */}
                        <div className="mt-4 p-3 bg-stone-800 rounded-xl">
                            <div className="flex justify-between text-white font-bold text-lg">
                                <span>Your Count:</span>
                                <span className="text-emerald-400">${closingTotal.toFixed(2)}</span>
                            </div>
                            <p className="text-stone-500 text-xs mt-2">Count all bills and submit. Manager will verify.</p>
                        </div>
                    </div>

                    {/* Right: Keypad */}
                    <div className="w-64 flex flex-col">
                        <div className="p-4 bg-stone-800 rounded-xl mb-4 text-center">
                            <p className="text-stone-400 text-sm mb-1">{closeShiftDenom ? denomList.find(d => d.key === closeShiftDenom)?.label : 'Select denomination'}</p>
                            <p className="text-4xl font-bold text-white">{closeShiftPinpad || '0'}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 flex-1">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handlePinpadKey(key)}
                                    disabled={!closeShiftDenom}
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

                        {/* Buttons */}
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowShiftModal(false)
                                    setDenominations({
                                        hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, ones: 0,
                                        quarters: 0, dimes: 0, nickels: 0, pennies: 0
                                    })
                                }}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleShiftAction('CLOSE', closingTotal)}
                                disabled={closingTotal === 0}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const { subtotal, tax, totalCash, totalCard, totalWithTip, totalCardWithTip, tip } = calculateTotal()

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
        <>
            <div className="flex h-screen bg-stone-950 overflow-hidden">
                {/* Left Side: Content Area */}
                <div className="flex-1 flex flex-col border-r border-stone-800 min-w-0">
                    {/* Header - Responsive padding and sizing */}
                    <div className="h-16 xl:h-20 border-b border-stone-800 flex items-center justify-between px-3 xl:px-6 bg-stone-900/50">
                        <div className="flex items-center gap-2 xl:gap-4">
                            {/* Menu Button - Links to Dashboard */}
                            <a
                                href="/dashboard"
                                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
                                title="Back to Dashboard"
                            >
                                <Menu className="h-5 w-5" />
                            </a>
                            <div className="flex bg-stone-800 rounded-lg p-1">
                                <button
                                    onClick={() => setView('POS')}
                                    className={`px-4 xl:px-6 py-2 xl:py-2.5 rounded-lg text-sm xl:text-base font-semibold transition-all ${view === 'POS' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
                                >
                                    Register
                                </button>
                                <button
                                    onClick={() => setView('HISTORY')}
                                    className={`px-4 xl:px-6 py-2 xl:py-2.5 rounded-lg text-sm xl:text-base font-semibold transition-all ${view === 'HISTORY' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
                                >
                                    History
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

                    {/* Main Content Area - Responsive padding */}
                    <div className="flex-1 overflow-y-auto p-3 xl:p-6">
                        {view === 'POS' ? (
                            <>
                                {!selectedCategory && !searchQuery ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 xl:gap-4">
                                        {serviceCategories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className="h-24 xl:h-32 bg-stone-900 rounded-xl border border-stone-800 hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-2 group"
                                            >
                                                <span className="font-bold text-base xl:text-xl text-stone-300 group-hover:text-white">{cat}</span>
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
                                {/* Search and Filter Bar */}
                                <div className="bg-stone-900 rounded-xl p-3 border border-stone-800 space-y-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Customer, card last 4, amount, date..."
                                            value={txSearchQuery}
                                            onChange={(e) => setTxSearchQuery(e.target.value)}
                                            className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                        {txSearchQuery && (
                                            <button
                                                onClick={() => setTxSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {(['ALL', 'COMPLETED', 'REFUNDED', 'VOIDED'] as const).map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setTxFilterStatus(status)}
                                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${txFilterStatus === status
                                                    ? status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                        : status === 'REFUNDED' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                                            : status === 'VOIDED' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                                    : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-600'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {transactions
                                    // Filter out refund accounting entries (negative totals) - they're internal records
                                    .filter((tx: any) => parseFloat(String(tx.total)) >= 0)
                                    // Filter by status
                                    .filter((tx: any) => txFilterStatus === 'ALL' || tx.status === txFilterStatus)
                                    // Smart search filter
                                    .filter((tx: any) => {
                                        if (!txSearchQuery.trim()) return true
                                        const query = txSearchQuery.toLowerCase().trim()
                                        const customerName = tx.client
                                            ? `${tx.client.firstName} ${tx.client.lastName}`.toLowerCase()
                                            : 'walk-in customer'
                                        const invoiceId = tx.id.toLowerCase()
                                        const amount = String(tx.total)
                                        const paymentMethod = tx.paymentMethod?.toLowerCase() || ''
                                        const date = new Date(tx.createdAt).toLocaleDateString().toLowerCase()
                                        const cardLast4 = tx.cardLast4 || '' // Search by last 4 of card

                                        return (
                                            customerName.includes(query) ||
                                            invoiceId.includes(query) ||
                                            amount.includes(query) ||
                                            paymentMethod.includes(query) ||
                                            date.includes(query) ||
                                            cardLast4.includes(query)
                                        )
                                    })
                                    .map((tx: any) => {
                                        // Determine transaction status
                                        const totalNum = parseFloat(String(tx.total))
                                        const isRefunded = tx.status === 'REFUNDED' || tx.status === 'PARTIALLY_REFUNDED'
                                        const isVoided = tx.status === 'VOIDED'
                                        const isCompleted = tx.status === 'COMPLETED' && totalNum > 0

                                        // Color scheme based on type
                                        const iconBg = isRefunded ? 'bg-orange-500/10 text-orange-500'
                                            : isVoided ? 'bg-yellow-500/10 text-yellow-500'
                                                : 'bg-emerald-500/10 text-emerald-500'
                                        const amountColor = isRefunded ? 'text-orange-400'
                                            : isVoided ? 'text-yellow-400 line-through'
                                                : 'text-emerald-400'

                                        return (
                                            <div
                                                key={tx.id}
                                                className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSelectedTxForActions(tx)
                                                    setShowTransactionModal(true)
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBg}`}>
                                                        {isRefunded ? <RotateCcw className="h-5 w-5" />
                                                            : isVoided ? <Trash2 className="h-5 w-5" />
                                                                : <Banknote className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white flex items-center gap-2">
                                                            {tx.client ? `${tx.client.firstName} ${tx.client.lastName}` : 'Walk-in Customer'}
                                                            {/* Status Badge */}
                                                            {isRefunded && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                                                                    REFUNDED
                                                                </span>
                                                            )}
                                                            {isVoided && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
                                                                    VOIDED
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-stone-500">
                                                            {new Date(tx.createdAt).toLocaleString()}
                                                            {tx.employee && <span className="ml-2 text-stone-600">• by {tx.employee.name || tx.employee.email}</span>}
                                                        </p>
                                                        {/* Show reason for refunds/voids */}
                                                        {(isRefunded || isVoided) && tx.voidReason && (
                                                            <p className="text-xs text-stone-600 mt-0.5 italic">
                                                                Reason: {tx.voidReason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold ${amountColor}`}>
                                                        {formatCurrency(Math.abs(totalNum))}
                                                    </p>
                                                    <p className="text-xs text-stone-500 uppercase">{tx.paymentMethod}</p>
                                                </div>
                                            </div>
                                        )
                                    })}

                                {/* Empty state when no transactions match */}
                                {transactions
                                    .filter((tx: any) => parseFloat(String(tx.total)) >= 0)
                                    .filter((tx: any) => txFilterStatus === 'ALL' || tx.status === txFilterStatus)
                                    .filter((tx: any) => {
                                        if (!txSearchQuery.trim()) return true
                                        const query = txSearchQuery.toLowerCase().trim()
                                        const customerName = tx.client
                                            ? `${tx.client.firstName} ${tx.client.lastName}`.toLowerCase()
                                            : 'walk-in customer'
                                        const invoiceId = tx.id.toLowerCase()
                                        const amount = String(tx.total)
                                        const paymentMethod = tx.paymentMethod?.toLowerCase() || ''
                                        const cardLast4 = tx.cardLast4 || ''
                                        return customerName.includes(query) || invoiceId.includes(query) || amount.includes(query) || paymentMethod.includes(query) || cardLast4.includes(query)
                                    }).length === 0 && (
                                        <div className="text-center py-8">
                                            <Search className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                                            <p className="text-stone-500">No transactions found</p>
                                            {(txSearchQuery || txFilterStatus !== 'ALL') && (
                                                <button
                                                    onClick={() => { setTxSearchQuery(''); setTxFilterStatus('ALL') }}
                                                    className="mt-2 text-orange-400 hover:text-orange-300 text-sm"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Cart or Transaction Details - Responsive width */}
                <div className="w-[320px] xl:w-[380px] 2xl:w-[420px] shrink-0 flex flex-col bg-stone-900 border-l border-stone-800 shadow-2xl">
                    {view === 'POS' ? (
                        <>
                            {/* Cart Header - Responsive */}
                            <div className="h-16 xl:h-20 border-b border-stone-800 flex items-center justify-between px-3 xl:px-6">
                                <h2 className="text-base xl:text-xl font-bold text-white">Order</h2>
                                <div className="flex items-center gap-1 xl:gap-2">



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
                                        const user = session?.user as any
                                        if (tipSettings.enabled && user?.locationId) {
                                            // Set cart to awaiting tip mode - POST to display-sync so customer display shows tip modal
                                            await fetch('/api/pos/display-sync', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    locationId: user.locationId,
                                                    cart: {
                                                        items: cart.map(item => ({
                                                            name: item.name,
                                                            type: item.type,
                                                            price: item.price,
                                                            cashPrice: getItemPrice(item),
                                                            quantity: item.quantity
                                                        })),
                                                        subtotal,
                                                        tax,
                                                        total: totalCash,
                                                        status: 'AWAITING_TIP',
                                                        showTipPrompt: true,
                                                        tipAmount: 0,
                                                        tipType: tipSettings.type,
                                                        tipSuggestions: tipSettings.suggestions
                                                    }
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
                                            setCashTenderingTotal(totals.totalWithTip)
                                            setCashReceived('')
                                            setShowCheckoutModal(false)
                                            setShowCashTendering(true)
                                        }}
                                        className="aspect-video bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
                                    >
                                        <Banknote className="h-12 w-12 text-emerald-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-xl font-bold text-emerald-100">Cash</span>
                                        <span className="text-sm text-emerald-300">{formatCurrency(totalWithTip)}</span>
                                        {tip > 0 && <span className="text-xs text-orange-400">(includes ${tip.toFixed(2)} tip)</span>}
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
                                        <span className="text-sm text-blue-300">{formatCurrency(totalCardWithTip)}</span>
                                        {tip > 0 && <span className="text-xs text-orange-400">(includes ${tip.toFixed(2)} tip)</span>}
                                    </button>

                                    {/* Split Payment */}
                                    <button
                                        onClick={() => {
                                            const totals = calculateTotal()
                                            setSplitTotal(totals.totalWithTip)
                                            setSplitCashAmount('')
                                            setSplitCashReceived('')
                                            setSplitQuickSelect(false)
                                            setShowCheckoutModal(false)
                                            setShowSplitPayment(true)
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

                    {/* Cash Tendering Modal */}
                    {showCashTendering && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                            <div className="w-full max-w-sm bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">Cash Payment</h2>
                                    <button
                                        onClick={() => {
                                            setShowCashTendering(false)
                                            setShowCheckoutModal(true)
                                        }}
                                        className="text-stone-400 hover:text-white"
                                    >
                                        <Trash2 className="h-5 w-5 rotate-45" />
                                    </button>
                                </div>

                                <div className="p-4">
                                    {/* Amount Due */}
                                    <div className="text-center mb-4 bg-stone-800/50 rounded-xl p-3">
                                        <p className="text-stone-400 text-xs">Amount Due</p>
                                        <p className="text-2xl font-bold text-orange-400">{formatCurrency(cashTenderingTotal)}</p>
                                    </div>

                                    {/* Cash Received Input */}
                                    <div className="mb-3">
                                        <label className="block text-xs text-stone-400 mb-1">Cash Received</label>
                                        <input
                                            type="text"
                                            value={cashReceived ? `$${cashReceived}` : '$0.00'}
                                            readOnly
                                            className="w-full text-center text-3xl font-bold bg-stone-800 border border-stone-700 rounded-xl py-3 text-orange-400"
                                        />
                                    </div>

                                    {/* Change Due */}
                                    {parseFloat(cashReceived || '0') >= cashTenderingTotal && (
                                        <div className="mb-3 text-center bg-emerald-500/20 border-2 border-emerald-400 rounded-xl p-3 animate-pulse">
                                            <p className="text-emerald-300 text-xs font-medium">CHANGE DUE</p>
                                            <p className="text-4xl font-bold text-emerald-400">
                                                {formatCurrency(parseFloat(cashReceived || '0') - cashTenderingTotal)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Quick Amount Buttons */}
                                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                                        {[1, 5, 10, 20, 50, 100].map(amount => (
                                            <button
                                                key={amount}
                                                onClick={() => {
                                                    setCashReceived(amount.toString())
                                                    setCashQuickSelect(true)
                                                }}
                                                className="py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-sm font-medium transition-all border border-stone-700"
                                            >
                                                ${amount}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                setCashReceived(Math.ceil(cashTenderingTotal).toString())
                                                setCashQuickSelect(true)
                                            }}
                                            className="py-2 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 rounded-lg text-sm font-medium transition-all border border-orange-500/30"
                                        >
                                            Exact
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCashReceived('')
                                                setCashQuickSelect(false)
                                            }}
                                            className="py-2 bg-stone-800 hover:bg-red-900/30 text-stone-400 hover:text-red-300 rounded-lg text-sm font-medium transition-all border border-stone-700"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {/* Numpad */}
                                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'].map(key => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    if (key === '←') {
                                                        setCashReceived(prev => prev.slice(0, -1))
                                                        setCashQuickSelect(false)
                                                    } else if (key === '.') {
                                                        // If quick select was used, start fresh with "0."
                                                        if (cashQuickSelect) {
                                                            setCashReceived('0.')
                                                            setCashQuickSelect(false)
                                                        } else if (!cashReceived.includes('.')) {
                                                            setCashReceived(prev => prev + '.')
                                                        }
                                                    } else {
                                                        // If quick select was used, clear and start with new digit
                                                        if (cashQuickSelect) {
                                                            setCashReceived(key)
                                                            setCashQuickSelect(false)
                                                        } else {
                                                            setCashReceived(prev => prev + key)
                                                        }
                                                    }
                                                }}
                                                className="py-3 bg-stone-800 hover:bg-stone-700 text-white text-lg font-bold rounded-lg transition-all border border-stone-700"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Complete Transaction Button */}
                                    <button
                                        onClick={async () => {
                                            const received = parseFloat(cashReceived || '0')
                                            if (received < cashTenderingTotal) {
                                                setToast({ message: 'Cash received is less than amount due', type: 'error' })
                                                return
                                            }

                                            const totals = calculateTotal()
                                            try {
                                                const res = await fetch('/api/pos/transaction', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        items: cart,
                                                        subtotal: totals.subtotal,
                                                        tax: totals.tax,
                                                        tip: totals.tip,
                                                        total: cashTenderingTotal,
                                                        paymentMethod: 'CASH',
                                                        cashDrawerSessionId: shift?.id
                                                    })
                                                })
                                                if (res.ok) {
                                                    const changeDue = received - cashTenderingTotal
                                                    setCart([])
                                                    setPendingTipAmount(0)
                                                    setShowCashTendering(false)
                                                    setCashReceived('')
                                                    // Clear display sync
                                                    const user = session?.user as any
                                                    if (user?.locationId) {
                                                        await fetch('/api/pos/display-sync', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                locationId: user.locationId,
                                                                cart: { status: 'COMPLETED', items: [] }
                                                            })
                                                        })
                                                    }
                                                    setToast({
                                                        message: `Transaction Complete! ${changeDue > 0 ? `Change: ${formatCurrency(changeDue)}` : ''}`,
                                                        type: 'success'
                                                    })
                                                    fetchTransactions()
                                                } else {
                                                    setToast({ message: 'Transaction failed', type: 'error' })
                                                }
                                            } catch (error) {
                                                console.error('Transaction error:', error)
                                                setToast({ message: 'Transaction failed', type: 'error' })
                                            }
                                        }}
                                        disabled={parseFloat(cashReceived || '0') < cashTenderingTotal}
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all"
                                    >
                                        {parseFloat(cashReceived || '0') >= cashTenderingTotal
                                            ? `Complete - Change: ${formatCurrency(parseFloat(cashReceived || '0') - cashTenderingTotal)}`
                                            : 'Enter Cash Amount'
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Split Payment Modal */}
                    {showSplitPayment && (() => {
                        const cashAmt = parseFloat(splitCashAmount || '0')
                        const cardAmt = Math.max(0, splitTotal - cashAmt)
                        const cashReceivedAmt = parseFloat(splitCashReceived || '0')
                        const changeDue = Math.max(0, cashReceivedAmt - cashAmt)
                        const isValidSplit = cashAmt > 0 && cashAmt < splitTotal && cashReceivedAmt >= cashAmt

                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                                <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                                    <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-white">Split Payment</h2>
                                        <button
                                            onClick={() => {
                                                setShowSplitPayment(false)
                                                setShowCheckoutModal(true)
                                            }}
                                            className="text-stone-400 hover:text-white"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Total Display */}
                                        <div className="text-center bg-stone-800/50 rounded-xl p-3">
                                            <p className="text-stone-400 text-xs">Total Amount</p>
                                            <p className="text-2xl font-bold text-purple-400">{formatCurrency(splitTotal)}</p>
                                        </div>

                                        {/* Cash/Card Split Display */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                                                <p className="text-emerald-400 text-xs font-medium">CASH PORTION</p>
                                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(cashAmt)}</p>
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                                                <p className="text-blue-400 text-xs font-medium">CARD PORTION</p>
                                                <p className="text-xl font-bold text-blue-400">{formatCurrency(cardAmt)}</p>
                                            </div>
                                        </div>

                                        {/* Cash Amount Input */}
                                        <div>
                                            <label className="text-stone-400 text-sm block mb-2">Enter Cash Amount</label>
                                            <input
                                                type="text"
                                                value={splitCashAmount ? `$${splitCashAmount}` : ''}
                                                readOnly
                                                placeholder="$0.00"
                                                className="w-full text-center text-2xl font-bold bg-stone-800 border border-stone-700 rounded-xl p-3 text-white"
                                            />
                                        </div>

                                        {/* Quick Cash Buttons */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {[10, 20, 50, 100].map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => {
                                                        const newAmt = Math.min(amt, splitTotal - 0.01)
                                                        setSplitCashAmount(newAmt.toFixed(2))
                                                        setSplitQuickSelect(true)
                                                    }}
                                                    disabled={amt >= splitTotal}
                                                    className="py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-white rounded-lg text-sm font-medium border border-stone-700"
                                                >
                                                    ${amt}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Numpad */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'].map(key => (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        if (key === '←') {
                                                            setSplitCashAmount(prev => prev.slice(0, -1))
                                                            setSplitQuickSelect(false)
                                                        } else if (key === '.') {
                                                            if (splitQuickSelect) {
                                                                setSplitCashAmount('0.')
                                                                setSplitQuickSelect(false)
                                                            } else if (!splitCashAmount.includes('.')) {
                                                                setSplitCashAmount(prev => prev + '.')
                                                            }
                                                        } else {
                                                            if (splitQuickSelect) {
                                                                setSplitCashAmount(key)
                                                                setSplitQuickSelect(false)
                                                            } else {
                                                                setSplitCashAmount(prev => prev + key)
                                                            }
                                                        }
                                                    }}
                                                    className="py-3 bg-stone-800 hover:bg-stone-700 text-white text-lg font-bold rounded-lg border border-stone-700"
                                                >
                                                    {key}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Cash Received (when cash portion is set) */}
                                        {cashAmt > 0 && cashAmt < splitTotal && (
                                            <div className="bg-stone-800/50 rounded-xl p-3 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-stone-400 text-sm">Cash Received:</span>
                                                    <input
                                                        type="number"
                                                        value={splitCashReceived}
                                                        onChange={(e) => setSplitCashReceived(e.target.value)}
                                                        placeholder={cashAmt.toFixed(2)}
                                                        className="w-32 text-right bg-stone-700 border border-stone-600 rounded px-2 py-1 text-white"
                                                    />
                                                </div>
                                                {cashReceivedAmt >= cashAmt && (
                                                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                                                        <span>Change Due:</span>
                                                        <span>{formatCurrency(changeDue)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Process Button */}
                                        <button
                                            onClick={() => {
                                                if (!isValidSplit) return
                                                // Store split amounts for PAX
                                                (window as any).splitPaymentCash = cashAmt;
                                                (window as any).splitPaymentCard = cardAmt;
                                                setShowSplitPayment(false)
                                                setShowPaxModal(true)
                                            }}
                                            disabled={!isValidSplit}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg"
                                        >
                                            {isValidSplit
                                                ? `Process Card: ${formatCurrency(cardAmt)}`
                                                : cashAmt <= 0
                                                    ? 'Enter Cash Amount'
                                                    : cashAmt >= splitTotal
                                                        ? 'Cash must be less than total'
                                                        : 'Enter Cash Received'
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}

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
                    {showTipWaiting && <TipPollingEffect
                        locationId={(session?.user as any)?.locationId}
                        onTipReceived={(tipAmount: number) => {
                            setPendingTipAmount(tipAmount)
                            setShowTipWaiting(false)
                            setShowCheckoutModal(true)
                        }}
                    />}

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

            {/* Toast Notification */}
            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )
            }

            {/* Shift Report Modal - Auto prints */}
            {
                shiftReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 print:bg-white print:p-0">
                        <div className="w-full max-w-md bg-white text-black p-6 rounded-xl shadow-2xl print:shadow-none print:max-w-full">
                            <div className="text-center mb-4 border-b pb-4">
                                <h2 className="text-xl font-bold">SHIFT REPORT</h2>
                                <p className="text-gray-500 text-sm">{locationName || 'POS Terminal'}</p>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Employee:</span>
                                    <span className="font-medium">{shiftReport.employeeName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Shift Start:</span>
                                    <span className="font-medium">{new Date(shiftReport.startTime).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Shift End:</span>
                                    <span className="font-medium">{new Date(shiftReport.endTime).toLocaleString()}</span>
                                </div>
                                <div className="border-t my-3"></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Opening Amount:</span>
                                    <span className="font-medium">${shiftReport.openingAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Cash Sales:</span>
                                    <span className="font-medium">${shiftReport.cashSales.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Expected:</span>
                                    <span>${shiftReport.expected.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Counted:</span>
                                    <span>${shiftReport.counted.toFixed(2)}</span>
                                </div>
                                <div className={`flex justify-between font-bold text-lg pt-2 border-t mt-2 ${shiftReport.variance < 0 ? 'text-red-600' : shiftReport.variance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    <span>{shiftReport.variance < 0 ? 'SHORT' : shiftReport.variance > 0 ? 'OVER' : 'BALANCED'}</span>
                                    <span>{shiftReport.variance >= 0 ? '+' : ''}${shiftReport.variance.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2 print:hidden">
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                                <button
                                    onClick={() => setShiftReport(null)}
                                    className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-lg font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    )
}

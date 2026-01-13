'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
    Menu,
    Maximize2,
    Minimize2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'
import TransactionActionsModal from '@/components/pos/TransactionActionsModal'
import CustomerDiscounts from '@/components/pos/CustomerDiscounts'
import { useFeature, useBusinessConfig } from '@/hooks/useBusinessConfig'
import { QRCodeSVG } from 'qrcode.react'
import Toast from '@/components/ui/Toast'
import { Printer } from 'lucide-react'
import ReceiptModal from '@/components/pos/ReceiptModal'
import { printReceipt as printThermalReceipt, isPrintAgentAvailable, ReceiptData } from '@/lib/print-agent'
import { normalizeTransactionForPrint } from '@/lib/print-utils'

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
    barberId?: string // ID of barber who will perform this service
    cashPrice?: number // Dual pricing
    cardPrice?: number // Dual pricing
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
    // Dual pricing fields (API returns strings, consumers convert as needed)
    totalCash?: number
    totalCard?: number
    chargedMode?: string
    change?: number
    cardLast4?: string
}

// Categories are now dynamically loaded from services - no hardcoded list

// Component to poll for tip selection from customer display
function TipPollingEffect({ onTipReceived, locationId }: { onTipReceived: (tipAmount: number) => void, locationId?: string }) {
    useEffect(() => {
        if (!locationId) {
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

function POSContent() {
    const searchParams = useSearchParams()
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

    // DEBUG OVERLAY
    const [showDebug, setShowDebug] = useState(false)

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

    // Ref to skip next cart sync (used when canceling payment to avoid race condition)
    const skipNextCartSync = useRef(false)

    // Confirmation modal state
    const [showClearCartConfirm, setShowClearCartConfirm] = useState(false)

    // Customer discounts state
    const [showDiscounts, setShowDiscounts] = useState(false)

    // Close shift pinpad state (must be at top level for React hooks rules)
    const [closeShiftDenom, setCloseShiftDenom] = useState<string | null>(null)
    const [closeShiftPinpad, setCloseShiftPinpad] = useState('')

    // Toast and shift report state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [shiftReport, setShiftReport] = useState<any>(null)

    // Shift requirement mode (from BusinessConfig)
    // NONE = no shift required, CLOCK_IN_ONLY = simple clock in, CASH_COUNT_ONLY = drawer only, BOTH = full
    const [shiftRequirement, setShiftRequirement] = useState<'NONE' | 'CLOCK_IN_ONLY' | 'CASH_COUNT_ONLY' | 'BOTH'>('BOTH')

    // Cash tendering state
    const [showCashTendering, setShowCashTendering] = useState(false)
    const [cashReceived, setCashReceived] = useState('')

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])
    const [cashTenderingTotal, setCashTenderingTotal] = useState(0)
    const [cashQuickSelect, setCashQuickSelect] = useState(false) // Track if value came from quick button

    // Split payment state
    const [showSplitPayment, setShowSplitPayment] = useState(false)
    const [splitTotal, setSplitTotal] = useState(0)
    const [splitCashAmount, setSplitCashAmount] = useState('')
    const [splitCashReceived, setSplitCashReceived] = useState('')
    const [splitQuickSelect, setSplitQuickSelect] = useState(false)
    const [isSplitPayment, setIsSplitPayment] = useState(false) // Flag to indicate split payment mode
    const [paxAmount, setPaxAmount] = useState(0) // Custom amount for PAX (card portion in split)

    // Receipt modal state
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [lastTransactionData, setLastTransactionData] = useState<any>(null)

    // Franchise pricing settings
    const [pricingSettings, setPricingSettings] = useState<{ pricingModel: string; cardSurchargeType: string; cardSurcharge: number; showDualPricing: boolean; taxRate?: number }>({
        pricingModel: 'STANDARD',
        cardSurchargeType: 'PERCENTAGE',
        cardSurcharge: 0,
        showDualPricing: false,
        taxRate: 0.08 // Default fallback
    })
    const [appliedDiscount, setAppliedDiscount] = useState(0)
    const [appliedDiscountSource, setAppliedDiscountSource] = useState<string | null>(null)
    const [checkedInCustomers, setCheckedInCustomers] = useState<any[]>([])

    // Barber selection for service-based pricing
    interface BarberInfo {
        id: string
        name: string
    }
    interface BarberService {
        id: string
        name: string
        duration: number
        price: number
        shopPrice: number
        hasCustomPrice: boolean
    }
    const [selectedBarber, setSelectedBarber] = useState<BarberInfo | null>(null)
    const [barberServices, setBarberServices] = useState<BarberService[]>([])
    const [barberList, setBarberList] = useState<BarberInfo[]>([])

    // Station support for multi-register display sync
    interface StationInfo {
        id: string
        name: string
    }
    const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null)

    // Transaction search and filter state
    const [txSearchQuery, setTxSearchQuery] = useState('')
    const [txFilterStatus, setTxFilterStatus] = useState<'ALL' | 'COMPLETED' | 'REFUNDED' | 'VOIDED'>('ALL')
    const [txDateFilter, setTxDateFilter] = useState<string>(new Date().toISOString().split('T')[0]) // Default to today

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

    // Auto-select first category if none selected
    useEffect(() => {
        if (!selectedCategory && serviceCategories.length > 0) {
            setSelectedCategory(serviceCategories[0])
        }
    }, [serviceCategories, selectedCategory])

    // Combined init function - reduces 4 API calls to 1
    const initSalonPOS = async () => {
        try {
            const res = await fetch('/api/pos/salon/init')
            if (res.ok) {
                const data = await res.json()

                // Menu (services, products, discounts)
                // ApiResponse wraps the payload in a 'data' property
                const payload = data.data || data

                if (payload.menu) {
                    setMenu({
                        services: payload.menu.services || [],
                        products: payload.menu.products || [],
                        discounts: payload.menu.discounts || []
                    })
                }

                if (payload.employees) {
                    setBarberList(payload.employees.map((e: any) => ({ id: e.id, name: e.name })))
                }

                // Pricing settings
                if (payload.pricingSettings) {
                    setPricingSettings(payload.pricingSettings)
                }

                if (payload.activeShift) {
                    setShift(payload.activeShift)
                }
            } else {
                console.error('[SALON POS] Init failed:', res.status)
                // Fallback to individual fetches if combined fails
                fetchMenu()
                fetchBarberList()
            }
        } catch (error) {
            console.error('[SALON POS] Init error:', error)
            // Fallback
            fetchMenu()
            fetchBarberList()
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        initSalonPOS()      // Combined: menu + employees + pricing (1 call)
        fetchTransactions() // Transactions (1 call)
        checkShift()        // Shift with role logic (1 call)
        fetchCheckedInCustomers()
        loadAssignedStation()
        if (session?.user) {
            fetchDetails()
        }
    }, [session])

    // Load assigned station for display sync
    const loadAssignedStation = async () => {
        try {
            const res = await fetch('/api/pos/my-station')
            if (res.ok) {
                const data = await res.json()
                if (data.station) {
                    setSelectedStation({ id: data.station.id, name: data.station.name })
                }
            }
        } catch (error) {
            console.error('Failed to load station:', error)
        }
    }

    // Handle appointment checkout URL params - auto-add service to cart
    useEffect(() => {
        const checkoutParam = searchParams.get('checkout')
        if (checkoutParam) {
            try {
                const checkoutData = JSON.parse(checkoutParam)
                if (checkoutData.serviceName && checkoutData.servicePrice) {
                    // Add appointment service to cart
                    const appointmentItem: CartItem = {
                        id: `appt-${checkoutData.appointmentId || Date.now()}`,
                        type: 'SERVICE',
                        name: checkoutData.serviceName,
                        price: parseFloat(checkoutData.servicePrice),
                        quantity: 1
                    }
                    setCart([appointmentItem])
                    setToast({
                        message: `Added ${checkoutData.serviceName} from appointment`,
                        type: 'success'
                    })

                    // Clear the URL param to prevent re-adding on refresh
                    window.history.replaceState({}, '', '/dashboard/pos')
                }
            } catch (e) {
                console.error('Error parsing checkout param:', e)
            }
        }
    }, [searchParams])

    // Sync cart to customer display - especially when cart becomes empty (cancel/delete)
    // But DON'T sync when checkout/tip/pax modals are active (would interfere with payment flow)
    useEffect(() => {
        // Skip syncing during checkout/tip/pax flow to prevent overriding status
        if (showCheckoutModal || showTipWaiting || showPaxModal) return

        // Check if we should skip this sync (e.g., after cancel to avoid race condition)
        if (skipNextCartSync.current) {
            skipNextCartSync.current = false
            return
        }

        const syncCartToDisplay = async () => {
            const user = session?.user as any
            // Use stationId for multi-register support, fallback to locationId
            const syncKey = selectedStation?.id || user?.locationId
            if (!syncKey) return

            try {
                // Calculate totals using the same logic as the POS display
                const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0)
                const discountedSubtotal = Math.max(0, subtotal - appliedDiscount)

                // Calculate tax
                let tax = 0
                if (config) {
                    const taxableSubtotal = cart.reduce((sum, item) => {
                        const price = getItemPrice(item)
                        const isTaxable = (item.type === 'SERVICE' && config.taxServices) ||
                            (item.type === 'PRODUCT' && config.taxProducts)
                        return isTaxable ? sum + price : sum
                    }, 0)
                    const taxableAfterDiscount = Math.max(0, taxableSubtotal - appliedDiscount)
                    tax = taxableAfterDiscount * (config.taxRate || 0.08)
                }

                const total = discountedSubtotal + tax

                const cartData = cart.length === 0
                    ? { items: [], status: 'IDLE', subtotal: 0, tax: 0, total: 0, cashTotal: 0, cardTotal: 0, showDualPricing: false, customerName: null }
                    : {
                        items: cart.map(item => {
                            const cashPrice = getItemPrice(item)
                            const cardPrice = pricingSettings.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing
                                ? (pricingSettings.cardSurchargeType === 'PERCENTAGE'
                                    ? cashPrice * (1 + pricingSettings.cardSurcharge / 100)
                                    : cashPrice + pricingSettings.cardSurcharge)
                                : cashPrice
                            return {
                                name: item.name,
                                type: item.type,
                                price: item.price,
                                quantity: item.quantity,
                                discount: item.discount || 0,
                                // Send both cash and card prices for dual pricing display
                                displayPrice: cashPrice,
                                cashPrice: cashPrice,
                                cardPrice: cardPrice
                            }
                        }),
                        status: 'ACTIVE',
                        subtotal: discountedSubtotal,
                        tax: tax,
                        total: total,
                        // Dual pricing data for customer display
                        cashTotal: total,
                        cardTotal: pricingSettings.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing
                            ? (pricingSettings.cardSurchargeType === 'PERCENTAGE'
                                ? total * (1 + pricingSettings.cardSurcharge / 100)
                                : total + pricingSettings.cardSurcharge)
                            : total,
                        showDualPricing: pricingSettings.showDualPricing,
                        customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : null
                    }

                await fetch('/api/pos/display-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Use stationId if station assigned, else locationId for backward compatibility
                        ...(selectedStation?.id ? { stationId: selectedStation.id } : { locationId: user?.locationId }),
                        cart: cartData
                    })
                })
            } catch (error) {
                console.error('Error syncing cart to display:', error)
            }
        }

        // Debounce to avoid too many requests
        const timeoutId = setTimeout(syncCartToDisplay, 300)
        return () => clearTimeout(timeoutId)
    }, [cart, session, showCheckoutModal, showTipWaiting, showPaxModal, selectedCustomer, selectedStation, pricingSettings])

    // Helper to cancel payment on customer display - sends CANCELLED status so display exits Processing mode
    const cancelPaymentOnDisplay = async () => {
        const user = session?.user as any
        const syncKey = selectedStation?.id || user?.locationId
        if (!syncKey) return

        // Set flag to skip the next automatic cart sync (which would run when modal closes)
        skipNextCartSync.current = true

        try {
            // First, send CANCELLED to exit processing mode on display
            await fetch('/api/pos/display-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(selectedStation?.id ? { stationId: selectedStation.id } : { locationId: user?.locationId }),
                    cart: {
                        status: 'CANCELLED',
                        items: [],
                        subtotal: 0,
                        tax: 0,
                        total: 0
                    }
                })
            })

            // Wait a moment for display to pick up CANCELLED status, then send actual cart
            setTimeout(async () => {
                try {
                    const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0)
                    const discountedSubtotal = Math.max(0, subtotal - appliedDiscount)
                    const tax = discountedSubtotal * 0.08 // Use default 8% tax for display sync
                    const total = discountedSubtotal + tax

                    const cartData = cart.length === 0
                        ? { items: [], status: 'IDLE', subtotal: 0, tax: 0, total: 0, cashTotal: 0, cardTotal: 0, showDualPricing: false, customerName: null }
                        : {
                            items: cart.map(item => {
                                const cashPrice = getItemPrice(item)
                                const cardPrice = pricingSettings.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing
                                    ? (pricingSettings.cardSurchargeType === 'PERCENTAGE'
                                        ? cashPrice * (1 + pricingSettings.cardSurcharge / 100)
                                        : cashPrice + pricingSettings.cardSurcharge)
                                    : cashPrice
                                return {
                                    name: item.name,
                                    type: item.type,
                                    price: item.price,
                                    quantity: item.quantity,
                                    discount: item.discount || 0,
                                    displayPrice: cashPrice,
                                    cashPrice: cashPrice,
                                    cardPrice: cardPrice
                                }
                            }),
                            status: 'ACTIVE',
                            subtotal: discountedSubtotal,
                            tax: tax,
                            total: total,
                            cashTotal: total,
                            cardTotal: pricingSettings.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing
                                ? (pricingSettings.cardSurchargeType === 'PERCENTAGE'
                                    ? total * (1 + pricingSettings.cardSurcharge / 100)
                                    : total + pricingSettings.cardSurcharge)
                                : total,
                            showDualPricing: pricingSettings.showDualPricing,
                            customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : null
                        }

                    await fetch('/api/pos/display-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...(selectedStation?.id ? { stationId: selectedStation.id } : { locationId: user?.locationId }),
                            cart: cartData
                        })
                    })
                } catch (error) {
                    console.error('Error syncing cart after cancel:', error)
                }
            }, 600) // Wait 600ms for display to poll and process CANCELLED
        } catch (error) {
            console.error('Error cancelling payment on display:', error)
        }
    }

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
                        setPricingSettings(prev => ({
                            ...prev,
                            pricingModel: data.settings.pricingModel || 'STANDARD',
                            cardSurchargeType: data.settings.cardSurchargeType || 'PERCENTAGE',
                            cardSurcharge: parseFloat(data.settings.cardSurcharge) || 0,
                        }))
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

    // Fetch list of barbers (employees) for barber selection
    const fetchBarberList = async () => {
        try {
            const res = await fetch('/api/franchise/employees')
            if (res.ok) {
                const data = await res.json()
                // API returns paginated format: { data: [...], pagination: {...} }
                const employees = data.data || data.employees || (Array.isArray(data) ? data : [])
                // Debug log removed
                setBarberList(employees.map((e: any) => ({ id: e.id, name: e.name })))
            } else {
                console.error('[SALON POS] Failed to fetch staff list:', res.status)
            }
        } catch (error) {
            console.error('Failed to fetch barber list:', error)
        }
    }

    // Fetch barber's allowed services with their prices
    const fetchBarberServices = async (barberId: string) => {
        try {
            const res = await fetch(`/api/pos/barber-prices/${barberId}`)
            if (res.ok) {
                const data = await res.json()
                setBarberServices(data.services || [])
            }
        } catch (error) {
            console.error('Failed to fetch barber services:', error)
            setBarberServices([])
        }
    }

    // Load barber list on mount
    useEffect(() => {
        fetchBarberList()
    }, [])

    // Load barber services when barber is selected
    useEffect(() => {
        if (selectedBarber) {
            fetchBarberServices(selectedBarber.id)
        } else {
            setBarberServices([])
        }
    }, [selectedBarber])

    const fetchTransactions = async (dateOverride?: string) => {
        try {
            // Use override date or current filter date
            const dateStr = dateOverride || txDateFilter
            const res = await fetch(`/api/pos/transaction?dateFrom=${dateStr}&dateTo=${dateStr}`)
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
                if (data.shiftRequirement) {
                    setShiftRequirement(data.shiftRequirement)
                }
                if (data.shift) {
                    setShift(data.shift)
                }
            } catch (error) {
                console.error('Failed to check shift:', error)
            }
            return // No shift modal for owners
        }

        // Employee mode - check shiftRequirement
        try {
            const res = await fetch('/api/pos/shift')
            const data = await res.json()

            // Save shift requirement setting
            if (data.shiftRequirement) {
                setShiftRequirement(data.shiftRequirement)
            }

            // Check if shift is required
            if (data.shiftRequirement === 'NONE') {
                // No shift required - skip modal
                return
            }

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
            setToast({ message: 'Please open a shift first', type: 'error' })
            setShowShiftModal(true)
            return
        }
        const newItem: CartItem = {
            id: item.id,
            type,
            name: item.name,
            price: item.price,
            quantity: 1,
            discount: 0,
            barberId: type === 'SERVICE' ? selectedBarber?.id : undefined
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

    // === PRINT RECEIPT: Uses shared normalizer (single source of truth) ===
    // No more cart snapshot workaround - always uses DB transaction data
    const printReceipt = async (transaction: Transaction) => {
        try {
            // Check if thermal print agent is available
            const agentAvailable = await isPrintAgentAvailable()

            if (agentAvailable) {
                // Use shared normalizer for consistent print format
                const receiptData: ReceiptData = normalizeTransactionForPrint(
                    transaction as any,
                    {
                        showDualPricing: pricingSettings.showDualPricing,
                        storeName: franchiseName || locationName || 'Store',
                        storeAddress: '123 Main St, City, ST 12345', // TODO: Get from franchise settings
                        storePhone: '(555) 123-4567' // TODO: Get from franchise settings
                    },
                    (session?.user as any)?.name || 'Staff'
                )

                const result = await printThermalReceipt(receiptData)
                if (!result.success) {
                    console.error('Thermal print failed:', result.error)
                    // Fallback to browser print
                    openBrowserPrintWindow(transaction)
                }
            } else {
                // Fallback to browser print
                openBrowserPrintWindow(transaction)
            }
        } catch (error) {
            console.error('Print error:', error)
            openBrowserPrintWindow(transaction)
        }
    }

    // Fallback browser print function
    const openBrowserPrintWindow = (transaction: Transaction) => {
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
                            <h2>${franchiseName || 'Store'}</h2>
                            <p>${new Date(transaction.createdAt).toLocaleString()}</p>
                            <p>Invoice: ${transaction.invoiceNumber || transaction.id}</p>
                        </div>
                        <div class="items">
                            ${transaction.lineItems.map((item: any) => `
                                <div class="item">
                                    <span>${item.quantity}x ${item.serviceNameSnapshot || item.productNameSnapshot || item.name || 'Item'}</span>
                                    <span>$${(Number(item.priceCharged || item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="total">
                            <div class="item">
                                <span>TOTAL</span>
                                <span>$${Number(transaction.total || 0).toFixed(2)}</span>
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

        // Require staff selection for salon checkout
        if (!selectedBarber) {
            setToast({ message: 'Please select a staff member before checkout', type: 'error' })
            return
        }

        if (!shift || shift.endTime) {
            setToast({ message: 'No open shift. Please open a shift first.', type: 'error' })
            return
        }

        setIsLoading(true)
        try {
            const { subtotal, tax, totalCash, totalCard, tip } = calculateTotal()
            const baseTotal = paymentMethod === 'CASH' ? totalCash : totalCard
            const total = baseTotal + tip // Include tip in final total

            // For split payments, validate totals match (with tip)
            if (paymentMethod === 'SPLIT') {
                const splitTotal = (cashAmount || 0) + (cardAmount || 0)
                if (Math.abs(splitTotal - total) > 0.01) {
                    setToast({ message: `Split amounts must equal total (${formatCurrency(total)})`, type: 'error' })
                    setIsLoading(false)
                    return
                }
            }

            const res = await fetch('/api/pos/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        ...item,
                        // Include dual pricing per line item
                        cashPrice: item.cashPrice,
                        cardPrice: item.cardPrice
                    })),
                    subtotal,
                    tax,
                    tip, // Include tip amount
                    total,
                    // Dual Pricing Totals for receipt printing
                    subtotalCash: totalCash ? totalCash - tax : undefined,
                    subtotalCard: totalCard ? totalCard - tax : undefined,
                    taxCash: tax,
                    taxCard: tax,
                    totalCash: totalCash || undefined,
                    totalCard: totalCard || undefined,
                    paymentMethod,
                    cashDrawerSessionId: shift?.id,
                    cashAmount: cashAmount || 0,
                    cardAmount: cardAmount || 0,
                    clientId: selectedCustomer?.id,
                    ...paymentDetails // Spread optional payment details
                })
            })

            if (res.ok) {
                const transaction = await res.json()

                // Clear state
                setCart([])
                setPendingTipAmount(0)
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

                // Print receipt using DB data only (no cart snapshot workaround)
                setToast({ message: '✓ Transaction Successful!', type: 'success' })
                printReceipt(transaction)
            } else {
                const error = await res.json()
                setToast({ message: error.error || 'Transaction failed', type: 'error' })
            }
        } catch (error) {
            console.error('Checkout error:', error)
            setToast({ message: 'An error occurred during checkout', type: 'error' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefund = async (tx: Transaction) => {
        // Note: This is a legacy refund function. Use TransactionActionsModal for full refund flow
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
                setToast({ message: '✓ Refund Processed Successfully', type: 'success' })
                setSelectedTx(null)
                fetchTransactions()
            } else {
                const error = await res.json()
                setToast({ message: error.error || 'Refund failed', type: 'error' })
            }
        } catch (error) {
            console.error('Refund error:', error)
            setToast({ message: 'Failed to process refund', type: 'error' })
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

        // CLOCK_IN_ONLY mode - Simple clock in button without cash counting
        if (shiftRequirement === 'CLOCK_IN_ONLY') {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="p-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl w-full max-w-md">
                        <div className="text-center mb-8">
                            <div className="h-20 w-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/50">
                                <LogOut className="h-10 w-10 text-emerald-400" />
                            </div>
                            <h2 className="text-3xl font-bold text-white">Start Your Shift</h2>
                            <p className="text-stone-400 mt-2">
                                Clock in to start accepting customers
                            </p>
                        </div>

                        <button
                            onClick={() => handleShiftAction('OPEN', 0)}
                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xl transition-all active:scale-98 flex items-center justify-center gap-3"
                        >
                            <LogOut className="h-6 w-6" />
                            Clock In
                        </button>

                        <p className="text-stone-500 text-xs text-center mt-4">
                            You can start using the POS after clocking in
                        </p>
                    </div>
                </div>
            )
        }

        // CASH_COUNT_ONLY or BOTH mode - Full denomination counting UI
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
        // Use services list based on barber selection or default menu
        // We do NOT overwrite the category here, allowing the original category (e.g. 'HAIR', 'Flexible') to be used for filtering
        const serviceList = selectedBarber && barberServices.length > 0
            ? barberServices
            : (menu.services || [])

        if (searchQuery) {
            const allItems = [...serviceList, ...(menu.products || [])]
            return allItems.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        if (!selectedCategory) return []
        if (selectedCategory === 'PRODUCTS') return menu.products || []
        if (selectedCategory === 'BARBER_SERVICE') return serviceList // Show all if specifically 'BARBER_SERVICE' is selected/needed

        // Filter by the selected category (e.g. 'HAIR')
        return serviceList.filter(s => (s.category || 'General') === selectedCategory)
    }

    const filteredItems = getFilteredItems()


    return (
        <>
            {showDebug && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border-2 border-red-500 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                            🐞 DEBUG MODE
                        </h3>
                        <div className="space-y-2 text-sm font-mono text-stone-300">
                            <p><span className="text-stone-500">User:</span> {user?.email || 'No Session'}</p>
                            <p><span className="text-stone-500">Role:</span> {user?.role}</p>
                            <p><span className="text-stone-500">FranchiseID:</span> {user?.franchiseId || 'NULL'}</p>
                            <hr className="border-stone-800" />
                            <p><span className="text-stone-500">Total Services Loaded:</span> {menu.services.length}</p>
                            <p><span className="text-stone-500">Categories:</span> {serviceCategories.join(', ') || 'None'}</p>
                            <p><span className="text-stone-500">Selected Cat:</span> {selectedCategory || 'None'}</p>
                            <p><span className="text-stone-500">Filtered Items:</span> {filteredItems.length}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-bold"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => {
                                    initSalonPOS()
                                    alert('Refetched data')
                                }}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold"
                            >
                                Force Fetch
                            </button>
                            <button
                                onClick={() => setShowDebug(false)}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold"
                            >
                                Close Debug
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex h-screen bg-stone-950 overflow-hidden">
                {/* Left Side: Content Area */}
                <div className="flex-1 flex flex-col border-r border-stone-800 min-w-0">
                    {/* Header - Unified design with integrated menu button */}
                    <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 gap-4 bg-gradient-to-r from-stone-900/95 via-stone-900/90 to-stone-900/95 backdrop-blur-xl shadow-lg shadow-black/20">
                        {/* Left Side - Menu + Register/History */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Integrated Menu Button */}
                            <button
                                onClick={() => {
                                    // Trigger sidebar - need to dispatch event since sidebar is in layout
                                    const event = new CustomEvent('toggleSidebar')
                                    window.dispatchEvent(event)
                                }}
                                className="p-2.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-all duration-200 border border-stone-700/50"
                                title="Navigation Menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            {/* Register/History Toggle */}
                            <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setView('POS')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${view === 'POS' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25' : 'text-stone-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    Register
                                </button>
                                <button
                                    onClick={() => setView('HISTORY')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${view === 'HISTORY' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25' : 'text-stone-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    History
                                </button>
                            </div>
                        </div>

                        {/* Search - Flexible middle section */}
                        {view === 'POS' && (
                            <div className="relative flex-1 max-w-[200px] mx-2">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded pl-7 pr-2 py-1 text-xs text-stone-200 focus:ring-1 focus:ring-orange-500/50 placeholder:text-stone-600 transition-all"
                                />
                            </div>
                        )}

                        {/* Right Side Actions - Spaced out */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Barber/Staff Selector */}
                            <select
                                value={selectedBarber?.id || ''}
                                onChange={(e) => {
                                    const barber = barberList.find(b => b.id === e.target.value)
                                    setSelectedBarber(barber || null)
                                    if (barber) {
                                        setSelectedCategory('BARBER_SERVICE')
                                    }
                                }}
                                className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-orange-500"
                            >
                                <option value="">Select Staff</option>
                                {barberList.map(barber => (
                                    <option key={barber.id} value={barber.id}>
                                        {barber.name}
                                    </option>
                                ))}
                            </select>

                            {/* Display Button */}
                            <button
                                onClick={() => setShowDisplayModal(true)}
                                className="p-2.5 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-blue-400 transition-colors border border-blue-500/20"
                                title="Customer Display"
                            >
                                <Monitor className="h-5 w-5" />
                            </button>

                            {/* Fullscreen Toggle Button */}
                            <button
                                onClick={() => {
                                    if (!document.fullscreenElement) {
                                        document.documentElement.requestFullscreen()
                                    } else {
                                        document.exitFullscreen()
                                    }
                                }}
                                className="p-2.5 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg text-purple-400 transition-colors border border-purple-500/20"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                            >
                                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                            </button>

                            {/* New Customer Button */}
                            {view === 'POS' && (
                                <button
                                    onClick={() => {
                                        if (!shift) {
                                            setShowShiftModal(true)
                                        }
                                    }}
                                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                                    title="New Customer"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    <span>New</span>
                                </button>
                            )}

                            {view === 'HISTORY' && (
                                <button
                                    onClick={() => setShowShiftModal(true)}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                    title={shift ? 'Close Shift' : 'Open Shift'}
                                >
                                    <DollarSign className="h-4 w-4" />
                                    <span>{shift ? 'Close' : 'Open'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Main Content Area - Responsive padding */}
                    <div className="flex-1 overflow-y-auto p-3 xl:p-6">
                        {view === 'POS' ? (
                            <>
                                {!selectedCategory && !searchQuery ? (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-5">
                                        {serviceCategories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className="h-32 xl:h-40 bg-gradient-to-br from-stone-800/80 to-stone-900/80 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 group hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 active:scale-[0.98]"
                                            >
                                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-all">
                                                    <span className="text-2xl">✨</span>
                                                </div>
                                                <span className="font-bold text-base xl:text-lg text-stone-300 group-hover:text-white transition-colors">{cat}</span>
                                            </button>
                                        ))}

                                        {/* Open Item Tile */}
                                        <button
                                            onClick={() => {
                                                setOpenItemPrice('')
                                                setShowOpenItemModal(true)
                                            }}
                                            className="h-32 xl:h-40 bg-stone-900/50 hover:bg-stone-800 rounded-2xl border border-dashed border-stone-700 hover:border-amber-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-3 group hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                                                <span className="text-2xl font-bold text-amber-500">+</span>
                                            </div>
                                            <span className="font-bold text-base xl:text-lg text-stone-400 group-hover:text-amber-500 transition-colors">Open Item</span>
                                        </button>
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

                                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                                                    className="bg-gradient-to-br from-stone-800/60 to-stone-900/60 backdrop-blur-sm rounded-2xl border border-white/10 p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="h-20 w-20 object-cover rounded-xl mb-1 group-hover:scale-110 transition-transform duration-300 shadow-lg" />
                                                    ) : (
                                                        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-1 group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-all">
                                                            <span className="text-2xl">💇</span>
                                                        </div>
                                                    )}
                                                    <p className="font-semibold text-white text-center text-sm leading-tight line-clamp-2 min-h-[2.5em] flex items-center">{item.name}</p>
                                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1 w-full font-mono">
                                                        <div className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-lg shrink-0">
                                                            <span className="text-xs font-bold text-emerald-400 block">${item.price.toFixed(2)}</span>
                                                        </div>
                                                        <div className="bg-stone-800 border border-stone-600 px-2 py-1 rounded-lg shrink-0">
                                                            <span className="text-xs font-medium text-white block">${(item.price * 1.0399).toFixed(2)}</span>
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
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Date Filter */}
                                        <input
                                            type="date"
                                            value={txDateFilter}
                                            onChange={(e) => {
                                                setTxDateFilter(e.target.value)
                                                fetchTransactions(e.target.value)
                                            }}
                                            className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-1 text-white text-xs focus:ring-2 focus:ring-orange-500"
                                        />
                                        {/* Status Filters */}
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

                {/* Right Side: Cart or Transaction Details - Premium Glass Design */}
                <div className="w-[340px] xl:w-[400px] 2xl:w-[440px] shrink-0 flex flex-col bg-gradient-to-b from-stone-900/95 to-stone-950/95 backdrop-blur-xl border-l border-white/5 shadow-2xl shadow-black/50">
                    {view === 'POS' ? (
                        <>

                            <div className="h-[72px] border-b border-white/5 flex items-center justify-between px-4 xl:px-5 bg-black/20">
                                <h2 className="text-lg xl:text-xl font-bold text-white">Order</h2>
                                <div className="flex items-center gap-2">
                                    {/* Clear Cart Button - Only show when cart has items */}
                                    {cart.length > 0 && (
                                        <button
                                            onClick={() => setShowClearCartConfirm(true)}
                                            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all duration-200 border border-red-500/20 hover:border-red-500/30"
                                            title="Clear Cart"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}

                                    {/* Customer Button */}
                                    <button
                                        onClick={() => setShowCustomerModal(true)}
                                        className={`p-2.5 rounded-xl transition-all duration-200 border ${selectedCustomer ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'hover:bg-white/5 text-stone-400 border-white/10 hover:border-white/20'}`}
                                        title={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Select Customer'}
                                    >
                                        <User className="h-5 w-5" />
                                    </button>
                                    {/* Discounts Button */}
                                    <button
                                        onClick={() => setShowDiscounts(true)}
                                        className={`p-2.5 rounded-xl transition-all duration-200 border ${appliedDiscount > 0 ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'hover:bg-white/5 text-purple-400 border-white/10 hover:border-white/20'}`}
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
                                    <div className="h-full flex flex-col items-center justify-center text-stone-600 space-y-3">
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                            <ShoppingBag className="h-10 w-10 text-stone-600" />
                                        </div>
                                        <p className="font-medium">Cart is empty</p>
                                        <p className="text-xs text-stone-700">Tap an item to get started</p>
                                    </div>
                                ) : (
                                    cart.map((item, idx) => (
                                        <div key={idx} className="bg-gradient-to-br from-white/5 to-white/[0.02] p-4 rounded-xl border border-white/10 flex flex-col gap-2 group hover:border-white/20 transition-all duration-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">{item.name}</p>
                                                    <p className="text-sm text-emerald-400 font-medium">{formatCurrency(item.price)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCartIndex(idx)
                                                            setDiscountValue(item.discount?.toString() || '')
                                                            setShowDiscountModal(true)
                                                        }}
                                                        className={`p-3 rounded-lg transition-colors ${item.discount ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-stone-800 text-stone-500'}`}
                                                        title="Apply Discount"
                                                    >
                                                        <Tag className="h-5 w-5" />
                                                    </button>
                                                    <div className="flex items-center bg-stone-900 rounded-lg border border-stone-800">
                                                        <button
                                                            onClick={() => updateQuantity(idx, -1)}
                                                            className="p-2.5 hover:text-orange-500 hover:bg-stone-800 transition-colors rounded-l-lg"
                                                        >
                                                            <Minus className="h-5 w-5" />
                                                        </button>
                                                        <span className="w-10 text-center text-base font-medium">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(idx, 1)}
                                                            className="p-2.5 hover:text-orange-500 hover:bg-stone-800 transition-colors rounded-r-lg"
                                                        >
                                                            <Plus className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(idx)}
                                                        className="p-2.5 text-stone-600 hover:text-red-500 hover:bg-stone-800 transition-colors rounded-lg"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {item.discount && item.discount > 0 && (
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

                            {/* Totals & Actions - Premium Glass Design */}
                            <div className="p-5 bg-gradient-to-t from-black/40 to-stone-900/60 backdrop-blur-xl border-t border-white/10 space-y-4">
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between text-stone-400">
                                        <span className="font-medium">Subtotal</span>
                                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                    </div>
                                    {appliedDiscount > 0 && (
                                        <div className="flex justify-between text-pink-400">
                                            <span className="font-medium">Discount</span>
                                            <span className="font-semibold">-{formatCurrency(appliedDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-stone-400">
                                        <span className="font-medium">Tax (8%)</span>
                                        <span className="font-semibold">{formatCurrency(tax)}</span>
                                    </div>
                                    {pricingSettings.showDualPricing ? (
                                        <>
                                            <div className="flex justify-between text-2xl font-bold text-white pt-3 mt-3 border-t border-white/10">
                                                <span>Total (Cash)</span>
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">{formatCurrency(totalCash)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-semibold text-stone-400">
                                                <span>Total (Card)</span>
                                                <span className="text-stone-300">{formatCurrency(totalCard)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between text-2xl font-bold text-white pt-3 mt-3 border-t border-white/10">
                                            <span>Total</span>
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">{formatCurrency(totalCash)}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={async () => {
                                        // Require staff selection before checkout
                                        if (!selectedBarber) {
                                            setToast({ message: 'Please select a staff member before checkout', type: 'error' })
                                            return
                                        }
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
                                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${cart.length > 0 ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:via-amber-400 hover:to-orange-400 text-white shadow-orange-500/30 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]' : 'bg-stone-800 text-stone-500 cursor-not-allowed'}`}
                                >
                                    <ShoppingBag className="h-5 w-5" />
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
                                    <button onClick={() => {
                                        cancelPaymentOnDisplay()
                                        setShowCheckoutModal(false)
                                    }} className="text-stone-400 hover:text-white">
                                        <Trash2 className="h-6 w-6 rotate-45" />
                                    </button>
                                </div>

                                <div className="p-8 grid grid-cols-2 gap-6">
                                    {/* Cash Payment */}
                                    <button
                                        onClick={() => {
                                            // Require staff selection before proceeding
                                            if (!selectedBarber) {
                                                setToast({ message: 'Please select a staff member before checkout', type: 'error' })
                                                return
                                            }
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
                                            // Require staff selection before proceeding
                                            if (!selectedBarber) {
                                                setToast({ message: 'Please select a staff member before checkout', type: 'error' })
                                                return
                                            }
                                            setIsSplitPayment(false) // Ensure not in split mode
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
                                            // Require staff selection before proceeding
                                            if (!selectedBarber) {
                                                setToast({ message: 'Please select a staff member before checkout', type: 'error' })
                                                return
                                            }
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
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                            <div className="w-full max-w-sm bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="p-3 border-b border-stone-800 flex items-center justify-between shrink-0">
                                    <h2 className="text-lg font-bold text-white">Cash Payment</h2>
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

                                <div className="p-3 flex-1 overflow-y-auto">
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
                                                setCashReceived(cashTenderingTotal.toFixed(2))
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
                                    <div className="grid grid-cols-3 gap-1.5">
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
                                                className="py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-lg font-bold rounded-lg transition-all border border-stone-700"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Complete Transaction Button - Fixed at bottom */}
                                <div className="p-3 border-t border-stone-800 shrink-0 bg-stone-900">
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
                                                        cashDrawerSessionId: shift?.id,
                                                        clientId: selectedCustomer?.id
                                                    })
                                                })
                                                if (res.ok) {
                                                    const txData = await res.json()
                                                    const changeDue = received - cashTenderingTotal
                                                    const savedCart = [...cart] // Save cart before clearing
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
                                                    // Store transaction data and show receipt modal
                                                    setLastTransactionData({
                                                        ...txData.transaction || txData,
                                                        lineItems: savedCart.map(item => ({
                                                            name: item.name,
                                                            quantity: item.quantity,
                                                            price: item.price,
                                                            total: item.price * item.quantity
                                                        })),
                                                        subtotal: totals.subtotal,
                                                        tax: totals.tax,
                                                        total: cashTenderingTotal,
                                                        paymentMethod: 'CASH',
                                                        change: changeDue,
                                                        locationName: locationName,
                                                        franchiseName: franchiseName
                                                    })
                                                    setShowReceiptModal(true)
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
                                        className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-stone-700 disabled:to-stone-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-orange-500/20"
                                    >
                                        {parseFloat(cashReceived || '0') >= cashTenderingTotal
                                            ? `✓ Complete - Change: ${formatCurrency(parseFloat(cashReceived || '0') - cashTenderingTotal)}`
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
                                                // Use React state instead of window globals
                                                setIsSplitPayment(true)
                                                setPaxAmount(cardAmt)
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
                        onClose={() => {
                            cancelPaymentOnDisplay()
                            setShowPaxModal(false)
                            setIsSplitPayment(false) // Reset split mode on close
                        }}
                        onSuccess={(response) => {
                            // Extract PAX details
                            const paymentDetails: PaymentDetails = {
                                gatewayTxId: response.transactionId,
                                authCode: response.authCode,
                                cardLast4: response.cardLast4,
                                cardType: response.cardType
                            }

                            if (isSplitPayment) {
                                // Use split amounts from state
                                const cashAmt = parseFloat(splitCashAmount || '0')
                                const cardAmt = paxAmount
                                handleCheckout('SPLIT', cashAmt, cardAmt, paymentDetails)
                                setIsSplitPayment(false) // Reset after processing
                            } else {
                                handleCheckout('CREDIT_CARD', undefined, undefined, paymentDetails)
                            }
                            setShowPaxModal(false)
                        }}
                        amount={isSplitPayment ? paxAmount : totalCard}
                        invoiceNumber="1"
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
                            cashDrawerSessionId={shift?.id}
                            canProcessRefunds={(session?.user as any)?.canProcessRefunds || (session?.user as any)?.role === 'FRANCHISOR'}
                            canVoid={(session?.user as any)?.canProcessRefunds || (session?.user as any)?.role === 'FRANCHISOR'}
                            canDelete={(session?.user as any)?.role === 'FRANCHISOR'}
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
                                        // Also update customer display to exit tip prompt
                                        cancelPaymentOnDisplay()
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

                    {/* Clear Cart Confirmation Modal */}
                    {showClearCartConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                            <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6 w-[360px] shadow-2xl">
                                <div className="text-center mb-6">
                                    <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Trash2 className="h-8 w-8 text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Clear Cart?</h3>
                                    <p className="text-stone-400">This will remove all items from the current order.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowClearCartConfirm(false)}
                                        className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCart([])
                                            setPendingTipAmount(0)
                                            setSelectedCustomer(null)
                                            setAppliedDiscount(0)
                                            setAppliedDiscountSource(null)
                                            setShowClearCartConfirm(false)
                                            setToast({ message: 'Cart cleared', type: 'success' })
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
                                                quantity: 1
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
                                    <p className="text-stone-500 text-xs mb-1">Display URL ({selectedStation ? 'Station' : 'Location'} Specific):</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-orange-400 text-sm break-all">
                                            {typeof window !== 'undefined' ? `${window.location.origin}/kiosk/display?${selectedStation ? `stationId=${selectedStation.id}` : `locationId=${user?.locationId || ''}`}` : ''}
                                        </code>
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/kiosk/display?${selectedStation ? `stationId=${selectedStation.id}` : `locationId=${user?.locationId || ''}`}`
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
                                    <p className="text-emerald-400 font-medium">✓ {selectedStation ? 'Station' : 'Location'}-specific sync enabled</p>
                                    <p className="text-emerald-600 text-xs">{selectedStation ? `Station: ${selectedStation.name}` : 'Only this location\'s cart will show'}</p>
                                </div>

                                {/* QR Code */}
                                <div className="bg-white rounded-lg p-4 mb-4 flex items-center justify-center">
                                    <QRCodeSVG
                                        value={typeof window !== 'undefined' ? `${window.location.origin}/kiosk/display?${selectedStation ? `stationId=${selectedStation.id}` : `locationId=${user?.locationId || ''}`}` : ''}
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
                                            const url = `/kiosk/display?${selectedStation ? `stationId=${selectedStation.id}` : `locationId=${user?.locationId || ''}`}`
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
                                            const url = `/kiosk/display?${selectedStation ? `stationId=${selectedStation.id}` : `locationId=${user?.locationId || ''}`}`
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

            {/* Open Item Modal */}
            {showOpenItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Open Item</h3>
                        <div className="bg-stone-950 rounded-xl p-4 border border-white/5 mb-4">
                            <div className="text-stone-400 text-sm mb-1">Amount</div>
                            <div className="text-4xl font-bold text-white flex items-center">
                                <span className="text-orange-500 mr-2">$</span>
                                {openItemPrice || '0'}
                            </div>
                        </div>

                        {/* Custom Numpad */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, '⌫'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (key === '⌫') {
                                            setOpenItemPrice(prev => prev.slice(0, -1))
                                        } else if (key === '.' && openItemPrice.includes('.')) {
                                            // Prevent multiple dots
                                        } else {
                                            setOpenItemPrice(prev => {
                                                if (key === '.' && !prev) return '0.'
                                                if (prev === '0' && key !== '.') return String(key)
                                                return prev + key
                                            })
                                        }
                                    }}
                                    className={`p-4 rounded-xl font-bold text-xl transition-all active:scale-95 ${key === '⌫'
                                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                        : 'bg-stone-800 text-white hover:bg-stone-700 hover:text-orange-200'
                                        }`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowOpenItemModal(false)}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!openItemPrice || parseFloat(openItemPrice) === 0) return
                                    const amount = parseFloat(openItemPrice)
                                    const newItem: CartItem = {
                                        id: `open-${Date.now()}`,
                                        type: 'PRODUCT',
                                        name: 'Open Item',
                                        price: amount,
                                        quantity: 1
                                    }
                                    setCart([...cart, newItem])
                                    setShowOpenItemModal(false)
                                    setToast({ message: 'Added Open Item', type: 'success' })
                                }}
                                className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 transition-all"
                            >
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing Receipt Modal */}
            <ReceiptModal
                isOpen={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                transactionData={lastTransactionData}
                onComplete={() => {
                    setShowReceiptModal(false)
                    setToast({ message: 'Transaction Complete!', type: 'success' })
                }}
            />
        </>
    )
}

// Export with Suspense wrapper for useSearchParams
export default function POSPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        }>
            <POSContent />
        </Suspense>
    )
}


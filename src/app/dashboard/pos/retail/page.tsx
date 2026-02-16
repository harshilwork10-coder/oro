'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Search,
    Trash2,
    Tag,
    DollarSign,
    Hash,
    CreditCard,
    Banknote,
    User,
    Users,
    FileText,
    History,
    X,
    ShoppingCart,
    Package,
    AlertTriangle,
    LogOut,
    Monitor,
    Gift,
    Printer,
    Phone,
    Wallet,
    Clock,
    PackagePlus,
    Moon,
    Ticket,
    Trophy,
    Loader2,
    RotateCcw,
    Ban,
    Download,
    Maximize,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBusinessConfig } from '@/hooks/useBusinessConfig'
import Toast from '@/components/ui/Toast'
import IDCheckModal from '@/components/modals/IDCheckModal'
import CheckoutModal from '@/components/pos/CheckoutModal'
import QuickAddModal from '@/components/modals/QuickAddModal'
import ScanQuickAddModal from '@/components/modals/ScanQuickAddModal'
import TransactionDiscountModal from '@/components/modals/TransactionDiscountModal'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'
import EndOfDayWizard from '@/components/pos/EndOfDayWizard'
import LotteryModal from '@/components/pos/LotteryModal'
import LotteryPayoutModal from '@/components/pos/LotteryPayoutModal'
import ReceiptModal from '@/components/pos/ReceiptModal'
import UniversalSearch from '@/components/pos/UniversalSearch'
import {
    printReceipt,
    openCashDrawer,
    formatReceiptFromTransaction,
    isPrintAgentAvailable
} from '@/lib/print-agent'
import { useOfflineMode } from '@/lib/use-offline-mode'
import { OfflineStatusIndicator } from '@/components/pos/OfflineStatusIndicator'
import QuickSwitchModal from '@/components/pos/QuickSwitchModal'

interface CartItem {
    id: string
    barcode?: string
    sku?: string
    name: string
    price: number
    // Dual Pricing Fields
    cashPrice?: number // Cash price (base price)
    cardPrice?: number // Card price = cashPrice × (1 + percentage)
    quantity: number
    discount?: number
    ageRestricted?: boolean
    minimumAge?: number
    isEbtEligible?: boolean
    taxRate?: number // Override default tax rate for this item
    category?: string // Category name (e.g., 'QUICK_ADD')
    sellByCase?: boolean // For case break products
    unitsPerCase?: number // Units per case for case break
    casePrice?: number // Case price for case break
}

interface TagAlongProduct {
    id: string
    name: string
    price: number
    barcode?: string
    sku?: string
}

interface HeldTransaction {
    id: string
    items: CartItem[]
    customerName?: string
    timestamp: Date
}

interface AppliedPromotion {
    promotionId: string
    promotionName: string
    type: string
    discountAmount: number
}

export default function RetailPOSPage() {
    const { data: session } = useSession()
    const user = session?.user as any
    const { data: config } = useBusinessConfig()

    // Barcode input
    const barcodeInputRef = useRef<HTMLInputElement>(null)
    const [barcodeInput, setBarcodeInput] = useState('')
    const router = useRouter()
    const [quantityInput, setQuantityInput] = useState('1')

    // Offline Mode
    const offlineMode = useOfflineMode()

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([])
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)

    // UI state
    const [isLoading, setIsLoading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [showDiscountModal, setShowDiscountModal] = useState(false)
    const [showQuantityModal, setShowQuantityModal] = useState(false)
    const [showPriceModal, setShowPriceModal] = useState(false)
    const [showUniversalSearch, setShowUniversalSearch] = useState(false)
    const [showAgeVerification, setShowAgeVerification] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showQuickAddModal, setShowQuickAddModal] = useState(false)
    const [showScanQuickAddModal, setShowScanQuickAddModal] = useState(false)
    const [pendingScanBarcode, setPendingScanBarcode] = useState<string>('')
    const [showTransactionDiscountModal, setShowTransactionDiscountModal] = useState(false)
    const [transactionDiscount, setTransactionDiscount] = useState<{ type: 'PERCENT' | 'AMOUNT'; value: number } | null>(null)
    const [showPriceCheckModal, setShowPriceCheckModal] = useState(false)
    const [priceCheckProduct, setPriceCheckProduct] = useState<any>(null)
    const [lastTransaction, setLastTransaction] = useState<any>(null)
    const [showPaxModal, setShowPaxModal] = useState(false)
    const [pendingCardAmount, setPendingCardAmount] = useState(0)

    // Derived State
    const selectedItem = selectedItemIndex !== null ? cart[selectedItemIndex] : null
    const [pendingAgeItem, setPendingAgeItem] = useState<CartItem | null>(null)

    // ID verification caching - once verified, don't ask again during this transaction
    const [idVerifiedForTransaction, setIdVerifiedForTransaction] = useState(false)

    // Tag-along suggestions (cross-sell)
    const [tagAlongItems, setTagAlongItems] = useState<TagAlongProduct[]>([])

    // Held transactions
    const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>([])

    // Customer
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [customerNotes, setCustomerNotes] = useState('')

    // Applied Promotions
    const [appliedPromotions, setAppliedPromotions] = useState<AppliedPromotion[]>([])
    const [promoDiscount, setPromoDiscount] = useState(0)

    // Today's Stats (live sales header)
    const [todayStats, setTodayStats] = useState<{ sales: number; transactions: number; avgTicket: number } | null>(null)

    // Favorites Bar (top sellers quick buttons)
    const [favorites, setFavorites] = useState<{ id: string; name: string; price: number; barcode?: string }[]>([])

    // Quick Life Features
    const [showCustomerLookup, setShowCustomerLookup] = useState(false)
    const [showCashDropModal, setShowCashDropModal] = useState(false)
    const [showReceiveStockModal, setShowReceiveStockModal] = useState(false)
    const [showRecentTransactions, setShowRecentTransactions] = useState(false)
    const [recentTransactions, setRecentTransactions] = useState<any[]>([])
    const [showEndOfDayWizard, setShowEndOfDayWizard] = useState(false)
    const [showPriceCheckInputModal, setShowPriceCheckInputModal] = useState(false)
    const [priceCheckInput, setPriceCheckInput] = useState('')

    // Lottery
    const [showLotteryModal, setShowLotteryModal] = useState(false)
    const [showLotteryPayoutModal, setShowLotteryPayoutModal] = useState(false)
    const [lotteryPayout, setLotteryPayout] = useState(0) // Tracks lottery payout amount separately (doesn't affect sales)

    // Category/Department Filter
    const [categories, setCategories] = useState<{ id: string; name: string; itemCount?: number }[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [categoryProducts, setCategoryProducts] = useState<any[]>([])

    // SMS Receipt Modal
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [pendingReceiptData, setPendingReceiptData] = useState<any>(null)

    // Quick Switch (Toast POS style employee switching)
    const [showQuickSwitch, setShowQuickSwitch] = useState(false)

    // Auto-detect screen size for responsive POS layout
    // Small screens (< 800px height) = compact mode
    const [compactMode, setCompactMode] = useState(false)
    const [uiScale, setUiScale] = useState(1)
    useEffect(() => {
        const checkScreenSize = () => {
            // Compact mode for screens under 800px height (typical 15.5" POS at 1366x768)
            setCompactMode(window.innerHeight < 800)

            // Auto-scale for narrow screens (like 1024px square displays)
            // Reference width is 1366px - scale down proportionally for smaller
            const referenceWidth = 1366
            const currentWidth = window.innerWidth
            if (currentWidth < referenceWidth) {
                const scale = currentWidth / referenceWidth
                setUiScale(Math.max(0.75, scale)) // Min 75% scale
            } else {
                setUiScale(1)
            }
        }
        checkScreenSize()
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    // F3 Keyboard Shortcut for Universal Search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F3 or Ctrl+F to open universal search
            if (e.key === 'F3' || (e.ctrlKey && e.key === 'f')) {
                e.preventDefault()
                setShowUniversalSearch(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // ===== KIOSK MODE FEATURES =====
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showInstallBanner, setShowInstallBanner] = useState(false)
    const [installPrompt, setInstallPrompt] = useState<any>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [exitPin, setExitPin] = useState('')
    const [pinError, setPinError] = useState('')
    const [showPin, setShowPin] = useState(false)
    const [verifyingPin, setVerifyingPin] = useState(false)

    // Check if in standalone mode (PWA) and listen for fullscreen changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true)
            }
            const handleFullscreenChange = () => {
                setIsFullscreen(!!document.fullscreenElement)
            }
            document.addEventListener('fullscreenchange', handleFullscreenChange)
            return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])

    // PWA install prompt listener
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e)
            setShowInstallBanner(true)
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [])

    // Block Escape key when in fullscreen - show PIN modal instead
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                e.preventDefault()
                e.stopPropagation()
                setShowExitModal(true)
            }
            if (e.key === 'F11') {
                e.preventDefault()
                setShowExitModal(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown, true)
        return () => document.removeEventListener('keydown', handleKeyDown, true)
    }, [isFullscreen])

    const enterFullscreen = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen()
            }
        } catch (err) {
            console.error('Fullscreen failed:', err)
        }
    }

    const exitFullscreen = async () => {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen()
            }
        } catch (err) {
            console.error('Exit fullscreen failed:', err)
        }
    }

    const handleVerifyPin = async () => {
        if (!exitPin || exitPin.length < 4) {
            setPinError('PIN must be at least 4 digits')
            return
        }
        setVerifyingPin(true)
        setPinError('')
        try {
            const res = await fetch('/api/pos/verify-owner-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: exitPin })
            })
            const data = await res.json()
            if (data.success) {
                setShowExitModal(false)
                setExitPin('')
                await exitFullscreen()
            } else {
                setPinError(data.error || 'Invalid PIN')
            }
        } catch (err) {
            setPinError('Verification failed')
        } finally {
            setVerifyingPin(false)
        }
    }

    const handleInstallClick = async () => {
        if (!installPrompt) {
            alert('To install: Tap Share (iOS) or Menu → Install App (Android/Chrome)')
            return
        }
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setIsInstalled(true)
            setShowInstallBanner(false)
            setInstallPrompt(null)
        }
    }

    // Case Break (Single vs 6-Pack vs Case) Selection
    const [showCaseBreakModal, setShowCaseBreakModal] = useState(false)
    const [pendingCaseBreakProduct, setPendingCaseBreakProduct] = useState<any>(null)

    // Dual Pricing Settings
    interface PricingSettings {
        pricingModel: 'STANDARD' | 'DUAL_PRICING'
        cardSurchargeType: 'PERCENTAGE' | 'FLAT_AMOUNT'
        cardSurcharge: number
        showDualPricing: boolean
        // Receipt Print Settings
        receiptPrintMode: 'ALL' | 'CARD_ONLY' | 'EBT_ONLY' | 'CARD_AND_EBT' | 'NONE'
        openDrawerOnCash: boolean
    }
    const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null)
    const [printerConnected, setPrinterConnected] = useState(false)

    // Station selection (multi-register support) with terminal info
    interface StationInfo {
        id: string
        name: string
        paymentMode: 'DEDICATED' | 'CASH_ONLY'
        dedicatedTerminal?: {
            id: string
            name: string
            terminalIP: string
            terminalPort: string
        } | null
    }
    const [stations, setStations] = useState<StationInfo[]>([])
    const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null)
    const [isLoadingStation, setIsLoadingStation] = useState(true)
    const [showStationPairing, setShowStationPairing] = useState(false) // Only for Provider to pair device

    // Load station based on device pairing (set by Provider before shipping)
    useEffect(() => {
        const loadDeviceStation = async () => {
            try {
                // Check if this device is already paired to a station
                const pairedStationId = localStorage.getItem('pairedStationId')

                // Fetch all stations for this location
                const res = await fetch('/api/pos/stations')
                if (!res.ok) {
                    setToast({ message: 'Failed to load stations', type: 'error' })
                    setIsLoadingStation(false)
                    return
                }

                const data = await res.json()
                const stationList = data.stations || []
                setStations(stationList)

                if (stationList.length === 0) {
                    // No stations configured - contact provider
                    setIsLoadingStation(false)
                    return
                }

                if (pairedStationId) {
                    // Device is paired - find the station
                    const paired = stationList.find((s: StationInfo) => s.id === pairedStationId)
                    if (paired) {
                        setSelectedStation(paired)
                    } else {
                        // Paired station no longer exists - clear and show pairing
                        localStorage.removeItem('pairedStationId')
                        setShowStationPairing(true)
                    }
                    // Only one station - auto-pair device to it
                    localStorage.setItem('pairedStationId', stationList[0].id)
                    setSelectedStation(stationList[0])
                } else {
                    // Multiple stations, device not paired - show pairing screen (Provider only)
                    setShowStationPairing(true)
                }
            } catch (error) {
                console.error('[POS] Failed to load station:', error)
                setToast({ message: 'Failed to connect to server', type: 'error' })
            } finally {
                setIsLoadingStation(false)
            }
        }
        loadDeviceStation()
    }, [])

    // Fetch franchise pricing settings on mount
    useEffect(() => {
        const loadPricingSettings = async () => {
            try {
                const res = await fetch('/api/settings/franchise')
                if (res.ok) {
                    const data = await res.json()
                    setPricingSettings({
                        pricingModel: data.pricingModel || 'STANDARD',
                        cardSurchargeType: data.cardSurchargeType || 'PERCENTAGE',
                        cardSurcharge: parseFloat(data.cardSurcharge) || 3.99,
                        showDualPricing: data.showDualPricing ?? false,
                        receiptPrintMode: data.receiptPrintMode || 'ALL',
                        openDrawerOnCash: data.openDrawerOnCash ?? true
                    })
                }
            } catch (error) {
                console.error('[POS] Failed to load pricing settings:', error)
            }
        }
        loadPricingSettings()

        // Check if print agent is connected
        isPrintAgentAvailable().then(setPrinterConnected)
    }, [])

    // Fetch today's stats for header (refresh every 60s)
    useEffect(() => {
        const fetchTodayStats = async () => {
            try {
                const today = new Date().toISOString().split('T')[0]
                const res = await fetch(`/api/franchise/reports/daily?date=${today}`)
                if (res.ok) {
                    const data = await res.json()
                    // API returns: totalRevenue, transactionCount, averageTicket
                    const txCount = data.summary?.transactionCount || 0
                    const sales = data.summary?.totalRevenue || 0
                    setTodayStats({
                        sales: sales,
                        transactions: txCount,
                        avgTicket: txCount > 0 ? sales / txCount : 0  // Calculate client-side if needed
                    })
                }
            } catch (error) {
                console.error('[POS] Failed to load today stats:', error)
            }
        }
        fetchTodayStats()
        const interval = setInterval(fetchTodayStats, 60000) // Refresh every minute
        return () => clearInterval(interval)
    }, [])

    // Fetch favorites (top sellers) for quick buttons
    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const res = await fetch('/api/pos/retail/top-sellers?limit=6')
                if (res.ok) {
                    const data = await res.json()
                    setFavorites(data.products || [])
                }
            } catch (error) {
                console.error('[POS] Failed to load favorites:', error)
            }
        }
        fetchFavorites()
    }, [])

    // Fetch categories for filter dropdown
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/inventory/categories')
                if (res.ok) {
                    const data = await res.json()
                    setCategories(Array.isArray(data.categories) ? data.categories : Array.isArray(data) ? data : [])
                }
            } catch (error) {
                console.error('[POS] Failed to load categories:', error)
            }
        }
        fetchCategories()
    }, [])

    // Fetch products when category is selected
    useEffect(() => {
        if (!selectedCategory) {
            setCategoryProducts([])
            return
        }
        const fetchCategoryProducts = async () => {
            try {
                const res = await fetch(`/api/inventory/products?categoryId=${selectedCategory}&limit=100`)
                if (res.ok) {
                    const data = await res.json()
                    setCategoryProducts(Array.isArray(data.products) ? data.products : Array.isArray(data) ? data : [])
                }
            } catch (error) {
                console.error('[POS] Failed to load category products:', error)
            }
        }
        fetchCategoryProducts()
    }, [selectedCategory])

    // Sync cart to SERVER for customer display (station-isolated)
    useEffect(() => {
        if (!selectedStation) return // Wait for station selection

        const { subtotal, tax, total, cashTotal, cardTotal, showDualPricing } = calculateTotals()
        const displayData = {
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            subtotal,
            tax,
            total,
            cashTotal,
            cardTotal,
            showDualPricing,
            status: cart.length > 0 ? 'ACTIVE' : 'IDLE',
            stationId: selectedStation.id
        }

        // Sync to server
        fetch('/api/pos/display-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stationId: selectedStation.id, cart: displayData })
        }).catch(err => console.error('Cart sync failed:', err))

        // Also keep localStorage for same-tab fallback
        localStorage.setItem('retail_customer_display', JSON.stringify(displayData))
    }, [cart, selectedStation, pricingSettings])

    // Keep focus on barcode input
    useEffect(() => {
        const focusBarcode = () => {
            if (!showDiscountModal && !showQuantityModal && !showPriceModal && !showUniversalSearch && !showAgeVerification && !showQuickAddModal) {
                barcodeInputRef.current?.focus()
            }
        }
        focusBarcode()
        const interval = setInterval(focusBarcode, 1000)
        return () => clearInterval(interval)
    }, [showDiscountModal, showQuantityModal, showPriceModal, showUniversalSearch, showAgeVerification, showQuickAddModal])

    // Check for applicable promotions when cart changes
    useEffect(() => {
        const checkPromotions = async () => {
            if (cart.length === 0) {
                setAppliedPromotions([])
                setPromoDiscount(0)
                return
            }

            try {
                const res = await fetch('/api/promotions/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart.map(item => ({
                            id: item.id,
                            categoryId: (item as any).categoryId,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity
                        }))
                    })
                })

                if (res.ok) {
                    const data = await res.json()
                    setAppliedPromotions(data.appliedPromotions || [])
                    setPromoDiscount(data.totalDiscount || 0)
                }
            } catch (error) {
                console.error('Failed to check promotions:', error)
            }
        }

        checkPromotions()
    }, [cart])


    // Handle barcode scan (Enter key from scanner)
    const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && barcodeInput.trim()) {
            e.preventDefault()
            await lookupAndAddProduct(barcodeInput.trim())
            setBarcodeInput('')
        }
    }

    // Lookup product by barcode/SKU
    const lookupAndAddProduct = async (code: string) => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/pos/retail/lookup?code=${encodeURIComponent(code)}`)
            if (res.ok) {
                const product = await res.json()

                // Check if age restricted
                if (product.ageRestricted) {
                    // If ID already verified for this transaction, skip the check
                    if (idVerifiedForTransaction) {
                        // Check for case break AFTER age verification
                        if (product.sellByCase && product.unitsPerCase) {
                            setPendingCaseBreakProduct(product)
                            setShowCaseBreakModal(true)
                        } else {
                            addToCart(product)
                        }
                        setToast({ message: `Added: ${product.name} (ID Already Verified)`, type: 'success' })
                    } else {
                        setPendingAgeItem({
                            id: product.id,
                            barcode: product.barcode,
                            sku: product.sku,
                            name: product.name,
                            price: parseFloat(product.price),
                            quantity: parseInt(quantityInput) || 1,
                            ageRestricted: true,
                            minimumAge: product.minimumAge || 21,
                            // Pass case break info for after verification
                            sellByCase: product.sellByCase,
                            unitsPerCase: product.unitsPerCase,
                            casePrice: product.casePrice
                        })
                        setShowAgeVerification(true)
                    }
                    // Still show tag-along suggestions
                    if (product.tagAlongItems?.length > 0) {
                        setTagAlongItems(product.tagAlongItems)
                    }
                } else {
                    // Check for case break - show popup if product supports it
                    if (product.sellByCase && product.unitsPerCase) {
                        setPendingCaseBreakProduct(product)
                        setShowCaseBreakModal(true)
                    } else {
                        addToCart(product)
                    }
                    // Show tag-along suggestions if any
                    if (product.tagAlongItems?.length > 0) {
                        setTagAlongItems(product.tagAlongItems)
                    } else {
                        setTagAlongItems([])
                    }
                }
            } else {
                // Product not found - trigger quick add modal with UPC lookup
                setPendingScanBarcode(code)
                setShowScanQuickAddModal(true)
            }
        } catch (error) {
            console.error('Lookup error:', error)
            setToast({ message: 'Error looking up product', type: 'error' })
        } finally {
            setIsLoading(false)
        }
    }

    // Add product to cart
    const addToCart = (product: any) => {
        const qty = parseInt(quantityInput) || 1
        // Get EBT eligibility from product's category
        const isEbtEligible = product.productCategory?.isEbtEligible || product.isEbtEligible || false

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing && !product.category?.startsWith('quick-')) { // Don't combine quick add items
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + qty }
                        : item
                )
            }
            return [...prev, {
                id: product.id,
                barcode: product.barcode,
                sku: product.sku,
                name: product.name,
                price: parseFloat(product.price),
                // Dual Pricing - use cashPrice/cardPrice from product if available
                cashPrice: product.cashPrice ? parseFloat(product.cashPrice) : parseFloat(product.price),
                cardPrice: product.cardPrice ? parseFloat(product.cardPrice) : undefined,
                quantity: qty,
                ageRestricted: product.ageRestricted,
                isEbtEligible,
                taxRate: product.taxRate, // Pass through taxRate if provided (e.g., from Quick Add)
                category: product.category // Pass through category if provided (e.g., from Quick Add)
            }]
        })
        setQuantityInput('1')
        setToast({ message: `Added: ${product.name}`, type: 'success' })
    }

    // Confirm age verification (ID was scanned and verified)  
    const confirmAgeVerification = () => {
        if (pendingAgeItem) {
            setCart(prev => [...prev, pendingAgeItem])
            setToast({ message: `Added: ${pendingAgeItem.name} (ID Verified)`, type: 'success' })
        }
        // Mark ID as verified for this transaction - won't ask again
        setIdVerifiedForTransaction(true)
        setPendingAgeItem(null)
        setShowAgeVerification(false)
        setQuantityInput('1')
    }

    // Skip age verification (regular customer cashier knows)
    const skipAgeVerification = () => {
        if (pendingAgeItem) {
            setCart(prev => [...prev, pendingAgeItem])
            setToast({ message: `Added: ${pendingAgeItem.name} (ID Skipped)`, type: 'success' })
        }
        // Mark as verified so we don't ask again for this transaction
        setIdVerifiedForTransaction(true)
        setPendingAgeItem(null)
        setShowAgeVerification(false)
        setQuantityInput('1')
    }

    // Cancel age verification (remove item from pending)
    const cancelAgeVerification = () => {
        setPendingAgeItem(null)
        setShowAgeVerification(false)
        setToast({ message: 'Age-restricted item removed', type: 'error' })
    }

    // Round to 2 decimal places (standard half-up)
    const round2 = (n: number) => Math.round(n * 100) / 100

    // Calculate totals (with dual pricing support - Model 1: Tax on Final Charged Price)
    const calculateTotals = () => {
        const isDualPricing = pricingSettings?.pricingModel === 'DUAL_PRICING' && pricingSettings.showDualPricing
        const surcharge = pricingSettings?.cardSurcharge || 3.99
        const isPercentage = pricingSettings?.cardSurchargeType === 'PERCENTAGE'

        // === ITEM-BASED TRUTH ===
        let subtotalCash = 0
        let subtotalCard = 0
        let taxCash = 0
        let taxCard = 0

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity
            const itemDiscount = item.discount ? itemTotal * (item.discount / 100) : 0
            const cashPrice = round2(itemTotal - itemDiscount)
            // Card price = cash price × (1 + surcharge%) - rounded per item
            const cardPrice = isDualPricing && isPercentage
                ? round2(cashPrice * (1 + surcharge / 100))
                : cashPrice

            subtotalCash += cashPrice
            subtotalCard += cardPrice

            // Calculate tax per item on the price that will be charged
            const itemTaxRate = item.taxRate !== undefined ? item.taxRate / 100 : (config?.taxRate || 0) / 100
            taxCash += round2(cashPrice * itemTaxRate)
            taxCard += round2(cardPrice * itemTaxRate)
        })

        // Apply transaction-level discount
        let transactionDiscountAmount = 0
        if (transactionDiscount) {
            if (transactionDiscount.type === 'PERCENT') {
                transactionDiscountAmount = subtotalCash * (transactionDiscount.value / 100)
            } else {
                transactionDiscountAmount = transactionDiscount.value
            }
        }

        // Discount ratio for proportional tax reduction
        const discountRatio = subtotalCash > 0 ? transactionDiscountAmount / subtotalCash : 0
        const discountedSubtotalCash = round2(Math.max(0, subtotalCash - transactionDiscountAmount - promoDiscount))
        const discountedSubtotalCard = round2(Math.max(0, subtotalCard - (transactionDiscountAmount + promoDiscount) * (subtotalCard / subtotalCash || 1)))

        // Reduce taxes proportionally by discount
        taxCash = round2(taxCash * (1 - discountRatio))
        taxCard = round2(taxCard * (1 - discountRatio))

        // Totals
        let cashTotal = round2(discountedSubtotalCash + taxCash)
        let cardTotal = round2(discountedSubtotalCard + taxCard)

        // For FLAT_AMOUNT surcharge, add once at total level
        if (isDualPricing && !isPercentage) {
            cardTotal = round2(cashTotal + surcharge)
        }

        return {
            subtotal: subtotalCash,
            subtotalCash,
            subtotalCard,
            promoDiscount,
            transactionDiscountAmount,
            tax: taxCash,
            taxCash,
            taxCard,
            total: cashTotal,
            cashTotal,
            cardTotal,
            lotteryPayout, // Lottery payout amount (tracked separately, doesn't affect sales)
            customerPayable: round2(Math.max(0, cashTotal - lotteryPayout)), // What customer actually pays after lottery offset
            customerPayableCard: round2(Math.max(0, cardTotal - lotteryPayout)), // Card price after lottery offset
            itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
            showDualPricing: isDualPricing
        }
    }

    // Remove item from cart
    const removeItem = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index))
        setSelectedItemIndex(null)
    }

    // Delete selected item
    const deleteSelectedItem = () => {
        if (selectedItemIndex !== null) {
            removeItem(selectedItemIndex)
        }
    }

    // Update quantity
    const updateQuantity = (index: number, newQty: number) => {
        if (newQty < 1) {
            removeItem(index)
            return
        }
        setCart(prev => prev.map((item, i) =>
            i === index ? { ...item, quantity: newQty } : item
        ))
    }

    // Apply discount to selected item
    const applyDiscount = (discountPercent: number) => {
        if (selectedItemIndex !== null) {
            setCart(prev => prev.map((item, i) =>
                i === selectedItemIndex ? { ...item, discount: discountPercent } : item
            ))
        }
        setShowDiscountModal(false)
    }

    // Change price of selected item
    const changePrice = (newPrice: number) => {
        if (selectedItemIndex !== null) {
            setCart(prev => prev.map((item, i) =>
                i === selectedItemIndex ? { ...item, price: newPrice } : item
            ))
        }
        setShowPriceModal(false)
    }

    // Hold current transaction
    const holdTransaction = () => {
        if (cart.length === 0) return
        setHeldTransactions(prev => [...prev, {
            id: Date.now().toString(),
            items: [...cart],
            customerName: selectedCustomer?.firstName,
            timestamp: new Date()
        }])
        setCart([])
        setSelectedCustomer(null)
        setToast({ message: 'Transaction held', type: 'success' })
    }

    // Recall held transaction
    const recallTransaction = (id: string) => {
        const held = heldTransactions.find(t => t.id === id)
        if (held) {
            setCart(held.items)
            setHeldTransactions(prev => prev.filter(t => t.id !== id))
            setToast({ message: 'Transaction recalled', type: 'success' })
        }
    }

    // Void entire transaction
    const voidTransaction = () => {
        if (cart.length === 0) return
        if (confirm('Void entire transaction?')) {
            setCart([])
            setSelectedCustomer(null)
            setIdVerifiedForTransaction(false) // Reset ID verification for next transaction
            setToast({ message: 'Transaction voided', type: 'success' })
        }
    }

    // Process payment
    const processPayment = async (method: string, tipAmount: number = 0, paxResponse?: any) => {
        if (cart.length === 0) return

        // For card payments, open PAX terminal modal instead of direct processing
        if ((method === 'CREDIT_CARD' || method === 'DEBIT_CARD') && !paxResponse) {
            setShowPaymentModal(false)
            const { total } = calculateTotals()
            setPendingCardAmount(total + tipAmount)
            setShowPaxModal(true)
            return
        }

        setIsLoading(true)
        setShowPaymentModal(false) // Close modal if open

        try {
            const { subtotal, tax, total, cashTotal, cardTotal } = calculateTotals()
            const totalWithTip = total + tipAmount

            const res = await fetch('/api/pos/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        type: 'PRODUCT',
                        productId: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        discount: item.discount,
                        taxRate: item.taxRate,
                        isEbtEligible: item.isEbtEligible,
                        category: item.category,
                        // Dual pricing per item
                        cashPrice: item.cashPrice || item.price,
                        cardPrice: item.cardPrice
                    })),
                    subtotal,
                    tax,
                    total: totalWithTip,
                    // Dual pricing totals - stored permanently
                    totalCash: cashTotal,
                    totalCard: cardTotal,
                    paymentMethod: method,
                    clientId: selectedCustomer?.id,
                    tipAmount: tipAmount,
                    // Include PAX terminal response data if available
                    ...(paxResponse && {
                        gatewayTxId: paxResponse.transactionId,
                        authCode: paxResponse.authCode,
                        cardLast4: paxResponse.cardLast4,
                        cardType: paxResponse.cardType
                    })
                })
            })

            if (res.ok) {
                const transaction = await res.json()
                setLastTransaction(transaction) // Save for "Last Receipt" button

                // Build receipt data for SMS (includes dual pricing info)
                const totals = calculateTotals()
                const cardFee = totals.cardTotal - totals.cashTotal // Card fee is the difference
                const receiptData = {
                    transactionId: transaction.id,
                    items: cart.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        subtotal: item.price * item.quantity
                    })),
                    subtotal,
                    tax,
                    cardFee: method.includes('CARD') || method === 'CREDIT_CARD' || method === 'DEBIT_CARD' ? cardFee : 0,
                    tipAmount,
                    paymentMethod: method,
                    total: total + tipAmount
                }

                // Show receipt modal instead of just toast
                setPendingReceiptData(receiptData)
                setShowReceiptModal(true)

                // === PRINT AGENT INTEGRATION ===
                if (printerConnected && pricingSettings) {
                    // 1. Open cash drawer on CASH payments
                    if (method === 'CASH' && pricingSettings.openDrawerOnCash) {
                        openCashDrawer().catch(console.error)
                    }

                    // 2. Auto-print receipt based on settings
                    const printMode = pricingSettings.receiptPrintMode
                    const shouldPrint =
                        printMode === 'ALL' ||
                        (printMode === 'CARD_ONLY' && ['CREDIT_CARD', 'DEBIT_CARD'].includes(method)) ||
                        (printMode === 'EBT_ONLY' && method === 'EBT') ||
                        (printMode === 'CARD_AND_EBT' && ['CREDIT_CARD', 'DEBIT_CARD', 'EBT'].includes(method))

                    if (shouldPrint) {
                        // Build receipt for thermal printer
                        const thermalReceipt = formatReceiptFromTransaction(
                            { ...transaction, items: cart },
                            {
                                name: (session?.user as any)?.franchiseName || 'Store',
                                address: pricingSettings.showDualPricing ? undefined : undefined,
                                phone: undefined
                            },
                            session?.user?.name || 'Cashier'
                        )
                        printReceipt(thermalReceipt).catch(console.error)
                    }
                }

                setCart([])
                setSelectedCustomer(null)
                setIdVerifiedForTransaction(false) // Reset ID verification for next transaction
                setTransactionDiscount(null) // Reset transaction discount
            } else {
                const error = await res.json()
                setToast({ message: error.error || 'Payment failed', type: 'error' })
            }
        } catch (error) {
            console.error('Payment error:', error)
            setToast({ message: 'Payment error', type: 'error' })
        } finally {
            setIsLoading(false)
        }
    }

    // Handle PAX payment success
    const handlePaxSuccess = (paxResponse: any) => {
        setShowPaxModal(false)
        // Complete the transaction with PAX response data
        processPayment('CREDIT_CARD', 0, paxResponse)
    }

    // Print last receipt
    const printLastReceipt = () => {
        if (!lastTransaction) {
            setToast({ message: 'No recent transaction to print', type: 'error' })
            return
        }

        // Create printable receipt
        const receiptWindow = window.open('', '_blank', 'width=400,height=600')
        if (!receiptWindow) {
            setToast({ message: 'Please allow popups to print receipt', type: 'error' })
            return
        }

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt #${lastTransaction.invoiceNumber || lastTransaction.id?.slice(-8)}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .line { border-top: 1px dashed #000; margin: 10px 0; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { font-weight: bold; font-size: 1.2em; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>RECEIPT</h2>
                    <p>#${lastTransaction.invoiceNumber || lastTransaction.id?.slice(-8)}</p>
                    <p>${new Date(lastTransaction.createdAt).toLocaleString()}</p>
                </div>
                <div class="line"></div>
                ${lastTransaction.lineItems?.map((item: any) => `
                    <div class="item">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('') || '<p>No items</p>'}
                <div class="line"></div>
                <div class="item"><span>Subtotal:</span><span>$${Number(lastTransaction.subtotal).toFixed(2)}</span></div>
                <div class="item"><span>Tax:</span><span>$${Number(lastTransaction.tax).toFixed(2)}</span></div>
                ${lastTransaction.tip > 0 ? `<div class="item"><span>Tip:</span><span>$${Number(lastTransaction.tip).toFixed(2)}</span></div>` : ''}
                <div class="line"></div>
                <div class="item total"><span>TOTAL:</span><span>$${(Number(lastTransaction.subtotal) + Number(lastTransaction.tax) + Number(lastTransaction.tip || 0)).toFixed(2)}</span></div>
                <div class="item"><span>Payment:</span><span>${lastTransaction.paymentMethod}</span></div>
                <div class="footer">
                    <p>Thank you for your business!</p>
                </div>
            </body>
            </html>
        `

        receiptWindow.document.write(receiptHTML)
        receiptWindow.document.close()
        receiptWindow.print()
    }

    // Price check - lookup product without adding to cart
    const handlePriceCheck = async (code: string) => {
        try {
            const res = await fetch(`/api/pos/retail/lookup?code=${encodeURIComponent(code)}`)
            if (res.ok) {
                const product = await res.json()
                setPriceCheckProduct(product)
                setShowPriceCheckModal(true)
            } else {
                setToast({ message: 'Product not found', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Lookup failed', type: 'error' })
        }
    }

    const { subtotal, tax, total, cashTotal, cardTotal, itemCount, showDualPricing } = calculateTotals()
    const totalWithTip = total // Placeholder for now, tip logic would be in PaymentSelectionModal

    return (
        <div
            className="h-screen flex flex-col bg-stone-950 text-stone-100"
            style={{
                transform: uiScale < 1 ? `scale(${uiScale})` : undefined,
                transformOrigin: 'top left',
                width: uiScale < 1 ? `${100 / uiScale}%` : '100%',
                height: uiScale < 1 ? `${100 / uiScale}vh` : '100vh',
            }}
        >
            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* ===== KIOSK MODE UI ===== */}
            {/* Fullscreen Prompt Banner - shown when not fullscreen and not installed */}
            {!isFullscreen && !isInstalled && (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2 px-4 z-[200] flex items-center justify-center gap-4">
                    <span className="text-sm font-medium">
                        📺 For best experience, use fullscreen mode
                    </span>
                    <button
                        onClick={enterFullscreen}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Maximize className="w-4 h-4" />
                        Go Fullscreen
                    </button>
                    {!isInstalled && installPrompt && (
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Install App
                        </button>
                    )}
                </div>
            )}

            {/* Install Banner (when in fullscreen but not installed) */}
            {isFullscreen && showInstallBanner && !isInstalled && (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white py-2 px-4 z-[200] flex items-center justify-center gap-4">
                    <span className="text-sm font-medium">
                        📲 Install as app for offline access
                    </span>
                    <button
                        onClick={handleInstallClick}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Install Now
                    </button>
                    <button
                        onClick={() => setShowInstallBanner(false)}
                        className="p-1 hover:bg-white/20 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Fullscreen Lock Indicator */}
            {isFullscreen && (
                <div className="fixed bottom-4 right-4 z-[200] flex items-center gap-2 bg-stone-800/90 backdrop-blur-sm text-stone-400 px-3 py-1.5 rounded-full text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Kiosk Mode</span>
                </div>
            )}

            {/* Exit Fullscreen PIN Modal */}
            {showExitModal && (
                <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-orange-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Exit Kiosk Mode</h2>
                            <p className="text-stone-400 mt-2 text-sm">
                                Enter owner, manager, or support PIN to exit fullscreen
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    value={exitPin}
                                    onChange={(e) => {
                                        setExitPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                                        setPinError('')
                                    }}
                                    placeholder="Enter PIN"
                                    autoFocus
                                    className="w-full px-4 py-4 bg-stone-800 border border-stone-600 rounded-xl text-white text-center text-2xl tracking-widest font-mono placeholder:text-stone-500 placeholder:text-base placeholder:tracking-normal focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleVerifyPin()
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-white"
                                >
                                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {pinError && (
                                <p className="text-red-400 text-sm text-center">{pinError}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowExitModal(false)
                                        setExitPin('')
                                        setPinError('')
                                    }}
                                    className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerifyPin}
                                    disabled={verifyingPin || exitPin.length < 4}
                                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 disabled:text-stone-400 text-white rounded-xl font-medium transition-colors"
                                >
                                    {verifyingPin ? 'Verifying...' : 'Exit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Device Pairing Screen - Provider pairs device to station before shipping */}
            {showStationPairing && (
                <div className="fixed inset-0 bg-stone-950 flex items-center justify-center z-50">
                    <div className="text-center max-w-lg w-full mx-4">
                        <div className="h-20 w-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Monitor className="h-10 w-10 text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Device Setup</h2>
                        <p className="text-stone-400 mb-8">Select which register this device will be</p>

                        <div className="grid grid-cols-2 gap-4">
                            {stations.map((station) => (
                                <button
                                    key={station.id}
                                    onClick={() => {
                                        // Permanently pair this device to the station
                                        localStorage.setItem('pairedStationId', station.id)
                                        setSelectedStation(station)
                                        setShowStationPairing(false)
                                    }}
                                    className="p-6 bg-stone-800 hover:bg-blue-600 rounded-2xl border-2 border-stone-700 hover:border-blue-500 transition-all text-center group"
                                >
                                    <div className="h-16 w-16 bg-stone-700 group-hover:bg-blue-500/30 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                                        <Monitor className="h-8 w-8 text-stone-300 group-hover:text-white" />
                                    </div>
                                    <p className="font-bold text-xl text-white">
                                        {station.name}
                                    </p>
                                </button>
                            ))}
                        </div>

                        <p className="text-stone-500 text-sm mt-6">
                            This only needs to be done once per device
                        </p>
                    </div>
                </div>
            )}

            {/* No Stations Configured - Allow Setup */}
            {!isLoadingStation && stations.length === 0 && (
                <div className="fixed inset-0 bg-stone-950 flex items-center justify-center z-50">
                    <div className="text-center max-w-md mx-4">
                        <div className="h-20 w-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="h-10 w-10 text-orange-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Station Setup Required</h2>
                        <p className="text-stone-400 mb-6">
                            No POS stations configured for this location yet.
                        </p>
                        {(user?.role === 'PROVIDER' || user?.role === 'FRANCHISOR' || user?.role === 'MANAGER') ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => router.push('/dashboard/settings/stations')}
                                    className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
                                >
                                    Create First Station
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="w-full px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        ) : (
                            <p className="text-orange-400 font-semibold">
                                Please ask your manager to configure POS stations
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ID Check Modal for Age-Restricted Products */}
            {showAgeVerification && pendingAgeItem && (
                <IDCheckModal
                    isOpen={showAgeVerification}
                    productName={pendingAgeItem.name}
                    minimumAge={pendingAgeItem.minimumAge || 21}
                    onVerified={confirmAgeVerification}
                    onSkip={skipAgeVerification}
                    onCancel={cancelAgeVerification}
                />
            )}

            {/* Today's Stats Header Bar - Hidden on compact screens */}
            {todayStats && !compactMode && (
                <div className="flex items-center justify-center gap-8 py-2 bg-stone-900/50 border-b border-stone-800 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500">Today:</span>
                        <span className="font-bold text-green-400">${todayStats.sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500">Txns:</span>
                        <span className="font-bold text-blue-400">{todayStats.transactions}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500">Avg:</span>
                        <span className="font-bold text-orange-400">${todayStats.avgTicket.toFixed(2)}</span>
                    </div>
                </div>
            )}

            {/* Top Bar - Scrollable on small screens for 15-inch square displays */}
            <div className={`flex items-center gap-2 bg-stone-900 border-b border-stone-800 overflow-x-auto ${compactMode ? 'p-2' : 'p-3'}`}>
                {/* Barcode Input - LEFT side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative w-48 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                        <input
                            ref={barcodeInputRef}
                            type="text"
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyDown={handleBarcodeScan}
                            placeholder="Scan Barcode Now..."
                            className={`w-full pl-10 pr-4 bg-stone-800 border border-stone-700 rounded-lg focus:outline-none focus:border-orange-500 font-mono ${compactMode ? 'py-2 text-base' : 'py-3 text-lg'}`}
                            autoFocus
                        />
                    </div>

                    {/* Category Filter Dropdown */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`bg-stone-800 border border-stone-700 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${compactMode ? 'py-2 px-2' : 'py-3 px-3'} ${selectedCategory ? 'text-orange-400' : 'text-stone-400'}`}
                    >
                        <option value="">All Depts</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>

                    {/* Quantity Input */}
                    <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
                        <span className="text-stone-400 text-sm">Qty:</span>
                        <input
                            type="number"
                            value={quantityInput}
                            onChange={(e) => setQuantityInput(e.target.value)}
                            className="w-16 bg-transparent text-center text-lg font-bold focus:outline-none"
                            min="1"
                        />
                    </div>

                    {/* Item Count */}
                    <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2">
                        <Package className="h-5 w-5 text-orange-500" />
                        <span className="text-lg font-bold">{itemCount}</span>
                        <span className="text-stone-400 text-sm">items</span>
                    </div>
                </div>

                {/* 1. Search Button */}
                <button
                    onClick={() => setShowUniversalSearch(true)}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
                >
                    <Search className="h-5 w-5" />
                    <span className="hidden xl:inline">Search</span>
                </button>

                {/* 2. Dashboard Button - Using plain anchor for reliable navigation */}
                <a
                    href="/dashboard"
                    target="_self"
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 transition-colors cursor-pointer no-underline text-white flex-shrink-0"
                >
                    <FileText className="h-5 w-5" />
                    <span className="hidden xl:inline">Dashboard</span>
                </a>

                <button
                    onClick={() => {
                        if (!selectedStation) {
                            setToast({ message: 'Select a station first', type: 'error' })
                            return
                        }
                        window.open(`/customer-display?stationId=${selectedStation.id}`, 'customer_display', 'popup=true,width=800,height=600')
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
                >
                    <Monitor className="h-5 w-5" />
                    <span className="hidden xl:inline">Customer Display</span>
                </button>

                {/* 5. Logout Button */}
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden xl:inline">Logout</span>
                </button>

                {/* 4. Station Indicator - FAR RIGHT */}
                {selectedStation && (
                    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${selectedStation.paymentMode === 'DEDICATED'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                        }`}>
                        <span className="text-lg">
                            {selectedStation.paymentMode === 'DEDICATED' ? '💳' : '💵'}
                        </span>
                        <div className="text-left">
                            <span className="text-stone-200 font-medium block">{selectedStation.name}</span>
                            <span className={`text-xs ${selectedStation.paymentMode === 'DEDICATED' ? 'text-green-400' : 'text-amber-400'
                                }`}>
                                {selectedStation.paymentMode === 'DEDICATED'
                                    ? selectedStation.dedicatedTerminal?.name || 'Terminal'
                                    : 'Cash Only'
                                }
                            </span>
                        </div>
                    </div>
                )}

                {/* Offline Status Indicator */}
                <OfflineStatusIndicator
                    isOnline={offlineMode.isOnline}
                    isReady={offlineMode.isReady}
                    isSyncing={offlineMode.isSyncing}
                    lastSync={offlineMode.lastSync}
                    pendingCount={offlineMode.pendingCount}
                    productCount={offlineMode.productCount}
                    onSync={offlineMode.sync}
                />
            </div>

            {/* Tag-Along Suggestions Bar (Cross-sell) */}
            {tagAlongItems.length > 0 && (
                <div className="px-4 py-2 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-b border-amber-700/50">
                    <div className="flex items-center gap-3">
                        <span className="text-amber-400 text-sm font-medium whitespace-nowrap">
                            💡 Customers also buy:
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {tagAlongItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        addToCart({
                                            id: item.id,
                                            name: item.name,
                                            price: item.price,
                                            barcode: item.barcode,
                                            sku: item.sku
                                        })
                                        setToast({ message: `Added: ${item.name}`, type: 'success' })
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-600/50 rounded-full text-sm whitespace-nowrap transition-colors"
                                >
                                    <span>{item.name}</span>
                                    <span className="text-amber-300 font-medium">
                                        {formatCurrency(Number(item.price))}
                                    </span>
                                    <span className="text-xs bg-amber-500/50 px-1.5 py-0.5 rounded">+ADD</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setTagAlongItems([])}
                            className="text-stone-500 hover:text-stone-300 ml-auto"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Favorites Bar (Top Sellers Quick Buttons) */}
            {favorites.length > 0 && !selectedCategory && (
                <div className="px-4 py-2 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-purple-700/50">
                    <div className="flex items-center gap-3">
                        <span className="text-purple-400 text-sm font-medium whitespace-nowrap">
                            ⭐ Quick:
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {favorites.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        addToCart({
                                            id: item.id,
                                            name: item.name,
                                            price: item.price,
                                            barcode: item.barcode
                                        })
                                        setToast({ message: `Added: ${item.name}`, type: 'success' })
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-600/50 rounded-lg text-sm whitespace-nowrap transition-colors"
                                >
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-purple-300 font-medium">
                                        {formatCurrency(Number(item.price))}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Category Products Grid - Shows when category is selected */}
            {selectedCategory && categoryProducts.length > 0 && (
                <div className="bg-gradient-to-r from-orange-900/20 to-amber-900/20 border-b border-orange-700/50 max-h-48 overflow-y-auto">
                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-orange-400 text-sm font-medium">
                                📦 {categories.find(c => c.id === selectedCategory)?.name} ({categoryProducts.length} items)
                            </span>
                            <button
                                onClick={() => setSelectedCategory('')}
                                className="text-xs text-stone-400 hover:text-white px-2 py-1 bg-stone-800 rounded"
                            >
                                Clear Filter
                            </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {categoryProducts.map((product: any) => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        addToCart({
                                            id: product.id,
                                            name: product.name,
                                            price: Number(product.price),
                                            barcode: product.barcode
                                        })
                                        setToast({ message: `Added: ${product.name}`, type: 'success' })
                                    }}
                                    className="flex flex-col items-center p-2 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-600/30 rounded-lg text-xs transition-colors"
                                >
                                    <span className="font-medium text-white truncate w-full text-center">{product.name}</span>
                                    <span className="text-orange-300 font-bold">{formatCurrency(Number(product.price))}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side - Item List */}
                <div className="flex-1 flex flex-col border-r border-stone-800">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-900 border-b border-stone-800 text-sm font-medium text-stone-400">
                        <div className="col-span-1">#</div>
                        <div className="col-span-6">Item Info</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Item List */}
                    <div className="flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-stone-500">
                                <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-lg">Scan items to begin</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedItemIndex(idx)}
                                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-stone-800 cursor-pointer transition-colors ${selectedItemIndex === idx
                                        ? 'bg-orange-500/20 border-l-4 border-l-orange-500'
                                        : 'hover:bg-stone-900'
                                        }`}
                                >
                                    <div className="col-span-1 text-stone-500 font-mono">{idx + 1}</div>
                                    <div className="col-span-6">
                                        <p className="font-medium">{item.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-stone-500">
                                            {item.barcode && <span>BC: {item.barcode}</span>}
                                            {item.sku && <span>SKU: {item.sku}</span>}
                                            {item.isEbtEligible && (
                                                <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">EBT</span>
                                            )}
                                            {item.ageRestricted && (
                                                <span className="text-amber-500">21+</span>
                                            )}
                                        </div>
                                        {item.discount && item.discount > 0 && (
                                            <span className="text-xs text-orange-400">-{item.discount}% OFF</span>
                                        )}
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity - 1) }}
                                            className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center"
                                        >
                                            -
                                        </button>
                                        <span className="w-10 text-center font-bold">{item.quantity}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity + 1) }}
                                            className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="col-span-2 text-right font-medium">
                                        {formatCurrency(item.price * item.quantity)}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeItem(idx) }}
                                            className="w-8 h-8 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Bottom Action Bar - Compact for 15.5" POS */}
                    <div className="flex flex-col gap-1 p-2 bg-stone-900 border-t border-stone-800">
                        {/* Row 1: Primary Actions - 7 columns */}
                        <div className="grid grid-cols-7 gap-1">
                            <button
                                onClick={voidTransaction}
                                disabled={cart.length === 0}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-red-900/30 hover:bg-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                                <span className="text-[10px]">VOID</span>
                            </button>
                            <button
                                onClick={deleteSelectedItem}
                                disabled={selectedItemIndex === null}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-red-500/30 hover:bg-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                            >
                                <Trash2 className="h-5 w-5" />
                                <span className="text-[10px]">DELETE</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedItemIndex !== null) {
                                        setShowDiscountModal(true)
                                    } else if (cart.length > 0) {
                                        setShowTransactionDiscountModal(true)
                                    }
                                }}
                                disabled={cart.length === 0}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-orange-500/30 hover:bg-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                            >
                                <Tag className="h-5 w-5" />
                                <span className="text-[10px]">{selectedItemIndex !== null ? 'ITEM%' : 'INV%'}</span>
                            </button>
                            <button
                                onClick={() => {
                                    // If cart has items, hold the current transaction
                                    if (cart.length > 0) {
                                        holdTransaction()
                                    }
                                    // If no cart but there are held transactions, show recall modal or recall first one
                                    else if (heldTransactions.length > 0) {
                                        recallTransaction(heldTransactions[0].id)
                                    }
                                }}
                                disabled={cart.length === 0 && heldTransactions.length === 0}
                                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cart.length > 0
                                    ? 'bg-purple-500/30 hover:bg-purple-500/50'
                                    : 'bg-amber-500/30 hover:bg-amber-500/50'
                                    }`}
                            >
                                <History className="h-5 w-5" />
                                <span className="text-[10px]">
                                    {cart.length > 0 ? 'HOLD' : `RECALL(${heldTransactions.length})`}
                                </span>
                            </button>
                            <button
                                onClick={() => selectedItemIndex !== null && setShowQuantityModal(true)}
                                disabled={selectedItemIndex === null}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-emerald-500/30 hover:bg-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                            >
                                <Hash className="h-5 w-5" />
                                <span className="text-[10px]">QTY</span>
                            </button>
                            <button
                                onClick={() => selectedItemIndex !== null && setShowPriceModal(true)}
                                disabled={selectedItemIndex === null}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-pink-500/30 hover:bg-pink-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                            >
                                <DollarSign className="h-5 w-5" />
                                <span className="text-[10px]">PRICE</span>
                            </button>
                            <button
                                onClick={printLastReceipt}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-cyan-500/30 hover:bg-cyan-500/50 rounded text-white transition-colors"
                            >
                                <Printer className="h-5 w-5" />
                                <span className="text-[10px]">RCPT</span>
                            </button>
                        </div>

                        {/* Row 2: Quick Actions - 8 columns */}
                        <div className="grid grid-cols-8 gap-1">
                            <button
                                onClick={() => setShowPriceCheckInputModal(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 rounded text-white transition-colors"
                            >
                                <Search className="h-4 w-4" />
                                <span className="text-[10px]">CHECK</span>
                            </button>
                            <button
                                onClick={() => setShowQuickAddModal(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-emerald-500/30 hover:bg-emerald-500/50 rounded text-white transition-colors"
                            >
                                <DollarSign className="h-4 w-4" />
                                <span className="text-[10px]">QUICK</span>
                            </button>
                            <button
                                onClick={() => setShowCustomerLookup(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-blue-500/30 hover:bg-blue-500/50 rounded text-white transition-colors"
                            >
                                <Phone className="h-4 w-4" />
                                <span className="text-[10px]">LOOK</span>
                            </button>
                            <button
                                onClick={() => setShowCashDropModal(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-green-500/30 hover:bg-green-500/50 rounded text-white transition-colors"
                            >
                                <Wallet className="h-4 w-4" />
                                <span className="text-[10px]">DROP</span>
                            </button>
                            <button
                                onClick={() => setShowReceiveStockModal(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-orange-500/30 hover:bg-orange-500/50 rounded text-white transition-colors"
                            >
                                <PackagePlus className="h-4 w-4" />
                                <span className="text-[10px]">RECV</span>
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch('/api/franchise/transactions?limit=5')
                                        if (res.ok) {
                                            const data = await res.json()
                                            setRecentTransactions(data.transactions || [])
                                        }
                                    } catch (e) { console.error(e) }
                                    setShowRecentTransactions(true)
                                }}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-purple-500/30 hover:bg-purple-500/50 rounded text-white transition-colors"
                            >
                                <Clock className="h-4 w-4" />
                                <span className="text-[10px]">HIST</span>
                            </button>
                            <button
                                onClick={() => setShowLotteryModal(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-amber-500/30 hover:bg-amber-500/50 rounded text-white transition-colors"
                            >
                                <Ticket className="h-4 w-4" />
                                <span className="text-[10px]">LOTTO</span>
                            </button>
                            <button
                                onClick={() => setShowLotteryPayoutModal(true)}
                                className="flex flex-col items-center justify-center gap-0.5 py-2 bg-teal-500/30 hover:bg-teal-500/50 rounded text-white transition-colors"
                            >
                                <Trophy className="h-4 w-4" />
                                <span className="text-[10px]">PAY</span>
                            </button>
                        </div>

                        {/* Row 3: End of Day */}
                        <button
                            onClick={() => setShowEndOfDayWizard(true)}
                            className="flex items-center justify-center gap-2 py-2 bg-indigo-500/30 hover:bg-indigo-500/50 rounded text-white transition-colors"
                        >
                            <Moon className="h-4 w-4" />
                            <span className="text-xs font-medium">End of Day / Close</span>
                        </button>
                    </div>
                </div>

                {/* Right Side - Totals & Payment - Narrower on compact */}
                <div className={`flex flex-col bg-stone-950 ${compactMode ? 'w-64' : 'w-80'}`}>
                    {/* Totals */}
                    <div className={`space-y-2 bg-stone-900 border-b border-stone-800 ${compactMode ? 'p-2' : 'p-4 space-y-3'}`}>
                        <div className={`flex justify-between ${compactMode ? 'text-base' : 'text-lg'}`}>
                            <span className="text-emerald-400">Sub Total</span>
                            <span className="font-bold">{formatCurrency(subtotal)}</span>
                        </div>

                        {/* Promo Discount Display */}
                        {promoDiscount > 0 && (
                            <div className="flex justify-between text-lg bg-pink-500/10 -mx-4 px-4 py-2 border-y border-pink-500/20">
                                <span className="text-pink-400 flex items-center gap-2">
                                    <Gift className="h-4 w-4" />
                                    Deals Savings
                                </span>
                                <span className="font-bold text-pink-400">-{formatCurrency(promoDiscount)}</span>
                            </div>
                        )}

                        {/* Applied Promotions List */}
                        {appliedPromotions.length > 0 && (
                            <div className="text-xs space-y-1 text-stone-400">
                                {appliedPromotions.map((promo, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span className="truncate">{promo.promotionName}</span>
                                        <span className="text-pink-400">-{formatCurrency(promo.discountAmount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between text-lg">
                            <span className="text-emerald-400">Tax</span>
                            <span className="font-bold">{formatCurrency(tax)}</span>
                        </div>

                        {/* Dual Pricing Display */}
                        {showDualPricing ? (
                            <div className="border-t border-stone-700 pt-3 space-y-2">
                                <div className="flex justify-between text-xl">
                                    <span className="text-blue-400 font-bold flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Card
                                    </span>
                                    <span className="font-bold text-blue-400">{formatCurrency(cardTotal)}</span>
                                </div>
                                <div className="flex justify-between text-xl">
                                    <span className="text-green-400 font-bold flex items-center gap-2">
                                        <Banknote className="h-5 w-5" />
                                        Cash
                                    </span>
                                    <span className="font-bold text-green-400">{formatCurrency(cashTotal)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between text-2xl border-t border-stone-700 pt-3">
                                <span className="text-emerald-400 font-bold">Grand Total</span>
                                <span className="font-bold text-emerald-400">{formatCurrency(total)}</span>
                            </div>
                        )}
                    </div>

                    {/* PAY Button - Smaller on compact screens */}
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        disabled={cart.length === 0 || isLoading}
                        className={`bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 ${compactMode ? 'm-2 py-5 text-2xl' : 'm-4 py-8 text-4xl'}`}
                    >
                        PAY {formatCurrency(total)}
                    </button>

                    {/* Action Buttons */}


                    {/* Customer Info */}
                    <div className="mt-auto p-4 bg-stone-900 border-t border-stone-800">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCustomerModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg text-orange-400 transition-colors"
                            >
                                <User className="h-5 w-5" />
                                <span>Customer Info</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors">
                                <FileText className="h-5 w-5" />
                                <span>Notes</span>
                            </button>
                        </div>
                        {selectedCustomer && (
                            <div className="mt-2 text-sm text-stone-400">
                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                            </div>
                        )}

                        {/* Quick Switch - Employee switching */}
                        <button
                            onClick={() => setShowQuickSwitch(true)}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-400 transition-colors text-sm"
                        >
                            <Users className="h-4 w-4" />
                            <span>Switch User</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Checkout Modal - Same as Salon POS */}
            {showPaymentModal && (
                <CheckoutModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    cart={cart.map(item => ({
                        ...item,
                        type: 'product'
                    }))}
                    subtotal={subtotal}
                    taxRate={config?.taxRate || 0}
                    customerId={selectedCustomer?.id}
                    customerName={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined}
                    onComplete={(transaction) => {
                        // Handle card payments via PAX
                        if (transaction.paymentMethod === 'CREDIT_CARD' || transaction.paymentMethod === 'DEBIT_CARD') {
                            setPendingCardAmount(transaction.total)
                            setShowPaymentModal(false)
                            setShowPaxModal(true)
                        } else {
                            // Process cash payment directly
                            processPayment(transaction.paymentMethod, 0)
                        }
                    }}
                />
            )}

            {showQuickAddModal && (
                <QuickAddModal
                    onAdd={(price, taxType) => {
                        let taxRate = config?.taxRate || 0
                        let isEbt = false

                        if (taxType === 'NO_TAX') taxRate = 0
                        if (taxType === 'HIGH_TAX') taxRate = config?.taxRate || 8.25 // Fallback to 8.25 if null
                        if (taxType === 'LOW_TAX') taxRate = 2.25 // Grocery rate
                        if (taxType === 'EBT') {
                            taxRate = 0
                            isEbt = true
                        }

                        addToCart({
                            id: `quick-${Date.now()}`,
                            name: 'Quick Add Item',
                            price: price,
                            taxRate: taxRate,
                            isEbtEligible: isEbt,
                            category: 'QUICK_ADD',
                            quantity: 1
                        })
                        setShowQuickAddModal(false)
                    }}
                    onClose={() => setShowQuickAddModal(false)}
                />
            )}

            {/* Scan Quick Add Modal - Auto-triggers on unknown barcode */}
            {showScanQuickAddModal && pendingScanBarcode && (
                <ScanQuickAddModal
                    barcode={pendingScanBarcode}
                    onAdd={async (product) => {
                        let taxRate = config?.taxRate || 0
                        let isEbt = false

                        if (product.taxType === 'NO_TAX') taxRate = 0
                        if (product.taxType === 'HIGH_TAX') taxRate = config?.taxRate || 8.25
                        if (product.taxType === 'LOW_TAX') taxRate = 2.25
                        if (product.taxType === 'EBT') {
                            taxRate = 0
                            isEbt = true
                        }

                        // If save to inventory requested, create the product first
                        if (product.saveToInventory) {
                            try {
                                const res = await fetch('/api/inventory/products', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        name: product.name,
                                        price: product.price,
                                        barcode: product.barcode,
                                        sku: product.barcode,
                                        taxRate: taxRate,
                                        isEbtEligible: isEbt,
                                        stock: 100, // Default stock
                                        isActive: true
                                    })
                                })

                                if (res.ok) {
                                    const savedProduct = await res.json()
                                    // Add the saved product to cart
                                    addToCart({
                                        id: savedProduct.id || savedProduct.product?.id,
                                        name: product.name,
                                        price: product.price,
                                        barcode: product.barcode,
                                        taxRate: taxRate,
                                        isEbtEligible: isEbt,
                                        quantity: 1
                                    })
                                    setToast({ message: `Saved "${product.name}" to inventory`, type: 'success' })
                                } else {
                                    // Save failed, add as quick item anyway
                                    addToCart({
                                        id: `scan-${Date.now()}`,
                                        name: product.name,
                                        price: product.price,
                                        barcode: product.barcode,
                                        taxRate: taxRate,
                                        isEbtEligible: isEbt,
                                        category: 'QUICK_ADD',
                                        quantity: 1
                                    })
                                    setToast({ message: `Added but save failed`, type: 'error' })
                                }
                            } catch (error) {
                                console.error('Failed to save product:', error)
                                addToCart({
                                    id: `scan-${Date.now()}`,
                                    name: product.name,
                                    price: product.price,
                                    taxRate: taxRate,
                                    isEbtEligible: isEbt,
                                    category: 'QUICK_ADD',
                                    quantity: 1
                                })
                            }
                        } else {
                            // Just add to cart without saving
                            addToCart({
                                id: `scan-${Date.now()}`,
                                name: product.name,
                                price: product.price,
                                barcode: product.barcode,
                                taxRate: taxRate,
                                isEbtEligible: isEbt,
                                category: 'QUICK_ADD',
                                quantity: 1
                            })
                        }

                        setShowScanQuickAddModal(false)
                        setPendingScanBarcode('')
                    }}
                    onClose={() => {
                        setShowScanQuickAddModal(false)
                        setPendingScanBarcode('')
                    }}
                />
            )}

            {/* PAX Payment Modal */}
            {showPaxModal && (
                <PaxPaymentModal
                    isOpen={showPaxModal}
                    onClose={() => setShowPaxModal(false)}
                    onSuccess={handlePaxSuccess}
                    amount={pendingCardAmount}
                    invoiceNumber={String(Math.floor(Date.now() / 1000) % 9999 + 1)}
                />
            )}

            {/* Transaction Discount Modal */}
            {showTransactionDiscountModal && (
                <TransactionDiscountModal
                    subtotal={subtotal}
                    onApply={(type, value) => {
                        setTransactionDiscount({ type, value })
                        setShowTransactionDiscountModal(false)
                        setToast({ message: `Invoice discount applied: ${type === 'PERCENT' ? value + '%' : formatCurrency(value)}`, type: 'success' })
                    }}
                    onClose={() => setShowTransactionDiscountModal(false)}
                />
            )}

            {/* Age Verification Modal */}
            {showAgeVerification && pendingAgeItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-stone-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-stone-700">
                        <div className="text-center">
                            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Age Verification Required</h2>
                            <p className="text-stone-400 mb-2">{pendingAgeItem.name}</p>
                            <p className="text-xl font-bold text-amber-500 mb-6">
                                Customer must be {pendingAgeItem.minimumAge || 21}+ years old
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setPendingAgeItem(null)
                                        setShowAgeVerification(false)
                                    }}
                                    className="py-4 bg-stone-800 hover:bg-stone-700 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAgeVerification}
                                    className="py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors"
                                >
                                    ID Verified ✓
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Discount Modal */}
            {showDiscountModal && selectedItemIndex !== null && (
                <DiscountModal
                    item={cart[selectedItemIndex]}
                    onApply={applyDiscount}
                    onClose={() => setShowDiscountModal(false)}
                />
            )}

            {/* Quantity Modal */}
            {showQuantityModal && selectedItemIndex !== null && (
                <QuantityModal
                    item={cart[selectedItemIndex]}
                    onApply={(qty) => {
                        updateQuantity(selectedItemIndex, qty)
                        setShowQuantityModal(false)
                    }}
                    onClose={() => setShowQuantityModal(false)}
                />
            )}

            {/* Price Modal */}
            {showPriceModal && selectedItemIndex !== null && (
                <PriceModal
                    item={cart[selectedItemIndex]}
                    onApply={changePrice}
                    onClose={() => setShowPriceModal(false)}
                />
            )}

            {/* Universal Search Modal (F3 or Search button) */}
            <UniversalSearch
                isOpen={showUniversalSearch}
                onClose={() => setShowUniversalSearch(false)}
                onAddToCart={(product) => {
                    addToCart(product)
                    setShowUniversalSearch(false)
                }}
            />

            {/* Price Check Input Modal */}
            {showPriceCheckInputModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 rounded-2xl p-6 max-w-md w-full border border-stone-700">
                        <h2 className="text-xl font-bold text-white mb-4">Price Check</h2>
                        <input
                            type="text"
                            value={priceCheckInput}
                            onChange={(e) => setPriceCheckInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && priceCheckInput.trim()) {
                                    handlePriceCheck(priceCheckInput.trim())
                                    setPriceCheckInput('')
                                    setShowPriceCheckInputModal(false)
                                }
                            }}
                            placeholder="Enter barcode or SKU..."
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg"
                            autoFocus
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setPriceCheckInput('')
                                    setShowPriceCheckInputModal(false)
                                }}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (priceCheckInput.trim()) {
                                        handlePriceCheck(priceCheckInput.trim())
                                        setPriceCheckInput('')
                                        setShowPriceCheckInputModal(false)
                                    }
                                }}
                                disabled={!priceCheckInput.trim()}
                                className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-white disabled:opacity-50"
                            >
                                Lookup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Price Check Modal */}
            {showPriceCheckModal && priceCheckProduct && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 rounded-2xl p-6 max-w-md w-full border border-stone-700">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-4">Price Check</h2>
                            <div className="bg-stone-800 rounded-xl p-6 mb-4">
                                <p className="text-xl font-bold text-white mb-2">{priceCheckProduct.name}</p>
                                {priceCheckProduct.barcode && (
                                    <p className="text-stone-400 text-sm mb-2">UPC: {priceCheckProduct.barcode}</p>
                                )}
                                <p className="text-4xl font-bold text-emerald-400">${Number(priceCheckProduct.price).toFixed(2)}</p>
                                {priceCheckProduct.isEbtEligible && (
                                    <span className="inline-block mt-2 px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-medium">
                                        EBT Eligible
                                    </span>
                                )}
                                {priceCheckProduct.stock !== undefined && (
                                    <p className={`mt-2 text-sm ${priceCheckProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {priceCheckProduct.stock > 0 ? `In Stock: ${priceCheckProduct.stock}` : 'Out of Stock'}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setShowPriceCheckModal(false)
                                        setPriceCheckProduct(null)
                                    }}
                                    className="py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-bold"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        addToCart(priceCheckProduct)
                                        setShowPriceCheckModal(false)
                                        setPriceCheckProduct(null)
                                    }}
                                    className="py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Quick Lookup Modal */}
            {showCustomerLookup && (
                <CustomerLookupModal
                    onClose={() => setShowCustomerLookup(false)}
                    onSelectCustomer={(customer) => {
                        setSelectedCustomer(customer)
                        setShowCustomerLookup(false)
                        setToast({ message: `Selected: ${customer.name}`, type: 'success' })
                    }}
                />
            )}

            {/* Cash Drop Modal */}
            {showCashDropModal && (
                <CashDropModal
                    onClose={() => setShowCashDropModal(false)}
                    onSuccess={() => {
                        setShowCashDropModal(false)
                        setToast({ message: '✓ Cash drop recorded', type: 'success' })
                    }}
                />
            )}

            {/* Receive Stock Modal */}
            {showReceiveStockModal && (
                <ReceiveStockModal
                    onClose={() => setShowReceiveStockModal(false)}
                    onSuccess={() => {
                        setShowReceiveStockModal(false)
                        setToast({ message: '✓ Stock received', type: 'success' })
                    }}
                />
            )}

            {/* Recent Transactions Modal */}
            {showRecentTransactions && (
                <RecentTransactionsModal
                    transactions={recentTransactions}
                    onClose={() => setShowRecentTransactions(false)}
                    onSelectTransaction={(tx) => {
                        // Could implement reprint/refund functionality here - tx.id available
                    }}
                />
            )}

            {/* End of Day Wizard */}
            {showEndOfDayWizard && (
                <EndOfDayWizard
                    onClose={() => setShowEndOfDayWizard(false)}
                    onComplete={() => {
                        setShowEndOfDayWizard(false)
                        setToast({ message: '✓ Day closed successfully!', type: 'success' })
                    }}
                />
            )}

            {/* Lottery Modal */}
            <LotteryModal
                isOpen={showLotteryModal}
                onClose={() => setShowLotteryModal(false)}
                onAddToCart={(item) => {
                    setCart([...cart, {
                        id: `lottery-${Date.now()}`,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        category: item.category
                    }])
                    setToast({ message: `Added ${item.name} to cart`, type: 'success' })
                }}
            />

            {/* Lottery Payout Modal */}
            <LotteryPayoutModal
                isOpen={showLotteryPayoutModal}
                onClose={() => setShowLotteryPayoutModal(false)}
                onPayout={(amount, type) => {
                    if (type === 'vendor') {
                        // Vendor payouts are standalone - just show toast (API already called in modal)
                        setToast({ message: `✓ Vendor payout $${amount.toFixed(2)} processed`, type: 'success' })
                    } else {
                        // Lottery payouts: track separately (doesn't affect sales, only reduces what customer pays)
                        setLotteryPayout(prev => prev + amount)
                        setToast({ message: `✓ Lottery payout $${amount.toFixed(2)} added - will offset customer total`, type: 'success' })
                    }
                }}
            />

            {/* Case Break Modal - Single vs 6-Pack vs Case */}
            {showCaseBreakModal && pendingCaseBreakProduct && (
                <CaseBreakModal
                    product={pendingCaseBreakProduct}
                    onSelect={(selectedProduct) => {
                        addToCart(selectedProduct)
                        setShowCaseBreakModal(false)
                        setPendingCaseBreakProduct(null)
                    }}
                    onClose={() => {
                        setShowCaseBreakModal(false)
                        setPendingCaseBreakProduct(null)
                    }}
                />
            )}

            {/* SMS Receipt Modal */}
            <ReceiptModal
                isOpen={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                transactionData={pendingReceiptData}
                onComplete={() => {
                    setShowReceiptModal(false)
                    setPendingReceiptData(null)
                    setToast({ message: 'Payment successful!', type: 'success' })
                }}
            />

            {/* Quick Switch Modal - Toast POS style employee switching */}
            <QuickSwitchModal
                isOpen={showQuickSwitch}
                onClose={() => setShowQuickSwitch(false)}
                onSwitch={async (employeeId, pin) => {
                    try {
                        const res = await fetch('/api/pos/timeclock/quick-switch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ employeeId, pin })
                        })
                        if (res.ok) {
                            const data = await res.json()
                            // Refresh the page to update session
                            setToast({ message: `Switched to ${data.employee.name}`, type: 'success' })
                            setTimeout(() => window.location.reload(), 500)
                            return true
                        }
                        return false
                    } catch {
                        return false
                    }
                }}
                currentEmployeeId={user?.id}
                storeId={user?.storeId || user?.locationId || ''}
            />
        </div>
    )
}

// Discount Modal Component
function DiscountModal({ item, onApply, onClose }: { item: CartItem; onApply: (discount: number) => void; onClose: () => void }) {
    const [discount, setDiscount] = useState(item.discount?.toString() || '')

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-stone-700">
                <h2 className="text-xl font-bold mb-4">Apply Discount</h2>
                <p className="text-stone-400 mb-4">{item.name}</p>
                <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Discount %"
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg mb-4 text-center text-2xl"
                    autoFocus
                />
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {[5, 10, 15, 20, 25, 30, 50, 100].map(pct => (
                        <button
                            key={pct}
                            onClick={() => setDiscount(pct.toString())}
                            className="py-2 bg-stone-800 hover:bg-orange-500/30 rounded-lg text-sm"
                        >
                            {pct}%
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onClose} className="py-3 bg-stone-800 rounded-lg">Cancel</button>
                    <button onClick={() => onApply(parseFloat(discount) || 0)} className="py-3 bg-orange-500 rounded-lg font-bold">Apply</button>
                </div>
            </div>
        </div>
    )
}

// Quantity Modal Component
function QuantityModal({ item, onApply, onClose }: { item: CartItem; onApply: (qty: number) => void; onClose: () => void }) {
    const [qty, setQty] = useState(item.quantity.toString())

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-stone-700">
                <h2 className="text-xl font-bold mb-4">Change Quantity</h2>
                <p className="text-stone-400 mb-4">{item.name}</p>
                <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg mb-4 text-center text-2xl"
                    autoFocus
                    min="1"
                />
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onClose} className="py-3 bg-stone-800 rounded-lg">Cancel</button>
                    <button onClick={() => onApply(parseInt(qty) || 1)} className="py-3 bg-emerald-500 rounded-lg font-bold">Apply</button>
                </div>
            </div>
        </div>
    )
}

// Price Modal Component
function PriceModal({ item, onApply, onClose }: { item: CartItem; onApply: (price: number) => void; onClose: () => void }) {
    const [price, setPrice] = useState(item.price.toString())

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-stone-700">
                <h2 className="text-xl font-bold mb-4">Change Price</h2>
                <p className="text-stone-400 mb-4">{item.name}</p>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-stone-400">$</span>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-lg mb-4 text-center text-2xl"
                        autoFocus
                        step="0.01"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={onClose} className="py-3 bg-stone-800 rounded-lg">Cancel</button>
                    <button onClick={() => onApply(parseFloat(price) || 0)} className="py-3 bg-pink-500 rounded-lg font-bold">Apply</button>
                </div>
            </div>
        </div>
    )
}

// Search Modal Component with auto-suggest
function SearchModal({ onSelect, onClose }: { onSelect: (product: any) => void; onClose: () => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Auto-search as user types (debounced)
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults([])
            return
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const res = await fetch(`/api/pos/retail/search?q=${encodeURIComponent(query)}`)
                if (res.ok) {
                    const data = await res.json()
                    setResults(Array.isArray(data) ? data : data.products || data.items || [])
                }
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsSearching(false)
            }
        }, 300) // 300ms debounce

        return () => clearTimeout(debounceTimer)
    }, [query])

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-stone-700 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Search Products</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="relative mb-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Start typing to search..."
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg pr-12"
                        autoFocus
                    />
                    {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {results.map((product) => (
                        <button
                            key={product.id}
                            onClick={() => onSelect(product)}
                            className="w-full p-4 bg-stone-800 hover:bg-stone-700 rounded-lg text-left flex justify-between items-center"
                        >
                            <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-stone-400">
                                    {product.barcode && `BC: ${product.barcode}`}
                                    {product.sku && ` | SKU: ${product.sku}`}
                                </p>
                            </div>
                            <span className="text-lg font-bold text-emerald-400">
                                {formatCurrency(parseFloat(product.price))}
                            </span>
                        </button>
                    ))}
                    {results.length === 0 && query.length >= 2 && !isSearching && (
                        <p className="text-center text-stone-500 py-8">No products found</p>
                    )}
                    {query.length < 2 && (
                        <p className="text-center text-stone-500 py-8">Type at least 2 characters to search</p>
                    )}
                </div>
            </div>
        </div>
    )
}

// Station Selection Modal Component
function StationModal({
    stations,
    onSelect,
    onClose
}: {
    stations: any[];
    onSelect: (station: any) => void;
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-2">Select Your Station</h2>
                <p className="text-stone-400 mb-6">Choose which register you're working at:</p>
                <div className="space-y-3">
                    {stations.map((station) => (
                        <button
                            key={station.id}
                            onClick={() => {
                                onSelect(station)
                                onClose()
                            }}
                            className="w-full p-4 bg-stone-800 hover:bg-stone-700 rounded-xl text-left flex items-center gap-4 transition-colors"
                        >
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${station.paymentMode === 'DEDICATED' ? 'bg-green-500/20' : 'bg-amber-500/20'
                                }`}>
                                <span className="text-2xl">
                                    {station.paymentMode === 'DEDICATED' ? '💳' : '💵'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-lg text-stone-100">{station.name}</p>
                                <p className="text-sm text-stone-400">
                                    {station.paymentMode === 'DEDICATED'
                                        ? `Terminal: ${station.dedicatedTerminal?.name || 'Configured'}`
                                        : 'Cash Only'
                                    }
                                </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${station.paymentMode === 'DEDICATED'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                {station.paymentMode === 'DEDICATED' ? 'Card' : 'Cash'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Customer Quick Lookup Modal
function CustomerLookupModal({ onClose, onSelectCustomer }: {
    onClose: () => void
    onSelectCustomer: (customer: any) => void
}) {
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleSearch = async () => {
        if (phone.length < 7) return
        setLoading(true)
        try {
            const res = await fetch(`/api/pos/customer-lookup?phone=${phone}`)
            const data = await res.json()
            setResult(data)
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-md w-full border border-stone-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Customer Lookup</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex gap-2 mb-4">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter phone number..."
                        className="flex-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-lg"
                        autoFocus
                    />
                    <button
                        onClick={handleSearch}
                        disabled={phone.length < 7 || loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-bold"
                    >
                        {loading ? '...' : 'Search'}
                    </button>
                </div>
                {result && (
                    result.found ? (
                        <div className="bg-stone-800 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-lg font-bold text-white">{result.customer.name}</p>
                                    <p className="text-stone-400 text-sm">{result.customer.phone}</p>
                                </div>
                                <button
                                    onClick={() => onSelectCustomer(result.customer)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium"
                                >
                                    Select
                                </button>
                            </div>
                            {result.loyalty && (
                                <div className="flex items-center gap-3 pt-2 border-t border-stone-700">
                                    <span className="text-2xl">⭐</span>
                                    <div>
                                        <p className="font-bold text-amber-400">{result.loyalty.points} Points</p>
                                        <p className="text-xs text-stone-500">Lifetime: {result.loyalty.lifetimePoints}</p>
                                    </div>
                                </div>
                            )}
                            {result.recentPurchases?.length > 0 && (
                                <div className="pt-2 border-t border-stone-700">
                                    <p className="text-xs text-stone-500 mb-2">Recent Purchases</p>
                                    {result.recentPurchases.map((p: any) => (
                                        <div key={p.id} className="flex justify-between text-sm py-1">
                                            <span className="text-stone-400">{new Date(p.date).toLocaleDateString()}</span>
                                            <span className="font-medium">${p.total.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-stone-400">
                            <p>No customer found</p>
                            <p className="text-sm mt-1">for this phone number</p>
                        </div>
                    )
                )}
            </div>
        </div>
    )
}

// Cash Drop Modal
function CashDropModal({ onClose, onSuccess }: {
    onClose: () => void
    onSuccess: () => void
}) {
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)

    const handleDrop = async () => {
        if (!amount || parseFloat(amount) <= 0) return
        setLoading(true)
        try {
            await fetch('/api/drawer-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'CASH_DROP',
                    amount: parseFloat(amount),
                    note: `Cash drop: $${amount}`
                })
            })
            onSuccess()
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">💵 Cash Drop</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-stone-400 mb-4">Enter amount to drop to safe:</p>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-4 bg-stone-800 border border-stone-700 rounded-lg text-center text-3xl font-bold mb-4"
                    autoFocus
                />
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {[20, 50, 100, 200].map(val => (
                        <button
                            key={val}
                            onClick={() => setAmount(val.toString())}
                            className="py-2 bg-stone-800 hover:bg-stone-700 rounded-lg font-medium"
                        >
                            ${val}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleDrop}
                    disabled={!amount || parseFloat(amount) <= 0 || loading}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-bold text-lg"
                >
                    {loading ? 'Recording...' : `Drop $${amount || '0'}`}
                </button>
            </div>
        </div>
    )
}

// Receive Stock Modal
function ReceiveStockModal({ onClose, onSuccess }: {
    onClose: () => void
    onSuccess: () => void
}) {
    const [barcode, setBarcode] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [loading, setLoading] = useState(false)
    const [product, setProduct] = useState<any>(null)

    const lookupProduct = async (code: string) => {
        try {
            const res = await fetch(`/api/inventory/products?barcode=${code}`)
            if (res.ok) {
                const data = await res.json()
                if (data.products?.[0]) {
                    setProduct(data.products[0])
                }
            }
        } catch (e) { }
    }

    const handleReceive = async () => {
        if (!barcode) return
        setLoading(true)
        try {
            const res = await fetch('/api/inventory/quick-receive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barcode,
                    quantity: parseInt(quantity) || 1
                })
            })
            if (res.ok) {
                onSuccess()
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">📦 Receive Stock</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <input
                    type="text"
                    value={barcode}
                    onChange={(e) => {
                        setBarcode(e.target.value)
                        if (e.target.value.length > 5) lookupProduct(e.target.value)
                    }}
                    placeholder="Scan or enter barcode..."
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg mb-3"
                    autoFocus
                />
                {product && (
                    <div className="bg-stone-800 rounded-lg p-3 mb-3">
                        <p className="font-bold">{product.name}</p>
                        <p className="text-sm text-stone-400">Current stock: {product.stock || 0}</p>
                    </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-stone-400">Quantity:</span>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="flex-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-center text-xl"
                    />
                </div>
                <button
                    onClick={handleReceive}
                    disabled={!barcode || loading}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl font-bold"
                >
                    {loading ? 'Receiving...' : `Receive ${quantity} Units`}
                </button>
            </div>
        </div>
    )
}

// Recent Transactions Modal
function RecentTransactionsModal({ transactions: initialTransactions, onClose, onSelectTransaction }: {
    transactions: any[]
    onClose: () => void
    onSelectTransaction: (tx: any) => void
}) {
    const [transactions, setTransactions] = useState(initialTransactions)
    const [search, setSearch] = useState('')
    const [cardLast4, setCardLast4] = useState('')
    const [loading, setLoading] = useState(false)
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'custom' | 'all'>('today')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedTx, setSelectedTx] = useState<any>(null)
    const [actionLoading, setActionLoading] = useState(false)

    // Fetch transactions with filters
    const fetchTransactions = async () => {
        setLoading(true)
        try {
            let url = '/api/franchise/transactions?limit=50'
            if (search) url += `&search=${encodeURIComponent(search)}`

            // Date filtering
            if (dateFilter === 'today') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                url += `&startDate=${today.toISOString()}`
            } else if (dateFilter === 'week') {
                const week = new Date()
                week.setDate(week.getDate() - 7)
                url += `&startDate=${week.toISOString()}`
            } else if (dateFilter === 'custom' && startDate) {
                url += `&startDate=${new Date(startDate).toISOString()}`
                if (endDate) {
                    const end = new Date(endDate)
                    end.setHours(23, 59, 59, 999)
                    url += `&endDate=${end.toISOString()}`
                }
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                let results = data.transactions || []

                // Client-side filter by card last 4 (since it's in JSON)
                if (cardLast4 && cardLast4.length >= 4) {
                    results = results.filter((tx: any) =>
                        tx.cardLast4?.includes(cardLast4) ||
                        tx.paymentDetails?.cardLast4?.includes(cardLast4)
                    )
                }

                setTransactions(results)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTransactions()
    }, [dateFilter, startDate, endDate])

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTransactions()
        }, 300)
        return () => clearTimeout(timer)
    }, [search, cardLast4])

    // Refund handler
    const handleRefund = async (tx: any) => {
        if (!confirm(`Refund $${Number(tx.total).toFixed(2)} for invoice #${tx.invoiceNumber || tx.id.slice(-6)}?`)) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/pos/transaction/${tx.id}/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Customer request' })
            })
            if (res.ok) {
                alert('Refund processed successfully!')
                fetchTransactions()
                setSelectedTx(null)
            } else {
                const data = await res.json()
                alert(data.error || 'Refund failed')
            }
        } catch (e) {
            alert('Refund failed')
        } finally {
            setActionLoading(false)
        }
    }

    // Void handler
    const handleVoid = async (tx: any) => {
        if (!confirm(`Void transaction #${tx.invoiceNumber || tx.id.slice(-6)}? This cannot be undone.`)) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/pos/transaction/${tx.id}/void`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Manager void' })
            })
            if (res.ok) {
                alert('Transaction voided!')
                fetchTransactions()
                setSelectedTx(null)
            } else {
                const data = await res.json()
                alert(data.error || 'Void failed')
            }
        } catch (e) {
            alert('Void failed')
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl w-full max-w-2xl border border-stone-700 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-gradient-to-r from-purple-600/20 to-stone-900">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-400" />
                        Transaction History
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="p-3 border-b border-stone-800 space-y-2">
                    {/* Search Row */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search invoice #, amount..."
                                className="w-full pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                        <div className="relative w-28">
                            <CreditCard className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <input
                                type="text"
                                value={cardLast4}
                                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="Card ****"
                                maxLength={4}
                                className="w-full pl-8 pr-2 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none text-center font-mono"
                            />
                        </div>
                    </div>

                    {/* Date Filter Row */}
                    <div className="flex gap-2 flex-wrap">
                        {(['today', 'week', 'custom', 'all'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setDateFilter(filter)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${dateFilter === filter
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                    }`}
                            >
                                {filter === 'today' ? 'Today' : filter === 'week' ? 'Week' : filter === 'custom' ? 'Date Range' : 'All'}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Range */}
                    {dateFilter === 'custom' && (
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                            />
                            <span className="text-stone-500 text-sm">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Transactions List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        </div>
                    ) : (Array.isArray(transactions) ? transactions : []).length > 0 ? (
                        (Array.isArray(transactions) ? transactions : []).map((tx) => (
                            <div
                                key={tx.id}
                                className={`p-3 rounded-xl transition-all cursor-pointer ${selectedTx?.id === tx.id
                                    ? 'bg-purple-500/20 border border-purple-500'
                                    : 'bg-stone-800 hover:bg-stone-700 border border-transparent'
                                    }`}
                                onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-white text-lg">
                                            ${Number(tx.total).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-stone-400">
                                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-stone-500">#{tx.invoiceNumber || tx.id.slice(-8)}</p>
                                        <div className="flex gap-1 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.paymentMethod === 'CASH' ? 'bg-green-500/20 text-green-400' :
                                                tx.paymentMethod === 'CREDIT_CARD' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-stone-600/20 text-stone-400'
                                                }`}>
                                                {tx.paymentMethod?.replace('_', ' ')}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                tx.status === 'REFUNDED' ? 'bg-red-500/20 text-red-400' :
                                                    tx.status === 'VOIDED' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-stone-600/20 text-stone-400'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Actions */}
                                {selectedTx?.id === tx.id && tx.status === 'COMPLETED' && (
                                    <div className="mt-3 pt-3 border-t border-stone-700 grid grid-cols-3 gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRefund(tx) }}
                                            disabled={actionLoading}
                                            className="flex items-center justify-center gap-1 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-xs font-medium disabled:opacity-50"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Refund
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleVoid(tx) }}
                                            disabled={actionLoading}
                                            className="flex items-center justify-center gap-1 py-2 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded-lg text-xs font-medium disabled:opacity-50"
                                        >
                                            <Ban className="h-3 w-3" />
                                            Void
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); window.print() }}
                                            className="flex items-center justify-center gap-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg text-xs font-medium"
                                        >
                                            <Printer className="h-3 w-3" />
                                            Reprint
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-stone-400">
                            <p>No transactions found</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-stone-800 text-center text-xs text-stone-500">
                    Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    )
}

// Case Break Modal - Single vs 6-Pack vs Case selection
function CaseBreakModal({ product, onSelect, onClose }: {
    product: any
    onSelect: (product: any) => void
    onClose: () => void
}) {
    const singlePrice = parseFloat(product.price)
    const casePrice = product.casePrice ? parseFloat(product.casePrice) : singlePrice * product.unitsPerCase * 0.9
    const sixPackPrice = singlePrice * 6 * 0.95 // 5% discount for 6-pack
    const unitsPerCase = product.unitsPerCase || 12

    const handleSelect = (type: 'single' | 'sixpack' | 'case') => {
        const selectedProduct = { ...product }

        if (type === 'single') {
            selectedProduct.name = `${product.name} (Single)`
            selectedProduct.price = singlePrice
        } else if (type === 'sixpack') {
            selectedProduct.name = `${product.name} (6-Pack)`
            selectedProduct.price = sixPackPrice
        } else {
            selectedProduct.name = `${product.name} (Case of ${unitsPerCase})`
            selectedProduct.price = casePrice
        }

        onSelect(selectedProduct)
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl w-full max-w-md border border-stone-700 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-stone-800 bg-gradient-to-r from-amber-600 to-orange-600">
                    <h2 className="text-xl font-bold">How are you selling this?</h2>
                    <p className="text-amber-100">{product.name}</p>
                </div>

                {/* Options */}
                <div className="p-4 space-y-3">
                    {/* Single */}
                    <button
                        onClick={() => handleSelect('single')}
                        className="w-full flex items-center justify-between p-4 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🍺</span>
                            <div className="text-left">
                                <p className="font-bold text-lg">Single</p>
                                <p className="text-sm text-stone-400">1 unit</p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">${singlePrice.toFixed(2)}</p>
                    </button>

                    {/* 6-Pack */}
                    <button
                        onClick={() => handleSelect('sixpack')}
                        className="w-full flex items-center justify-between p-4 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors border-2 border-blue-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🍻</span>
                            <div className="text-left">
                                <p className="font-bold text-lg">6-Pack</p>
                                <p className="text-sm text-blue-400">Save 5%</p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">${sixPackPrice.toFixed(2)}</p>
                    </button>

                    {/* Case */}
                    <button
                        onClick={() => handleSelect('case')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 rounded-xl transition-colors border-2 border-purple-500/50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📦</span>
                            <div className="text-left">
                                <p className="font-bold text-lg">Full Case</p>
                                <p className="text-sm text-purple-400">{unitsPerCase} units • Best Value!</p>
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-purple-400">${casePrice.toFixed(2)}</p>
                    </button>
                </div>

                {/* Cancel */}
                <div className="p-4 border-t border-stone-800">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}


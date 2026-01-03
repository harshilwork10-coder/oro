'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Users,
    RefreshCw,
    Zap,
    ChevronDown,
    Store,
    BarChart3,
    AlertTriangle,
    LogOut,
    Search,
    Plus,
    X,
    Edit3,
    Check,
    Download,
    Bell
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with camera
const BarcodeScanner = dynamic(() => import('@/components/pulse/BarcodeScanner'), { ssr: false })
const NumberPadModal = dynamic(() => import('@/components/pulse/NumberPadModal'), { ssr: false })

interface Location {
    id: string
    name: string
}

interface StoreBreakdown {
    id: string
    name: string
    todaySales: number
    transactionCount: number
}

interface LiveStats {
    todaySales: number
    yesterdaySales: number
    weekSales: number
    transactionCount: number
    averageTicket: number
}

interface TopSeller {
    name: string
    quantity: number
    revenue: number
}

interface LowStockItem {
    id: string
    name: string
    stock: number
    location: string
}

interface EmployeeOnClock {
    name: string
    location: string
    since: string
}

interface LotteryStats {
    sales: number
    payouts: number
    net: number
    salesCount: number
    payoutsCount: number
    topGames: { name: string; price: number; sold: number; revenue: number }[]
}

interface Product {
    id: string
    name: string
    sku: string
    barcode: string
    price: number
    costPrice: number
    stock: number
    location: string
    locationId: string | null
    category: string
}

type TabType = 'sales' | 'lottery' | 'inventory' | 'reports'

export default function OroPulsePage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState<boolean | null>(null)

    // Data state
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>('all')
    const [showLocationDropdown, setShowLocationDropdown] = useState(false)
    const [stats, setStats] = useState<LiveStats>({ todaySales: 0, yesterdaySales: 0, weekSales: 0, transactionCount: 0, averageTicket: 0 })
    const [storeBreakdown, setStoreBreakdown] = useState<StoreBreakdown[]>([])
    const [topSellers, setTopSellers] = useState<TopSeller[]>([])
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
    const [employeesOnClock, setEmployeesOnClock] = useState<EmployeeOnClock[]>([])

    // Inventory state
    const [products, setProducts] = useState<Product[]>([])
    const [invSearch, setInvSearch] = useState('')
    const [invLoading, setInvLoading] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [newProduct, setNewProduct] = useState({ name: '', price: '', costPrice: '', stock: '', barcode: '', category: '' })
    const [lookingUpBarcode, setLookingUpBarcode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [padField, setPadField] = useState<{ field: 'price' | 'costPrice' | 'stock' | 'newPrice' | 'newCostPrice' | 'newStock', isDecimal: boolean } | null>(null)
    const [stockAdjust, setStockAdjust] = useState<{ mode: 'add' | 'remove', amount: string } | null>(null)
    const [departments, setDepartments] = useState<{ id: string, name: string, icon?: string, color?: string, productCount?: number }[]>([])
    const [selectedDept, setSelectedDept] = useState<string | null>(null) // null = show departments, string = show products in dept

    // Reports state
    interface OpenDrawer { id: string; currentCash: number; location: string; openedBy: string }
    const [openDrawers, setOpenDrawers] = useState<OpenDrawer[]>([])
    const [paymentBreakdown, setPaymentBreakdown] = useState({ cash: 0, card: 0, other: 0 })
    const [voidCount, setVoidCount] = useState(0)
    const [refundCount, setRefundCount] = useState(0)
    // Report date filters
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]) // For daily
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)) // For monthly/CPA (YYYY-MM)
    const [totalSalesReport, setTotalSalesReport] = useState(0)
    const [taxCollected, setTaxCollected] = useState(0)
    const [lotteryStats, setLotteryStats] = useState<LotteryStats>({ sales: 0, payouts: 0, net: 0, salesCount: 0, payoutsCount: 0, topGames: [] })

    // UI state
    const [activeTab, setActiveTab] = useState<TabType>('sales')
    const [lastRefresh, setLastRefresh] = useState(new Date())

    // PWA Install state
    const [installPrompt, setInstallPrompt] = useState<any>(null)
    const [isInstalled, setIsInstalled] = useState(false)

    // Listen for PWA install prompt
    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!installPrompt) {
            // Fallback for iOS or when prompt not available
            alert('To install: Tap the Share button (iOS) or Menu → Install App (Android)')
            return
        }
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') {
            setIsInstalled(true)
            setInstallPrompt(null)
        }
    }

    // Allowed locations for filtering (null = all)
    const [allowedLocationIds, setAllowedLocationIds] = useState<string[] | null>(null)

    // Check access on mount
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await fetch('/api/pulse/access')
                const data = await res.json()
                if (!data.hasAccess) {
                    window.location.href = '/pulse/upgrade'
                    return
                }
                setHasAccess(true)
                // Store allowed locations from API
                if (data.allowedLocationIds && Array.isArray(data.allowedLocationIds)) {
                    setAllowedLocationIds(data.allowedLocationIds)
                }
            } catch (e) {
                console.error('Access check failed:', e)
                setHasAccess(true)
            }
        }
        checkAccess()
    }, [])

    useEffect(() => {
        if (hasAccess) {
            fetchData()
            const interval = setInterval(fetchData, 30000)
            return () => clearInterval(interval)
        }
    }, [hasAccess, selectedLocation])

    // Fetch departments when switching to inventory tab, fetch products when dept selected or search changes
    useEffect(() => {
        if (activeTab === 'inventory' && hasAccess) {
            if (!selectedDept) {
                // Show departments first
                fetchDepartments()
            } else {
                // Fetch products for selected department
                fetchInventory(selectedDept === 'all' ? undefined : selectedDept)
            }
        }
    }, [activeTab, invSearch, selectedLocation, hasAccess, selectedDept])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/pulse/live?locationId=${selectedLocation}`)
            if (res.ok) {
                const data = await res.json()
                // Filter locations by allowed list if set
                let availableLocations = data.locations || []
                if (allowedLocationIds && allowedLocationIds.length > 0) {
                    availableLocations = availableLocations.filter((loc: Location) =>
                        allowedLocationIds.includes(loc.id)
                    )
                }
                setLocations(availableLocations)
                setStats(data.stats || { todaySales: 0, yesterdaySales: 0, weekSales: 0, transactionCount: 0, averageTicket: 0 })
                setStoreBreakdown(data.storeBreakdown || [])
                setTopSellers(data.topSellers || [])
                setLowStockItems(data.lowStockItems || [])
                setEmployeesOnClock(data.employeesOnClock || [])
            }
            // Also fetch reports data for cash drawer
            const reportsRes = await fetch(`/api/pulse/reports?locationId=${selectedLocation}`)
            if (reportsRes.ok) {
                const reportsData = await reportsRes.json()
                setOpenDrawers(reportsData.openDrawers || [])
                setPaymentBreakdown(reportsData.paymentBreakdown || { cash: 0, card: 0, other: 0 })
                setVoidCount(reportsData.voidCount || 0)
                setRefundCount(reportsData.refundCount || 0)
                setTotalSalesReport(reportsData.totalSales || 0)
                setTaxCollected(reportsData.taxCollected || 0)
                setLotteryStats(reportsData.lottery || { sales: 0, payouts: 0, net: 0, salesCount: 0, payoutsCount: 0, topGames: [] })
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
            setLastRefresh(new Date())
        }
    }

    const fetchInventory = async (deptFilter?: string) => {
        setInvLoading(true)
        try {
            // Build query - add category filter if department is selected
            let url = `/api/pulse/inventory?search=${invSearch}&locationId=${selectedLocation}`
            if (deptFilter) {
                url += `&category=${encodeURIComponent(deptFilter)}`
            }
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setProducts(data.products || [])
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error)
        } finally {
            setInvLoading(false)
        }
    }

    const fetchDepartments = async () => {
        try {
            // First try departments endpoint
            const deptRes = await fetch('/api/inventory/departments')
            if (deptRes.ok) {
                const data = await deptRes.json()
                if (data.departments && data.departments.length > 0) {
                    setDepartments(data.departments.map((d: { id: string, name: string, icon?: string, color?: string, _count?: { products: number } }) => ({
                        id: d.id,
                        name: d.name,
                        icon: d.icon,
                        color: d.color,
                        productCount: d._count?.products || 0
                    })))
                    return
                }
            }
            // Fallback: get unique categories from products
            const catRes = await fetch('/api/pulse/inventory?limit=1000')
            if (catRes.ok) {
                const data = await catRes.json()
                const categories = [...new Set((data.products || []).map((p: { category: string }) => p.category))]
                    .filter(Boolean)
                    .map((cat, i) => ({
                        id: `cat-${i}`,
                        name: cat as string,
                        productCount: (data.products || []).filter((p: { category: string }) => p.category === cat).length
                    }))
                setDepartments(categories.length > 0 ? categories : [{ id: 'all', name: 'All Products', productCount: data.products?.length || 0 }])
            }
        } catch (error) {
            console.error('Failed to fetch departments:', error)
        }
    }

    const updateProduct = async (id: string, updates: Partial<Product>) => {
        setSaving(true)
        try {
            const res = await fetch('/api/pulse/inventory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: id, ...updates })
            })
            if (res.ok) {
                setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p))
                setEditingProduct(null)
            }
        } catch (error) {
            console.error('Failed to update:', error)
        } finally {
            setSaving(false)
        }
    }

    // Barcode lookup to auto-fill product details
    const lookupBarcode = async (barcode: string) => {
        if (!barcode || barcode.length < 8) return

        setLookingUpBarcode(true)
        try {
            const res = await fetch(`/api/catalog/lookup?barcode=${encodeURIComponent(barcode)}`)
            if (res.ok) {
                const data = await res.json()
                if (data.found && data.product) {
                    const p = data.product
                    setNewProduct(prev => ({
                        ...prev,
                        name: p.name || prev.name,
                        price: p.defaultPrice > 0 ? p.defaultPrice.toString() : prev.price,
                        category: p.category || prev.category,
                        // Keep existing values if API doesn't provide them
                        costPrice: prev.costPrice,
                        stock: prev.stock
                    }))
                    // Show success feedback
                    console.log(`[BARCODE] Found: ${p.name} (${data.source})`)
                }
            }
        } catch (error) {
            console.error('[BARCODE] Lookup error:', error)
        } finally {
            setLookingUpBarcode(false)
        }
    }

    const addProduct = async () => {
        if (!newProduct.name || !newProduct.price) {
            alert('Product name and price are required')
            return
        }
        setSaving(true)
        try {
            const res = await fetch('/api/pulse/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price) || 0,
                    costPrice: parseFloat(newProduct.costPrice) || 0,
                    stock: parseInt(newProduct.stock) || 0,
                    barcode: newProduct.barcode || null,
                    category: newProduct.category || 'General',
                    locationId: selectedLocation !== 'all' ? selectedLocation : null
                })
            })
            if (res.ok) {
                setShowAddModal(false)
                setNewProduct({ name: '', price: '', costPrice: '', stock: '', barcode: '', category: '' })
                fetchInventory()
            } else {
                const data = await res.json()
                alert('Error adding product: ' + (data.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Failed to add:', error)
            alert('Failed to add product. Check console for details.')
        } finally {
            setSaving(false)
        }
    }

    const vsYesterday = stats.yesterdaySales > 0
        ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales * 100)
        : 0
    const isUp = vsYesterday >= 0

    const selectedLocationName = selectedLocation === 'all'
        ? 'All Stores'
        : locations.find(l => l.id === selectedLocation)?.name || 'Store'

    // Push Notification state and handlers
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [notificationLoading, setNotificationLoading] = useState(false)

    // Check notification status on mount
    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setNotificationsEnabled(Notification.permission === 'granted')
        }
    }, [])

    const handleNotificationToggle = async () => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            alert('Notifications not supported in this browser')
            return
        }

        setNotificationLoading(true)
        try {
            if (notificationsEnabled) {
                // Unsubscribe
                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.getSubscription()
                if (subscription) {
                    await subscription.unsubscribe()
                    await fetch('/api/notifications/subscribe', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: subscription.endpoint })
                    })
                }
                setNotificationsEnabled(false)
            } else {
                // Subscribe
                const permission = await Notification.requestPermission()
                if (permission !== 'granted') {
                    alert('Please allow notifications to receive alerts')
                    return
                }

                const res = await fetch('/api/notifications/subscribe')
                const { vapidPublicKey } = await res.json()

                if (!vapidPublicKey) {
                    alert('Push notifications not configured on server')
                    return
                }

                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidPublicKey
                })

                await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscription: subscription.toJSON(),
                        deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone' :
                            navigator.userAgent.includes('Android') ? 'Android' : 'Browser'
                    })
                })
                setNotificationsEnabled(true)
            }
        } catch (error) {
            console.error('Notification toggle error:', error)
            alert('Failed to toggle notifications')
        } finally {
            setNotificationLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-sm">O</div>
                    <div>
                        <h1 className="text-base font-bold flex items-center gap-1">
                            <span className="text-orange-500">OroNext</span>
                            <span className="text-gray-300">Pulse</span>
                            <Zap className="w-3 h-3 text-yellow-400" />
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Notification Toggle */}
                    <button
                        onClick={handleNotificationToggle}
                        disabled={notificationLoading}
                        className={`p-2 rounded-full transition-colors ${notificationsEnabled
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400'} active:scale-95`}
                        title={notificationsEnabled ? 'Notifications ON' : 'Enable Notifications'}
                    >
                        <Bell className={`w-4 h-4 ${notificationLoading ? 'animate-pulse' : ''}`} />
                    </button>
                    {!isInstalled && (
                        <button
                            onClick={handleInstallClick}
                            className="p-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 active:scale-95 transition-transform"
                            title="Install App"
                        >
                            <Download className="w-4 h-4 text-white" />
                        </button>
                    )}
                    <button onClick={fetchData} className="p-2 rounded-full bg-gray-800 active:bg-gray-700">
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-2 rounded-full bg-gray-800 active:bg-gray-700">
                        <LogOut className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Store Selector */}
            {locations.length > 1 && (
                <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <button
                        onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                        className="w-full flex items-center justify-between bg-gray-700/50 rounded-xl px-4 py-2 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-orange-400" />
                            <span>{selectedLocationName}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showLocationDropdown && (
                        <div className="mt-2 bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                            <button
                                onClick={() => { setSelectedLocation('all'); setShowLocationDropdown(false) }}
                                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${selectedLocation === 'all' ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-gray-700'}`}
                            >
                                <Store className="w-4 h-4" />
                                All Stores
                            </button>
                            {locations.map(loc => (
                                <button
                                    key={loc.id}
                                    onClick={() => { setSelectedLocation(loc.id); setShowLocationDropdown(false) }}
                                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 border-t border-gray-700 ${selectedLocation === loc.id ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-gray-700'}`}
                                >
                                    <Store className="w-4 h-4" />
                                    {loc.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
                {/* SALES TAB */}
                {activeTab === 'sales' && (
                    <>
                        {/* Live Sales Card */}
                        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 rounded-2xl p-4 mb-4 shadow-lg">
                            <p className="text-orange-100 text-xs font-medium uppercase">Today's Sales</p>
                            <p className="text-3xl font-black text-white mt-1">
                                ${stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-semibold ${isUp ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'}`}>
                                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>{isUp ? '+' : ''}{vsYesterday.toFixed(1)}% vs yesterday</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20 text-center text-sm">
                                <div>
                                    <p className="text-orange-200 text-[10px]">ORDERS</p>
                                    <p className="font-bold">{stats.transactionCount}</p>
                                </div>
                                <div>
                                    <p className="text-orange-200 text-[10px]">AVG TICKET</p>
                                    <p className="font-bold">${stats.averageTicket.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p className="text-orange-200 text-[10px]">THIS WEEK</p>
                                    <p className="font-bold">${(stats.weekSales / 1000).toFixed(1)}k</p>
                                </div>
                            </div>
                        </div>

                        {/* Per-Store Breakdown */}
                        {storeBreakdown.length > 1 && (
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Store className="w-4 h-4 text-orange-400" />
                                    By Store
                                </h3>
                                <div className="space-y-2">
                                    {storeBreakdown.map(store => (
                                        <div key={store.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                            <div>
                                                <p className="text-white text-sm font-medium">{store.name}</p>
                                                <p className="text-gray-500 text-xs">{store.transactionCount} orders</p>
                                            </div>
                                            <p className="text-green-400 font-bold">${store.todaySales.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Who's Working */}
                        {employeesOnClock.length > 0 && (
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-400" />
                                    On Clock ({employeesOnClock.length})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {employeesOnClock.map((emp, idx) => (
                                        <div key={idx} className="bg-blue-900/30 border border-blue-500/30 rounded-lg px-3 py-2">
                                            <p className="text-white text-sm">{emp.name}</p>
                                            <p className="text-blue-300 text-xs">{emp.location} • {emp.since}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Sellers */}
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-green-400" />
                                Top Sellers Today
                            </h3>
                            {topSellers.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">No sales yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {topSellers.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-gray-600'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm">{item.name}</span>
                                            </div>
                                            <span className="text-green-400 text-sm font-medium">${item.revenue.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cash vs Card - Payment Breakdown */}
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                💵 Payment Breakdown
                            </h3>
                            {(() => {
                                const total = paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.other
                                const cashPct = total > 0 ? (paymentBreakdown.cash / total) * 100 : 0
                                const cardPct = total > 0 ? (paymentBreakdown.card / total) * 100 : 0
                                return (
                                    <>
                                        <div className="h-4 rounded-full overflow-hidden bg-gray-700 flex mb-2">
                                            <div className="bg-green-500 h-full" style={{ width: `${cashPct}%` }} title="Cash" />
                                            <div className="bg-blue-500 h-full" style={{ width: `${cardPct}%` }} title="Card" />
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                Cash ${paymentBreakdown.cash.toFixed(2)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                Card ${paymentBreakdown.card.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs">
                                            <span className="text-gray-400">Tax Collected</span>
                                            <span className="text-purple-400 font-bold">${taxCollected.toFixed(2)}</span>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>

                        {/* Void/Refund Alerts */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className={`rounded-xl p-4 border text-center ${voidCount > 0 ? 'bg-red-900/30 border-red-500/50' : 'bg-gray-800/50 border-gray-700'}`}>
                                <p className="text-gray-400 text-xs mb-1">🚫 VOIDS</p>
                                <p className={`text-2xl font-bold ${voidCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{voidCount}</p>
                            </div>
                            <div className={`rounded-xl p-4 border text-center ${refundCount > 0 ? 'bg-orange-900/30 border-orange-500/50' : 'bg-gray-800/50 border-gray-700'}`}>
                                <p className="text-gray-400 text-xs mb-1">↩️ REFUNDS</p>
                                <p className={`text-2xl font-bold ${refundCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>{refundCount}</p>
                            </div>
                        </div>

                        {/* Cash Drawer Status */}
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                💰 Cash in Drawer
                            </h3>
                            {openDrawers.length > 0 ? (
                                <div className="space-y-2">
                                    {openDrawers.slice(0, 3).map((drawer, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                            <div>
                                                <p className="text-white text-sm font-medium">{drawer.location}</p>
                                                <p className="text-gray-400 text-xs">{drawer.openedBy}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-green-400 font-bold text-lg">${drawer.currentCash.toFixed(2)}</p>
                                                <p className="text-gray-500 text-xs">Open</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-2xl font-bold text-gray-500">--</p>
                                    <p className="text-gray-500 text-xs">No drawers open</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* INVENTORY TAB */}
                {activeTab === 'inventory' && (
                    <>
                        {/* Department view or Product view */}
                        {!selectedDept ? (
                            <>
                                {/* Header when viewing departments */}
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-white">📦 Departments</h2>
                                    <button
                                        onClick={() => { setSelectedDept('all'); fetchInventory(); }}
                                        className="text-sm text-orange-400 hover:text-orange-300"
                                    >
                                        View All Products →
                                    </button>
                                </div>

                                {/* Department Cards Grid */}
                                {departments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-500 mb-2" />
                                        <p className="text-gray-500 text-sm">Loading departments...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {departments.map(dept => (
                                            <button
                                                key={dept.id}
                                                onClick={() => {
                                                    setSelectedDept(dept.name);
                                                    fetchInventory(dept.name === 'All Products' ? undefined : dept.name);
                                                }}
                                                className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 text-left hover:border-orange-500 transition-all active:scale-95"
                                            >
                                                <div className="text-3xl mb-2">{dept.icon || '📁'}</div>
                                                <p className="text-white font-semibold text-sm truncate">{dept.name}</p>
                                                <p className="text-gray-500 text-xs">{dept.productCount || 0} products</p>
                                            </button>
                                        ))}
                                        {/* Add Product button */}
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-600/50 rounded-xl p-4 text-left hover:border-green-500 transition-all active:scale-95"
                                        >
                                            <div className="text-3xl mb-2">➕</div>
                                            <p className="text-green-400 font-semibold text-sm">Add Product</p>
                                            <p className="text-gray-500 text-xs">Add new item</p>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Back button + Department name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <button
                                        onClick={() => { setSelectedDept(null); setProducts([]); }}
                                        className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 active:scale-95"
                                    >
                                        <ChevronDown className="w-5 h-5 text-gray-400 rotate-90" />
                                    </button>
                                    <h2 className="text-lg font-bold text-white flex-1">
                                        {selectedDept === 'all' ? '📦 All Products' : `📁 ${selectedDept}`}
                                    </h2>
                                </div>

                                {/* Search, Scan & Add */}
                                <div className="flex gap-2 mb-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={invSearch}
                                            onChange={(e) => setInvSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="px-4 py-3 bg-orange-600 rounded-xl flex items-center active:scale-95"
                                        title="Scan Barcode"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 5h2v14H3zM7 5h1v14H7zM11 5h2v14h-2zM15 5h1v14h-1zM19 5h2v14h-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-4 py-3 bg-green-600 rounded-xl flex items-center active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Low Stock Alert */}
                                {lowStockItems.length > 0 && (
                                    <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                            <span className="text-red-400 text-sm font-medium">{lowStockItems.length} items low stock</span>
                                        </div>
                                    </div>
                                )}

                                {/* Product List */}
                                {invLoading ? (
                                    <div className="text-center py-8">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-500" />
                                    </div>
                                ) : products.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No products in this category</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {products.map(product => (
                                            <div
                                                key={product.id}
                                                className={`bg-gray-800/50 border rounded-xl p-3 ${product.stock <= 5 ? 'border-red-500/50' : 'border-gray-700'}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-white font-medium text-sm">{product.name}</p>
                                                        <p className="text-gray-500 text-xs">
                                                            {product.sku && `SKU: ${product.sku} • `}
                                                            {product.category}
                                                            {product.location && ` • ${product.location}`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditingProduct(product)}
                                                        className="p-2 text-gray-400 hover:text-white"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                                                    <div className="flex gap-4 text-sm">
                                                        <span className="text-green-400 font-bold">${product.price.toFixed(2)}</span>
                                                        {product.costPrice > 0 && (
                                                            <span className="text-gray-500">Cost: ${product.costPrice.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                    <span className={`font-bold ${product.stock <= 5 ? 'text-red-400' : 'text-blue-400'}`}>
                                                        {product.stock} in stock
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* LOTTERY TAB - Full Lottery Management */}
                {activeTab === 'lottery' && (
                    <>
                        {/* Lottery Summary Header */}
                        <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 rounded-2xl p-4 mb-4 shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-purple-100 text-xs font-medium uppercase">🎰 Lottery Today</p>
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white">Separate Accounting</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-purple-200 text-[10px]">TICKETS SOLD</p>
                                    <p className="text-xl font-black text-white">+${lotteryStats.sales.toFixed(2)}</p>
                                    <p className="text-purple-300 text-[10px]">{lotteryStats.salesCount} sales</p>
                                </div>
                                <div>
                                    <p className="text-purple-200 text-[10px]">PAYOUTS</p>
                                    <p className="text-xl font-black text-red-300">-${lotteryStats.payouts.toFixed(2)}</p>
                                    <p className="text-purple-300 text-[10px]">{lotteryStats.payoutsCount} winners</p>
                                </div>
                                <div>
                                    <p className="text-purple-200 text-[10px]">NET</p>
                                    <p className={`text-xl font-black ${lotteryStats.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {lotteryStats.net >= 0 ? '+' : ''}${lotteryStats.net.toFixed(2)}
                                    </p>
                                    <p className="text-purple-300 text-[10px]">Cash Flow</p>
                                </div>
                            </div>
                        </div>

                        {/* Scratch Tickets Sold */}
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-300">
                                🎟️ Scratch Tickets Sold
                            </h3>
                            {lotteryStats.topGames && lotteryStats.topGames.length > 0 ? (
                                <div className="space-y-2">
                                    {lotteryStats.topGames.map((game, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-purple-500/10 rounded-lg px-3 py-3 border border-purple-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                                                    <span className="text-purple-300 font-bold">${game.price}</span>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{game.name}</p>
                                                    <p className="text-gray-400 text-xs">${game.price} per ticket</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-green-400 font-bold">{game.sold}</p>
                                                <p className="text-gray-500 text-xs">sold</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <span className="text-4xl">🎟️</span>
                                    <p className="text-gray-500 mt-2">No scratch tickets sold today</p>
                                </div>
                            )}
                        </div>

                        {/* Recent Lottery Transactions */}
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-300">
                                📜 Recent Activity
                            </h3>
                            {(lotteryStats.salesCount > 0 || lotteryStats.payoutsCount > 0) ? (
                                <div className="space-y-2">
                                    {/* Show combined activity - sales and payouts */}
                                    <div className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400">💵</span>
                                            <span className="text-white text-sm">Ticket Sales</span>
                                        </div>
                                        <span className="text-green-400 font-bold">{lotteryStats.salesCount} transactions</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-400">🏆</span>
                                            <span className="text-white text-sm">Winner Payouts</span>
                                        </div>
                                        <span className="text-red-400 font-bold">{lotteryStats.payoutsCount} payouts</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-4">No lottery activity today</p>
                            )}
                        </div>

                        {/* Lottery Quick Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button className="bg-green-600/20 border border-green-500/30 rounded-xl p-4 text-center active:scale-95 transition-transform">
                                <span className="text-2xl">🎫</span>
                                <p className="text-green-400 font-medium mt-1 text-sm">Sell Ticket</p>
                                <p className="text-gray-500 text-xs">Record sale</p>
                            </button>
                            <button className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 text-center active:scale-95 transition-transform">
                                <span className="text-2xl">🏆</span>
                                <p className="text-red-400 font-medium mt-1 text-sm">Pay Winner</p>
                                <p className="text-gray-500 text-xs">Record payout</p>
                            </button>
                        </div>
                    </>
                )}
                {/* REPORTS TAB - Downloadable PDFs */}
                {activeTab === 'reports' && (
                    <>
                        <div className="text-center mb-4">
                            <BarChart3 className="w-10 h-10 mx-auto mb-2 text-orange-500" />
                            <h2 className="text-lg font-bold text-white">Download Reports</h2>
                        </div>

                        {/* Date Filters */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                            <p className="text-gray-400 text-xs uppercase mb-3">📅 Select Report Date</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Daily / Weekly</label>
                                    <input
                                        type="date"
                                        value={reportDate}
                                        onChange={(e) => setReportDate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Month</label>
                                    <input
                                        type="month"
                                        value={reportMonth}
                                        onChange={(e) => setReportMonth(e.target.value)}
                                        max={new Date().toISOString().slice(0, 7)}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Report Options */}
                        <div className="space-y-2">
                            {/* Daily Report */}
                            <button
                                onClick={() => window.open(`/api/reports/daily?date=${reportDate}&print=true`, '_blank')}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center">
                                        <span className="text-lg">📊</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">Daily Report</p>
                                        <p className="text-gray-400 text-xs">{new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* Weekly Report */}
                            <button
                                onClick={() => window.open(`/api/reports/weekly?endDate=${reportDate}&print=true`, '_blank')}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <span className="text-lg">📅</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">Weekly Report</p>
                                        <p className="text-gray-400 text-xs">7 days ending {new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* Monthly Report */}
                            <button
                                onClick={() => window.open(`/api/reports/monthly?month=${reportMonth}&print=true`, '_blank')}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <span className="text-lg">📈</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">Monthly Report</p>
                                        <p className="text-gray-400 text-xs">{new Date(reportMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* Shift Reports */}
                            <button
                                onClick={() => window.open(`/api/reports/shifts?endDate=${reportDate}&print=true`, '_blank')}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                        <span className="text-lg">👤</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">Shift Reports</p>
                                        <p className="text-gray-400 text-xs">7 days ending {new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* Lottery Report */}
                            <button
                                onClick={() => window.open(`/api/reports/lottery?endDate=${reportDate}&print=true`, '_blank')}
                                className="w-full bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <span className="text-lg">🎰</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">Lottery Report</p>
                                        <p className="text-purple-300 text-xs">7 days ending {new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-purple-400" />
                            </button>

                            {/* Inventory Report */}
                            <button
                                onClick={() => window.open('/api/reports/inventory?print=true', '_blank')}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                                        <span className="text-lg">📦</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">Inventory Report</p>
                                        <p className="text-gray-400 text-xs">Current stock levels</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* CPA Monthly Tax Report */}
                            <button
                                onClick={() => window.open(`/api/reports/cpa-monthly?month=${reportMonth}&print=true`, '_blank')}
                                className="w-full bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <span className="text-lg">🧾</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium text-sm">CPA Monthly Report</p>
                                        <p className="text-emerald-300 text-xs">{new Date(reportMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <Download className="w-4 h-4 text-emerald-400" />
                            </button>
                        </div>

                        {/* Quick Stats Summary */}
                        <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                            <p className="text-gray-400 text-xs uppercase mb-2">Quick Summary</p>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-xl font-bold text-green-400">${stats.todaySales.toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs">Today</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-blue-400">${stats.weekSales.toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs">This Week</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Last Updated */}
                <div className="text-center text-gray-600 text-xs mt-4" suppressHydrationWarning>
                    Updated: {lastRefresh.toLocaleTimeString()}
                </div>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 border-t border-gray-700 sm:border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Edit Product</h3>
                            <button onClick={() => setEditingProduct(null)} className="p-2">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">{editingProduct.name}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Price ($)</label>
                                <button
                                    onClick={() => setPadField({ field: 'price', isDecimal: true })}
                                    className="w-full mt-1 px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-xl font-bold text-left text-green-400 active:bg-gray-700"
                                >
                                    ${editingProduct.price.toFixed(2)}
                                </button>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Cost Price ($)</label>
                                <button
                                    onClick={() => setPadField({ field: 'costPrice', isDecimal: true })}
                                    className="w-full mt-1 px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-xl font-bold text-left text-blue-400 active:bg-gray-700"
                                >
                                    ${editingProduct.costPrice.toFixed(2)}
                                </button>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Stock Quantity</label>
                                <p className="text-2xl font-bold text-orange-400 mt-1 mb-3">{editingProduct.stock}</p>

                                {/* Quick Adjust */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setStockAdjust({ mode: 'add', amount: '' })}
                                        className="py-3 bg-green-600/30 border border-green-500/50 rounded-xl text-green-400 font-bold flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <span className="text-lg">+</span> Add Stock
                                    </button>
                                    <button
                                        onClick={() => setStockAdjust({ mode: 'remove', amount: '' })}
                                        className="py-3 bg-red-600/30 border border-red-500/50 rounded-xl text-red-400 font-bold flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <span className="text-lg">-</span> Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => updateProduct(editingProduct.id, {
                                price: editingProduct.price,
                                costPrice: editingProduct.costPrice,
                                stock: editingProduct.stock
                            })}
                            disabled={saving}
                            className="w-full mt-6 py-4 bg-orange-500 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 border-t border-gray-700 sm:border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Add Product</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Product Name *</label>
                                <input
                                    type="text"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder="e.g., Coca Cola 2L"
                                    className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Price *</label>
                                    <button
                                        onClick={() => setPadField({ field: 'newPrice', isDecimal: true })}
                                        className="w-full mt-1 px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-lg font-bold text-left text-green-400 active:bg-gray-700"
                                    >
                                        {newProduct.price ? `$${newProduct.price}` : '$0.00'}
                                    </button>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Cost</label>
                                    <button
                                        onClick={() => setPadField({ field: 'newCostPrice', isDecimal: true })}
                                        className="w-full mt-1 px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-lg font-bold text-left text-blue-400 active:bg-gray-700"
                                    >
                                        {newProduct.costPrice ? `$${newProduct.costPrice}` : '$0.00'}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Stock</label>
                                    <button
                                        onClick={() => setPadField({ field: 'newStock', isDecimal: false })}
                                        className="w-full mt-1 px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-lg font-bold text-left text-orange-400 active:bg-gray-700"
                                    >
                                        {newProduct.stock || '0'}
                                    </button>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase flex items-center gap-1">
                                        Barcode
                                        {lookingUpBarcode && <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />}
                                    </label>
                                    <input
                                        type="text"
                                        value={newProduct.barcode}
                                        onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                                        onBlur={(e) => lookupBarcode(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                lookupBarcode(newProduct.barcode)
                                            }
                                        }}
                                        placeholder="Scan or type"
                                        className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl"
                                    />
                                </div>
                            </div>
                            {/* Category / Department Selection */}
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Category / Department</label>
                                <select
                                    value={newProduct.category}
                                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                    className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:border-orange-500"
                                >
                                    <option value="">Select category...</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.name}>{dept.icon || '📁'} {dept.name}</option>
                                    ))}
                                    <option value="__custom__">➕ Add new category...</option>
                                </select>
                            </div>
                            {/* Custom category input */}
                            {newProduct.category === '__custom__' && (
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">New Category Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Snacks, Beverages, Tobacco"
                                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        className="w-full mt-1 px-4 py-3 bg-gray-800 border border-orange-500/50 rounded-xl"
                                        autoFocus
                                    />
                                </div>
                            )}
                            {/* Show auto-filled indicator */}
                            {newProduct.category && newProduct.category !== '__custom__' && lookingUpBarcode && (
                                <div className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center gap-2">
                                    <span className="text-green-400 text-sm">✓ Auto-filled from barcode</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={addProduct}
                            disabled={saving || !newProduct.name || !newProduct.price}
                            className="w-full mt-6 py-4 bg-green-600 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            Add Product
                        </button>
                    </div>
                </div>
            )}

            {/* Stock Adjustment Number Pad */}
            {stockAdjust && editingProduct && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-end sm:items-center justify-center">
                    <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 border-t border-gray-700 sm:border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-lg font-bold ${stockAdjust.mode === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                                {stockAdjust.mode === 'add' ? '+ Add Stock' : '- Remove Stock'}
                            </h3>
                            <button onClick={() => setStockAdjust(null)} className="p-2">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Current stock display */}
                        <p className="text-gray-400 text-sm text-center mb-2">Current: {editingProduct.stock}</p>

                        {/* Amount display */}
                        <div className={`text-center p-4 rounded-xl mb-4 ${stockAdjust.mode === 'add' ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
                            <p className={`text-4xl font-black ${stockAdjust.mode === 'add' ? 'text-green-400' : 'text-red-400'}`}>
                                {stockAdjust.mode === 'add' ? '+' : '-'}{stockAdjust.amount || '0'}
                            </p>
                        </div>

                        {/* Number Pad */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (key === 'C') {
                                            setStockAdjust({ ...stockAdjust, amount: '' })
                                        } else if (key === '⌫') {
                                            setStockAdjust({ ...stockAdjust, amount: stockAdjust.amount.slice(0, -1) })
                                        } else {
                                            if (stockAdjust.amount.length < 5) {
                                                setStockAdjust({ ...stockAdjust, amount: stockAdjust.amount + key })
                                            }
                                        }
                                    }}
                                    className={`py-4 text-xl font-bold rounded-xl active:scale-95 ${key === 'C' ? 'bg-gray-700 text-gray-300' :
                                        key === '⌫' ? 'bg-gray-700 text-gray-300' :
                                            'bg-gray-800 text-white'
                                        }`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        {/* Confirm button */}
                        <button
                            onClick={() => {
                                const amount = parseInt(stockAdjust.amount) || 0
                                if (amount > 0) {
                                    if (stockAdjust.mode === 'add') {
                                        setEditingProduct({ ...editingProduct, stock: editingProduct.stock + amount })
                                    } else {
                                        setEditingProduct({ ...editingProduct, stock: Math.max(0, editingProduct.stock - amount) })
                                    }
                                }
                                setStockAdjust(null)
                            }}
                            disabled={!stockAdjust.amount || stockAdjust.amount === '0'}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${stockAdjust.mode === 'add' ? 'bg-green-600' : 'bg-red-600'
                                }`}
                        >
                            <Check className="w-5 h-5" />
                            {stockAdjust.mode === 'add' ? 'Add' : 'Remove'} {stockAdjust.amount || '0'} units
                        </button>
                    </div>
                </div>
            )}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-2 py-2 safe-area-inset">
                <div className="flex justify-around max-w-lg mx-auto">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`flex flex-col items-center py-2 px-3 rounded-xl ${activeTab === 'sales' ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                        <DollarSign className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Sales</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('lottery')}
                        className={`flex flex-col items-center py-2 px-3 rounded-xl ${activeTab === 'lottery' ? 'text-purple-400' : 'text-gray-500'}`}
                    >
                        <span className="text-lg">🎰</span>
                        <span className="text-[10px] mt-0.5">Lottery</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex flex-col items-center py-2 px-3 rounded-xl ${activeTab === 'inventory' ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                        <Package className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Inventory</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex flex-col items-center py-2 px-3 rounded-xl ${activeTab === 'reports' ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Reports</span>
                    </button>
                </div>
            </div>

            {/* Barcode Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onScan={(barcode) => {
                        setShowScanner(false)
                        setInvSearch(barcode)
                        setActiveTab('inventory')
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Number Pad Modal */}
            {padField && (
                <NumberPadModal
                    title={padField.field.includes('Price') || padField.field === 'price' || padField.field === 'costPrice'
                        ? 'Enter Price'
                        : 'Enter Quantity'}
                    initialValue={
                        padField.field === 'price' && editingProduct ? editingProduct.price.toFixed(2) :
                            padField.field === 'costPrice' && editingProduct ? editingProduct.costPrice.toFixed(2) :
                                padField.field === 'stock' && editingProduct ? String(editingProduct.stock) :
                                    padField.field === 'newPrice' ? newProduct.price :
                                        padField.field === 'newCostPrice' ? newProduct.costPrice :
                                            padField.field === 'newStock' ? newProduct.stock : '0'
                    }
                    isDecimal={padField.isDecimal}
                    onConfirm={(value) => {
                        if (padField.field === 'price' && editingProduct) {
                            setEditingProduct({ ...editingProduct, price: parseFloat(value) || 0 })
                        } else if (padField.field === 'costPrice' && editingProduct) {
                            setEditingProduct({ ...editingProduct, costPrice: parseFloat(value) || 0 })
                        } else if (padField.field === 'stock' && editingProduct) {
                            setEditingProduct({ ...editingProduct, stock: parseInt(value) || 0 })
                        } else if (padField.field === 'newPrice') {
                            setNewProduct({ ...newProduct, price: value })
                        } else if (padField.field === 'newCostPrice') {
                            setNewProduct({ ...newProduct, costPrice: value })
                        } else if (padField.field === 'newStock') {
                            setNewProduct({ ...newProduct, stock: value })
                        }
                    }}
                    onClose={() => setPadField(null)}
                />
            )}
        </div>
    )
}


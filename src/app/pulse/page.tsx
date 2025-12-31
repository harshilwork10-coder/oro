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
import OroLogo from '@/components/ui/OroLogo'
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

type TabType = 'sales' | 'inventory' | 'reports'

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
    const [newProduct, setNewProduct] = useState({ name: '', price: '', costPrice: '', stock: '', barcode: '' })
    const [saving, setSaving] = useState(false)
    const [padField, setPadField] = useState<{ field: 'price' | 'costPrice' | 'stock' | 'newPrice' | 'newCostPrice' | 'newStock', isDecimal: boolean } | null>(null)

    // Reports state
    interface OpenDrawer { id: string; currentCash: number; location: string; openedBy: string }
    const [openDrawers, setOpenDrawers] = useState<OpenDrawer[]>([])
    const [paymentBreakdown, setPaymentBreakdown] = useState({ cash: 0, card: 0, other: 0 })
    const [voidCount, setVoidCount] = useState(0)
    const [refundCount, setRefundCount] = useState(0)
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

    // Fetch inventory when switching to inventory tab or search changes
    useEffect(() => {
        if (activeTab === 'inventory' && hasAccess) {
            fetchInventory()
        }
    }, [activeTab, invSearch, selectedLocation, hasAccess])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/pulse/live?locationId=${selectedLocation}`)
            if (res.ok) {
                const data = await res.json()
                setLocations(data.locations || [])
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

    const fetchInventory = async () => {
        setInvLoading(true)
        try {
            const res = await fetch(`/api/pulse/inventory?search=${invSearch}&locationId=${selectedLocation}`)
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
                    locationId: selectedLocation !== 'all' ? selectedLocation : null
                })
            })
            if (res.ok) {
                setShowAddModal(false)
                setNewProduct({ name: '', price: '', costPrice: '', stock: '', barcode: '' })
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
                    <OroLogo size={32} showText={false} />
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
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
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
                                            <span className="text-green-400 text-sm font-medium">${item.revenue.toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* INVENTORY TAB */}
                {activeTab === 'inventory' && (
                    <>
                        {/* Search, Scan & Add */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search or scan..."
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
                                <p>No products found</p>
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

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                    <>
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                                <p className="text-gray-400 text-xs">TODAY</p>
                                <p className="text-2xl font-bold text-green-400">${stats.todaySales.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                                <p className="text-gray-400 text-xs">YESTERDAY</p>
                                <p className="text-2xl font-bold text-gray-300">${stats.yesterdaySales.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                                <p className="text-gray-400 text-xs">THIS WEEK</p>
                                <p className="text-2xl font-bold text-blue-400">${stats.weekSales.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                                <p className="text-gray-400 text-xs">ORDERS</p>
                                <p className="text-2xl font-bold text-orange-400">{stats.transactionCount}</p>
                            </div>
                        </div>

                        {/* Total Sales + Tax Collected - Hero Cards */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30 text-center">
                                <p className="text-gray-300 text-xs mb-1">💰 TOTAL SALES</p>
                                <p className="text-3xl font-bold text-green-400">${totalSalesReport.toLocaleString()}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30 text-center">
                                <p className="text-gray-300 text-xs mb-1">🏛️ TAX COLLECTED</p>
                                <p className="text-3xl font-bold text-purple-400">${taxCollected.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Cash vs Card - Visual Bar */}
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
                                                Cash ${paymentBreakdown.cash.toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                Card ${paymentBreakdown.card.toLocaleString()}
                                            </span>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>

                        {/* Top Employee Sales */}
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                👤 Top Sellers Today
                            </h3>
                            {employeesOnClock.length > 0 ? (
                                <div className="space-y-2">
                                    {employeesOnClock.slice(0, 3).map((emp, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500' : 'bg-gray-600'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm">{emp.name}</span>
                                            </div>
                                            <span className="text-gray-400 text-sm">{emp.location}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-2">No data yet</p>
                            )}
                        </div>

                        {/* Void/Refund Alerts - Separate */}
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
                                                <p className="text-green-400 font-bold text-lg">${drawer.currentCash.toLocaleString()}</p>
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

                        {/* 🎰 Lottery Summary - Separate from regular sales */}
                        {(lotteryStats.sales > 0 || lotteryStats.payouts > 0) && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl p-4 border border-purple-500/30 mt-4">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-purple-300">
                                    🎰 Lottery Today
                                    <span className="text-[10px] bg-purple-500/30 px-2 py-0.5 rounded-full">Separate Accounting</span>
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-1">Tickets Sold</p>
                                        <p className="text-lg font-bold text-green-400">+${lotteryStats.sales.toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-500">{lotteryStats.salesCount} sales</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-1">Winner Payouts</p>
                                        <p className="text-lg font-bold text-red-400">-${lotteryStats.payouts.toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-500">{lotteryStats.payoutsCount} payouts</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400 mb-1">Net Lottery</p>
                                        <p className={`text-lg font-bold ${lotteryStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {lotteryStats.net >= 0 ? '+' : ''}${lotteryStats.net.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-purple-400">Cash Flow</p>
                                    </div>
                                </div>

                                {/* Top Selling Scratch Tickets */}
                                {lotteryStats.topGames && lotteryStats.topGames.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-purple-500/20">
                                        <p className="text-xs text-purple-300 font-medium mb-2">🎟️ Top Scratch Tickets</p>
                                        <div className="space-y-1.5">
                                            {lotteryStats.topGames.map((game, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-purple-500/10 rounded-lg px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-purple-400 text-xs font-bold">${game.price}</span>
                                                        <span className="text-white text-sm truncate max-w-[120px]">{game.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-green-400 font-bold text-sm">{game.sold}</span>
                                                        <span className="text-gray-500 text-xs ml-1">sold</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                                <button
                                    onClick={() => setPadField({ field: 'stock', isDecimal: false })}
                                    className="w-full mt-1 px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-xl font-bold text-left text-orange-400 active:bg-gray-700"
                                >
                                    {editingProduct.stock}
                                </button>
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
                                    <label className="text-gray-400 text-xs uppercase">Barcode</label>
                                    <input
                                        type="text"
                                        value={newProduct.barcode}
                                        onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                                        placeholder="Optional"
                                        className="w-full mt-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl"
                                    />
                                </div>
                            </div>
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

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2 safe-area-inset">
                <div className="flex justify-around max-w-lg mx-auto">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl ${activeTab === 'sales' ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                        <DollarSign className="w-5 h-5" />
                        <span className="text-xs mt-1">Sales</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl ${activeTab === 'inventory' ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                        <Package className="w-5 h-5" />
                        <span className="text-xs mt-1">Inventory</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex flex-col items-center py-2 px-4 rounded-xl ${activeTab === 'reports' ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-xs mt-1">Reports</span>
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


'use client'

import { useState, useEffect } from 'react'
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
    ChevronRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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
    createdAt: string
    status: string
    paymentMethod: string
    lineItems: any[]
    client?: { firstName: string, lastName: string }
}

export default function POSPage() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(true)
    const [view, setView] = useState<'POS' | 'HISTORY'>('POS')
    const [itemView, setItemView] = useState<'SERVICES' | 'PRODUCTS'>('SERVICES')

    const [shift, setShift] = useState<any>(null)
    const [menu, setMenu] = useState<MenuData>({ services: [], products: [], discounts: [] })
    const [cart, setCart] = useState<CartItem[]>([])
    const [activeCategory, setActiveCategory] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const SERVICE_CATEGORIES = {
        'THREADING': ['Eyebrows', 'Upper & Lower Lips', 'Chin, Neck & Forehead', 'Side Burn Half/Full', 'Full Face (No Neck)'],
        'WAXING': ['Full Face (No Neck)', 'Arm Half/full Waxing', 'Under Arm Waxing', 'Leg Half/Full Waxing'],
        'SPA': ['Express Facial', 'Deluxe Facial', 'Anti-Ageing Facial', 'Acne Facial'],
        'ADDITIONS': ['Eyebrow Tinting', 'Henna Tattoo', 'Natural/Full Eyelashes', 'Touch-ups', 'Eyelash Extension']
    }

    // History State
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

    // Modals
    const [showShiftModal, setShowShiftModal] = useState(false)
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [showDiscountModal, setShowDiscountModal] = useState(false)
    const [selectedCartIndex, setSelectedCartIndex] = useState<number | null>(null)
    const [discountValue, setDiscountValue] = useState('')
    const [shiftAmount, setShiftAmount] = useState('')
    const [denominations, setDenominations] = useState({
        hundreds: 0,
        fifties: 0,
        twenties: 0,
        tens: 0,
        fives: 0,
        ones: 0,
        quarters: 0,
        dimes: 0,
        nickels: 0,
        pennies: 0
    })

    useEffect(() => {
        fetchInitialData()
    }, [])


    useEffect(() => {
        if (view === 'HISTORY') {
            fetchTransactions()
        }
    }, [view])

    // Sync cart to kiosk display whenever it changes
    useEffect(() => {
        const syncCart = async () => {
            if (!shift) return // Only sync when shift is open

            const { subtotal, tax, totalCash, totalCard } = calculateTotal()

            try {
                await fetch('/api/pos/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart.map(item => {
                            const itemSubtotal = getItemPrice(item)
                            return {
                                name: item.name,
                                type: item.type,
                                price: itemSubtotal / item.quantity, // Per-item discounted price
                                cashPrice: itemSubtotal / item.quantity, // Same as price for cash
                                cardPrice: (itemSubtotal / item.quantity) * 1.0399, // Card surcharge per item
                                quantity: item.quantity,
                                icon: item.type === 'SERVICE' ? '✂️' : '🛍️'
                            }
                        }),
                        subtotal,
                        tax,
                        total: totalCash,
                        totalCard,
                        status: cart.length > 0 ? 'ACTIVE' : 'IDLE'
                    })
                })
            } catch (error) {
                console.error('Failed to sync cart to kiosk:', error)
            }
        }

        syncCart()
    }, [cart, shift])

    const fetchInitialData = async () => {
        try {
            const [menuRes, shiftRes] = await Promise.all([
                fetch('/api/pos/menu'),
                fetch('/api/pos/shift')
            ])

            if (menuRes.ok) {
                const menuData = await menuRes.json()
                setMenu(menuData)
            }

            if (shiftRes.ok) {
                const shiftData = await shiftRes.json()
                setShift(shiftData.session)
                if (!shiftData.session) setShowShiftModal(true)
            }
        } catch (error) {
            console.error('Error fetching POS data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/pos/transactions')
            if (res.ok) {
                const data = await res.json()
                setTransactions(data)
            }
        } catch (error) {
            console.error('Error fetching transactions:', error)
        }
    }

    const handleShiftAction = async (action: 'OPEN' | 'CLOSE') => {
        try {
            const res = await fetch('/api/pos/shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    amount: parseFloat(shiftAmount) || 0,
                    notes: action === 'CLOSE' ? 'Closed via POS' : 'Opened via POS'
                })
            })

            if (res.ok) {
                const data = await res.json()
                setShift(action === 'OPEN' ? data : null)
                setShowShiftModal(false)
                if (action === 'CLOSE') {
                    setCart([])
                    setView('POS')
                }
            }
        } catch (error) {
            console.error('Shift action error:', error)
        }
    }

    const addToCart = (item: any, type: 'SERVICE' | 'PRODUCT') => {
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

    const handleCheckout = async (paymentMethod: string) => {
        const totals = calculateTotal()
        const finalAmount = paymentMethod === 'CASH' ? totals.totalCash : totals.totalCard

        try {
            const res = await fetch('/api/pos/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    subtotal: totals.subtotal,
                    tax: totals.tax,
                    total: finalAmount,
                    paymentMethod,
                    cashDrawerSessionId: shift?.id
                })
            })

            if (res.ok) {
                setCart([])
                setShowCheckoutModal(false)
                alert('Transaction Completed!')
            }
        } catch (error) {
            console.error('Checkout error:', error)
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

    const calculateTotal = () => {
        const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0)
        const tax = subtotal * 0.08
        const totalCash = subtotal + tax
        const totalCard = totalCash * 1.0399
        return {
            subtotal,
            tax,
            totalCash,
            totalCard
        }
    }

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-stone-950 text-orange-500">Loading POS...</div>

    // Shift Modal
    if (showShiftModal && !shift) {
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

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="w-full max-w-2xl p-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl my-8">
                    <div className="text-center mb-8">
                        <div className="h-16 w-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Banknote className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Open Cash Drawer</h2>
                        <p className="text-stone-400 mt-2">Count your starting cash</p>
                    </div>

                    <div className="space-y-6">
                        {/* Bills */}
                        <div>
                            <h3 className="text-sm font-medium text-stone-400 mb-3">Bills</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: '$100', key: 'hundreds', mult: 100 },
                                    { label: '$50', key: 'fifties', mult: 50 },
                                    { label: '$20', key: 'twenties', mult: 20 },
                                    { label: '$10', key: 'tens', mult: 10 },
                                    { label: '$5', key: 'fives', mult: 5 },
                                    { label: '$1', key: 'ones', mult: 1 },
                                ].map(({ label, key, mult }) => (
                                    <div key={key} className="flex items-center gap-3 bg-stone-950 p-3 rounded-lg border border-stone-800">
                                        <span className="text-emerald-400 font-bold text-lg w-12">{label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations[key as keyof typeof denominations] || ''}
                                            onChange={(e) => updateDenom(key, e.target.value)}
                                            className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                                            placeholder="0"
                                        />
                                        <span className="text-stone-500 text-sm w-16 text-right">
                                            ${(denominations[key as keyof typeof denominations] * mult).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Coins */}
                        <div>
                            <h3 className="text-sm font-medium text-stone-400 mb-3">Coins</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: '25¢', key: 'quarters', mult: 0.25 },
                                    { label: '10¢', key: 'dimes', mult: 0.10 },
                                    { label: '5¢', key: 'nickels', mult: 0.05 },
                                    { label: '1¢', key: 'pennies', mult: 0.01 },
                                ].map(({ label, key, mult }) => (
                                    <div key={key} className="flex items-center gap-3 bg-stone-950 p-3 rounded-lg border border-stone-800">
                                        <span className="text-amber-400 font-bold text-lg w-12">{label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={denominations[key as keyof typeof denominations] || ''}
                                            onChange={(e) => updateDenom(key, e.target.value)}
                                            className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-white text-center focus:ring-1 focus:ring-amber-500 outline-none"
                                            placeholder="0"
                                        />
                                        <span className="text-stone-500 text-sm w-16 text-right">
                                            ${(denominations[key as keyof typeof denominations] * mult).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="bg-gradient-to-r from-emerald-900/20 to-emerald-900/10 border border-emerald-500/30 rounded-xl p-6">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-stone-300">Total Starting Cash</span>
                                <span className="text-3xl font-bold text-emerald-400">${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShiftAmount(totalAmount.toFixed(2))
                                handleShiftAction('OPEN')
                            }}
                            disabled={totalAmount === 0}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Open Shift
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const { subtotal, tax, totalCash, totalCard } = calculateTotal()

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
                                Orders
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

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden lg:block">
                            <p className="text-sm font-medium text-white">{session?.user?.name}</p>
                            <p className="text-xs text-emerald-400">Shift Open</p>
                        </div>
                        <button
                            onClick={() => { setShowShiftModal(true); setShift(null); }}
                            className="p-2 bg-stone-800 hover:bg-red-900/20 hover:text-red-400 text-stone-400 rounded-lg transition-colors"
                            title="Close Shift"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {view === 'POS' ? (
                        <div className="space-y-6">
                            {/* Services/Products Toggle */}
                            <div className="flex justify-center">
                                <div className="flex bg-stone-800 rounded-lg p-1.5">
                                    <button
                                        onClick={() => { setItemView('SERVICES'); setSelectedCategory(null); }}
                                        className={`px-8 py-3 rounded-lg text-base font-semibold transition-all ${itemView === 'SERVICES' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
                                    >
                                        Services
                                    </button>
                                    <button
                                        onClick={() => { setItemView('PRODUCTS'); setSelectedCategory(null); }}
                                        className={`px-8 py-3 rounded-lg text-base font-semibold transition-all ${itemView === 'PRODUCTS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}
                                    >
                                        Products
                                    </button>
                                </div>
                            </div>

                            {/* Content based on itemView */}
                            {itemView === 'SERVICES' ? (
                                !selectedCategory ? (
                                    /* Service Categories */
                                    <div className="flex justify-center items-start">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl w-full">
                                            {Object.keys(SERVICE_CATEGORIES).map((category) => (
                                                <button
                                                    key={category}
                                                    onClick={() => setSelectedCategory(category)}
                                                    className="aspect-[3/4] bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-orange-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-6 transition-all group"
                                                >
                                                    <div className="h-20 w-20 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                                        {category === 'THREADING' && <Scissors className="h-10 w-10 text-orange-400" />}
                                                        {category === 'WAXING' && <Tag className="h-10 w-10 text-orange-400" />}
                                                        {category === 'SPA' && <User className="h-10 w-10 text-orange-400" />}
                                                        {category === 'ADDITIONS' && <Plus className="h-10 w-10 text-orange-400" />}
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white tracking-wider">{category}</h3>
                                                    <p className="text-stone-500 text-sm font-medium uppercase tracking-widest">Select Category</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Services in Selected Category */
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setSelectedCategory(null)}
                                                className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-400 hover:text-white transition-colors"
                                            >
                                                <ChevronRight className="h-6 w-6 rotate-180" />
                                            </button>
                                            <h2 className="text-3xl font-bold text-white tracking-wide">{selectedCategory}</h2>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {menu.services
                                                .filter(s => {
                                                    const categoryServices = SERVICE_CATEGORIES[selectedCategory as keyof typeof SERVICE_CATEGORIES] || []
                                                    return categoryServices.includes(s.name)
                                                })
                                                .map(service => (
                                                    <button
                                                        key={service.id}
                                                        onClick={() => addToCart(service, 'SERVICE')}
                                                        className="bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-orange-500/50 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all group min-h-[160px]"
                                                    >
                                                        <div className="w-full text-left">
                                                            <p className="font-bold text-lg text-stone-200 line-clamp-2 leading-tight">{service.name}</p>
                                                        </div>

                                                        {/* Dual Pricing */}
                                                        <div className="flex justify-between w-full gap-2 mt-auto">
                                                            <div className="flex-1 bg-emerald-900/20 border border-emerald-900/30 p-2 rounded-lg text-center">
                                                                <div className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider mb-0.5">Cash</div>
                                                                <div className="font-bold text-emerald-400">{formatCurrency(service.price)}</div>
                                                            </div>
                                                            <div className="flex-1 bg-blue-900/20 border border-blue-900/30 p-2 rounded-lg text-center">
                                                                <div className="text-[10px] text-blue-500/70 font-bold uppercase tracking-wider mb-0.5">Card</div>
                                                                <div className="font-bold text-blue-400">{formatCurrency(service.price * 1.0399)}</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )
                            ) : (
                                /* Products Grid - Direct Display */
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {menu.products
                                        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => addToCart(product, 'PRODUCT')}
                                                className="bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all group min-h-[160px]"
                                            >
                                                <div className="w-full text-left">
                                                    <p className="font-bold text-lg text-stone-200 line-clamp-2 leading-tight">{product.name}</p>
                                                </div>

                                                {/* Dual Pricing */}
                                                <div className="flex justify-between w-full gap-2 mt-auto">
                                                    <div className="flex-1 bg-emerald-900/20 border border-emerald-900/30 p-2 rounded-lg text-center">
                                                        <div className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider mb-0.5">Cash</div>
                                                        <div className="font-bold text-emerald-400">{formatCurrency(product.price)}</div>
                                                    </div>
                                                    <div className="flex-1 bg-blue-900/20 border border-blue-900/30 p-2 rounded-lg text-center">
                                                        <div className="text-[10px] text-blue-500/70 font-bold uppercase tracking-wider mb-0.5">Card</div>
                                                        <div className="font-bold text-blue-400">{formatCurrency(product.price * 1.0399)}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* History View */
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
                            <div className="grid gap-4">
                                {transactions.map(tx => (
                                    <div key={tx.id} className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-colors cursor-pointer" onClick={() => setSelectedTx(tx)}>
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
                            <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 transition-colors">
                                <User className="h-5 w-5" />
                            </button>
                        </div>

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
                                    <span>{formatCurrency(totalCard)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowCheckoutModal(true)}
                                disabled={cart.length === 0}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xl shadow-lg shadow-orange-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Checkout
                            </button>
                        </div>
                    </>
                ) : (
                    /* Transaction Details View */
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
                                            <span className="text-stone-300">{item.quantity}x Item</span>
                                            <span className="text-white">{formatCurrency(item.total)}</span>
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
            </div>

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
                            <button
                                onClick={() => handleCheckout('CASH')}
                                className="aspect-video bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
                            >
                                <Banknote className="h-12 w-12 text-emerald-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-emerald-100">Cash</span>
                            </button>

                            <button
                                onClick={() => handleCheckout('CREDIT_CARD')}
                                className="aspect-video bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
                            >
                                <CreditCard className="h-12 w-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-blue-100">Card</span>
                                <span className="text-sm text-blue-300">Total: {formatCurrency(totalCard)}</span>
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
        </div>
    )
}

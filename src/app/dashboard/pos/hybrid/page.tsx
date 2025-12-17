'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Search,
    Trash2,
    CreditCard,
    Banknote,
    User,
    Scissors,
    ShoppingBag,
    X,
    Package,
    Clock,
    Tag,
    Hash,
    Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBusinessConfig } from '@/hooks/useBusinessConfig'
import Toast from '@/components/ui/Toast'
import CheckoutModal from '@/components/pos/CheckoutModal'

interface CartItem {
    id: string
    type: 'SERVICE' | 'PRODUCT'
    name: string
    price: number
    quantity: number
    duration?: number  // For services
    barcode?: string   // For products
    sku?: string
}

interface Item {
    id: string
    name: string
    price: string
    type: string
    duration?: number
    barcode?: string
    sku?: string
    stock?: number
    category?: {
        id: string
        name: string
        color?: string
    }
}

type TabType = 'SERVICES' | 'PRODUCTS'

export default function HybridPOSPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { data: config } = useBusinessConfig()
    const searchInputRef = useRef<HTMLInputElement>(null)

    // State
    const [activeTab, setActiveTab] = useState<TabType>('SERVICES')
    const [cart, setCart] = useState<CartItem[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showCheckout, setShowCheckout] = useState(false)

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    // Fetch items based on active tab
    useEffect(() => {
        if (status === 'authenticated') {
            fetchItems()
        }
    }, [status, activeTab])

    const fetchItems = async () => {
        setLoading(true)
        try {
            const type = activeTab === 'SERVICES' ? 'SERVICE' : 'PRODUCT'
            const res = await fetch(`/api/items?type=${type}&activeOnly=true`)
            if (res.ok) {
                const data = await res.json()
                setItems(data.items || [])
            }
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    // Add item to cart
    const addToCart = (item: Item) => {
        const existingIndex = cart.findIndex(c => c.id === item.id)

        if (existingIndex >= 0) {
            // Increment quantity
            const updated = [...cart]
            updated[existingIndex].quantity += 1
            setCart(updated)
        } else {
            // Add new item
            setCart([...cart, {
                id: item.id,
                type: item.type as 'SERVICE' | 'PRODUCT',
                name: item.name,
                price: parseFloat(item.price),
                quantity: 1,
                duration: item.duration,
                barcode: item.barcode,
                sku: item.sku
            }])
        }
    }

    // Remove from cart
    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index))
    }

    // Update quantity
    const updateQuantity = (index: number, delta: number) => {
        const updated = [...cart]
        updated[index].quantity = Math.max(1, updated[index].quantity + delta)
        setCart(updated)
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const taxRate = config?.taxRate || 0.08
    const tax = subtotal * taxRate
    const total = subtotal + tax

    // Filter items by search
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handle checkout complete
    const handleCheckoutComplete = (transaction: any) => {
        setCart([])
        setShowCheckout(false)
        setToast({ message: 'Transaction completed!', type: 'success' })
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white flex">
            {/* Left Side - Items Grid */}
            <div className="flex-1 flex flex-col">
                {/* Header with Tabs */}
                <div className="bg-stone-900 border-b border-stone-800 p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <h1 className="text-2xl font-bold">Hybrid POS</h1>
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                            Services + Products
                        </span>
                    </div>

                    {/* Tab Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('SERVICES')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'SERVICES'
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            <Scissors className="w-5 h-5" />
                            Services
                        </button>
                        <button
                            onClick={() => setActiveTab('PRODUCTS')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'PRODUCTS'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Products
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 bg-stone-900/50">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeTab === 'SERVICES' ? 'Search services...' : 'Scan barcode or search products...'}
                            className="w-full pl-12 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                    </div>
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-stone-500">
                            <Package className="w-16 h-16 mb-4 opacity-50" />
                            <p>No {activeTab.toLowerCase()} found</p>
                            <p className="text-sm mt-2">Add items in the unified inventory</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className={`p-4 rounded-xl border transition-all hover:scale-[1.02] text-left ${activeTab === 'SERVICES'
                                            ? 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500'
                                            : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500'
                                        }`}
                                >
                                    <p className="font-medium text-white truncate">{item.name}</p>
                                    <p className={`text-lg font-bold mt-1 ${activeTab === 'SERVICES' ? 'text-purple-400' : 'text-emerald-400'
                                        }`}>
                                        {formatCurrency(parseFloat(item.price))}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
                                        {item.duration && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.duration} min
                                            </span>
                                        )}
                                        {item.sku && (
                                            <span className="flex items-center gap-1">
                                                <Hash className="w-3 h-3" />
                                                {item.sku}
                                            </span>
                                        )}
                                        {item.stock !== undefined && (
                                            <span className={item.stock <= 5 ? 'text-red-400' : ''}>
                                                Stock: {item.stock}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Cart */}
            <div className="w-96 bg-stone-900 border-l border-stone-800 flex flex-col">
                {/* Cart Header */}
                <div className="p-4 border-b border-stone-800">
                    <h2 className="text-xl font-bold">Cart</h2>
                    <p className="text-sm text-stone-500">{cart.length} items</p>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center py-12 text-stone-500">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div
                                key={`${item.id}-${index}`}
                                className="bg-stone-800 rounded-xl p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            {item.type === 'SERVICE' ? (
                                                <Scissors className="w-4 h-4 text-purple-400" />
                                            ) : (
                                                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                                            )}
                                            <p className="font-medium">{item.name}</p>
                                        </div>
                                        <p className="text-sm text-stone-500 mt-1">
                                            {formatCurrency(item.price)} each
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(index)}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(index, -1)}
                                            className="w-8 h-8 bg-stone-700 hover:bg-stone-600 rounded-lg flex items-center justify-center"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(index, 1)}
                                            className="w-8 h-8 bg-stone-700 hover:bg-stone-600 rounded-lg flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="font-bold text-orange-400">
                                        {formatCurrency(item.price * item.quantity)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Totals */}
                <div className="p-4 border-t border-stone-800 space-y-2">
                    <div className="flex justify-between text-stone-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                        <span>Tax ({(taxRate * 100).toFixed(1)}%)</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-2 border-t border-stone-700">
                        <span>Total</span>
                        <span className="text-emerald-400">{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Pay Button */}
                <div className="p-4">
                    <button
                        onClick={() => setShowCheckout(true)}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xl font-bold transition-all"
                    >
                        PAY {formatCurrency(total)}
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <CheckoutModal
                    isOpen={showCheckout}
                    onClose={() => setShowCheckout(false)}
                    cart={cart.map(item => ({
                        ...item,
                        type: item.type.toLowerCase() as 'service' | 'product'
                    }))}
                    subtotal={subtotal}
                    taxRate={taxRate}
                    onComplete={handleCheckoutComplete}
                />
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}

'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Send, Clock, Phone, User, ArrowLeft, CheckCircle } from 'lucide-react';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    description: string;
}

interface MenuCategory {
    category: string;
    items: MenuItem[];
}

interface CartItem extends MenuItem {
    quantity: number;
}

/**
 * Customer Order Ahead — Mobile-first ordering page
 * 
 * URL: /order?store=STORE_ID
 * Customer scans QR code, browses menu, builds cart, submits order.
 * Designed for phone screens (375px—430px wide).
 */

export default function OrderAheadPage() {
    const [storeId, setStoreId] = useState('');
    const [storeName, setStoreName] = useState('');
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [pickupTime, setPickupTime] = useState('ASAP');
    const [submitting, setSubmitting] = useState(false);
    const [orderResult, setOrderResult] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('store') || params.get('storeId') || '';
        setStoreId(id);
        if (id) {
            fetch(`/api/public/order-ahead?storeId=${id}`)
                .then(r => r.json())
                .then(data => {
                    setStoreName(data.store?.name || 'Store');
                    setMenu(data.menu || []);
                })
                .catch(() => { });
        }
    }, []);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const updateQty = (itemId: string, delta: number) => {
        setCart(prev => prev
            .map(c => c.id === itemId ? { ...c, quantity: c.quantity + delta } : c)
            .filter(c => c.quantity > 0)
        );
    };

    const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    const submitOrder = async () => {
        setSubmitting(true);
        const res = await fetch('/api/public/order-ahead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storeId,
                customerName,
                customerPhone,
                notes,
                pickupTime,
                items: cart.map(c => ({ productId: c.id, name: c.name, quantity: c.quantity })),
            }),
        });
        const data = await res.json();
        setOrderResult(data);
        setSubmitting(false);
    };

    // Filter items by search
    const filteredMenu = searchQuery
        ? menu.map(cat => ({
            ...cat,
            items: cat.items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())),
        })).filter(cat => cat.items.length > 0)
        : menu;

    // Order confirmation screen
    if (orderResult?.success) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 text-white flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle size={80} className="text-green-400 mb-6" />
                <h1 className="text-3xl font-black mb-2">Order Confirmed!</h1>
                <p className="text-green-300 text-xl font-bold mb-4">{orderResult.order?.id}</p>
                <div className="bg-white/10 backdrop-blur rounded-2xl p-6 w-full max-w-sm space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-green-300">Pickup</span>
                        <span className="font-bold">{orderResult.order?.pickupTime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-green-300">Items</span>
                        <span className="font-bold">{cart.length}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-white/20 pt-3">
                        <span>Total</span>
                        <span>${orderResult.order?.total.toFixed(2)}</span>
                    </div>
                </div>
                <p className="text-green-400 mt-6 text-sm">
                    Est. ready in ~{orderResult.estimatedMinutes} minutes
                </p>
                <p className="text-green-300/60 text-xs mt-4">{orderResult.message}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur-lg border-b border-stone-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-orange-400">{storeName}</h1>
                        <p className="text-xs text-stone-500">Order for pickup</p>
                    </div>
                    <button
                        onClick={() => setCartOpen(true)}
                        className="relative bg-orange-600 hover:bg-orange-500 p-3 rounded-full transition-colors"
                    >
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search */}
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search menu..."
                    className="w-full mt-3 bg-stone-900 border border-stone-700 rounded-xl py-2.5 px-4 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
            </div>

            {/* Menu */}
            <div className="px-4 py-4 pb-24 space-y-6">
                {filteredMenu.map(cat => (
                    <div key={cat.category}>
                        <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3">{cat.category}</h2>
                        <div className="space-y-2">
                            {cat.items.map(item => {
                                const inCart = cart.find(c => c.id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between bg-stone-900 rounded-xl p-3 border border-stone-800"
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                            {item.description && <p className="text-xs text-stone-500 truncate">{item.description}</p>}
                                            <p className="text-orange-400 font-bold text-sm mt-0.5">${item.price.toFixed(2)}</p>
                                        </div>
                                        {inCart ? (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center">
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-6 text-center font-bold text-sm">{inCart.quantity}</span>
                                                <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-10 h-10 bg-orange-600 hover:bg-orange-500 rounded-full flex items-center justify-center transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {filteredMenu.length === 0 && (
                    <div className="text-center py-16 text-stone-600">
                        <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                        <p>{searchQuery ? 'No items match your search' : 'Menu loading...'}</p>
                    </div>
                )}
            </div>

            {/* Cart Footer */}
            {cartCount > 0 && !cartOpen && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-stone-950/95 backdrop-blur-lg border-t border-stone-800">
                    <button
                        onClick={() => setCartOpen(true)}
                        className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <ShoppingCart size={18} />
                        View Cart ({cartCount}) — ${cartTotal.toFixed(2)}
                    </button>
                </div>
            )}

            {/* Cart Drawer */}
            {cartOpen && (
                <div className="fixed inset-0 z-40 bg-stone-950/95 backdrop-blur-lg flex flex-col">
                    <div className="px-4 py-3 border-b border-stone-800 flex items-center gap-3">
                        <button onClick={() => setCartOpen(false)} className="p-2">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="font-bold text-lg">Your Order</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {/* Cart Items */}
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-stone-900 p-3 rounded-xl border border-stone-800">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    <p className="text-xs text-orange-400">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-stone-800 rounded-full flex items-center justify-center">
                                        <Minus size={12} />
                                    </button>
                                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center">
                                        <Plus size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Customer Info */}
                        <div className="space-y-3 pt-4 border-t border-stone-800">
                            <div>
                                <label className="text-xs text-stone-500 flex items-center gap-1 mb-1"><User size={12} /> Name</label>
                                <input
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-stone-500 flex items-center gap-1 mb-1"><Phone size={12} /> Phone</label>
                                <input
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                    type="tel"
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-stone-500 flex items-center gap-1 mb-1"><Clock size={12} /> Pickup Time</label>
                                <select
                                    value={pickupTime}
                                    onChange={e => setPickupTime(e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="ASAP">ASAP (~10 min)</option>
                                    <option value="15 min">In 15 minutes</option>
                                    <option value="30 min">In 30 minutes</option>
                                    <option value="1 hour">In 1 hour</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-stone-500 mb-1 block">Special Instructions</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Any special requests..."
                                    rows={2}
                                    className="w-full bg-stone-900 border border-stone-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cart Total + Submit */}
                    <div className="px-4 py-4 border-t border-stone-800 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-400">Subtotal</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-stone-400">Est. Tax</span>
                            <span>${(cartTotal * 0.08).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span className="text-orange-400">${(cartTotal * 1.08).toFixed(2)}</span>
                        </div>
                        <button
                            onClick={submitOrder}
                            disabled={submitting || cart.length === 0}
                            className="w-full py-3.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            {submitting ? (
                                <><Clock size={16} className="animate-spin" /> Placing Order...</>
                            ) : (
                                <><Send size={16} /> Place Order — Pay at Pickup</>
                            )}
                        </button>
                        <p className="text-xs text-stone-600 text-center">Payment collected at pickup</p>
                    </div>
                </div>
            )}
        </div>
    );
}

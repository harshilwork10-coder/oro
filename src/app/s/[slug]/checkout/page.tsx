'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, AlertCircle, Store } from 'lucide-react';
import { CartProvider, useCart } from '@/components/storefront/CartProvider';

function CheckoutContent() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const { items, updateQuantity, removeItem, clearCart, subtotal, itemCount } = useCart();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const estimatedTax = subtotal * 0.08;
    const estimatedTotal = subtotal + estimatedTax;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (items.length === 0) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/public/storefront/${slug}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: name,
                    customerPhone: phone,
                    notes: notes || undefined,
                    items: items.map(i => ({
                        itemId: i.itemId,
                        itemName: i.name,
                        quantity: i.quantity,
                        expectedPrice: i.price,
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to place order');
                setSubmitting(false);
                return;
            }

            clearCart();
            router.push(`/s/${slug}/order/${data.orderNumber}`);
        } catch {
            setError('Something went wrong. Please try again.');
            setSubmitting(false);
        }
    }

    if (items.length === 0) {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-6">Add some products to get started</p>
                <Link
                    href={`/s/${slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium transition-colors"
                >
                    <Store size={18} />
                    Browse Products
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Back link */}
            <Link href={`/s/${slug}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
                <ArrowLeft size={16} />
                Continue Shopping
            </Link>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

            {/* Cart Items */}
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 mb-6">
                {items.map(item => (
                    <div key={item.itemId} className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                            {item.categoryName && (
                                <p className="text-xs text-gray-400">{item.categoryName}</p>
                            )}
                            <p className="text-sm font-semibold text-gray-700 mt-1">${item.price.toFixed(2)}</p>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-semibold text-gray-900">{item.quantity}</span>
                            <button
                                onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        <div className="text-right w-20">
                            <p className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>

                        <button
                            onClick={() => removeItem(item.itemId)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Estimated Tax</span>
                    <span>${estimatedTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                    <span>Estimated Total</span>
                    <span>${estimatedTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Final price determined at pickup. Subject to availability.
                </p>
            </div>

            {/* Customer Info Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">Your Information</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any special requests..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting || !name.trim() || !phone.trim()}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Placing Order...' : `Place Order — Pay in Store`}
                </button>

                <p className="text-xs text-gray-400 text-center">
                    By placing this order you agree to pick up in store and pay at the register.
                </p>
            </form>
        </div>
    );
}

export default function CheckoutPage() {
    const params = useParams();
    const slug = params.slug as string;

    return (
        <CartProvider storeSlug={slug}>
            <CheckoutContent />
        </CartProvider>
    );
}

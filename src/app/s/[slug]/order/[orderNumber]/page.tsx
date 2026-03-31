'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, Package, MapPin, Phone, ArrowLeft, RefreshCw, XCircle } from 'lucide-react';

interface OrderData {
    orderNumber: string;
    status: string;
    customerName: string;
    items: { name: string; quantity: number; price: number; total: number }[];
    subtotal: number;
    estimatedTax: number;
    estimatedTotal: number;
    notes?: string;
    pickupTime?: string;
    readyAt?: string;
    placedAt: string;
    store: {
        name: string;
        slug: string;
        address?: string;
        phone?: string;
        latitude?: number;
        longitude?: number;
    };
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: typeof Clock; description: string }> = {
    PENDING: { label: 'Order Received', color: 'text-amber-500', icon: Clock, description: 'The store has received your order and will confirm shortly.' },
    CONFIRMED: { label: 'Preparing', color: 'text-blue-500', icon: Package, description: 'Your order has been confirmed and is being prepared.' },
    READY: { label: 'Ready for Pickup!', color: 'text-green-500', icon: CheckCircle, description: 'Your order is ready! Head to the store to pick it up.' },
    PICKED_UP: { label: 'Completed', color: 'text-gray-500', icon: CheckCircle, description: 'Order has been picked up. Thank you!' },
    CANCELLED: { label: 'Cancelled', color: 'text-red-500', icon: XCircle, description: 'This order has been cancelled by the store.' },
};

export default function OrderStatusPage() {
    const params = useParams();
    const orderNumber = params.orderNumber as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchOrder() {
        try {
            const res = await fetch(`/api/public/storefront/order/${orderNumber}`);
            if (!res.ok) {
                setError('Order not found');
                setLoading(false);
                return;
            }
            const data = await res.json();
            setOrder(data);
        } catch {
            setError('Failed to load order');
        }
        setLoading(false);
    }

    useEffect(() => { fetchOrder(); }, [orderNumber]);

    // Auto-refresh for active orders
    useEffect(() => {
        if (!order || order.status === 'PICKED_UP' || order.status === 'CANCELLED') return;
        const interval = setInterval(fetchOrder, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, [order?.status]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <XCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <h1 className="text-xl font-bold text-gray-800">{error || 'Order not found'}</h1>
                </div>
            </div>
        );
    }

    const statusInfo = STATUS_INFO[order.status] || STATUS_INFO.PENDING;
    const StatusIcon = statusInfo.icon;

    return (
        <div className="max-w-lg mx-auto px-4 py-8">
            {/* Status Header */}
            <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-4 ${statusInfo.color}`}>
                    <StatusIcon size={40} />
                </div>
                <h1 className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</h1>
                <p className="text-gray-500 mt-1 text-sm">{statusInfo.description}</p>
                <p className="text-lg font-mono font-bold text-gray-900 mt-3 bg-gray-100 inline-block px-4 py-2 rounded-xl">
                    {order.orderNumber}
                </p>
            </div>

            {/* Pickup Info */}
            {order.pickupTime && order.status !== 'PICKED_UP' && order.status !== 'CANCELLED' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 text-center">
                    <p className="text-sm text-orange-700 font-medium">Estimated Ready</p>
                    <p className="text-lg font-bold text-orange-800">
                        {new Date(order.pickupTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                </div>
            )}

            {/* Store Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Pickup Location</h3>
                <div className="space-y-2 text-sm">
                    <p className="font-medium text-gray-800">{order.store.name}</p>
                    {order.store.address && (
                        <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(order.store.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-orange-600 hover:underline"
                        >
                            <MapPin size={14} />
                            {order.store.address}
                        </a>
                    )}
                    {order.store.phone && (
                        <a href={`tel:${order.store.phone}`} className="flex items-center gap-2 text-orange-600 hover:underline">
                            <Phone size={14} />
                            {order.store.phone}
                        </a>
                    )}
                </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                    {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                                {item.quantity}× {item.name}
                            </span>
                            <span className="font-medium text-gray-900">${item.total.toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Est. Tax</span>
                            <span>${order.estimatedTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900">
                            <span>Est. Total</span>
                            <span>${order.estimatedTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                {order.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <strong>Notes:</strong> {order.notes}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
                {order.status !== 'PICKED_UP' && order.status !== 'CANCELLED' && (
                    <button
                        onClick={fetchOrder}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                        <RefreshCw size={16} />
                        Refresh Status
                    </button>
                )}
                <Link
                    href={`/s/${order.store.slug}`}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Store
                </Link>
            </div>

            <p className="text-xs text-gray-400 text-center mt-6">
                Placed {new Date(order.placedAt).toLocaleString()} · Final price at register
            </p>
        </div>
    );
}

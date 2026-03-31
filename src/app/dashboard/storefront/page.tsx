'use client';

import { useState, useEffect } from 'react';
import {
    Store, Settings, ShoppingBag, CheckCircle, Clock, XCircle,
    Copy, ExternalLink, Eye, EyeOff, Package, Phone, RefreshCw, Bell
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface StorefrontConfig {
    id: string;
    isEnabled: boolean;
    headline: string | null;
    showAllCategories: boolean;
    visibleCategoryIds: string | null;
    hideOutOfStock: boolean;
    pickupEnabled: boolean;
    pickupLeadMinutes: number;
    maxOrdersPerSlot: number;
    minOrderAmount: number | null;
    maxItemsPerOrder: number;
    orderNotesEnabled: boolean;
}

interface StorefrontOrderData {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    status: string;
    subtotal: number;
    estimatedTotal: number;
    notes: string | null;
    pickupTime: string | null;
    createdAt: string;
    items: { itemName: string; quantity: number; price: number; total: number }[];
}

interface CategoryOption {
    id: string;
    name: string;
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-500/20 text-amber-400',
    CONFIRMED: 'bg-blue-500/20 text-blue-400',
    READY: 'bg-green-500/20 text-green-400',
    PICKED_UP: 'bg-stone-500/20 text-stone-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
};

export default function StorefrontDashboard() {
    const [tab, setTab] = useState<'settings' | 'orders'>('settings');
    const [config, setConfig] = useState<StorefrontConfig | null>(null);
    const [location, setLocation] = useState<{ id: string; name: string; slug: string } | null>(null);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [orders, setOrders] = useState<StorefrontOrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [orderFilter, setOrderFilter] = useState<string | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    // Fetch config
    async function fetchConfig() {
        try {
            const res = await fetch('/api/storefront/config');
            if (res.ok) {
                const data = await res.json();
                setConfig(data.config);
                setLocation(data.location);
                setCategories(data.categories || []);
            }
        } catch {}
        setLoading(false);
    }

    // Fetch orders
    async function fetchOrders() {
        try {
            const params = orderFilter ? `?status=${orderFilter}` : '';
            const res = await fetch(`/api/storefront/orders${params}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch {}
    }

    useEffect(() => { fetchConfig(); }, []);
    useEffect(() => { if (tab === 'orders') fetchOrders(); }, [tab, orderFilter]);

    // Auto-refresh orders
    useEffect(() => {
        if (tab !== 'orders') return;
        const interval = setInterval(fetchOrders, 15000);
        return () => clearInterval(interval);
    }, [tab, orderFilter]);

    // Save config
    async function updateConfig(updates: Partial<StorefrontConfig>) {
        setSaving(true);
        try {
            const res = await fetch('/api/storefront/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const data = await res.json();
                setConfig(data.config);
                setToast({ message: 'Settings saved', type: 'success' });
            } else {
                setToast({ message: 'Failed to save', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error saving settings', type: 'error' });
        }
        setSaving(false);
    }

    // Update order status
    async function updateOrderStatus(orderId: string, status: string) {
        try {
            const res = await fetch(`/api/storefront/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setToast({ message: `Order ${status.toLowerCase()}`, type: 'success' });
                fetchOrders();
            } else {
                const data = await res.json();
                setToast({ message: data.error || 'Failed to update', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error updating order', type: 'error' });
        }
    }

    function copyLink() {
        if (!location) return;
        const url = `${window.location.origin}/s/${location.slug}`;
        navigator.clipboard.writeText(url);
        setToast({ message: 'Storefront link copied!', type: 'success' });
    }

    const pendingCount = orders.filter(o => o.status === 'PENDING').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
        );
    }

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <Store className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">ORO 9 Storefront</h1>
                        <p className="text-stone-400 text-sm">Online ordering for your store</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        tab === 'settings' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                >
                    <Settings size={16} />
                    Settings
                </button>
                <button
                    onClick={() => setTab('orders')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors relative ${
                        tab === 'orders' ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                >
                    <ShoppingBag size={16} />
                    Orders
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Settings Tab */}
            {tab === 'settings' && config && (
                <div className="space-y-4">
                    {/* Enable Toggle + Link */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-stone-100">Enable Storefront</h3>
                                <p className="text-sm text-stone-400">Make your store visible online</p>
                            </div>
                            <button
                                onClick={() => updateConfig({ isEnabled: !config.isEnabled })}
                                disabled={saving}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                    config.isEnabled ? 'bg-green-500' : 'bg-stone-600'
                                }`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                    config.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                        {config.isEnabled && location && (
                            <div className="flex items-center gap-2 bg-stone-700/50 rounded-lg px-3 py-2">
                                <span className="text-sm text-stone-300 flex-1 truncate">
                                    {window.location.origin}/s/{location.slug}
                                </span>
                                <button onClick={copyLink} className="p-1.5 hover:bg-stone-600 rounded text-stone-400 hover:text-stone-200">
                                    <Copy size={14} />
                                </button>
                                <a href={`/s/${location.slug}`} target="_blank" className="p-1.5 hover:bg-stone-600 rounded text-stone-400 hover:text-stone-200">
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Headline */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                        <h3 className="font-semibold text-stone-100 mb-2">Store Headline</h3>
                        <input
                            type="text"
                            defaultValue={config.headline || ''}
                            placeholder={`Welcome to ${location?.name || 'our store'}`}
                            onBlur={e => updateConfig({ headline: e.target.value || null })}
                            className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {/* Category Visibility */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-stone-100">Show All Categories</h3>
                                <p className="text-sm text-stone-400">Turn off to pick specific categories</p>
                            </div>
                            <button
                                onClick={() => updateConfig({ showAllCategories: !config.showAllCategories })}
                                disabled={saving}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                    config.showAllCategories ? 'bg-green-500' : 'bg-stone-600'
                                }`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                    config.showAllCategories ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                        {!config.showAllCategories && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                {categories.map(cat => {
                                    const selected = config.visibleCategoryIds
                                        ? JSON.parse(config.visibleCategoryIds).includes(cat.id)
                                        : false;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                const current = config.visibleCategoryIds
                                                    ? JSON.parse(config.visibleCategoryIds) as string[]
                                                    : [];
                                                const updated = selected
                                                    ? current.filter((id: string) => id !== cat.id)
                                                    : [...current, cat.id];
                                                updateConfig({ visibleCategoryIds: updated as any });
                                            }}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                                                selected
                                                    ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                                                    : 'border-stone-700 text-stone-300 hover:border-stone-600'
                                            }`}
                                        >
                                            {selected ? <Eye size={12} className="inline mr-1" /> : <EyeOff size={12} className="inline mr-1" />}
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pickup Settings */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                        <h3 className="font-semibold text-stone-100 mb-3">Pickup Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Lead Time (minutes)</label>
                                <input
                                    type="number"
                                    defaultValue={config.pickupLeadMinutes}
                                    min={5}
                                    max={120}
                                    onBlur={e => updateConfig({ pickupLeadMinutes: parseInt(e.target.value) || 30 })}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Max Orders/Slot</label>
                                <input
                                    type="number"
                                    defaultValue={config.maxOrdersPerSlot}
                                    min={1}
                                    max={100}
                                    onBlur={e => updateConfig({ maxOrdersPerSlot: parseInt(e.target.value) || 10 })}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <span className="text-stone-200 text-sm">Hide Out-of-Stock Items</span>
                            </div>
                            <button
                                onClick={() => updateConfig({ hideOutOfStock: !config.hideOutOfStock })}
                                disabled={saving}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                    config.hideOutOfStock ? 'bg-green-500' : 'bg-stone-600'
                                }`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                    config.hideOutOfStock ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Tab */}
            {tab === 'orders' && (
                <div>
                    {/* Status Filter Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                        {[
                            { id: null, label: 'All' },
                            { id: 'PENDING', label: 'Pending' },
                            { id: 'CONFIRMED', label: 'Confirmed' },
                            { id: 'READY', label: 'Ready' },
                            { id: 'PICKED_UP', label: 'Done' },
                        ].map(f => (
                            <button
                                key={f.id || 'all'}
                                onClick={() => setOrderFilter(f.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                    orderFilter === f.id ? 'bg-orange-500 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                        <button onClick={fetchOrders} className="ml-auto p-2 text-stone-400 hover:text-stone-200">
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {/* Orders List */}
                    {orders.length === 0 ? (
                        <div className="text-center py-12">
                            <Package size={48} className="mx-auto text-stone-600 mb-4" />
                            <h3 className="text-lg font-semibold text-stone-300">No orders</h3>
                            <p className="text-stone-500 text-sm">Orders will appear here when customers place them</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map(order => (
                                <div key={order.id} className="bg-stone-800/50 border border-stone-700 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-orange-400">{order.orderNumber}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-stone-100">${order.estimatedTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-stone-400">
                                            <span>{order.customerName}</span>
                                            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        </div>
                                    </button>

                                    {expandedOrder === order.id && (
                                        <div className="border-t border-stone-700 p-4">
                                            {/* Customer */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <Phone size={14} className="text-stone-500" />
                                                <a href={`tel:${order.customerPhone}`} className="text-orange-400 text-sm hover:underline">
                                                    {order.customerPhone}
                                                </a>
                                            </div>

                                            {/* Items */}
                                            <div className="space-y-1 mb-4">
                                                {order.items.map((item, i) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <span className="text-stone-300">{item.quantity}× {item.itemName}</span>
                                                        <span className="text-stone-400">${item.total.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {order.notes && (
                                                <div className="bg-stone-700/50 rounded-lg p-2 text-sm text-stone-300 mb-4">
                                                    <strong>Notes:</strong> {order.notes}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                {order.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                                                            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm"
                                                        >
                                                            ✓ Accept
                                                        </button>
                                                        <button
                                                            onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                                                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium text-sm"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {order.status === 'CONFIRMED' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'READY')}
                                                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm"
                                                    >
                                                        Mark Ready for Pickup
                                                    </button>
                                                )}
                                                {order.status === 'READY' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'PICKED_UP')}
                                                        className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm"
                                                    >
                                                        Picked Up ✓
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, ChefHat, AlertTriangle, RotateCcw, Volume2, VolumeX, Maximize } from 'lucide-react';

interface KitchenItem {
    id: string;
    name: string;
    quantity: number;
    category: string;
    bumped: boolean;
}

interface KitchenOrder {
    id: string;
    orderNumber: string;
    createdAt: string;
    elapsedMinutes: number;
    urgency: 'green' | 'yellow' | 'orange' | 'red';
    status: 'NEW' | 'PREPARING' | 'READY';
    employeeName: string;
    items: KitchenItem[];
    itemCount: number;
}

interface KDSStats {
    total: number;
    new: number;
    preparing: number;
    ready: number;
    avgWaitMinutes: number;
}

const URGENCY_COLORS = {
    green: { bg: 'bg-green-900/40', border: 'border-green-500/50', text: 'text-green-400', header: 'bg-green-600' },
    yellow: { bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', text: 'text-yellow-400', header: 'bg-yellow-600' },
    orange: { bg: 'bg-orange-900/30', border: 'border-orange-500/50', text: 'text-orange-400', header: 'bg-orange-600' },
    red: { bg: 'bg-red-900/30', border: 'border-red-500/50', text: 'text-red-400', header: 'bg-red-600 animate-pulse' },
};

export default function KitchenDisplayPage() {
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [stats, setStats] = useState<KDSStats | null>(null);
    const [completedOrders, setCompletedOrders] = useState<string[]>([]);
    const [bumpedItems, setBumpedItems] = useState<Set<string>>(new Set());
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lastOrderCount, setLastOrderCount] = useState(0);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/pos/kitchen-display');
            const data = await res.json();
            const filtered = (data.orders || []).filter(
                (o: KitchenOrder) => !completedOrders.includes(o.id)
            );
            // Play sound if new orders arrive
            if (soundEnabled && filtered.length > lastOrderCount && lastOrderCount > 0) {
                try { new Audio('/sounds/ding.mp3').play(); } catch { }
            }
            setLastOrderCount(filtered.length);
            setOrders(filtered);
            setStats(data.stats || null);
        } catch { }
    }, [completedOrders, soundEnabled, lastOrderCount]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const handleBumpItem = (orderId: string, itemId: string) => {
        setBumpedItems(prev => new Set(prev).add(`${orderId}:${itemId}`));
        fetch('/api/pos/kitchen-display', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bump', orderId, itemId }),
        });
    };

    const handleCompleteOrder = (orderId: string) => {
        setCompletedOrders(prev => [...prev, orderId]);
        fetch('/api/pos/kitchen-display', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete', orderId }),
        });
    };

    const handleRecall = (orderId: string) => {
        setCompletedOrders(prev => prev.filter(id => id !== orderId));
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const allItemsBumped = (order: KitchenOrder) =>
        order.items.every(item => bumpedItems.has(`${order.id}:${item.id}`));

    const formatTime = (minutes: number) => {
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* KDS Top Bar */}
            <div className="bg-stone-950 border-b border-stone-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ChefHat size={24} className="text-orange-400" />
                    <h1 className="text-lg font-bold">Kitchen Display</h1>
                    <span className="text-xs text-stone-500 ml-2">
                        {new Date().toLocaleTimeString()}
                    </span>
                </div>

                {/* Stats Bar */}
                {stats && (
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-blue-400 font-medium">{stats.new} New</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                            <span className="text-yellow-400 font-medium">{stats.preparing} Making</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                            <span className="text-green-400 font-medium">{stats.ready} Ready</span>
                        </div>
                        <div className="text-stone-400">
                            <Clock size={14} className="inline mr-1" />
                            Avg {stats.avgWaitMinutes}m
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 rounded-lg hover:bg-stone-800 transition-colors"
                        title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}
                    >
                        {soundEnabled
                            ? <Volume2 size={18} className="text-green-400" />
                            : <VolumeX size={18} className="text-stone-500" />
                        }
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg hover:bg-stone-800 transition-colors"
                        title="Fullscreen"
                    >
                        <Maximize size={18} className="text-stone-400" />
                    </button>
                </div>
            </div>

            {/* Order Grid */}
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-min">
                {orders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 text-stone-600">
                        <ChefHat size={64} className="mb-4 opacity-30" />
                        <p className="text-xl font-medium">All Clear</p>
                        <p className="text-sm">No orders in kitchen. Waiting for next order...</p>
                    </div>
                )}

                {orders.map(order => {
                    const colors = URGENCY_COLORS[order.urgency];
                    const isDone = allItemsBumped(order);

                    return (
                        <div
                            key={order.id}
                            className={`rounded-xl border-2 overflow-hidden ${colors.border} ${isDone ? 'opacity-60' : ''} transition-all`}
                        >
                            {/* Order Header */}
                            <div className={`${colors.header} px-3 py-2 flex items-center justify-between`}>
                                <span className="font-bold text-white text-lg">{order.orderNumber}</span>
                                <div className="flex items-center gap-2 text-white/80 text-xs">
                                    <Clock size={12} />
                                    <span className="font-mono font-bold">{formatTime(order.elapsedMinutes)}</span>
                                </div>
                            </div>

                            {/* Order Meta */}
                            <div className={`${colors.bg} px-3 py-1.5 flex items-center justify-between text-xs`}>
                                <span className="text-stone-400">{order.employeeName}</span>
                                <span className={`font-semibold ${colors.text}`}>
                                    {order.status === 'NEW' && '🆕 NEW'}
                                    {order.status === 'PREPARING' && '🔥 MAKING'}
                                    {order.status === 'READY' && '✅ READY'}
                                </span>
                            </div>

                            {/* Items */}
                            <div className="bg-stone-950 divide-y divide-stone-800/50">
                                {order.items.map(item => {
                                    const isBumped = bumpedItems.has(`${order.id}:${item.id}`);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleBumpItem(order.id, item.id)}
                                            className={`w-full px-3 py-2 text-left flex items-center justify-between transition-all ${isBumped
                                                    ? 'bg-green-900/20 line-through text-stone-600'
                                                    : 'hover:bg-stone-900 active:bg-stone-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isBumped ? (
                                                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <span className="w-4 h-4 rounded border border-stone-600 flex-shrink-0" />
                                                )}
                                                <span className="text-sm font-medium truncate">{item.name}</span>
                                            </div>
                                            <span className={`text-sm font-bold ml-2 flex-shrink-0 ${isBumped ? 'text-stone-600' : 'text-white'}`}>
                                                x{item.quantity}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Complete Button */}
                            <div className="p-2 bg-stone-950">
                                <button
                                    onClick={() => handleCompleteOrder(order.id)}
                                    className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${isDone
                                            ? 'bg-green-600 hover:bg-green-500 text-white'
                                            : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                                        }`}
                                >
                                    {isDone ? '✅ DONE — Bump Order' : `${order.items.filter(i => bumpedItems.has(`${order.id}:${i.id}`)).length}/${order.items.length} Items`}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completed Orders (recall bar) */}
            {completedOrders.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-700 px-4 py-2 flex items-center gap-2">
                    <RotateCcw size={14} className="text-stone-500" />
                    <span className="text-xs text-stone-500 mr-2">Completed:</span>
                    {completedOrders.slice(-5).map(id => (
                        <button
                            key={id}
                            onClick={() => handleRecall(id)}
                            className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-xs text-stone-400 rounded-lg transition-colors"
                        >
                            Recall {id.slice(0, 6)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

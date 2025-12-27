'use client';

import { useState } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';

interface OfflineStatusProps {
    isOnline: boolean;
    isReady: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    pendingCount: number;
    productCount: number;
    onSync?: () => void;
}

export function OfflineStatusIndicator({
    isOnline,
    isReady,
    isSyncing,
    lastSync,
    pendingCount,
    productCount,
    onSync
}: OfflineStatusProps) {
    const [showDetails, setShowDetails] = useState(false);

    if (!isReady) return null;

    const formatLastSync = () => {
        if (!lastSync) return 'Never';
        const now = new Date();
        const diff = now.getTime() - new Date(lastSync).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return new Date(lastSync).toLocaleDateString();
    };

    return (
        <div className="relative">
            {/* Status Button */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!isOnline
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : pendingCount > 0
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
            >
                {!isOnline ? (
                    <>
                        <WifiOff className="h-4 w-4" />
                        <span>Offline</span>
                    </>
                ) : pendingCount > 0 ? (
                    <>
                        <Cloud className="h-4 w-4" />
                        <span>{pendingCount} Pending</span>
                    </>
                ) : isSyncing ? (
                    <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Syncing...</span>
                    </>
                ) : (
                    <>
                        <Wifi className="h-4 w-4" />
                        <span>Online</span>
                    </>
                )}
            </button>

            {/* Dropdown Details */}
            {showDetails && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-stone-900 border border-stone-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-stone-800">
                        <div className="flex items-center gap-3">
                            {isOnline ? (
                                <div className="h-10 w-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                    <Wifi className="h-5 w-5 text-emerald-400" />
                                </div>
                            ) : (
                                <div className="h-10 w-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                    <WifiOff className="h-5 w-5 text-amber-400" />
                                </div>
                            )}
                            <div>
                                <div className="font-semibold">
                                    {isOnline ? 'Connected' : 'Offline Mode'}
                                </div>
                                <div className="text-sm text-stone-400">
                                    {isOnline
                                        ? 'All features available'
                                        : 'Cash payments only'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-stone-400">Products cached</span>
                            <span className="font-medium">{productCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-400">Pending transactions</span>
                            <span className={`font-medium ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {pendingCount}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-400">Last sync</span>
                            <span className="font-medium">{formatLastSync()}</span>
                        </div>
                    </div>

                    {pendingCount > 0 && !isOnline && (
                        <div className="px-4 pb-3">
                            <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-amber-400 text-xs">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>{pendingCount} sale(s) will sync when back online</span>
                            </div>
                        </div>
                    )}

                    {isOnline && onSync && (
                        <div className="p-4 pt-0">
                            <button
                                onClick={() => {
                                    onSync();
                                    setShowDetails(false);
                                }}
                                disabled={isSyncing}
                                className="w-full py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Offline Mode Banner */}
            {!isOnline && (
                <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-black py-2 px-4 text-center text-sm font-medium z-50">
                    <WifiOff className="inline h-4 w-4 mr-2" />
                    Offline Mode - Cash payments only. Sales will sync when connection returns.
                </div>
            )}
        </div>
    );
}

'use client'

import { useState, useEffect } from 'react'
import {
    X, History, ArrowUp, ArrowDown, DollarSign, TrendingDown,
    TrendingUp, Truck, Package, Clock
} from 'lucide-react'

interface ProductHistoryModalProps {
    isOpen: boolean
    onClose: () => void
    productId: string
    productName: string
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; label: string; bg: string }> = {
    ADJUSTMENT: { icon: Package, color: 'text-amber-400', label: 'Stock Adjustment', bg: 'bg-amber-500/15' },
    PRICE_CHANGE: { icon: DollarSign, color: 'text-green-400', label: 'Price Change', bg: 'bg-green-500/15' },
    COST_CHANGE: { icon: TrendingDown, color: 'text-blue-400', label: 'Cost Change', bg: 'bg-blue-500/15' },
    INVOICE_RECEIVED: { icon: Truck, color: 'text-purple-400', label: 'Invoice Received', bg: 'bg-purple-500/15' },
}

export default function ProductHistoryModal({
    isOpen,
    onClose,
    productId,
    productName
}: ProductHistoryModalProps) {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen && productId) {
            setLoading(true)
            fetch(`/api/inventory/product-history?productId=${productId}`)
                .then(r => r.json())
                .then(data => { setEvents(data.events || []); setLoading(false) })
                .catch(() => setLoading(false))
        }
        if (!isOpen) {
            setEvents([])
            setLoading(true)
        }
    }, [isOpen, productId])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="bg-stone-900 rounded-2xl w-full max-w-lg max-h-[80vh] border border-stone-700 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <History className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-white">Product History</h2>
                            <p className="text-sm text-stone-400 truncate">{productName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-lg flex-shrink-0">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center py-12 text-stone-500">Loading history...</div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                            <p className="text-stone-500">No history recorded for this product.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map((event: any, i: number) => {
                                const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.ADJUSTMENT
                                const Icon = config.icon
                                return (
                                    <div key={i} className={`${config.bg} border border-stone-800 rounded-xl p-3`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg bg-stone-900/50 ${config.color} flex-shrink-0`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                                                    <span className="text-xs text-stone-500">
                                                        {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Event-specific details */}
                                                {event.type === 'ADJUSTMENT' && (
                                                    <div className="mt-1">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            {event.quantity > 0 ? (
                                                                <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                                                            ) : (
                                                                <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                                                            )}
                                                            <span className={event.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                                {event.quantity > 0 ? '+' : ''}{event.quantity}
                                                            </span>
                                                            {event.previousStock != null && (
                                                                <span className="text-stone-500">
                                                                    ({event.previousStock} → {event.newStock})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-stone-500">{event.reason}</span>
                                                            {event.notes && <span className="text-xs text-stone-600">• {event.notes}</span>}
                                                        </div>
                                                    </div>
                                                )}

                                                {event.type === 'PRICE_CHANGE' && (
                                                    <div className="mt-1 text-sm">
                                                        {event.oldPrice != null && event.newPrice != null && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-stone-500">Price:</span>
                                                                <span className="text-stone-400">${Number(event.oldPrice).toFixed(2)}</span>
                                                                <span className="text-stone-600">→</span>
                                                                <span className={event.newPrice > event.oldPrice ? 'text-emerald-400' : 'text-red-400'}>
                                                                    ${Number(event.newPrice).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {event.oldCost != null && event.newCost != null && event.oldCost !== event.newCost && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-stone-500">Cost:</span>
                                                                <span className="text-stone-400">${Number(event.oldCost).toFixed(2)}</span>
                                                                <span className="text-stone-600">→</span>
                                                                <span className="text-blue-400">${Number(event.newCost).toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {event.changedBy && (
                                                            <span className="text-xs text-stone-600">by {event.changedBy}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {event.type === 'COST_CHANGE' && (
                                                    <div className="mt-1 text-sm">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-stone-400">${Number(event.oldCost || 0).toFixed(2)}</span>
                                                            <span className="text-stone-600">→</span>
                                                            <span className="text-blue-400">${Number(event.newCost || 0).toFixed(2)}</span>
                                                            {event.changePct != null && (
                                                                <span className={`text-xs ${event.changePct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                    ({event.changePct > 0 ? '+' : ''}{Number(event.changePct).toFixed(1)}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-stone-600">{event.sourceType}</span>
                                                    </div>
                                                )}

                                                {event.type === 'INVOICE_RECEIVED' && (
                                                    <div className="mt-1 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-stone-300">{event.quantity} units</span>
                                                            {event.unitCost && (
                                                                <span className="text-stone-500">@ ${Number(event.unitCost).toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                        {event.vendorName && (
                                                            <span className="text-xs text-stone-500">
                                                                {event.vendorName}
                                                                {event.invoiceNumber && ` • #${event.invoiceNumber}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

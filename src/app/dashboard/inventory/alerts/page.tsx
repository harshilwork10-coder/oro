'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Package, ShoppingCart, ArrowRight, ArrowLeft } from 'lucide-react'


type Alert = {
    id: string
    productName: string
    currentStock: number
    reorderPoint: number
    supplier: string
    lastOrdered: string
}

export default function InventoryAlertsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)

    const locationId = 'your-location-id' // TODO: Get from session

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAlerts()
        }
    }, [status])

    async function fetchAlerts() {
        try {
            const res = await fetch(`/api/inventory/alerts?locationId=${locationId}`)
            if (res.ok) {
                const data = await res.json()
                setAlerts(data)
            }
        } catch (error) {
            console.error('Error fetching alerts:', error)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/dashboard/inventory/retail" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                    <ArrowLeft className="h-5 w-5 text-stone-400" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Inventory Alerts</h1>
                    <p className="text-stone-400">Low stock warnings and reorder suggestions</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl">
                            <AlertTriangle className="h-6 w-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Critical Stock</p>
                            <p className="text-2xl font-bold text-white">{alerts.filter(a => a.currentStock === 0).length} Items</p>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Package className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Low Stock</p>
                            <p className="text-2xl font-bold text-white">{alerts.filter(a => a.currentStock > 0).length} Items</p>
                        </div>
                    </div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <ShoppingCart className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">To Reorder</p>
                            <p className="text-2xl font-bold text-white">{alerts.length} Items</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Reorder Suggestions</h2>
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium">
                        Create Purchase Order
                    </button>
                </div>

                <div className="divide-y divide-white/5">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${alert.currentStock === 0 ? 'bg-red-500/20' : 'bg-yellow-500/20'
                                    }`}>
                                    <Package className={`h-6 w-6 ${alert.currentStock === 0 ? 'text-red-400' : 'text-yellow-400'
                                        }`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{alert.productName}</h3>
                                    <p className="text-sm text-stone-400">Supplier: {alert.supplier}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-xs text-stone-500 mb-1">Current Stock</p>
                                    <p className={`font-bold ${alert.currentStock === 0 ? 'text-red-400' : 'text-yellow-400'
                                        }`}>{alert.currentStock}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-stone-500 mb-1">Reorder Point</p>
                                    <p className="font-bold text-stone-300">{alert.reorderPoint}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-stone-500 mb-1">Last Ordered</p>
                                    <p className="text-stone-300 text-sm">{new Date(alert.lastOrdered).toLocaleDateString()}</p>
                                </div>
                                <button className="p-2 hover:bg-white/10 rounded-lg text-stone-400 hover:text-white transition-colors">
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {alerts.length === 0 && (
                    <div className="p-12 text-center">
                        <Package className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">Inventory Healthy</h3>
                        <p className="text-stone-400">No low stock items found</p>
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { Package, Truck, Search, Calendar } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Toast from '@/components/ui/Toast'

interface ShippingOrder {
    id: string
    numberOfStations: number
    status: string
    contractSignedAt: string | null
    shippingStatus: string | null
    trackingNumber: string | null
    carrier: string | null
    franchisor: {
        name: string
        owner: {
            name: string
            email: string
        }
    }
    location: {
        name: string
        address: string
    }
}

export default function ShippingManagementPage() {
    const [orders, setOrders] = useState<ShippingOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<ShippingOrder | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const [shippingData, setShippingData] = useState({
        trackingNumber: '',
        carrier: '',
        estimatedDelivery: ''
    })

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/admin/shipping/pending')
            if (res.ok) {
                const data = await res.json()
                setOrders(data.orders || [])
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleShip = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedOrder) return

        setSubmitting(true)
        try {
            const res = await fetch(`/api/admin/requests/${selectedOrder.id}/ship`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shippingData)
            })

            if (res.ok) {
                setToast({ message: 'Shipping info sent successfully!', type: 'success' })
                fetchOrders()
                closeModal()
            } else {
                setToast({ message: 'Failed to update shipping info', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    const openModal = (order: ShippingOrder) => {
        setSelectedOrder(order)
        setShippingData({
            trackingNumber: order.trackingNumber || '',
            carrier: order.carrier || '',
            estimatedDelivery: ''
        })
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedOrder(null)
        setShippingData({ trackingNumber: '', carrier: '', estimatedDelivery: '' })
    }

    const filteredOrders = orders.filter(order =>
        order.franchisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                    <Truck className="h-8 w-8 text-blue-500" />
                    Shipping Management
                </h1>
                <p className="text-stone-400 mt-1">Process and ship approved hardware orders</p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400">No orders ready to ship</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="glass-panel p-6 rounded-xl flex items-center justify-between hover:border-blue-500/30 transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-stone-100">
                                        {order.franchisor.name}
                                    </h3>
                                    {order.shippingStatus === 'SHIPPED' ? (
                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">Shipped</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">Ready to Ship</span>
                                    )}
                                </div>
                                <p className="text-sm text-stone-400 mb-1">
                                    <span className="font-medium text-stone-300">{order.location.name}</span> • {order.location.address}
                                </p>
                                <p className="text-xs text-stone-500">
                                    {order.numberOfStations} {order.numberOfStations === 1 ? 'Station' : 'Stations'} •
                                    Owner: {order.franchisor.owner.name}
                                </p>
                                {order.trackingNumber && (
                                    <div className="mt-2 flex items-center gap-2 text-xs">
                                        <span className="text-stone-500">Tracking:</span>
                                        <span className="font-mono text-blue-400">{order.trackingNumber}</span>
                                        <span className="text-stone-500">via {order.carrier}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => openModal(order)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Truck className="h-4 w-4" />
                                {order.shippingStatus === 'SHIPPED' ? 'Update Shipping' : 'Ship Order'}
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Shipping Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title="Ship Order"
            >
                {selectedOrder && (
                    <form onSubmit={handleShip} className="space-y-4">
                        <div className="bg-stone-900/50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-stone-400">Shipping to:</p>
                            <p className="text-white font-medium">{selectedOrder.location.name}</p>
                            <p className="text-sm text-stone-400">{selectedOrder.location.address}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Tracking Number *
                            </label>
                            <input
                                type="text"
                                value={shippingData.trackingNumber}
                                onChange={(e) => setShippingData({ ...shippingData, trackingNumber: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., 1Z999AA10123456784"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Carrier *
                            </label>
                            <select
                                value={shippingData.carrier}
                                onChange={(e) => setShippingData({ ...shippingData, carrier: e.target.value })}
                                required
                                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                                <option value="">Select carrier</option>
                                <option value="UPS">UPS</option>
                                <option value="FedEx">FedEx</option>
                                <option value="USPS">USPS</option>
                                <option value="DHL">DHL</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Estimated Delivery Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                <input
                                    type="date"
                                    value={shippingData.estimatedDelivery}
                                    onChange={(e) => setShippingData({ ...shippingData, estimatedDelivery: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-900/20 text-white font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Sending...' : 'Send Shipping Info'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

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

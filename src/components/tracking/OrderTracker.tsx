'use client'

import { CheckCircle2, Circle, Clock, Package, Truck, Home } from 'lucide-react'

interface OrderTrackerProps {
    request: {
        status: string
        createdAt: string
        approvedAt?: string | null
        contractSignedAt?: string | null
        shippingStatus?: string | null
        shippedAt?: string | null
        estimatedDelivery?: string | null
        deliveredAt?: string | null
        trackingNumber?: string | null
        carrier?: string | null
    }
}

export default function OrderTracker({ request }: OrderTrackerProps) {
    const steps = [
        {
            id: 'placed',
            label: 'Order Placed',
            icon: Circle,
            completed: !!request.createdAt,
            date: request.createdAt
        },
        {
            id: 'approved',
            label: 'Contract Sent',
            icon: Package,
            completed: !!request.approvedAt,
            date: request.approvedAt
        },
        {
            id: 'signed',
            label: 'Contract Signed',
            icon: CheckCircle2,
            completed: !!request.contractSignedAt,
            date: request.contractSignedAt
        },
        {
            id: 'shipped',
            label: 'Hardware Shipped',
            icon: Truck,
            completed: request.shippingStatus === 'SHIPPED' || request.shippingStatus === 'DELIVERED',
            date: request.shippedAt
        },
        {
            id: 'delivered',
            label: 'Delivered',
            icon: Home,
            completed: request.shippingStatus === 'DELIVERED',
            date: request.deliveredAt
        }
    ]

    const currentStep = steps.findIndex(step => !step.completed)
    const activeStepIndex = currentStep === -1 ? steps.length - 1 : currentStep

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-400" />
                Order Progress
            </h3>

            <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-stone-800" />
                <div
                    className="absolute left-6 top-8 w-0.5 bg-emerald-500 transition-all duration-500"
                    style={{ height: `${(activeStepIndex / (steps.length - 1)) * 100}%` }}
                />

                {/* Steps */}
                <div className="space-y-8 relative">
                    {steps.map((step, index) => {
                        const Icon = step.icon
                        const isActive = index === activeStepIndex
                        const isCompleted = step.completed

                        return (
                            <div key={step.id} className="flex items-start gap-4 relative">
                                {/* Icon */}
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all z-10 ${isCompleted
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                        : isActive
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-400 animate-pulse'
                                            : 'bg-stone-900 border-stone-700 text-stone-500'
                                    }`}>
                                    <Icon className="h-5 w-5" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-2">
                                    <h4 className={`font-semibold ${isCompleted ? 'text-stone-100' : 'text-stone-400'
                                        }`}>
                                        {step.label}
                                    </h4>
                                    {step.date && (
                                        <p className="text-xs text-stone-500 mt-1">
                                            {new Date(step.date).toLocaleString()}
                                        </p>
                                    )}
                                    {isActive && !isCompleted && (
                                        <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            In Progress
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Tracking Info */}
            {request.trackingNumber && (
                <div className="mt-6 pt-6 border-t border-stone-800">
                    <div className="bg-stone-900/50 rounded-lg p-4">
                        <p className="text-xs text-stone-500 mb-1">Tracking Number</p>
                        <p className="text-sm font-mono text-emerald-400">{request.trackingNumber}</p>
                        {request.carrier && (
                            <p className="text-xs text-stone-400 mt-1">Carrier: {request.carrier}</p>
                        )}
                        {request.estimatedDelivery && !request.deliveredAt && (
                            <p className="text-xs text-stone-400 mt-2">
                                Est. Delivery: {new Date(request.estimatedDelivery).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}


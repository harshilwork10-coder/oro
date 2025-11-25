'use client'

import { Clock, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CheckedInCustomer {
    id: string
    customerName: string
    service: string
    checkedInAt: Date
    queuePosition: number
}

export default function CheckInQueue() {
    const [queue, setQueue] = useState<CheckedInCustomer[]>([
        {
            id: '1',
            customerName: 'John D.',
            service: 'Haircut',
            checkedInAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
            queuePosition: 1
        },
        {
            id: '2',
            customerName: 'Maria S.',
            service: 'Color + Style',
            checkedInAt: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
            queuePosition: 2
        },
        {
            id: '3',
            customerName: 'David K.',
            service: 'Beard Trim',
            checkedInAt: new Date(Date.now() - 30 * 1000), // 30 sec ago
            queuePosition: 3
        }
    ])

    const getWaitTime = (checkedInAt: Date) => {
        const minutes = Math.floor((Date.now() - checkedInAt.getTime()) / 60000)
        if (minutes < 1) return 'Just now'
        if (minutes === 1) return '1 min ago'
        return `${minutes} min ago`
    }

    const getQueueEmoji = (position: number) => {
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        return emojis[position - 1] || `${position}`
    }

    return (
        <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                    <h3 className="font-bold text-stone-100">Check-In Queue</h3>
                    <p className="text-xs text-stone-500">Customers waiting</p>
                </div>
            </div>

            {queue.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No customers in queue</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {queue.map((customer) => (
                        <div
                            key={customer.id}
                            className="flex items-start gap-3 p-3 bg-stone-900/30 rounded-lg border border-stone-800 hover:border-orange-500/50 transition-colors"
                        >
                            <span className="text-2xl leading-none">{getQueueEmoji(customer.queuePosition)}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-stone-200 truncate">{customer.customerName}</p>
                                <p className="text-sm text-stone-400 truncate">{customer.service}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
                                    <Clock className="h-3 w-3" />
                                    <span>{getWaitTime(customer.checkedInAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

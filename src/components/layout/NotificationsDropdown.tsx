'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, Calendar, MessageSquare, AlertTriangle, DollarSign } from 'lucide-react'

interface Notification {
    id: string
    type: 'booking' | 'message' | 'alert' | 'payment'
    title: string
    description: string
    time: string
    read: boolean
}

// Demo notifications - in production, fetch from API
const DEMO_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'booking',
        title: 'New Booking',
        description: 'John Doe booked a haircut for 3:00 PM',
        time: '5 min ago',
        read: false
    },
    {
        id: '2',
        type: 'payment',
        title: 'Payment Received',
        description: '$150.00 from Jane Smith',
        time: '1 hour ago',
        read: false
    },
    {
        id: '3',
        type: 'alert',
        title: 'Low Inventory',
        description: 'Shampoo stock is running low',
        time: '2 hours ago',
        read: true
    }
]

const iconMap = {
    booking: Calendar,
    message: MessageSquare,
    alert: AlertTriangle,
    payment: DollarSign
}

const colorMap = {
    booking: 'bg-blue-500/20 text-blue-400',
    message: 'bg-purple-500/20 text-purple-400',
    alert: 'bg-yellow-500/20 text-yellow-400',
    payment: 'bg-green-500/20 text-green-400'
}

export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter(n => !n.read).length

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function markAsRead(id: string) {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
    }

    function markAllAsRead() {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    function dismissNotification(id: string) {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-stone-400 hover:text-stone-100 p-2 rounded-lg hover:bg-stone-800 transition-colors"
            >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-orange-400 hover:text-orange-300"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-stone-500">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const Icon = iconMap[notification.type]
                                const colorClass = colorMap[notification.type]
                                return (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 border-b border-stone-800 hover:bg-stone-800/50 transition-colors ${!notification.read ? 'bg-stone-800/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`font-medium ${!notification.read ? 'text-white' : 'text-stone-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <button
                                                        onClick={() => dismissNotification(notification.id)}
                                                        className="text-stone-500 hover:text-stone-300"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-stone-400 truncate">{notification.description}</p>
                                                <p className="text-xs text-stone-500 mt-1">{notification.time}</p>
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="text-xs text-orange-400 hover:text-orange-300 mt-2 flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Mark as read
                                            </button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-stone-700 bg-stone-900/50">
                        <button className="w-full text-center text-sm text-orange-400 hover:text-orange-300 py-1">
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}


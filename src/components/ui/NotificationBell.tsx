'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, X, Package, Clock, AlertTriangle, DollarSign, Info } from 'lucide-react'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    isRead: boolean
    createdAt: string
    data?: string
}

const TYPE_ICONS: Record<string, typeof Bell> = {
    LOW_INVENTORY: Package,
    SHIFT_STARTED: Clock,
    SHIFT_ENDED: Clock,
    LARGE_REFUND: DollarSign,
    STORE_OFFLINE: AlertTriangle,
    DAILY_SUMMARY: Info,
}

const TYPE_COLORS: Record<string, string> = {
    LOW_INVENTORY: 'text-orange-400 bg-orange-500/20',
    SHIFT_STARTED: 'text-emerald-400 bg-emerald-500/20',
    SHIFT_ENDED: 'text-blue-400 bg-blue-500/20',
    LARGE_REFUND: 'text-red-400 bg-red-500/20',
    STORE_OFFLINE: 'text-red-400 bg-red-500/20',
    DAILY_SUMMARY: 'text-purple-400 bg-purple-500/20',
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = useCallback(async function () {
        try {
            const res = await fetch('/api/notifications?limit=10')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications || [])
                setUnreadCount(data.unreadCount || 0)
            }
        } catch (e) {
            console.error('Failed to fetch notifications', e)
        }
    }, [])

    async function markAsRead(id: string) {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            })
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (e) {
            console.error('Failed to mark as read', e)
        }
    }

    async function markAllRead() {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true })
            })
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
        } catch (e) {
            console.error('Failed to mark all as read', e)
        }
    }

    useEffect(() => {
        fetchNotifications()
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

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

    function formatTime(dateStr: string) {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-stone-800 transition-colors"
            >
                <Bell className="h-5 w-5 text-stone-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-stone-700">
                        <h3 className="font-semibold text-stone-100">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-purple-400 hover:text-purple-300"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-stone-500">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notif => {
                                const Icon = TYPE_ICONS[notif.type] || Bell
                                const colorClass = TYPE_COLORS[notif.type] || 'text-stone-400 bg-stone-700'

                                return (
                                    <div
                                        key={notif.id}
                                        className={`p-3 border-b border-stone-800 hover:bg-stone-800/50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-stone-800/30' : ''
                                            }`}
                                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`p-2 rounded-lg ${colorClass.split(' ')[1]}`}>
                                                <Icon className={`h-4 w-4 ${colorClass.split(' ')[0]}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium ${!notif.isRead ? 'text-stone-100' : 'text-stone-400'}`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.isRead && (
                                                        <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-stone-600 mt-1">
                                                    {formatTime(notif.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-2 border-t border-stone-700">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-2 text-center text-sm text-stone-400 hover:text-stone-200"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}


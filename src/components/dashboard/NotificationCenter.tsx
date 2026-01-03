'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info } from 'lucide-react'

type Notification = {
    id: string
    type: 'success' | 'info' | 'warning' | 'error'
    title: string
    message: string
    timestamp: string
    read: boolean
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/admin/notifications')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    async function markAsRead(id: string) {
        try {
            await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            )
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    async function clearAll() {
        try {
            await fetch('/api/admin/notifications/clear', { method: 'POST' })
            setNotifications([])
        } catch (error) {
            console.error('Error clearing notifications:', error)
        }
    }

    useEffect(() => {
        fetchNotifications()
        // Poll for new notifications every minute
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    const unreadCount = notifications.filter(n => !n.read).length

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return Check
            case 'warning': return AlertCircle
            case 'error': return AlertCircle
            default: return Info
        }
    }

    const getColor = (type: string) => {
        switch (type) {
            case 'success': return 'emerald'
            case 'warning': return 'amber'
            case 'error': return 'red'
            default: return 'blue'
        }
    }

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-stone-400 hover:text-white transition-colors">
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 glass-panel rounded-2xl border border-stone-700 shadow-2xl z-50">
                        {/* Header */}
                        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                            <h3 className="font-bold text-stone-100">Notifications</h3>
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-xs text-stone-400 hover:text-purple-400 transition-colors">
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="h-12 w-12 text-stone-700 mx-auto mb-3" />
                                    <p className="text-stone-400">No notifications</p>
                                </div>
                            ) : (
                                notifications.map((notification) => {
                                    const Icon = getIcon(notification.type)
                                    const color = getColor(notification.type)

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`p-4 border-b border-stone-800/50 hover:bg-stone-900/30 transition-all cursor-pointer ${!notification.read ? 'bg-purple-500/5' : ''
                                                }`}
                                            onClick={() => markAsRead(notification.id)}>
                                            <div className="flex gap-3">
                                                <div className={`h-8 w-8 rounded-lg bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`h-4 w-4 text-${color}-400`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-stone-100 mb-1">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-stone-400">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-stone-500 mt-2">
                                                        {new Date(notification.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <div className="h-2 w-2 bg-purple-500 rounded-full flex-shrink-0 mt-2"></div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}


'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Bell, RefreshCw, Send, Users, Store,
    MessageSquare, Mail, Smartphone, CheckCircle
} from 'lucide-react'

interface Template {
    id: string
    name: string
    icon: string
    title: string
    body: string
    audience: string
}

interface HistoryItem {
    id: string
    type: string
    title: string
    body: string
    audience: string
    sentAt: string
    sentTo: number
    opened: number
}

export default function NotificationsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
    const [templates, setTemplates] = useState<Template[]>([])
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [audience, setAudience] = useState<any>({})
    const [message, setMessage] = useState('')

    // Form state
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [targetAudience, setTargetAudience] = useState('employees')
    const [targetLocation, setTargetLocation] = useState('all')
    const [channel, setChannel] = useState('push')

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/owner/notifications')
            const data = await res.json()

            setLocations(data.locations || [])
            setTemplates(data.templates || [])
            setHistory(data.history || [])
            setAudience(data.audience || {})
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const selectTemplate = (template: Template) => {
        setTitle(template.title)
        setBody(template.body)
        if (template.audience !== 'all') {
            setTargetAudience(template.audience)
        }
    }

    const sendNotification = async () => {
        if (!title || !body) return
        setSending(true)
        setMessage('')
        try {
            const res = await fetch('/api/owner/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    message: body,
                    audience: targetAudience,
                    locationId: targetLocation,
                    channel
                })
            })
            const data = await res.json()
            if (res.ok) {
                setMessage(`✓ ${data.message}`)
                setTitle('')
                setBody('')
                fetchData()
            }
        } catch (error) {
            setMessage('Failed to send')
        } finally {
            setSending(false)
        }
    }

    const getEstimatedRecipients = () => {
        switch (targetAudience) {
            case 'employees': return audience.employees || 0
            case 'managers': return audience.managers || 0
            case 'customers': return audience.customers || 0
            case 'all': return (audience.employees || 0) + (audience.customers || 0)
            default: return 0
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Bell className="h-8 w-8 text-violet-500" />
                            Push Notifications
                        </h1>
                        <p className="text-stone-400">Send alerts to employees and customers</p>
                    </div>
                </div>
                <button onClick={fetchData} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl">
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compose */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Templates */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-bold mb-4">Quick Templates</h3>
                        <div className="flex gap-2 flex-wrap">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => selectTemplate(template)}
                                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl flex items-center gap-2"
                                >
                                    <span>{template.icon}</span>
                                    <span>{template.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compose Form */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-bold mb-4">Compose Message</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Notification title..."
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-stone-400">Message</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Type your message..."
                                    rows={4}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm text-stone-400">Audience</label>
                                    <select
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="employees">Employees</option>
                                        <option value="managers">Managers Only</option>
                                        <option value="customers">Customers</option>
                                        <option value="all">Everyone</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-stone-400">Location</label>
                                    <select
                                        value={targetLocation}
                                        onChange={(e) => setTargetLocation(e.target.value)}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="all">All Locations</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-stone-400">Channel</label>
                                    <select
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="push">Push Only</option>
                                        <option value="sms">SMS Only</option>
                                        <option value="email">Email Only</option>
                                        <option value="all">All Channels</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-stone-800 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-violet-400" />
                                    <span>Estimated Recipients:</span>
                                    <span className="font-bold">{getEstimatedRecipients().toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {channel === 'push' || channel === 'all' ? <Bell className="h-4 w-4 text-violet-400" /> : null}
                                    {channel === 'sms' || channel === 'all' ? <Smartphone className="h-4 w-4 text-emerald-400" /> : null}
                                    {channel === 'email' || channel === 'all' ? <Mail className="h-4 w-4 text-blue-400" /> : null}
                                </div>
                            </div>

                            <button
                                onClick={sendNotification}
                                disabled={sending || !title || !body}
                                className="w-full py-4 bg-violet-600 hover:bg-violet-500 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {sending ? (
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                                Send Notification
                            </button>
                        </div>
                    </div>
                </div>

                {/* History */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-violet-400" />
                        Recent Notifications
                    </h3>

                    {history.length === 0 ? (
                        <div className="text-center py-8 text-stone-500">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No notifications sent yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map(item => (
                                <div key={item.id} className="p-4 bg-stone-800 rounded-xl">
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm text-stone-400 mt-1 line-clamp-2">{item.body}</p>
                                    <div className="flex justify-between mt-3 text-xs text-stone-500">
                                        <span>{new Date(item.sentAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            {item.opened}/{item.sentTo}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Audience Summary */}
                    <div className="mt-6 pt-6 border-t border-stone-700">
                        <h4 className="text-sm text-stone-400 mb-3">Your Audience</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Employees</span>
                                <span className="font-bold">{audience.employees || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Managers</span>
                                <span className="font-bold">{audience.managers || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Loyalty Members</span>
                                <span className="font-bold">{audience.customers || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


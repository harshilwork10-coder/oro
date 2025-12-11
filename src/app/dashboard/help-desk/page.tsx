'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
    Headphones,
    MessageSquare,
    Phone,
    Mail,
    Clock,
    AlertCircle,
    Send,
    X,
    Loader2,
    RefreshCw
} from 'lucide-react'

interface Message {
    id: string
    content: string
    sender: 'USER' | 'SUPPORT'
    createdAt: string
}

interface Chat {
    id: string
    status: string
    messages: Message[]
}

export default function HelpDeskPage() {
    const { data: session } = useSession()
    const [showChat, setShowChat] = useState(false)
    const [message, setMessage] = useState('')
    const [chat, setChat] = useState<Chat | null>(null)
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chat?.messages])

    // Poll for new messages every 3 seconds when chat is open
    useEffect(() => {
        if (!showChat) return

        const pollMessages = async () => {
            try {
                const res = await fetch('/api/support-chat')
                if (res.ok) {
                    const data = await res.json()
                    setChat(data)
                }
            } catch (error) {
                console.error('Poll error:', error)
            }
        }

        const interval = setInterval(pollMessages, 3000)
        return () => clearInterval(interval)
    }, [showChat])

    const openChat = async () => {
        setShowChat(true)
        setLoading(true)
        try {
            const res = await fetch('/api/support-chat')
            if (res.ok) {
                const data = await res.json()
                setChat(data)
            }
        } catch (error) {
            console.error('Failed to load chat:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSendMessage = async () => {
        if (!message.trim() || sending) return

        const messageText = message
        setMessage('')
        setSending(true)

        try {
            const res = await fetch('/api/support-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, chatId: chat?.id })
            })

            if (res.ok) {
                // Refresh chat to get new messages
                const chatRes = await fetch('/api/support-chat')
                if (chatRes.ok) {
                    setChat(await chatRes.json())
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setSending(false)
        }
    }

    const closeChat = async () => {
        if (chat?.id) {
            try {
                await fetch('/api/support-chat', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: chat.id })
                })
            } catch (error) {
                console.error('Failed to close chat:', error)
            }
        }
        setShowChat(false)
        setChat(null)
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="min-h-screen bg-stone-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Headphones className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Help Desk</h1>
                            <p className="text-stone-400">We're here to help, 24/7</p>
                        </div>
                    </div>
                </div>

                {/* Support Options Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Live Chat */}
                    <button
                        onClick={openChat}
                        className="bg-stone-900 border border-stone-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all group text-left"
                    >
                        <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <MessageSquare className="h-7 w-7 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Live Chat</h3>
                        <p className="text-stone-400 text-sm mb-4">Get instant help from our support team</p>
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Available now
                        </div>
                    </button>

                    {/* Phone Support */}
                    <a
                        href="tel:+18005551234"
                        className="bg-stone-900 border border-stone-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all group text-left"
                    >
                        <div className="h-14 w-14 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                            <Phone className="h-7 w-7 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Call Us</h3>
                        <p className="text-stone-400 text-sm mb-4">Speak directly with a support specialist</p>
                        <p className="text-purple-400 font-mono text-lg">1-800-555-1234</p>
                    </a>

                    {/* Email Support */}
                    <a
                        href="mailto:support@Oronex.com"
                        className="bg-stone-900 border border-stone-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all group text-left"
                    >
                        <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                            <Mail className="h-7 w-7 text-orange-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Email Us</h3>
                        <p className="text-stone-400 text-sm mb-4">For non-urgent inquiries</p>
                        <p className="text-orange-400">support@Oronex.com</p>
                    </a>
                </div>

                {/* Support Hours */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">Support Hours</h3>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-stone-400 mb-1">Live Chat & Phone:</p>
                                    <p className="text-white font-medium">24/7 - Always available</p>
                                </div>
                                <div>
                                    <p className="text-stone-400 mb-1">Email Response Time:</p>
                                    <p className="text-white font-medium">Within 2 hours</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Common Issues */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Common Issues</h3>
                    <div className="space-y-3">
                        {[
                            { title: 'POS System Not Loading', solution: 'Try refreshing the page or clearing your browser cache' },
                            { title: 'Cash Drawer Won\'t Open', solution: 'Ensure shift is active and try restarting the POS' },
                            { title: 'Payment Terminal Offline', solution: 'Check network connection and power cycle the terminal' },
                            { title: 'Missing Products in Catalog', solution: 'Contact your location manager to add products' }
                        ].map((issue, idx) => (
                            <div key={idx} className="flex gap-3 p-4 bg-stone-950 rounded-lg border border-stone-800/50">
                                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-white">{issue.title}</p>
                                    <p className="text-sm text-stone-400 mt-1">{issue.solution}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Info */}
                <div className="mt-6 text-center text-sm text-stone-500">
                    Logged in as: <span className="text-stone-400 font-medium">{session?.user?.name}</span>
                </div>
            </div>

            {/* Live Chat Modal */}
            {showChat && (
                <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closeChat}
                    />

                    {/* Chat Window */}
                    <div className="relative w-full max-w-md h-[80vh] md:h-[600px] bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Headphones className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Oronex Support</p>
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Online
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={closeChat}
                                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                                </div>
                            ) : chat?.messages?.length === 0 ? (
                                <div className="text-center text-stone-500 py-8">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Start a conversation with our support team</p>
                                </div>
                            ) : (
                                <>
                                    {chat?.messages?.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.sender === 'USER'
                                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                                        : 'bg-stone-800 text-stone-200 rounded-bl-sm'
                                                    }`}
                                            >
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <p className={`text-xs mt-1 ${msg.sender === 'USER' ? 'text-blue-200' : 'text-stone-500'}`}>
                                                    {formatTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-stone-800 bg-stone-900/80">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type your message..."
                                    disabled={sending}
                                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!message.trim() || sending}
                                    className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

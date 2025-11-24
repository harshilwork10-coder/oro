'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    Headphones,
    MessageSquare,
    Phone,
    Mail,
    Clock,
    CheckCircle,
    AlertCircle,
    Send,
    X
} from 'lucide-react'

export default function HelpDeskPage() {
    const { data: session } = useSession()
    const [showChat, setShowChat] = useState(false)
    const [message, setMessage] = useState('')
    const [chatMessages, setChatMessages] = useState<{ text: string; sender: 'user' | 'support'; timestamp: Date }[]>([])

    const handleSendMessage = () => {
        if (!message.trim()) return

        // Add user message
        setChatMessages(prev => [...prev, {
            text: message,
            sender: 'user',
            timestamp: new Date()
        }])

        // Simulate support response
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                text: "Thanks for reaching out! A support team member will be with you shortly. Average wait time is under 2 minutes.",
                sender: 'support',
                timestamp: new Date()
            }])
        }, 1000)

        setMessage('')
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
                        onClick={() => setShowChat(true)}
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
                        href="mailto:support@aura.com"
                        className="bg-stone-900 border border-stone-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all group text-left"
                    >
                        <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                            <Mail className="h-7 w-7 text-orange-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Email Us</h3>
                        <p className="text-stone-400 text-sm mb-4">For non-urgent inquiries</p>
                        <p className="text-orange-400">support@aura.com</p>
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
                    {session?.user?.locationId && <> • Location ID: <span className="text-stone-400">{session.user.locationId}</span></>}
                </div>
            </div>

            {/* Live Chat Modal */}
            {showChat && (
                <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowChat(false)}
                    />

                    {/* Chat Window */}
                    <div className="relative w-full max-w-md h-[600px] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Headphones className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">Support Team</p>
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Online
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.length === 0 ? (
                                <div className="text-center text-stone-500 py-8">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Start a conversation with our support team</p>
                                </div>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-3 ${msg.sender === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-stone-800 text-stone-200'
                                                }`}
                                        >
                                            <p className="text-sm">{msg.text}</p>
                                            <p className="text-xs opacity-60 mt-1">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-stone-800">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!message.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

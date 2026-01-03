'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User, Headphones, Loader2 } from 'lucide-react'

interface Message {
    id: string
    senderType: 'CUSTOMER' | 'STAFF' | 'SYSTEM'
    content: string
    createdAt: string
    sender?: { name: string }
}

interface ChatWidgetProps {
    franchiseId: string
    position?: 'bottom-right' | 'bottom-left'
}

export default function ChatWidget({ franchiseId, position = 'bottom-right' }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [customerName, setCustomerName] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [showForm, setShowForm] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const lastMessageTime = useRef<string | null>(null)

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Poll for new messages when conversation is active
    useEffect(() => {
        if (!conversationId || !isOpen) return

        const pollMessages = async () => {
            try {
                const url = `/api/chat/messages?conversationId=${conversationId}${lastMessageTime.current ? `&after=${lastMessageTime.current}` : ''}`
                const res = await fetch(url)
                if (res.ok) {
                    const newMessages = await res.json()
                    if (newMessages.length > 0) {
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id))
                            const uniqueNew = newMessages.filter((m: Message) => !existingIds.has(m.id))
                            return [...prev, ...uniqueNew]
                        })
                        lastMessageTime.current = newMessages[newMessages.length - 1].createdAt
                    }
                }
            } catch (error) {
                console.error('Failed to poll messages:', error)
            }
        }

        const interval = setInterval(pollMessages, 3000) // Poll every 3 seconds
        return () => clearInterval(interval)
    }, [conversationId, isOpen])

    const startConversation = async () => {
        if (!input.trim()) return
        setIsLoading(true)

        try {
            const res = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    customerName: customerName || 'Guest',
                    customerEmail,
                    message: input
                })
            })

            if (res.ok) {
                const conversation = await res.json()
                setConversationId(conversation.id)
                setMessages(conversation.messages)
                lastMessageTime.current = conversation.messages[conversation.messages.length - 1]?.createdAt
                setShowForm(false)
                setInput('')

                // Add auto-reply
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: 'system-1',
                        senderType: 'SYSTEM',
                        content: 'Thanks for reaching out! A support team member will be with you shortly. Average wait time is under 2 minutes.',
                        createdAt: new Date().toISOString()
                    }])
                }, 1000)
            }
        } catch (error) {
            console.error('Failed to start conversation:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || !conversationId) return

        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            senderType: 'CUSTOMER',
            content: input,
            createdAt: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempMessage])
        setInput('')

        try {
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    content: tempMessage.content,
                    senderType: 'CUSTOMER'
                })
            })

            if (res.ok) {
                const message = await res.json()
                lastMessageTime.current = message.createdAt
                setMessages(prev => prev.map(m =>
                    m.id === tempMessage.id ? message : m
                ))
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        }
    }

    const positionClasses = position === 'bottom-right'
        ? 'bottom-4 right-4'
        : 'bottom-4 left-4'

    return (
        <div className={`fixed ${positionClasses} z-50`}>
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 bg-stone-900 rounded-2xl shadow-2xl border border-stone-700 overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Headphones className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Support Team</h3>
                                <p className="text-xs text-white/80 flex items-center gap-1">
                                    <span className="h-2 w-2 bg-emerald-400 rounded-full"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="h-80 overflow-y-auto p-4 space-y-3 bg-stone-950">
                        {showForm && !conversationId ? (
                            <>
                                {/* Initial form */}
                                <div className="space-y-3">
                                    <p className="text-stone-400 text-sm">
                                        Hi! 👋 Let us know how we can help.
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Your name (optional)"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email (optional)"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </>
                        ) : (
                            /* Message list */
                            messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.senderType === 'CUSTOMER'
                                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                                : msg.senderType === 'SYSTEM'
                                                    ? 'bg-stone-800 text-stone-300 rounded-bl-sm'
                                                    : 'bg-stone-800 text-white rounded-bl-sm'
                                            }`}
                                    >
                                        {msg.senderType === 'STAFF' && msg.sender?.name && (
                                            <p className="text-xs text-indigo-400 mb-1">{msg.sender.name}</p>
                                        )}
                                        <p className="text-sm">{msg.content}</p>
                                        <p className="text-xs opacity-60 mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-stone-800 bg-stone-900">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Type your message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        conversationId ? sendMessage() : startConversation()
                                    }
                                }}
                                className="flex-1 bg-stone-800 border border-stone-700 rounded-full px-4 py-2 text-white text-sm placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <button
                                onClick={conversationId ? sendMessage : startConversation}
                                disabled={!input.trim() || isLoading}
                                className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Bubble */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${isOpen
                        ? 'bg-stone-700 text-white'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    }`}
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <MessageCircle className="h-6 w-6" />
                )}
            </button>
        </div>
    )
}


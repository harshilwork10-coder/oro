'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, X, Bot, User, ChevronDown } from 'lucide-react'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    data?: any // For charts/stats in the future
}

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm Trinex AI. Ask me about your revenue, staff performance, or daily stats.",
            timestamp: new Date()
        }
    ])
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg.content })
            })

            const data = await res.json()

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || "I didn't quite catch that.",
                timestamp: new Date(),
                data: data.data
            }

            setMessages(prev => [...prev, aiMsg])

        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting to my brain right now.",
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20 hover:scale-110 transition-transform duration-300 group"
                >
                    <Sparkles className="h-6 w-6 text-white animate-pulse" />
                    <span className="absolute -top-10 right-0 bg-stone-900 text-xs px-2 py-1 rounded border border-stone-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Ask Trinex
                    </span>
                </button>
            )}

            {/* Chat Interface */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] max-h-[80vh] flex flex-col bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-300">

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-orange-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/20">
                                <Sparkles className="h-4 w-4 text-orange-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-white">Trinex AI</h3>
                                <p className="text-[10px] text-green-400 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-stone-400 hover:text-white"
                        >
                            <ChevronDown className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-stone-800' : 'bg-orange-500/20'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <User className="h-4 w-4 text-stone-400" />
                                    ) : (
                                        <Bot className="h-4 w-4 text-orange-400" />
                                    )}
                                </div>
                                <div className={`max-w-[75%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                        ? 'bg-stone-800 text-stone-100 rounded-tr-none'
                                        : 'bg-white/5 text-stone-200 rounded-tl-none border border-white/5'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-orange-400" />
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                                    <span className="h-2 w-2 bg-stone-500 rounded-full animate-bounce duration-500" />
                                    <span className="h-2 w-2 bg-stone-500 rounded-full animate-bounce duration-500 delay-100" />
                                    <span className="h-2 w-2 bg-stone-500 rounded-full animate-bounce duration-500 delay-200" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/5 bg-stone-900/50">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="relative flex items-center"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about revenue, staff..."
                                className="w-full bg-stone-800/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 p-2 bg-orange-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

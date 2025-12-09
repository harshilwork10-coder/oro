'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    MessageSquare,
    Send,
    Clock,
    User,
    CheckCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    X,
    ArrowLeft,
    HelpCircle,
    Flag,
    UserPlus,
    MessageCircle,
    ChevronDown,
    Zap,
    AlertTriangle,
    ArrowUp
} from 'lucide-react'

interface Message {
    id: string
    content: string
    sender: 'USER' | 'SUPPORT'
    senderId?: string
    createdAt: string
    readAt?: string
}

interface ChatUser {
    id: string
    name: string
    email: string
    image?: string
}

interface Chat {
    id: string
    status: string
    priority: string
    createdAt: string
    updatedAt: string
    closedAt?: string
    user: ChatUser
    assignee?: ChatUser
    messages: Message[]
}

interface StatusCounts {
    all: number
    OPEN: number
    WAITING_SUPPORT: number
    WAITING_USER: number
    CLOSED: number
}

interface CannedResponse {
    id: string
    title: string
    content: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    OPEN: { label: 'New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    WAITING_SUPPORT: { label: 'Awaiting Reply', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    WAITING_USER: { label: 'Replied', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    CLOSED: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: <X className="w-3.5 h-3.5" /> }
}

const priorityConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    LOW: { label: 'Low', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: <ArrowUp className="w-3 h-3 rotate-180" /> },
    MEDIUM: { label: 'Medium', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Flag className="w-3 h-3" /> },
    HIGH: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <AlertTriangle className="w-3 h-3" /> },
    URGENT: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <Zap className="w-3 h-3" /> }
}

export default function SupportChatDashboard() {
    const [chats, setChats] = useState<Chat[]>([])
    const [counts, setCounts] = useState<StatusCounts>({ all: 0, OPEN: 0, WAITING_SUPPORT: 0, WAITING_USER: 0, CLOSED: 0 })
    const [supportTeam, setSupportTeam] = useState<ChatUser[]>([])
    const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
    const [activeFilter, setActiveFilter] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [replyMessage, setReplyMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showCannedDropdown, setShowCannedDropdown] = useState(false)
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchChats = useCallback(async () => {
        try {
            const res = await fetch(`/api/support-chat/admin?status=${activeFilter}`)
            const data = await res.json()
            if (data.chats) {
                setChats(data.chats)
                setCounts(data.counts)
                if (data.supportTeam) setSupportTeam(data.supportTeam)
                if (data.cannedResponses) setCannedResponses(data.cannedResponses)
            }
        } catch (error) {
            console.error('Failed to fetch chats:', error)
        } finally {
            setLoading(false)
        }
    }, [activeFilter])

    const fetchSingleChat = useCallback(async (chatId: string) => {
        try {
            const res = await fetch(`/api/support-chat/admin?chatId=${chatId}`)
            const data = await res.json()
            if (data) {
                setSelectedChat(data)
            }
        } catch (error) {
            console.error('Failed to fetch chat:', error)
        }
    }, [])

    useEffect(() => {
        fetchChats()
        const interval = setInterval(fetchChats, 5000)
        return () => clearInterval(interval)
    }, [fetchChats])

    useEffect(() => {
        if (selectedChat?.id) {
            const interval = setInterval(() => fetchSingleChat(selectedChat.id), 3000)
            return () => clearInterval(interval)
        }
    }, [selectedChat?.id, fetchSingleChat])

    useEffect(() => {
        scrollToBottom()
    }, [selectedChat?.messages])

    const handleSelectChat = async (chat: Chat) => {
        await fetchSingleChat(chat.id)
    }

    const handleSendReply = async () => {
        if (!selectedChat || !replyMessage.trim()) return

        setSending(true)
        try {
            const res = await fetch('/api/support-chat/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: selectedChat.id, message: replyMessage })
            })

            if (res.ok) {
                setReplyMessage('')
                await fetchSingleChat(selectedChat.id)
                await fetchChats()
            }
        } catch (error) {
            console.error('Failed to send reply:', error)
        } finally {
            setSending(false)
        }
    }

    const handleUpdateChat = async (updates: { status?: string; priority?: string; assigneeId?: string | null }) => {
        if (!selectedChat) return

        try {
            await fetch('/api/support-chat/admin', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: selectedChat.id, ...updates })
            })
            await fetchSingleChat(selectedChat.id)
            await fetchChats()
        } catch (error) {
            console.error('Failed to update chat:', error)
        }
        setShowPriorityDropdown(false)
        setShowAssigneeDropdown(false)
    }

    const handleUseCannedResponse = (response: CannedResponse) => {
        setReplyMessage(response.content)
        setShowCannedDropdown(false)
    }

    const filteredChats = chats.filter(chat => {
        const matchesSearch = searchTerm === '' ||
            chat.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chat.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    })

    const formatTime = (dateStr: string) => {
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            Support Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Manage customer support conversations</p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchChats() }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl text-slate-300 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
                    {/* Chat List Panel */}
                    <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 flex flex-col overflow-hidden">
                        {/* Filter Tabs */}
                        <div className="p-4 border-b border-slate-800/50">
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'WAITING_SUPPORT', label: 'Awaiting' },
                                    { key: 'OPEN', label: 'New' },
                                    { key: 'CLOSED', label: 'Closed' }
                                ].map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => setActiveFilter(filter.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === filter.key
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {filter.label}
                                        <span className="ml-1.5 opacity-60">
                                            {counts[filter.key as keyof StatusCounts] || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-slate-800/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading && chats.length === 0 ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                </div>
                            ) : filteredChats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                                    <p>No chats found</p>
                                </div>
                            ) : (
                                filteredChats.map(chat => (
                                    <div
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`p-4 border-b border-slate-800/30 cursor-pointer transition-all hover:bg-slate-800/30 ${selectedChat?.id === chat.id ? 'bg-slate-800/50 border-l-2 border-l-blue-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                                {chat.user.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-medium text-white truncate">
                                                        {chat.user.name || 'Unknown User'}
                                                    </h3>
                                                    <span className="text-xs text-slate-500 shrink-0">
                                                        {formatTime(chat.updatedAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                    {chat.user.email}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusConfig[chat.status]?.color || statusConfig.OPEN.color}`}>
                                                        {statusConfig[chat.status]?.icon}
                                                        {statusConfig[chat.status]?.label || chat.status}
                                                    </span>
                                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${priorityConfig[chat.priority]?.color || priorityConfig.MEDIUM.color}`}>
                                                        {priorityConfig[chat.priority]?.icon}
                                                        {priorityConfig[chat.priority]?.label || chat.priority}
                                                    </span>
                                                </div>
                                                {chat.assignee && (
                                                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {chat.assignee.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Detail Panel */}
                    <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 flex flex-col overflow-hidden">
                        {selectedChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedChat(null)}
                                                className="lg:hidden p-2 hover:bg-slate-800/50 rounded-lg"
                                            >
                                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                                            </button>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                                {selectedChat.user.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white">
                                                    {selectedChat.user.name || 'Unknown User'}
                                                </h3>
                                                <p className="text-xs text-slate-400">{selectedChat.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {/* Priority Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-all ${priorityConfig[selectedChat.priority]?.color}`}
                                                >
                                                    {priorityConfig[selectedChat.priority]?.icon}
                                                    {priorityConfig[selectedChat.priority]?.label}
                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                </button>
                                                {showPriorityDropdown && (
                                                    <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl py-1 z-50 shadow-xl min-w-[120px]">
                                                        {Object.entries(priorityConfig).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={() => handleUpdateChat({ priority: key })}
                                                                className={`w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-slate-700/50 ${selectedChat.priority === key ? 'bg-slate-700/30' : ''
                                                                    }`}
                                                            >
                                                                <span className={`flex items-center gap-1 ${config.color.replace('bg-', 'text-').split(' ')[1]}`}>
                                                                    {config.icon}
                                                                </span>
                                                                <span className="text-slate-300">{config.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assignee Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-700/50 transition-all"
                                                >
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    {selectedChat.assignee?.name || 'Assign'}
                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                </button>
                                                {showAssigneeDropdown && (
                                                    <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl py-1 z-50 shadow-xl min-w-[180px] max-h-48 overflow-y-auto">
                                                        <button
                                                            onClick={() => handleUpdateChat({ assigneeId: null })}
                                                            className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-slate-700/50 text-slate-400"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Unassign
                                                        </button>
                                                        {supportTeam.map(member => (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => handleUpdateChat({ assigneeId: member.id })}
                                                                className={`w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-slate-700/50 ${selectedChat.assignee?.id === member.id ? 'bg-slate-700/30' : ''
                                                                    }`}
                                                            >
                                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px]">
                                                                    {member.name?.charAt(0).toUpperCase() || 'U'}
                                                                </div>
                                                                <span className="text-slate-300 truncate">{member.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Toggle */}
                                            {selectedChat.status !== 'CLOSED' ? (
                                                <button
                                                    onClick={() => handleUpdateChat({ status: 'CLOSED' })}
                                                    className="px-3 py-1.5 bg-slate-800/50 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 rounded-lg text-xs text-slate-400 hover:text-red-400 transition-all"
                                                >
                                                    Close
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateChat({ status: 'OPEN' })}
                                                    className="px-3 py-1.5 bg-slate-800/50 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/30 rounded-lg text-xs text-slate-400 hover:text-emerald-400 transition-all"
                                                >
                                                    Reopen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {selectedChat.messages?.map((msg, idx) => (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex ${msg.sender === 'SUPPORT' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] px-4 py-3 rounded-2xl ${msg.sender === 'SUPPORT'
                                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                                                        : 'bg-slate-800/70 text-slate-200 border border-slate-700/50'
                                                    }`}
                                            >
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                <p className={`text-xs mt-1 ${msg.sender === 'SUPPORT' ? 'text-blue-200' : 'text-slate-500'}`}>
                                                    {formatTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Reply Input */}
                                {selectedChat.status !== 'CLOSED' && (
                                    <div className="p-4 border-t border-slate-800/50">
                                        {/* Canned Responses */}
                                        <div className="relative mb-3">
                                            <button
                                                onClick={() => setShowCannedDropdown(!showCannedDropdown)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs text-slate-400 transition-all"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                Quick Replies
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                            {showCannedDropdown && (
                                                <div className="absolute left-0 bottom-full mb-1 bg-slate-800 border border-slate-700 rounded-xl py-1 z-50 shadow-xl min-w-[280px] max-h-64 overflow-y-auto">
                                                    {cannedResponses.map(response => (
                                                        <button
                                                            key={response.id}
                                                            onClick={() => handleUseCannedResponse(response)}
                                                            className="w-full px-4 py-3 text-left hover:bg-slate-700/50 border-b border-slate-700/30 last:border-0"
                                                        >
                                                            <p className="text-sm font-medium text-white">{response.title}</p>
                                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{response.content}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <textarea
                                                placeholder="Type your reply..."
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendReply())}
                                                rows={2}
                                                className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
                                            />
                                            <button
                                                onClick={handleSendReply}
                                                disabled={sending || !replyMessage.trim()}
                                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all flex items-center gap-2 self-end"
                                            >
                                                {sending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                    <MessageSquare className="w-10 h-10 opacity-50" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-400">Select a conversation</h3>
                                <p className="text-sm mt-1">Choose a chat from the list to view and respond</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    Search, Plus, MessageSquare, Send, CheckCircle, Clock, User, Mail, Phone, Inbox, RefreshCw
} from 'lucide-react';

interface Message {
    id: string;
    senderType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
    senderId?: string;
    content: string;
    createdAt: string;
    sender?: { name: string };
}

interface Conversation {
    id: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    status: 'OPEN' | 'RESOLVED' | 'SPAM';
    lastMessageAt?: string;
    unreadCount: number;
    createdAt: string;
    messages: Message[];
    client?: {
        firstName: string;
        lastName: string;
        email?: string;
    };
    assignedTo?: {
        name: string;
        email: string;
    };
}

type TicketTab = 'open' | 'resolved' | 'all';

export default function TicketsPage() {
    const { data: session } = useSession();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TicketTab>('open');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversations
    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversation?.messages]);

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/chat/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(data);

                // Update selected conversation if it exists
                if (selectedConversation) {
                    const updated = data.find((c: Conversation) => c.id === selectedConversation.id);
                    if (updated) {
                        setSelectedConversation(updated);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectConversation = async (conversation: Conversation) => {
        setSelectedConversation(conversation);

        // Fetch full conversation with messages
        try {
            const res = await fetch(`/api/chat/conversations/${conversation.id}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedConversation(data);
            }

            // Mark as read
            if (conversation.unreadCount > 0) {
                await fetch(`/api/chat/conversations/${conversation.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markAsRead: true })
                });
                fetchConversations();
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        setIsSending(true);
        try {
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConversation.id,
                    content: newMessage,
                    senderType: 'STAFF'
                })
            });

            if (res.ok) {
                setNewMessage('');
                // Refresh conversation
                const convRes = await fetch(`/api/chat/conversations/${selectedConversation.id}`);
                if (convRes.ok) {
                    const data = await convRes.json();
                    setSelectedConversation(data);
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const updateStatus = async (conversationId: string, status: string) => {
        try {
            await fetch(`/api/chat/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchConversations();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const filteredConversations = conversations.filter(c => {
        // Tab filter
        if (activeTab === 'open' && c.status !== 'OPEN') return false;
        if (activeTab === 'resolved' && c.status !== 'RESOLVED') return false;

        // Search filter
        if (!searchQuery) return true;
        const name = c.customerName || c.client?.firstName || '';
        const email = c.customerEmail || c.client?.email || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const openCount = conversations.filter(c => c.status === 'OPEN').length;
    const resolvedCount = conversations.filter(c => c.status === 'RESOLVED').length;

    const tabs: { id: TicketTab; label: string; count: number }[] = [
        { id: 'open', label: 'Open', count: openCount },
        { id: 'resolved', label: 'Resolved', count: resolvedCount },
        { id: 'all', label: 'All', count: conversations.length },
    ];

    return (
        <div className="flex h-[calc(100vh-120px)]">
            {/* Left Sidebar - Conversation List */}
            <div className="w-80 border-r border-stone-800 flex flex-col bg-stone-900/30">
                {/* Header */}
                <div className="p-4 border-b border-stone-800">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2">
                            <MessageSquare size={20} className="text-orange-400" />
                            Support Inbox
                        </h1>
                        <button
                            onClick={fetchConversations}
                            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1 ${activeTab === tab.id
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'text-stone-400 hover:bg-stone-800'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-orange-500/30' : 'bg-stone-700'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-9 pr-4 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw size={24} className="text-stone-600 animate-spin" />
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <Inbox size={40} className="mx-auto mb-3 text-stone-600" />
                            <p className="text-stone-400 text-sm">No conversations</p>
                            <p className="text-stone-500 text-xs mt-1">Customer messages will appear here</p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => selectConversation(conv)}
                                className={`w-full p-4 border-b border-stone-800 text-left hover:bg-stone-800/50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-stone-800' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${conv.status === 'OPEN' ? 'bg-orange-500/20 text-orange-400' :
                                        conv.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-stone-700 text-stone-400'
                                        }`}>
                                        <User size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-stone-100 truncate text-sm">
                                                {conv.customerName || conv.client?.firstName || 'Anonymous'}
                                            </span>
                                            {conv.unreadCount > 0 && (
                                                <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-stone-500 truncate mt-0.5">
                                            {conv.messages[0]?.content || 'No messages'}
                                        </p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${conv.status === 'OPEN' ? 'bg-amber-500/20 text-amber-400' :
                                                conv.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-stone-700 text-stone-400'
                                                }`}>
                                                {conv.status}
                                            </span>
                                            <span className="text-[10px] text-stone-600">
                                                {conv.lastMessageAt && new Date(conv.lastMessageAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side - Message Thread */}
            <div className="flex-1 flex flex-col bg-stone-950">
                {selectedConversation ? (
                    <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <User size={18} className="text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-stone-100">
                                        {selectedConversation.customerName ||
                                            selectedConversation.client?.firstName ||
                                            'Anonymous'}
                                    </h2>
                                    <div className="flex items-center gap-3 text-xs text-stone-500">
                                        {selectedConversation.customerEmail && (
                                            <span className="flex items-center gap-1">
                                                <Mail size={12} />
                                                {selectedConversation.customerEmail}
                                            </span>
                                        )}
                                        {selectedConversation.customerPhone && (
                                            <span className="flex items-center gap-1">
                                                <Phone size={12} />
                                                {selectedConversation.customerPhone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedConversation.status === 'OPEN' ? (
                                    <button
                                        onClick={() => updateStatus(selectedConversation.id, 'RESOLVED')}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <CheckCircle size={16} />
                                        Mark Resolved
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => updateStatus(selectedConversation.id, 'OPEN')}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Clock size={16} />
                                        Reopen
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {selectedConversation.messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.senderType === 'STAFF' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.senderType === 'STAFF'
                                            ? 'bg-orange-500 text-white rounded-br-sm'
                                            : msg.senderType === 'SYSTEM'
                                                ? 'bg-stone-800 text-stone-300 rounded-bl-sm'
                                                : 'bg-stone-800 text-white rounded-bl-sm'
                                            }`}
                                    >
                                        {msg.senderType === 'CUSTOMER' && (
                                            <p className="text-xs text-amber-400 mb-1 font-medium">Customer</p>
                                        )}
                                        {msg.senderType === 'STAFF' && msg.sender?.name && (
                                            <p className="text-xs text-orange-200 mb-1">{msg.sender.name}</p>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <p className="text-xs opacity-60 mt-2">
                                            {new Date(msg.createdAt).toLocaleString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input */}
                        <div className="p-4 border-t border-stone-800 bg-stone-900/50">
                            <div className="flex items-end gap-3">
                                <textarea
                                    placeholder="Type your reply..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    rows={2}
                                    className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 placeholder:text-stone-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className="h-12 w-12 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageSquare size={64} className="mx-auto mb-4 text-stone-700" />
                            <h2 className="text-xl font-semibold text-stone-400 mb-2">Select a Conversation</h2>
                            <p className="text-stone-600">Choose a conversation from the left to view messages</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

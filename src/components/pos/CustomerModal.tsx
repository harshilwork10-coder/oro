'use client'

import { useState, useEffect } from 'react'
import { X, Search, UserPlus, User, Phone, Mail, FileText, Loader2, Star } from 'lucide-react'

interface Customer {
    id: string
    name: string
    email?: string
    phone: string
    notes?: string
    loyaltyPoints?: number
    visits?: number
}

interface CustomerModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectCustomer: (customer: Customer) => void
}

export default function CustomerModal({ isOpen, onClose, onSelectCustomer }: CustomerModalProps) {
    const [activeTab, setActiveTab] = useState<'search' | 'add'>('search')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Customer[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // New Customer Form State
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Load customers on mount and on search - use unified /api/pos/clients endpoint
    useEffect(() => {
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const url = searchQuery.length >= 2
                    ? `/api/pos/clients?query=${encodeURIComponent(searchQuery)}`
                    : '/api/pos/clients'
                const res = await fetch(url)
                if (res.ok) {
                    const data = await res.json()
                    // Handle both formats: { success, data } or direct array
                    const customers = data.data || data
                    setSearchResults(Array.isArray(customers) ? customers : [])
                }
            } catch (error) {
                console.error('Error searching customers:', error)
            } finally {
                setIsSearching(false)
            }
        }, searchQuery ? 300 : 0)

        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/franchise/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer)
            })

            if (res.ok) {
                const customer = await res.json()
                onSelectCustomer(customer)
                onClose()
                // Reset form
                setNewCustomer({ name: '', email: '', phone: '', notes: '' })
                setActiveTab('search')
            } else {
                setToast({ message: 'Failed to create customer', type: 'error' })
            }
        } catch (error) {
            console.error('Error creating customer:', error)
            setToast({ message: 'Error creating customer', type: 'error' })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[#2a2a2a] flex flex-col">
                {/* Header */}
                <div className="bg-[#0f0f0f] px-6 py-4 flex items-center justify-between border-b border-[#2a2a2a]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-orange-500" />
                        </div>
                        Customer
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#0f0f0f] px-4 pt-2">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-3 px-4 font-medium text-sm transition-all rounded-t-xl ${activeTab === 'search'
                            ? 'text-white bg-[#1a1a1a] border-t border-l border-r border-[#2a2a2a]'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Search className="h-4 w-4" />
                            Find Customer
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 px-4 font-medium text-sm transition-all rounded-t-xl ${activeTab === 'add'
                            ? 'text-white bg-[#1a1a1a] border-t border-l border-r border-[#2a2a2a]'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            New Customer
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'search' ? (
                        <div className="space-y-4">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-base"
                                    autoFocus
                                />
                            </div>

                            {/* Quick Add Hint */}
                            {searchQuery.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                                        <Search className="h-8 w-8 text-gray-600" />
                                    </div>
                                    <p className="text-gray-500 text-sm">Type to search customers</p>
                                    <button
                                        onClick={() => setActiveTab('add')}
                                        className="mt-3 text-orange-500 font-medium hover:text-orange-400 transition-colors text-sm"
                                    >
                                        Or add a new walk-in →
                                    </button>
                                </div>
                            )}

                            {isSearching ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {searchResults.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                onSelectCustomer(customer)
                                                onClose()
                                            }}
                                            className="w-full text-left p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] hover:border-orange-500/50 hover:bg-[#1f1f1f] transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Avatar */}
                                                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-orange-500 font-bold text-lg">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-white group-hover:text-orange-500 transition-colors truncate">
                                                        {customer.name}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {customer.phone || 'No phone'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Points */}
                                                {customer.loyaltyPoints !== undefined && customer.loyaltyPoints > 0 && (
                                                    <div className="text-right flex-shrink-0">
                                                        <div className="text-orange-500 font-bold">{customer.loyaltyPoints}</div>
                                                        <div className="text-xs text-gray-500">points</div>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}

                                    {searchQuery.length >= 2 && searchResults.length === 0 && (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                                                <User className="h-8 w-8 text-gray-600" />
                                            </div>
                                            <p className="text-gray-400 mb-3">No customers found</p>
                                            <button
                                                onClick={() => setActiveTab('add')}
                                                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm"
                                            >
                                                <UserPlus className="h-4 w-4 inline mr-2" />
                                                Create &quot;{searchQuery}&quot;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleCreateCustomer} className="space-y-5">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Full Name <span className="text-orange-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input
                                        type="text"
                                        required
                                        value={newCustomer.name}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Phone <span className="text-gray-600">(for loyalty)</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input
                                        type="tel"
                                        value={newCustomer.phone}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Email <span className="text-gray-600">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <input
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Notes <span className="text-gray-600">(preferences, allergies)</span>
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-3 text-gray-500 h-5 w-5" />
                                    <textarea
                                        value={newCustomer.notes}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
                                        rows={2}
                                        placeholder="Add any notes..."
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !newCustomer.name.trim()}
                                className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mt-6"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-5 w-5" />
                                        Add Customer
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

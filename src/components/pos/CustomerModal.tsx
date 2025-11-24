'use client'

import { useState, useEffect } from 'react'
import { X, Search, UserPlus, User, Phone, Mail, FileText, Loader2 } from 'lucide-react'

interface Customer {
    id: string
    name: string
    email?: string
    phone: string
    notes?: string
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

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true)
                try {
                    const res = await fetch(`/api/franchise/customers?query=${encodeURIComponent(searchQuery)}`)
                    if (res.ok) {
                        const data = await res.json()
                        setSearchResults(data)
                    }
                } catch (error) {
                    console.error('Error searching customers:', error)
                } finally {
                    setIsSearching(false)
                }
            } else {
                setSearchResults([])
            }
        }, 500)

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
                alert('Failed to create customer')
            }
        } catch (error) {
            console.error('Error creating customer:', error)
            alert('Error creating customer')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Customer Management
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-4 font-medium text-sm transition-colors relative ${activeTab === 'search'
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Search className="h-4 w-4" />
                            Search Customer
                        </div>
                        {activeTab === 'search' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-4 font-medium text-sm transition-colors relative ${activeTab === 'add'
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add New Customer
                        </div>
                        {activeTab === 'add' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'search' ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Search by name, phone, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    autoFocus
                                />
                            </div>

                            {isSearching ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
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
                                            className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">
                                                        {customer.name}
                                                    </h3>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {customer.phone}
                                                        </span>
                                                        {customer.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {customer.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                        Select
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {searchQuery.length >= 2 && searchResults.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No customers found matching "{searchQuery}"</p>
                                            <button
                                                onClick={() => setActiveTab('add')}
                                                className="mt-2 text-blue-600 font-medium hover:underline"
                                            >
                                                Create new customer?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleCreateCustomer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type="text"
                                        required
                                        value={newCustomer.name}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type="tel"
                                        required
                                        value={newCustomer.phone}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type="email"
                                        value={newCustomer.email}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                                    <textarea
                                        value={newCustomer.notes}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={3}
                                        placeholder="Preferences, allergies, etc."
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-5 w-5" />
                                            Create Customer
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

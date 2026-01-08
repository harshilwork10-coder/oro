'use client'

import { useState, useEffect, useRef } from 'react'
import { useOptionalAccountContext } from '@/contexts/AccountContext'
import { Building2, ChevronDown, X, Search, Check } from 'lucide-react'

interface Franchisor {
    id: string
    name: string
    industryType: string
    ownerId: string
    owner?: { name: string; email: string }
}

export default function AccountSelector() {
    const accountContext = useOptionalAccountContext()
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [franchisors, setFranchisors] = useState<Franchisor[]>([])
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // If no account context (not Provider/Support), don't show
    if (!accountContext) return null

    const { selectedAccount, setSelectedAccount, clearAccount } = accountContext

    // Load franchisors on first open
    useEffect(() => {
        if (isOpen && franchisors.length === 0) {
            loadFranchisors()
        }
    }, [isOpen])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function loadFranchisors() {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/franchisors?status=APPROVED')
            if (res.ok) {
                const data = await res.json()
                setFranchisors(data.franchisors || data || [])
            }
        } catch (e) {
            console.error('Failed to load accounts:', e)
        } finally {
            setLoading(false)
        }
    }

    const filteredFranchisors = franchisors.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
        f.owner?.email?.toLowerCase().includes(search.toLowerCase())
    )

    function selectAccount(franchisor: Franchisor) {
        setSelectedAccount({
            id: franchisor.id,
            name: franchisor.name,
            type: 'franchisor',
            ownerId: franchisor.ownerId,
            industryType: franchisor.industryType
        })
        setIsOpen(false)
        setSearch('')
    }

    return (
        <div ref={dropdownRef} className="relative">
            {/* Selected Account Bar or Selector */}
            {selectedAccount ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/10 border border-orange-500/30 rounded-lg">
                    <Building2 className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-orange-100">
                        Working on: <span className="text-white">{selectedAccount.name}</span>
                    </span>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="ml-2 px-2 py-0.5 text-xs bg-orange-500/20 hover:bg-orange-500/30 rounded transition-colors"
                    >
                        Change
                    </button>
                    <button
                        onClick={clearAccount}
                        className="ml-1 p-1 text-orange-400 hover:text-red-400 transition-colors"
                        title="Clear selection"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded-lg hover:bg-yellow-500/30 transition-colors"
                >
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Select Account to Work On</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-stone-800 border border-stone-700 rounded-lg shadow-2xl z-50">
                    {/* Search */}
                    <div className="p-3 border-b border-stone-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search accounts..."
                                className="w-full pl-9 pr-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-stone-400 text-sm">
                                Loading accounts...
                            </div>
                        ) : filteredFranchisors.length === 0 ? (
                            <div className="p-4 text-center text-stone-400 text-sm">
                                {search ? 'No accounts match your search' : 'No accounts found'}
                            </div>
                        ) : (
                            filteredFranchisors.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => selectAccount(f)}
                                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-stone-700 transition-colors ${selectedAccount?.id === f.id ? 'bg-orange-500/10' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs">
                                            {f.name.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-medium text-white">{f.name}</div>
                                            <div className="text-xs text-stone-400">
                                                {f.owner?.name || f.owner?.email || 'No owner'}
                                                <span className="ml-2 px-1.5 py-0.5 bg-stone-600 rounded text-[10px]">
                                                    {f.industryType}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedAccount?.id === f.id && (
                                        <Check className="w-4 h-4 text-orange-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}


'use client'

import { useState, useEffect } from 'react'
import { Building2, Search, ChevronDown } from 'lucide-react'

interface Franchise {
    id: string
    name: string
    locations?: { id: string; name: string }[]
}

interface StoreContextSelectorProps {
    onSelect: (franchiseId: string, locationId?: string) => void
    selectedFranchiseId?: string
    required?: boolean
    label?: string
}

export default function StoreContextSelector({
    onSelect,
    selectedFranchiseId,
    required = true,
    label = "Select Client Store"
}: StoreContextSelectorProps) {
    const [franchises, setFranchises] = useState<Franchise[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [selected, setSelected] = useState<Franchise | null>(null)

    useEffect(() => {
        fetchFranchises()
    }, [])

    useEffect(() => {
        if (selectedFranchiseId && franchises.length > 0) {
            const found = franchises.find(f => f.id === selectedFranchiseId)
            if (found) setSelected(found)
        }
    }, [selectedFranchiseId, franchises])

    const fetchFranchises = async () => {
        try {
            const res = await fetch('/api/franchisors')
            const data = await res.json()
            setFranchises(data.franchisors || data || [])
        } catch (error) {
            console.error('Failed to fetch franchises:', error)
        }
        setLoading(false)
    }

    const handleSelect = (franchise: Franchise) => {
        setSelected(franchise)
        setIsOpen(false)
        onSelect(franchise.id)
    }

    const filtered = franchises.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-stone-400 mb-2">
                {label} {required && <span className="text-red-400">*</span>}
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all
                        ${selected
                            ? 'bg-stone-800 border-emerald-500/50 text-white'
                            : 'bg-stone-900 border-stone-700 text-stone-400 hover:border-stone-600'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Building2 className={`h-5 w-5 ${selected ? 'text-emerald-400' : 'text-stone-500'}`} />
                        {loading ? (
                            <span>Loading stores...</span>
                        ) : selected ? (
                            <span className="font-medium">{selected.name}</span>
                        ) : (
                            <span>Choose which client to work on...</span>
                        )}
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-stone-900 border border-stone-700 rounded-xl shadow-xl max-h-80 overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-stone-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-56 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="px-4 py-3 text-stone-500 text-sm">No clients found</div>
                            ) : (
                                filtered.map(franchise => (
                                    <button
                                        key={franchise.id}
                                        onClick={() => handleSelect(franchise)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-800 transition-colors text-left
                                            ${selected?.id === franchise.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-white'}`}
                                    >
                                        <Building2 className={`h-4 w-4 ${selected?.id === franchise.id ? 'text-emerald-400' : 'text-stone-500'}`} />
                                        <span className="font-medium">{franchise.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {required && !selected && (
                <p className="mt-2 text-sm text-amber-400">
                    ⚠️ Select a client before proceeding
                </p>
            )}
        </div>
    )
}


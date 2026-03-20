// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Package, User, Receipt, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GlobalSearchModalProps {
    open: boolean
    onClose: () => void
}

export default function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>()

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
            setQuery('')
            setResults(null)
        }
    }, [open])

    // ⌘+K / Ctrl+K global shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                if (open) onClose()
                else if (!open) {
                    // Parent should handle opening
                }
            }
            if (e.key === 'Escape' && open) onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    // Debounced search
    const search = useCallback((q: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (q.length < 2) { setResults(null); return }

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`)
                const data = await res.json()
                setResults(data.data)
            } catch { setResults(null) }
            setLoading(false)
        }, 250) // 250ms debounce — prevents API spam
    }, [])

    useEffect(() => { search(query) }, [query, search])

    if (!open) return null

    const hasResults = results && results.total > 0

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-700">
                    <Search className="h-5 w-5 text-stone-400" />
                    <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search items, customers, transactions…"
                        className="flex-1 bg-transparent text-lg outline-none placeholder:text-stone-500" />
                    <kbd className="hidden sm:inline text-xs text-stone-500 bg-stone-800 px-2 py-0.5 rounded border border-stone-600">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {loading && <div className="text-center py-6 text-stone-400">Searching...</div>}

                    {!loading && query.length >= 2 && !hasResults && (
                        <div className="text-center py-8 text-stone-500">No results for &quot;{query}&quot;</div>
                    )}

                    {hasResults && (
                        <div className="py-2">
                            {/* Items */}
                            {results.items?.length > 0 && (
                                <div>
                                    <p className="text-xs text-stone-500 uppercase tracking-wider px-5 py-2">Items</p>
                                    {results.items.map((item: any) => (
                                        <button key={item.id} onClick={() => { window.location.href = `/dashboard/inventory/products`; onClose() }}
                                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-stone-800 text-left">
                                            <Package className="h-4 w-4 text-emerald-400" />
                                            <div className="flex-1">
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-xs text-stone-500">{item.barcode || item.sku}</p>
                                            </div>
                                            <span className="font-mono text-emerald-400">{formatCurrency(item.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Customers */}
                            {results.customers?.length > 0 && (
                                <div>
                                    <p className="text-xs text-stone-500 uppercase tracking-wider px-5 py-2">Customers</p>
                                    {results.customers.map((c: any) => (
                                        <button key={c.id} onClick={() => { window.location.href = `/dashboard/customers`; onClose() }}
                                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-stone-800 text-left">
                                            <User className="h-4 w-4 text-blue-400" />
                                            <div className="flex-1">
                                                <p className="font-medium">{c.name}</p>
                                                <p className="text-xs text-stone-500">{c.email || c.phone}</p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-stone-600" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Transactions */}
                            {results.transactions?.length > 0 && (
                                <div>
                                    <p className="text-xs text-stone-500 uppercase tracking-wider px-5 py-2">Transactions</p>
                                    {results.transactions.map((t: any) => (
                                        <button key={t.id} onClick={() => { window.location.href = `/dashboard/transactions`; onClose() }}
                                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-stone-800 text-left">
                                            <Receipt className="h-4 w-4 text-purple-400" />
                                            <div className="flex-1">
                                                <p className="font-medium">#{t.receiptNumber || t.id.slice(0, 8)}</p>
                                                <p className="text-xs text-stone-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`font-mono ${t.status === 'COMPLETED' ? 'text-emerald-400' : 'text-stone-400'}`}>{formatCurrency(t.total)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-stone-800 px-5 py-2 flex justify-between text-xs text-stone-500">
                    <span>⌘K to toggle</span>
                    <span>↑↓ navigate • Enter to select</span>
                </div>
            </div>
        </div>
    )
}

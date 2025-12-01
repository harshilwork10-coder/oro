'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

export default function QuickSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    async function handleSearch(q: string) {
        setQuery(q)
        if (q.length < 2) {
            setResults([])
            return
        }

        setIsSearching(true)
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
            if (res.ok) {
                const data = await res.json()
                setResults(data.results)
            }
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setIsSearching(false)
        }
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Quick search..."
                    className="w-full md:w-80 pl-10 pr-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:border-purple-500 focus:outline-none transition-all"
                />
            </div>

            {/* Results Dropdown */}
            {query.length >= 2 && (
                <div className="absolute top-full mt-2 w-full glass-panel rounded-xl border border-stone-700 shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {isSearching ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-center text-stone-400 text-sm">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div>
                            {results.map((result, i) => (
                                <a
                                    key={i}
                                    href={result.href}
                                    className="block p-3 hover:bg-stone-900/50 transition-colors border-b border-stone-800/50 last:border-0">
                                    <p className="text-sm font-medium text-stone-100">{result.title}</p>
                                    <p className="text-xs text-stone-400 mt-1">{result.description}</p>
                                    <p className="text-xs text-purple-400 mt-1">{result.type}</p>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

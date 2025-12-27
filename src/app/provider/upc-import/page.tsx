'use client'

import { useState, useRef } from 'react'
import {
    Upload, FileText, Play, Pause, CheckCircle, XCircle,
    Clock, Database, BarChart3, RefreshCw, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface ImportResult {
    upc: string
    status: 'success' | 'exists' | 'not_found' | 'error'
    name?: string
    error?: string
}

interface Stats {
    totalProducts: number
    recentProducts: { upc: string; name: string; brand: string; createdAt: string }[]
}

export default function UpcImportPage() {
    const [upcText, setUpcText] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [results, setResults] = useState<ImportResult[]>([])
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [stats, setStats] = useState<Stats | null>(null)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const abortRef = useRef(false)

    // Load master DB stats
    async function loadStats() {
        try {
            const res = await fetch('/api/inventory/upc-bulk-import')
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (e) {
            console.error('Failed to load stats', e)
        }
    }

    // Parse UPC codes from text
    function parseUpcCodes(text: string): string[] {
        // Split by newlines, commas, spaces, tabs
        const codes = text
            .split(/[\n,\s\t]+/)
            .map(c => c.trim().replace(/\D/g, ''))
            .filter(c => c.length >= 8 && c.length <= 14)
        return [...new Set(codes)] // Remove duplicates
    }

    // Handle file upload
    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            setUpcText(text)
        }
        reader.readAsText(file)
    }

    // Start bulk import
    async function startImport() {
        const codes = parseUpcCodes(upcText)
        if (codes.length === 0) {
            setError('No valid UPC codes found')
            return
        }

        setIsImporting(true)
        setIsPaused(false)
        setError('')
        setResults([])
        abortRef.current = false

        const batchSize = 1 // Process 1 at a time to avoid rate limits
        const batches = []
        for (let i = 0; i < codes.length; i += batchSize) {
            batches.push(codes.slice(i, i + batchSize))
        }

        setProgress({ current: 0, total: codes.length })

        let allResults: ImportResult[] = []

        for (let i = 0; i < batches.length; i++) {
            if (abortRef.current) break

            // Wait while paused
            while (isPaused && !abortRef.current) {
                await new Promise(r => setTimeout(r, 500))
            }

            try {
                const res = await fetch('/api/inventory/upc-bulk-import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        upcCodes: batches[i],
                        delayMs: 5000 // 5 second delay between each API call
                    })
                })

                if (res.ok) {
                    const data = await res.json()
                    allResults = [...allResults, ...data.results]
                    setResults([...allResults])
                } else {
                    const err = await res.json()
                    setError(err.error || 'Import failed')
                    break
                }
            } catch (e) {
                setError('Network error during import')
                break
            }

            setProgress({ current: Math.min((i + 1) * batchSize, codes.length), total: codes.length })
        }

        setIsImporting(false)
        loadStats() // Refresh stats
    }

    // Stop import
    function stopImport() {
        abortRef.current = true
        setIsImporting(false)
    }

    // Calculate summary
    const summary = {
        success: results.filter(r => r.status === 'success').length,
        exists: results.filter(r => r.status === 'exists').length,
        notFound: results.filter(r => r.status === 'not_found').length,
        errors: results.filter(r => r.status === 'error').length,
    }

    const upcCount = parseUpcCodes(upcText).length

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/provider" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">UPC Database Import</h1>
                        <p className="text-stone-400">Build your master product database from UPC codes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Input */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Stats Card */}
                        <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Database className="h-5 w-5 text-purple-400" />
                                    Master Database Stats
                                </h3>
                                <button onClick={loadStats} className="text-stone-400 hover:text-white">
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>
                            {stats ? (
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-purple-400">{stats.totalProducts.toLocaleString()}</div>
                                    <div className="text-sm text-stone-500">Total Products in Master DB</div>
                                </div>
                            ) : (
                                <button onClick={loadStats} className="w-full py-3 text-stone-500 hover:text-white">
                                    Click to load stats
                                </button>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold">Paste UPC Codes</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-stone-400">
                                        {upcCount > 0 && `${upcCount.toLocaleString()} codes detected`}
                                    </span>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".txt,.csv"
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1 px-3 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload File
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={upcText}
                                onChange={(e) => setUpcText(e.target.value)}
                                placeholder="Paste UPC codes here (one per line, comma-separated, or space-separated)&#10;&#10;Example:&#10;049000042566&#10;012345678901&#10;..."
                                className="w-full h-64 px-4 py-3 bg-stone-950 border border-stone-700 rounded-xl font-mono text-sm focus:outline-none focus:border-purple-500 resize-none"
                                disabled={isImporting}
                            />

                            {error && (
                                <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-4">
                                {!isImporting ? (
                                    <button
                                        onClick={startImport}
                                        disabled={upcCount === 0}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2"
                                    >
                                        <Play className="h-5 w-5" />
                                        Start Import ({upcCount.toLocaleString()} codes)
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsPaused(!isPaused)}
                                            className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-semibold flex items-center justify-center gap-2"
                                        >
                                            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                                            {isPaused ? 'Resume' : 'Pause'}
                                        </button>
                                        <button
                                            onClick={stopImport}
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-semibold"
                                        >
                                            Stop Import
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Progress */}
                        {(isImporting || results.length > 0) && (
                            <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-blue-400" />
                                        Import Progress
                                    </h3>
                                    {isImporting && (
                                        <span className="text-sm text-purple-400 flex items-center gap-1">
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                            {isPaused ? 'Paused' : 'Importing...'}
                                        </span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="h-3 bg-stone-800 rounded-full overflow-hidden mb-4">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                        style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                                    />
                                </div>

                                <div className="text-center text-sm text-stone-400 mb-4">
                                    {progress.current.toLocaleString()} / {progress.total.toLocaleString()} processed
                                </div>

                                {/* Summary */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3 text-center">
                                        <CheckCircle className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
                                        <div className="text-xl font-bold text-emerald-400">{summary.success}</div>
                                        <div className="text-xs text-stone-400">Added</div>
                                    </div>
                                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                                        <Database className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                                        <div className="text-xl font-bold text-blue-400">{summary.exists}</div>
                                        <div className="text-xs text-stone-400">Already Exist</div>
                                    </div>
                                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
                                        <Clock className="h-5 w-5 mx-auto text-yellow-400 mb-1" />
                                        <div className="text-xl font-bold text-yellow-400">{summary.notFound}</div>
                                        <div className="text-xs text-stone-400">Not Found</div>
                                    </div>
                                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                                        <XCircle className="h-5 w-5 mx-auto text-red-400 mb-1" />
                                        <div className="text-xl font-bold text-red-400">{summary.errors}</div>
                                        <div className="text-xs text-stone-400">Errors</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Results */}
                    <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                        <div className="p-4 border-b border-stone-800">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-400" />
                                Import Results
                            </h3>
                        </div>
                        <div className="h-[600px] overflow-y-auto p-2">
                            {results.length === 0 ? (
                                <div className="text-center py-12 text-stone-500">
                                    <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Results will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {results.map((r, i) => (
                                        <div
                                            key={i}
                                            className={`p-2 rounded-lg text-sm flex items-center gap-2 ${r.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                                                r.status === 'exists' ? 'bg-blue-500/10 text-blue-400' :
                                                    r.status === 'not_found' ? 'bg-yellow-500/10 text-yellow-400' :
                                                        'bg-red-500/10 text-red-400'
                                                }`}
                                        >
                                            {r.status === 'success' && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
                                            {r.status === 'exists' && <Database className="h-4 w-4 flex-shrink-0" />}
                                            {r.status === 'not_found' && <Clock className="h-4 w-4 flex-shrink-0" />}
                                            {r.status === 'error' && <XCircle className="h-4 w-4 flex-shrink-0" />}
                                            <div className="min-w-0 flex-1">
                                                <div className="font-mono text-xs">{r.upc}</div>
                                                {r.name && <div className="text-xs truncate opacity-70">{r.name}</div>}
                                                {r.error && <div className="text-xs text-red-400">{r.error}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

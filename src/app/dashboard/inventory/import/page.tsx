'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Upload, Loader2, CheckCircle, AlertCircle, Sparkles, Save, ArrowRight, Edit2, Building2, ArrowLeft } from 'lucide-react'

interface ImportItem {
    rowNum: number
    upc: string
    originalName: string
    enrichedName: string | null
    brand: string | null
    size: string | null
    department: string
    cost: number
    price: number
    stock: number
    needsEnrichment: boolean
    enrichmentSource?: string
}

export default function InventoryImportPage() {
    const searchParams = useSearchParams()
    const franchiseId = searchParams.get('franchiseId')

    const [step, setStep] = useState<'upload' | 'preview' | 'enriching' | 'review' | 'importing'>('upload')
    const [items, setItems] = useState<ImportItem[]>([])
    const [columnMappings, setColumnMappings] = useState<any>(null)
    const [uploading, setUploading] = useState(false)
    const [enriching, setEnriching] = useState(false)
    const [importing, setImporting] = useState(false)
    const [updateExisting, setUpdateExisting] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const [storeName, setStoreName] = useState<string>('')

    // Fetch store info if franchiseId provided
    useEffect(() => {
        if (franchiseId) {
            fetch(`/api/franchisors/${franchiseId}`)
                .then(res => res.json())
                .then(data => setStoreName(data.name || 'Unknown Store'))
                .catch(() => setStoreName('Unknown Store'))
        }
    }, [franchiseId])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        if (franchiseId) formData.append('franchiseId', franchiseId)

        try {
            const res = await fetch('/api/inventory/import', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (data.success) {
                setItems(data.items)
                setColumnMappings(data.columnMappings)
                setStep('preview')
            } else {
                alert(data.error || 'Failed to parse file')
            }
        } catch (error) {
            alert('Failed to upload file')
        }
        setUploading(false)
    }

    const handleEnrich = async () => {
        setEnriching(true)
        setStep('enriching')

        try {
            const res = await fetch('/api/inventory/enrich-upc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            })
            const data = await res.json()

            if (data.success) {
                setItems(data.items)
                setStep('review')
            } else {
                alert(data.error || 'Failed to enrich items')
                setStep('preview')
            }
        } catch (error) {
            alert('Failed to enrich items')
            setStep('preview')
        }
        setEnriching(false)
    }

    const handleImport = async () => {
        setImporting(true)
        setStep('importing')

        try {
            const res = await fetch('/api/inventory/import-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, updateExisting, franchiseId })
            })
            const data = await res.json()
            setResult(data)
        } catch (error) {
            setResult({ error: 'Failed to import items' })
        }
        setImporting(false)
    }

    const updateItem = (rowNum: number, field: string, value: any) => {
        setItems(items.map(item =>
            item.rowNum === rowNum ? { ...item, [field]: value } : item
        ))
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header with store context */}
                <div className="mb-8">
                    {franchiseId && (
                        <a
                            href={`/dashboard/franchisors/${franchiseId}`}
                            className="inline-flex items-center gap-2 text-stone-400 hover:text-white mb-4 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Store
                        </a>
                    )}
                    <h1 className="text-3xl font-bold">Import Inventory</h1>
                    {storeName && (
                        <div className="flex items-center gap-2 mt-2">
                            <Building2 className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">{storeName}</span>
                        </div>
                    )}
                    <p className="text-stone-400 mt-1">Upload CSV/Excel with auto product enrichment</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-4 mb-8">
                    {['Upload', 'Preview', 'Enrich', 'Review', 'Complete'].map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
                                ${i <= ['upload', 'preview', 'enriching', 'review', 'importing'].indexOf(step)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-stone-800 text-stone-500'}`}>
                                {i + 1}
                            </div>
                            <span className="ml-2 text-sm text-stone-400 hidden sm:inline">{s}</span>
                            {i < 4 && <ArrowRight className="h-4 w-4 text-stone-600 ml-4" />}
                        </div>
                    ))}
                </div>

                {/* Upload Step */}
                {step === 'upload' && (
                    <div className="bg-stone-900 rounded-xl p-8 border border-stone-800">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Upload className="h-5 w-5 text-blue-400" />
                            Upload Inventory File
                        </h2>
                        <p className="text-stone-400 text-sm mb-6">
                            Upload your CSV or Excel file with columns: UPC/Barcode, Description, Department, Cost, Price, Stock
                        </p>

                        <label className="block cursor-pointer">
                            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                            <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
                                ${uploading ? 'border-blue-500 bg-blue-500/10' : 'border-stone-700 hover:border-blue-500'}`}>
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                                        <span>Parsing file...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Upload className="h-10 w-10 text-stone-500" />
                                        <span className="text-lg">Click to upload CSV or Excel</span>
                                        <span className="text-stone-500 text-sm">Supports .csv files only</span>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                )}

                {/* Preview Step */}
                {step === 'preview' && (
                    <div className="space-y-6">
                        <div className="bg-stone-900 rounded-xl p-6 border border-stone-800">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">Preview ({items.length} items)</h2>
                                    <p className="text-stone-400 text-sm">Review detected columns before enrichment</p>
                                </div>
                                <button
                                    onClick={handleEnrich}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold"
                                >
                                    <Sparkles className="h-5 w-5" />
                                    Enrich with UPC Data
                                </button>
                            </div>

                            {/* Column Mapping Info */}
                            {columnMappings && (
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 text-sm">
                                    {Object.entries(columnMappings).map(([key, val]: any) => (
                                        <div key={key} className="bg-stone-800 rounded px-2 py-1">
                                            <span className="text-stone-500">{key}:</span>{' '}
                                            <span className="text-white">{val || 'Not found'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-700 text-stone-400">
                                            <th className="text-left py-2 px-2">#</th>
                                            <th className="text-left py-2 px-2">UPC</th>
                                            <th className="text-left py-2 px-2">Description</th>
                                            <th className="text-left py-2 px-2">Dept</th>
                                            <th className="text-right py-2 px-2">Cost</th>
                                            <th className="text-right py-2 px-2">Price</th>
                                            <th className="text-right py-2 px-2">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.slice(0, 20).map(item => (
                                            <tr key={item.rowNum} className="border-b border-stone-800">
                                                <td className="py-2 px-2 text-stone-500">{item.rowNum}</td>
                                                <td className="py-2 px-2 font-mono">{item.upc}</td>
                                                <td className="py-2 px-2">{item.originalName}</td>
                                                <td className="py-2 px-2 text-stone-400">{item.department}</td>
                                                <td className="py-2 px-2 text-right">${item.cost.toFixed(2)}</td>
                                                <td className="py-2 px-2 text-right font-medium">${item.price.toFixed(2)}</td>
                                                <td className="py-2 px-2 text-right">{item.stock}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {items.length > 20 && (
                                    <p className="text-stone-500 text-center mt-2">...and {items.length - 20} more items</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Enriching Step */}
                {step === 'enriching' && (
                    <div className="bg-stone-900 rounded-xl p-12 border border-stone-800 text-center">
                        <Sparkles className="h-12 w-12 text-blue-400 mx-auto animate-pulse" />
                        <h2 className="text-xl font-bold mt-4">Enriching Products...</h2>
                        <p className="text-stone-400 mt-2">Looking up UPC codes to get standardized names, brands, and sizes</p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                            <span className="text-blue-400">This may take a moment...</span>
                        </div>
                    </div>
                )}

                {/* Review Step */}
                {step === 'review' && (
                    <div className="space-y-6">
                        <div className="bg-stone-900 rounded-xl p-6 border border-stone-800">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">Review Enriched Data</h2>
                                    <p className="text-stone-400 text-sm">Edit any items before importing. Click a row to edit.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={updateExisting}
                                            onChange={(e) => setUpdateExisting(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        Update existing items
                                    </label>
                                    <button
                                        onClick={handleImport}
                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold"
                                    >
                                        <Save className="h-5 w-5" />
                                        Import {items.length} Items
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-700 text-stone-400">
                                            <th className="text-left py-2 px-2">#</th>
                                            <th className="text-left py-2 px-2">UPC</th>
                                            <th className="text-left py-2 px-2">Original</th>
                                            <th className="text-left py-2 px-2">Enriched Name</th>
                                            <th className="text-left py-2 px-2">Brand</th>
                                            <th className="text-left py-2 px-2">Size</th>
                                            <th className="text-right py-2 px-2">Cost</th>
                                            <th className="text-right py-2 px-2">Price</th>
                                            <th className="text-center py-2 px-2">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.slice(0, 30).map(item => (
                                            <tr
                                                key={item.rowNum}
                                                className={`border-b border-stone-800 cursor-pointer hover:bg-stone-800/50
                                                    ${editingRow === item.rowNum ? 'bg-blue-500/10' : ''}`}
                                                onClick={() => setEditingRow(editingRow === item.rowNum ? null : item.rowNum)}
                                            >
                                                <td className="py-2 px-2 text-stone-500">{item.rowNum}</td>
                                                <td className="py-2 px-2 font-mono text-xs">{item.upc}</td>
                                                <td className="py-2 px-2 text-stone-400 text-xs">{item.originalName}</td>
                                                <td className="py-2 px-2">
                                                    {editingRow === item.rowNum ? (
                                                        <input
                                                            value={item.enrichedName || ''}
                                                            onChange={(e) => updateItem(item.rowNum, 'enrichedName', e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-1"
                                                        />
                                                    ) : (
                                                        <span className={item.enrichmentSource === 'upc_database' ? 'text-emerald-400' : ''}>
                                                            {item.enrichedName}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2 text-blue-400">{item.brand}</td>
                                                <td className="py-2 px-2">{item.size}</td>
                                                <td className="py-2 px-2 text-right">${item.cost.toFixed(2)}</td>
                                                <td className="py-2 px-2 text-right font-medium">${item.price.toFixed(2)}</td>
                                                <td className="py-2 px-2 text-center">
                                                    {item.enrichmentSource === 'upc_database' && (
                                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">UPC</span>
                                                    )}
                                                    {item.enrichmentSource === 'not_found' && (
                                                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Manual</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Importing / Complete */}
                {step === 'importing' && (
                    <div className="bg-stone-900 rounded-xl p-12 border border-stone-800 text-center">
                        {importing ? (
                            <>
                                <Loader2 className="h-12 w-12 text-emerald-400 mx-auto animate-spin" />
                                <h2 className="text-xl font-bold mt-4">Importing Items...</h2>
                            </>
                        ) : result?.success ? (
                            <>
                                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                                <h2 className="text-xl font-bold mt-4 text-emerald-400">Import Complete!</h2>
                                <p className="text-stone-300 mt-2">{result.message}</p>
                                <div className="flex gap-4 justify-center mt-6">
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-6 py-4">
                                        <span className="text-3xl font-bold text-emerald-400">{result.created}</span>
                                        <p className="text-sm text-stone-400">Created</p>
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-6 py-4">
                                        <span className="text-3xl font-bold text-blue-400">{result.updated}</span>
                                        <p className="text-sm text-stone-400">Updated</p>
                                    </div>
                                    <div className="bg-stone-800 border border-stone-700 rounded-xl px-6 py-4">
                                        <span className="text-3xl font-bold text-stone-400">{result.skipped}</span>
                                        <p className="text-sm text-stone-400">Skipped</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setStep('upload'); setItems([]); setResult(null); }}
                                    className="mt-6 px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium"
                                >
                                    Import Another File
                                </button>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                                <h2 className="text-xl font-bold mt-4 text-red-400">Import Failed</h2>
                                <p className="text-stone-400 mt-2">{result?.error}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}


'use client'

import { useState, useEffect } from 'react'
import {
    Printer, Search, Plus, Minus, Trash2, Settings, CheckCircle,
    Package, Tag, ArrowLeft, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface Product {
    id: string
    name: string
    barcode?: string
    price: number
    cardPrice?: number  // For dual pricing
    salePrice?: number  // For sale items
    brand?: string
    category?: string
    onSale?: boolean
}

interface LabelItem {
    product: Product
    quantity: number
    template: string
}

type LabelTemplate = 'PRICE_ONLY' | 'NAME_PRICE' | 'FULL' | 'DUAL_PRICE' | 'BIG_PRICE' | 'SALE' | 'BOXED'

const TEMPLATES: { id: LabelTemplate; name: string; description: string; requiresDualPricing?: boolean }[] = [
    { id: 'BOXED', name: 'Boxed Price', description: 'Border frame, boxed price' },
    { id: 'FULL', name: 'Full Label', description: 'Name, brand, price, barcode' },
    { id: 'PRICE_ONLY', name: 'Price Only', description: 'Just big price' },
    { id: 'NAME_PRICE', name: 'Name + Price', description: 'No barcode' },
    { id: 'BIG_PRICE', name: 'Big Price', description: 'Extra large price' },
    { id: 'DUAL_PRICE', name: 'Cash/Card', description: 'Cash vs Card prices', requiresDualPricing: true },
    { id: 'SALE', name: 'Sale Tag', description: 'Was/Now pricing' },
]

const LABEL_SIZES = [
    { id: '2.25x1.25', name: '2.25" x 1.25" (Standard)' },
    { id: '2x1', name: '2" x 1"' },
    { id: '1.5x1', name: '1.5" x 1"' },
    { id: '1x1', name: '1" x 1"' },
]

export default function LabelPrintPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [products, setProducts] = useState<Product[]>([])
    const [labelQueue, setLabelQueue] = useState<LabelItem[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>('BOXED')
    const [selectedSize, setSelectedSize] = useState('2.25x1.25')
    const [isPrinting, setIsPrinting] = useState(false)
    const [printStatus, setPrintStatus] = useState('')
    const [hasDualPricing, setHasDualPricing] = useState(false)
    const [printerStatus, setPrinterStatus] = useState<'checking' | 'online' | 'offline'>('checking')

    // Check printer status on load
    useEffect(() => {
        checkPrinterStatus()
        loadStoreSettings()
    }, [])

    async function checkPrinterStatus() {
        try {
            const res = await fetch('http://localhost:9100/status', {
                signal: AbortSignal.timeout(2000)
            })
            setPrinterStatus(res.ok ? 'online' : 'offline')
        } catch {
            setPrinterStatus('offline')
        }
    }

    async function loadStoreSettings() {
        try {
            const res = await fetch('/api/settings/franchise')
            if (res.ok) {
                const data = await res.json()
                setHasDualPricing(data.settings?.showDualPricing || false)
            }
        } catch {
            // Default to no dual pricing
        }
    }

    // Search products
    async function searchProducts() {
        if (!searchQuery.trim()) return

        try {
            // Search by barcode first
            const res = await fetch(`/api/inventory/items?search=${encodeURIComponent(searchQuery)}`)
            if (res.ok) {
                const data = await res.json()
                setProducts(data.items || [])
            }
        } catch (e) {
            console.error('Search failed', e)
        }
    }

    // Add product to queue
    function addToQueue(product: Product) {
        const existing = labelQueue.find(l => l.product.id === product.id)
        if (existing) {
            setLabelQueue(labelQueue.map(l =>
                l.product.id === product.id
                    ? { ...l, quantity: l.quantity + 1 }
                    : l
            ))
        } else {
            setLabelQueue([...labelQueue, { product, quantity: 1, template: selectedTemplate }])
        }
    }

    // Update quantity
    function updateQuantity(productId: string, delta: number) {
        setLabelQueue(labelQueue.map(l => {
            if (l.product.id === productId) {
                const newQty = Math.max(1, l.quantity + delta)
                return { ...l, quantity: newQty }
            }
            return l
        }))
    }

    // Remove from queue
    function removeFromQueue(productId: string) {
        setLabelQueue(labelQueue.filter(l => l.product.id !== productId))
    }

    // Update item template
    function updateItemTemplate(productId: string, template: string) {
        setLabelQueue(labelQueue.map(l =>
            l.product.id === productId ? { ...l, template } : l
        ))
    }

    // Print all labels
    async function printLabels() {
        if (labelQueue.length === 0) return

        setIsPrinting(true)
        setPrintStatus('Connecting to printer...')

        try {
            const labels = labelQueue.map(item => ({
                productName: item.product.name,
                price: item.product.price,
                cardPrice: item.product.cardPrice,
                salePrice: item.product.salePrice,
                barcode: item.product.barcode,
                brand: item.product.brand,
                size: selectedSize,
                quantity: item.quantity,
                template: item.template
            }))

            const res = await fetch('http://localhost:9100/print-labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels })
            })

            if (res.ok) {
                const totalLabels = labelQueue.reduce((sum, l) => sum + l.quantity, 0)
                setPrintStatus(`✅ Printed ${totalLabels} labels successfully!`)
                setLabelQueue([])
            } else {
                const error = await res.json()
                setPrintStatus(`❌ Error: ${error.error || 'Print failed'}`)
            }
        } catch (e: any) {
            setPrintStatus(`❌ Cannot connect to print agent. Is it running?`)
        }

        setIsPrinting(false)
        setTimeout(() => setPrintStatus(''), 5000)
    }

    // Print test label
    async function printTestLabel() {
        setIsPrinting(true)
        setPrintStatus('Printing test...')

        try {
            const res = await fetch('http://localhost:9100/print-label', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: {
                        productName: 'Test Product',
                        price: 9.99,
                        cardPrice: 10.49,
                        barcode: '123456789012',
                        brand: 'Test Brand',
                        size: selectedSize,
                        template: selectedTemplate,
                        quantity: 1
                    }
                })
            })

            if (res.ok) {
                setPrintStatus('✅ Test label printed!')
            } else {
                setPrintStatus('❌ Test print failed')
            }
        } catch {
            setPrintStatus('❌ Printer not connected')
        }

        setIsPrinting(false)
        setTimeout(() => setPrintStatus(''), 3000)
    }

    const totalLabels = labelQueue.reduce((sum, l) => sum + l.quantity, 0)
    const availableTemplates = TEMPLATES.filter(t => !t.requiresDualPricing || hasDualPricing)

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-stone-800 rounded-lg">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Tag className="h-6 w-6 text-orange-400" />
                                Label Printing
                            </h1>
                            <p className="text-stone-400">Print price labels for your products</p>
                        </div>
                    </div>

                    {/* Printer Status */}
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${printerStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                            printerStatus === 'offline' ? 'bg-red-500/20 text-red-400' :
                                'bg-stone-800 text-stone-400'
                            }`}>
                            <Printer className="h-4 w-4" />
                            {printerStatus === 'online' ? 'Printer Ready' :
                                printerStatus === 'offline' ? 'Printer Offline' :
                                    'Checking...'}
                        </div>
                        <button
                            onClick={checkPrinterStatus}
                            className="p-2 hover:bg-stone-800 rounded-lg"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Search & Products */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Search */}
                        <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, barcode, or scan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                                        className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-lg focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                                <button
                                    onClick={searchProducts}
                                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {products.length > 0 && (
                            <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                                <div className="p-3 border-b border-stone-800 text-sm text-stone-400">
                                    {products.length} products found
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {products.map(product => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 hover:bg-stone-800 border-b border-stone-800 last:border-0"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium truncate">{product.name}</div>
                                                <div className="text-sm text-stone-400 flex items-center gap-3">
                                                    <span>${product.price.toFixed(2)}</span>
                                                    {product.barcode && (
                                                        <span className="font-mono text-xs">{product.barcode}</span>
                                                    )}
                                                    {product.brand && <span>{product.brand}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => addToQueue(product)}
                                                className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg ml-4"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Template & Size Selection */}
                        <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Template */}
                                <div>
                                    <label className="block text-sm text-stone-400 mb-2">Default Template</label>
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value as LabelTemplate)}
                                        className="w-full px-4 py-2 bg-stone-950 border border-stone-700 rounded-lg focus:outline-none focus:border-orange-500"
                                    >
                                        {availableTemplates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} - {t.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Size */}
                                <div>
                                    <label className="block text-sm text-stone-400 mb-2">Label Size</label>
                                    <select
                                        value={selectedSize}
                                        onChange={(e) => setSelectedSize(e.target.value)}
                                        className="w-full px-4 py-2 bg-stone-950 border border-stone-700 rounded-lg focus:outline-none focus:border-orange-500"
                                    >
                                        {LABEL_SIZES.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Test Print */}
                            <button
                                onClick={printTestLabel}
                                disabled={isPrinting || printerStatus !== 'online'}
                                className="mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                Print Test Label
                            </button>
                        </div>
                    </div>

                    {/* Right: Print Queue */}
                    <div className="space-y-4">
                        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Package className="h-5 w-5 text-purple-400" />
                                    Print Queue
                                </h3>
                                <span className="text-sm bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                    {totalLabels} labels
                                </span>
                            </div>

                            {labelQueue.length === 0 ? (
                                <div className="p-8 text-center text-stone-500">
                                    <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Add products to print labels</p>
                                </div>
                            ) : (
                                <div className="max-h-96 overflow-y-auto">
                                    {labelQueue.map(item => (
                                        <div key={item.product.id} className="p-3 border-b border-stone-800 last:border-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-sm truncate">{item.product.name}</div>
                                                    <div className="text-xs text-stone-400">${item.product.price.toFixed(2)}</div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromQueue(item.product.id)}
                                                    className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Quantity */}
                                                <div className="flex items-center gap-1 bg-stone-800 rounded-lg">
                                                    <button
                                                        onClick={() => updateQuantity(item.product.id, -1)}
                                                        className="p-1.5 hover:bg-stone-700 rounded-l-lg"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.product.id, 1)}
                                                        className="p-1.5 hover:bg-stone-700 rounded-r-lg"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>

                                                {/* Template */}
                                                <select
                                                    value={item.template}
                                                    onChange={(e) => updateItemTemplate(item.product.id, e.target.value)}
                                                    className="flex-1 px-2 py-1 bg-stone-800 border border-stone-700 rounded text-xs"
                                                >
                                                    {availableTemplates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Print Button */}
                            <div className="p-4 border-t border-stone-800">
                                <button
                                    onClick={printLabels}
                                    disabled={labelQueue.length === 0 || isPrinting || printerStatus !== 'online'}
                                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2"
                                >
                                    <Printer className="h-5 w-5" />
                                    {isPrinting ? 'Printing...' : `Print ${totalLabels} Labels`}
                                </button>

                                {printStatus && (
                                    <div className={`mt-3 p-2 rounded-lg text-sm text-center ${printStatus.includes('✅') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {printStatus}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                            <h4 className="text-sm font-medium text-stone-300 mb-2">Quick Tips</h4>
                            <ul className="text-xs text-stone-500 space-y-1">
                                <li>• Scan barcodes to quickly add products</li>
                                <li>• Change template per item in the queue</li>
                                <li>• Use BIG_PRICE for sale displays</li>
                                {hasDualPricing && <li>• Cash/Card template shows both prices</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

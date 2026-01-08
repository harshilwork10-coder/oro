import { useState, useEffect } from 'react'
import { X, DollarSign, ArrowLeft, Loader2, Package, Barcode, Save, Check } from 'lucide-react'

interface ScanQuickAddModalProps {
    barcode: string
    onAdd: (product: {
        name: string
        price: number
        barcode: string
        taxType: 'NO_TAX' | 'HIGH_TAX' | 'LOW_TAX' | 'EBT'
        saveToInventory: boolean
        category?: string
    }) => void
    onClose: () => void
}

interface UpcLookupResult {
    found: boolean
    barcode: string
    name: string | null
    brand: string | null
    category: string | null
    imageUrl: string | null
    suggestedPrice: number | null
    source: string | null
}

export default function ScanQuickAddModal({ barcode, onAdd, onClose }: ScanQuickAddModalProps) {
    const [value, setValue] = useState('')
    const [productName, setProductName] = useState('')
    const [saveToInventory, setSaveToInventory] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [lookupResult, setLookupResult] = useState<UpcLookupResult | null>(null)

    // Lookup UPC on mount
    useEffect(() => {
        const lookupUpc = async () => {
            if (!barcode) {
                setIsLoading(false)
                return
            }

            try {
                const res = await fetch(`/api/products/upc-lookup?barcode=${encodeURIComponent(barcode)}`)
                if (res.ok) {
                    const data = await res.json()
                    const result = data.data || data
                    setLookupResult(result)

                    // Pre-populate fields if found
                    if (result.found) {
                        if (result.name) setProductName(result.name)
                        if (result.suggestedPrice) setValue(result.suggestedPrice.toFixed(2))
                    }
                }
            } catch (error) {
                console.error('UPC lookup failed:', error)
            } finally {
                setIsLoading(false)
            }
        }

        lookupUpc()
    }, [barcode])

    // Handle keyboard input for price
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if not focused on text input
            if (document.activeElement?.tagName === 'INPUT' &&
                (document.activeElement as HTMLInputElement).type === 'text') {
                return
            }

            if (e.key >= '0' && e.key <= '9') {
                handleInput(e.key)
            } else if (e.key === 'Backspace') {
                handleInput('backspace')
            } else if (e.key === 'Escape') {
                onClose()
            } else if (e.key === '.') {
                handleInput('.')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [value])

    const handleInput = (key: string) => {
        if (key === 'backspace') {
            setValue(prev => prev.slice(0, -1))
        } else if (key === 'clear') {
            setValue('')
        } else if (key === '.') {
            if (!value.includes('.')) setValue(prev => prev + '.')
        } else {
            if (value.includes('.') && value.split('.')[1].length >= 2) return
            if (value.length > 8) return
            setValue(prev => prev + key)
        }
    }

    const price = parseFloat(value) || 0

    const handleAdd = (taxType: 'NO_TAX' | 'HIGH_TAX' | 'LOW_TAX' | 'EBT') => {
        if (price <= 0) return

        onAdd({
            name: productName || `Item (${barcode})`,
            price,
            barcode,
            taxType,
            saveToInventory,
            category: lookupResult?.category || undefined
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-gradient-to-r from-emerald-900/30 to-stone-900">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Package className="w-6 h-6 text-emerald-500" />
                            Product Not Found
                        </h2>
                        <p className="text-sm text-stone-400 mt-1">Quick add to cart and optionally save to inventory</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Barcode Display */}
                <div className="px-4 py-3 bg-stone-950 border-b border-stone-800 flex items-center gap-3">
                    <Barcode className="w-5 h-5 text-stone-500" />
                    <span className="font-mono text-lg text-stone-300">{barcode}</span>
                    {isLoading && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin ml-auto" />}
                    {!isLoading && lookupResult?.found && (
                        <span className="ml-auto text-xs text-emerald-500 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Found via {lookupResult.source}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {/* Product Name Input */}
                    <div>
                        <label className="text-sm text-stone-400 mb-2 block">Product Name</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder={lookupResult?.name || "Enter product name..."}
                            className="w-full p-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        {lookupResult?.brand && (
                            <p className="text-xs text-stone-500 mt-1">Brand: {lookupResult.brand}</p>
                        )}
                    </div>

                    {/* Price Display & Keypad */}
                    <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                        <div className="text-stone-400 text-sm font-medium mb-1 text-center">PRICE</div>
                        <div className="text-4xl font-bold text-white tracking-tight text-center mb-4">
                            {value ? `$${value}` : '$0.00'}
                        </div>

                        {lookupResult?.suggestedPrice && !value && (
                            <button
                                onClick={() => setValue(lookupResult.suggestedPrice!.toFixed(2))}
                                className="w-full mb-4 py-2 bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30 transition-colors"
                            >
                                Use Suggested: ${lookupResult.suggestedPrice.toFixed(2)}
                            </button>
                        )}

                        {/* Compact Keypad */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleInput(num.toString())}
                                    className="h-12 rounded-lg bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-xl font-bold text-white transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => handleInput('backspace')}
                                className="h-12 rounded-lg bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-500 flex items-center justify-center transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Save to Inventory Toggle */}
                    <label className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-xl border border-stone-700 cursor-pointer hover:bg-stone-800 transition-colors">
                        <input
                            type="checkbox"
                            checked={saveToInventory}
                            onChange={(e) => setSaveToInventory(e.target.checked)}
                            className="w-5 h-5 rounded border-stone-600 text-emerald-500 focus:ring-emerald-500/50 bg-stone-700"
                        />
                        <div className="flex-1">
                            <div className="text-white font-medium flex items-center gap-2">
                                <Save className="w-4 h-4 text-emerald-500" />
                                Save product to inventory
                            </div>
                            <div className="text-xs text-stone-400">Next scan will add automatically</div>
                        </div>
                    </label>

                    {/* Tax Type Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleAdd('NO_TAX')}
                            disabled={price <= 0}
                            className="h-14 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            NO TAX
                        </button>
                        <button
                            onClick={() => handleAdd('HIGH_TAX')}
                            disabled={price <= 0}
                            className="h-14 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            HIGH TAX
                        </button>
                        <button
                            onClick={() => handleAdd('LOW_TAX')}
                            disabled={price <= 0}
                            className="h-14 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            LOW TAX
                        </button>
                        <button
                            onClick={() => handleAdd('EBT')}
                            disabled={price <= 0}
                            className="h-14 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            EBT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, DollarSign, Percent, AlertCircle } from 'lucide-react'

// Using local task definition
interface PreOnboardingConfigProps {
    franchiseId: string
    franchisorId: string
    onConfigured?: () => void
}

export default function PreOnboardingConfig({ franchiseId, franchisorId, onConfigured }: PreOnboardingConfigProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Current config state
    const [pricingModel, setPricingModel] = useState<'STANDARD' | 'DUAL_PRICING'>('DUAL_PRICING')
    const [cardSurcharge, setCardSurcharge] = useState<number>(3.99)
    const [taxRate, setTaxRate] = useState<number>(8.25)
    
    // We will pull the global BusinessConfig to see if the industry is Retail vs Salon
    const [industry, setIndustry] = useState<string>('SERVICE')

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch franchise settings
                const res = await fetch(`/api/provider/franchise-settings?franchiseId=${franchiseId}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.pricingModel) setPricingModel(data.pricingModel)
                    if (data.cardSurcharge !== undefined) setCardSurcharge(parseFloat(data.cardSurcharge))
                    if (data.taxRate !== undefined) setTaxRate(parseFloat(data.taxRate))
                }
            } catch (err) {
                console.error('Failed to load settings', err)
            } finally {
                setLoading(false)
            }
        }
        fetchSettings()
    }, [franchiseId])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSaved(false)

        try {
            const res = await fetch('/api/provider/franchise-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    pricingModel,
                    cardSurcharge,
                    cardSurchargeType: 'PERCENTAGE',
                    showDualPricing: pricingModel === 'DUAL_PRICING',
                    taxRate
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to save config')
            }

            setSaved(true)
            if (onConfigured) onConfigured()
            
            setTimeout(() => setSaved(false), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 mb-6 flex items-center justify-center min-h-[150px]">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-stone-100">Financial Setup & Pre-Onboarding</h2>
                    <p className="text-xs text-stone-400 mt-0.5">Configure dual pricing and taxes before handing off to the owner.</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {/* Pricing Model */}
                <div className="space-y-4 bg-stone-950/50 border border-stone-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-stone-300">Payment Pricing Model</h3>
                    
                    <div 
                        onClick={() => setPricingModel('STANDARD')}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${pricingModel === 'STANDARD' ? 'border-emerald-500 bg-emerald-500/10' : 'border-stone-800 hover:border-stone-700'}`}
                    >
                        <p className="font-bold text-white text-sm">Standard Pricing</p>
                        <p className="text-xs text-stone-400 mt-1">Merchant absorbs processing fees. Receipt shows single uniform total.</p>
                    </div>

                    <div 
                        onClick={() => setPricingModel('DUAL_PRICING')}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${pricingModel === 'DUAL_PRICING' ? 'border-emerald-500 bg-emerald-500/10' : 'border-stone-800 hover:border-stone-700'}`}
                    >
                        <p className="font-bold text-white text-sm">Dual Pricing (Cash Discount)</p>
                        <p className="text-xs text-stone-400 mt-1">Pass processing fees to customers. Receipt shows Cash vs Card explicitly.</p>
                    </div>

                    {pricingModel === 'DUAL_PRICING' && (
                        <div className="mt-4 pt-4 border-t border-stone-800">
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Card Surcharge %</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={cardSurcharge}
                                        onChange={(e) => setCardSurcharge(parseFloat(e.target.value))}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white pr-8 focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                    <Percent className="h-4 w-4 text-stone-500 absolute right-3 top-2.5" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tax Configuration */}
                <div className="space-y-4 bg-stone-950/50 border border-stone-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-stone-300">Base Tax Configuration</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Primary Tax Rate %</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                step="0.01"
                                value={taxRate}
                                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white pr-8 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <Percent className="h-4 w-4 text-stone-500 absolute right-3 top-2.5" />
                        </div>
                        <p className="text-xs text-stone-500 mt-2">This establishes the fallback tax group if not explicitly set elsewhere.</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end mt-6 pt-6 border-t border-stone-800/80 relative z-10">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors ${
                        saved 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {saved ? <CheckCircle2 className="h-4 w-4" /> : null}
                    {saved ? 'Saved!' : 'Save Business Config'}
                </button>
            </div>
        </div>
    )
}

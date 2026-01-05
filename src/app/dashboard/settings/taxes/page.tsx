'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Receipt, MapPin, Search, AlertCircle, Check, ChevronDown, ChevronUp,
    DollarSign, Percent, Package, Wine, Beer, Cigarette, ShoppingCart,
    Utensils, Droplet, Info, Save, RefreshCw
} from 'lucide-react'

// Bottle deposit rates by state
const BOTTLE_DEPOSITS: Record<string, {
    hasDeposit: boolean
    rates: { size: string; amount: number }[]
    containers: string
}> = {
    'CA': { hasDeposit: true, rates: [{ size: '<24oz', amount: 0.05 }, { size: '≥24oz', amount: 0.10 }], containers: 'Most beverages' },
    'CT': { hasDeposit: true, rates: [{ size: 'all', amount: 0.05 }], containers: 'Beer, carbonated' },
    'HI': { hasDeposit: true, rates: [{ size: 'all', amount: 0.05 }], containers: 'All beverages' },
    'IA': { hasDeposit: true, rates: [{ size: 'all', amount: 0.05 }], containers: 'Beer, carbonated' },
    'ME': { hasDeposit: true, rates: [{ size: 'standard', amount: 0.05 }, { size: 'wine/liquor', amount: 0.15 }], containers: 'Beer, wine, liquor' },
    'MA': { hasDeposit: true, rates: [{ size: 'all', amount: 0.05 }], containers: 'Carbonated' },
    'MI': { hasDeposit: true, rates: [{ size: 'all', amount: 0.10 }], containers: 'Carbonated' },
    'NY': { hasDeposit: true, rates: [{ size: 'all', amount: 0.05 }], containers: 'Carbonated, water' },
    'OR': { hasDeposit: true, rates: [{ size: 'all', amount: 0.10 }], containers: 'Most beverages' },
    'VT': { hasDeposit: true, rates: [{ size: 'standard', amount: 0.05 }, { size: 'liquor', amount: 0.15 }], containers: 'Beer, wine, liquor' },
}

interface TaxLookupResult {
    zip: string
    state: string
    stateCode: string
    city?: string
    county?: string
    stateTaxRate: number
    localTaxRate: number
    villageTax?: number
    rtaTax?: number
    countyTax?: number
    combinedRate: number
    categoryRates?: {
        general: number
        grocery: number
        liquorSpirits: number
        liquorWine: number
        liquorBeer: number
        tobacco: number
    }
    disclaimer: string
}

interface TaxSettings {
    // Location
    zipCode: string
    stateCode: string
    city: string
    county: string

    // Rates
    stateTaxRate: number
    countyTaxRate: number
    cityTaxRate: number
    specialDistrictRate: number

    // Toggles
    taxServices: boolean
    taxProducts: boolean
    taxGroceries: boolean
    taxPreparedFood: boolean

    // Bottle Deposit
    bottleDepositEnabled: boolean
    bottleDepositSmall: number // < 24oz
    bottleDepositLarge: number // >= 24oz

    // Category Overrides
    alcoholTaxRate: number
    tobaccoTaxRate: number
    groceryTaxRate: number
    preparedFoodTaxRate: number
}

export default function TaxSettingsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [lookingUp, setLookingUp] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [zipInput, setZipInput] = useState('')
    const [lookupResult, setLookupResult] = useState<TaxLookupResult | null>(null)

    const [settings, setSettings] = useState<TaxSettings>({
        zipCode: '',
        stateCode: '',
        city: '',
        county: '',
        stateTaxRate: 0,
        countyTaxRate: 0,
        cityTaxRate: 0,
        specialDistrictRate: 0,
        taxServices: true,
        taxProducts: true,
        taxGroceries: false,
        taxPreparedFood: true,
        bottleDepositEnabled: false,
        bottleDepositSmall: 0.05,
        bottleDepositLarge: 0.10,
        alcoholTaxRate: 0,
        tobaccoTaxRate: 0,
        groceryTaxRate: 0,
        preparedFoodTaxRate: 0,
    })

    // Provider check
    const isProvider = session?.user?.role === 'PROVIDER'
    const canEdit = isProvider

    useEffect(() => {
        fetchCurrentSettings()
    }, [])

    const fetchCurrentSettings = async () => {
        try {
            const res = await fetch('/api/settings/franchise')
            if (res.ok) {
                const data = await res.json()
                if (data) {
                    setSettings(prev => ({
                        ...prev,
                        taxServices: data.taxServices ?? true,
                        taxProducts: data.taxProducts ?? true,
                        stateTaxRate: data.taxRate ? data.taxRate * 100 : 0,
                    }))
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const lookupTaxRate = async () => {
        if (!zipInput || zipInput.length !== 5) {
            setMessage('❌ Please enter a valid 5-digit ZIP code')
            return
        }

        setLookingUp(true)
        setMessage('')

        try {
            const res = await fetch(`/api/tax/lookup?zip=${zipInput}`)
            const data = await res.json()

            if (data.success) {
                setLookupResult(data)

                // Auto-populate settings
                const bottleInfo = BOTTLE_DEPOSITS[data.stateCode]
                setSettings(prev => ({
                    ...prev,
                    zipCode: data.zip,
                    stateCode: data.stateCode,
                    city: data.city || '',
                    county: data.county || '',
                    stateTaxRate: data.stateTaxRate || 0,
                    countyTaxRate: data.countyTax || 0,
                    cityTaxRate: data.villageTax || 0,
                    specialDistrictRate: data.rtaTax || 0,
                    bottleDepositEnabled: bottleInfo?.hasDeposit || false,
                    bottleDepositSmall: bottleInfo?.rates.find(r => r.size.includes('<') || r.size === 'standard' || r.size === 'all')?.amount || 0.05,
                    bottleDepositLarge: bottleInfo?.rates.find(r => r.size.includes('≥') || r.size === 'wine' || r.size === 'liquor')?.amount || 0.10,
                    alcoholTaxRate: data.categoryRates?.liquorSpirits || data.combinedRate,
                    groceryTaxRate: data.categoryRates?.grocery || 0,
                    tobaccoTaxRate: data.categoryRates?.tobacco || data.combinedRate,
                    preparedFoodTaxRate: data.combinedRate,
                }))

                setMessage('✅ Tax rates loaded! Review and save.')
            } else {
                setMessage('❌ ' + (data.error || 'Failed to lookup tax rate'))
            }
        } catch (error) {
            console.error('Tax lookup error:', error)
            setMessage('❌ Error looking up tax rate')
        } finally {
            setLookingUp(false)
        }
    }

    const saveSettings = async () => {
        if (!canEdit) return

        setSaving(true)
        setMessage('')

        try {
            // Calculate combined rate
            const combinedRate = settings.stateTaxRate + settings.countyTaxRate + settings.cityTaxRate + settings.specialDistrictRate

            const res = await fetch('/api/settings/franchise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taxRate: combinedRate / 100, // Store as decimal
                    taxServices: settings.taxServices,
                    taxProducts: settings.taxProducts,
                    // Store detailed breakdown in settings
                    taxSettings: JSON.stringify({
                        zipCode: settings.zipCode,
                        stateCode: settings.stateCode,
                        city: settings.city,
                        county: settings.county,
                        stateTaxRate: settings.stateTaxRate,
                        countyTaxRate: settings.countyTaxRate,
                        cityTaxRate: settings.cityTaxRate,
                        specialDistrictRate: settings.specialDistrictRate,
                        bottleDepositEnabled: settings.bottleDepositEnabled,
                        bottleDepositSmall: settings.bottleDepositSmall,
                        bottleDepositLarge: settings.bottleDepositLarge,
                        alcoholTaxRate: settings.alcoholTaxRate,
                        tobaccoTaxRate: settings.tobaccoTaxRate,
                        groceryTaxRate: settings.groceryTaxRate,
                        preparedFoodTaxRate: settings.preparedFoodTaxRate,
                    })
                })
            })

            if (res.ok) {
                setMessage('✅ Tax settings saved!')
            } else {
                setMessage('❌ Failed to save settings')
            }
        } catch (error) {
            setMessage('❌ Error saving settings')
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 4000)
        }
    }

    const combinedRate = settings.stateTaxRate + settings.countyTaxRate + settings.cityTaxRate + settings.specialDistrictRate

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        Tax Configuration
                    </h1>
                    <p className="text-stone-400 mt-1">Set up sales tax, excise taxes, and bottle deposits</p>
                </div>
                {canEdit && (
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="h-5 w-5" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                )}
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl ${message.includes('✅') ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-400' : 'bg-red-900/30 border border-red-500/30 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* ZIP Code Lookup */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Auto-Lookup by ZIP Code</h2>
                        <p className="text-sm text-stone-400">Enter your ZIP code and we'll find all applicable tax rates</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <input
                        type="text"
                        value={zipInput}
                        onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="Enter 5-digit ZIP code"
                        className="flex-1 max-w-xs px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:border-blue-500 focus:outline-none text-lg tracking-wider"
                    />
                    <button
                        onClick={lookupTaxRate}
                        disabled={lookingUp || zipInput.length !== 5}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {lookingUp ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                            <Search className="h-5 w-5" />
                        )}
                        Lookup
                    </button>
                </div>

                {/* Lookup Result Preview */}
                {lookupResult && (
                    <div className="mt-4 p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <div className="flex items-center gap-2 mb-3">
                            <Check className="h-5 w-5 text-emerald-400" />
                            <span className="font-semibold text-white">
                                {lookupResult.city || lookupResult.county || lookupResult.state}, {lookupResult.stateCode}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <div className="text-stone-500">State Tax</div>
                                <div className="text-lg font-bold text-white">{lookupResult.stateTaxRate}%</div>
                            </div>
                            <div>
                                <div className="text-stone-500">Local Tax</div>
                                <div className="text-lg font-bold text-white">{lookupResult.localTaxRate}%</div>
                            </div>
                            <div>
                                <div className="text-stone-500">Combined</div>
                                <div className="text-lg font-bold text-emerald-400">{lookupResult.combinedRate}%</div>
                            </div>
                            {BOTTLE_DEPOSITS[lookupResult.stateCode] && (
                                <div>
                                    <div className="text-stone-500">Bottle Deposit</div>
                                    <div className="text-lg font-bold text-blue-400">Required</div>
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-xs text-stone-500">{lookupResult.disclaimer}</p>
                    </div>
                )}
            </div>

            {/* Tax Rate Breakdown */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                        <Percent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Sales Tax Rates</h2>
                        <p className="text-sm text-stone-400">Review and adjust tax rates for your location</p>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-sm text-stone-500">Combined Rate</div>
                        <div className="text-2xl font-bold text-emerald-400">{combinedRate.toFixed(3)}%</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* State Tax */}
                    <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <label className="text-sm text-stone-400 mb-2 block">State Tax Rate</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.001"
                                value={settings.stateTaxRate}
                                onChange={(e) => setSettings(prev => ({ ...prev, stateTaxRate: parseFloat(e.target.value) || 0 }))}
                                disabled={!canEdit}
                                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                            <span className="text-stone-400 text-lg">%</span>
                        </div>
                        {settings.stateCode && <p className="text-xs text-stone-500 mt-2">{settings.stateCode} State Sales Tax</p>}
                    </div>

                    {/* County Tax */}
                    <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <label className="text-sm text-stone-400 mb-2 block">County Tax Rate</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.001"
                                value={settings.countyTaxRate}
                                onChange={(e) => setSettings(prev => ({ ...prev, countyTaxRate: parseFloat(e.target.value) || 0 }))}
                                disabled={!canEdit}
                                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                            <span className="text-stone-400 text-lg">%</span>
                        </div>
                        {settings.county && <p className="text-xs text-stone-500 mt-2">{settings.county} County</p>}
                    </div>

                    {/* City Tax */}
                    <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <label className="text-sm text-stone-400 mb-2 block">City/Municipality Tax</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.001"
                                value={settings.cityTaxRate}
                                onChange={(e) => setSettings(prev => ({ ...prev, cityTaxRate: parseFloat(e.target.value) || 0 }))}
                                disabled={!canEdit}
                                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                            <span className="text-stone-400 text-lg">%</span>
                        </div>
                        {settings.city && <p className="text-xs text-stone-500 mt-2">{settings.city}</p>}
                    </div>

                    {/* Special District */}
                    <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <label className="text-sm text-stone-400 mb-2 block">Special District (RTA, etc.)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.001"
                                value={settings.specialDistrictRate}
                                onChange={(e) => setSettings(prev => ({ ...prev, specialDistrictRate: parseFloat(e.target.value) || 0 }))}
                                disabled={!canEdit}
                                className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-orange-500 focus:outline-none disabled:opacity-60"
                            />
                            <span className="text-stone-400 text-lg">%</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-2">Transit, tourism, or other special taxes</p>
                    </div>
                </div>
            </div>

            {/* Tax Categories */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">What Gets Taxed?</h2>
                        <p className="text-sm text-stone-400">Configure which items are taxable</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tax Products */}
                    <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-blue-400" />
                            <div>
                                <div className="font-medium text-white">Tax Products</div>
                                <div className="text-sm text-stone-500">Apply tax to retail products</div>
                            </div>
                        </div>
                        <button
                            onClick={() => canEdit && setSettings(prev => ({ ...prev, taxProducts: !prev.taxProducts }))}
                            disabled={!canEdit}
                            className={`relative w-14 h-8 rounded-full transition-all ${settings.taxProducts ? 'bg-emerald-500' : 'bg-stone-600'} disabled:opacity-60`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.taxProducts ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Tax Services */}
                    <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <div className="flex items-center gap-3">
                            <Utensils className="h-5 w-5 text-pink-400" />
                            <div>
                                <div className="font-medium text-white">Tax Services</div>
                                <div className="text-sm text-stone-500">Apply tax to service items</div>
                            </div>
                        </div>
                        <button
                            onClick={() => canEdit && setSettings(prev => ({ ...prev, taxServices: !prev.taxServices }))}
                            disabled={!canEdit}
                            className={`relative w-14 h-8 rounded-full transition-all ${settings.taxServices ? 'bg-emerald-500' : 'bg-stone-600'} disabled:opacity-60`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.taxServices ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Tax Groceries */}
                    <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-5 w-5 text-green-400" />
                            <div>
                                <div className="font-medium text-white">Tax Groceries</div>
                                <div className="text-sm text-stone-500">Many states exempt groceries</div>
                            </div>
                        </div>
                        <button
                            onClick={() => canEdit && setSettings(prev => ({ ...prev, taxGroceries: !prev.taxGroceries }))}
                            disabled={!canEdit}
                            className={`relative w-14 h-8 rounded-full transition-all ${settings.taxGroceries ? 'bg-emerald-500' : 'bg-stone-600'} disabled:opacity-60`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.taxGroceries ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Tax Prepared Food */}
                    <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                        <div className="flex items-center gap-3">
                            <Utensils className="h-5 w-5 text-orange-400" />
                            <div>
                                <div className="font-medium text-white">Tax Prepared Food</div>
                                <div className="text-sm text-stone-500">Hot/prepared food items</div>
                            </div>
                        </div>
                        <button
                            onClick={() => canEdit && setSettings(prev => ({ ...prev, taxPreparedFood: !prev.taxPreparedFood }))}
                            disabled={!canEdit}
                            className={`relative w-14 h-8 rounded-full transition-all ${settings.taxPreparedFood ? 'bg-emerald-500' : 'bg-stone-600'} disabled:opacity-60`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.taxPreparedFood ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottle Deposits */}
            <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <Droplet className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Bottle Deposit (CRV)</h2>
                        <p className="text-sm text-stone-400">Container redemption value - required in 10 states</p>
                    </div>
                    <button
                        onClick={() => canEdit && setSettings(prev => ({ ...prev, bottleDepositEnabled: !prev.bottleDepositEnabled }))}
                        disabled={!canEdit}
                        className={`ml-auto relative w-14 h-8 rounded-full transition-all ${settings.bottleDepositEnabled ? 'bg-cyan-500' : 'bg-stone-600'} disabled:opacity-60`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.bottleDepositEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                {settings.bottleDepositEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                            <label className="text-sm text-stone-400 mb-2 block">Small Containers (&lt; 24oz)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-stone-400 text-lg">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.bottleDepositSmall}
                                    onChange={(e) => setSettings(prev => ({ ...prev, bottleDepositSmall: parseFloat(e.target.value) || 0 }))}
                                    disabled={!canEdit}
                                    className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                            <label className="text-sm text-stone-400 mb-2 block">Large Containers (≥ 24oz)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-stone-400 text-lg">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.bottleDepositLarge}
                                    onChange={(e) => setSettings(prev => ({ ...prev, bottleDepositLarge: parseFloat(e.target.value) || 0 }))}
                                    disabled={!canEdit}
                                    className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottle Deposit States Info */}
                <div className="mt-4 p-4 bg-cyan-900/20 rounded-xl border border-cyan-500/20">
                    <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-stone-400">
                            <strong className="text-cyan-400">States with bottle deposit laws:</strong>{' '}
                            CA, CT, HI, IA, ME, MA, MI, NY, OR, VT.
                            Michigan has the highest at $0.10. Maine and Vermont charge $0.15 for wine/liquor.
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced: Category-Specific Rates */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full p-6 flex items-center justify-between hover:bg-stone-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
                            <Wine className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-white">Category-Specific Tax Rates</h2>
                            <p className="text-sm text-stone-400">Alcohol, tobacco, and special category rates</p>
                        </div>
                    </div>
                    {showAdvanced ? <ChevronUp className="h-6 w-6 text-stone-400" /> : <ChevronDown className="h-6 w-6 text-stone-400" />}
                </button>

                {showAdvanced && (
                    <div className="p-6 pt-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Alcohol */}
                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wine className="h-5 w-5 text-purple-400" />
                                    <label className="text-white font-medium">Alcohol Tax Rate</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.alcoholTaxRate}
                                        onChange={(e) => setSettings(prev => ({ ...prev, alcoholTaxRate: parseFloat(e.target.value) || 0 }))}
                                        disabled={!canEdit}
                                        className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-purple-500 focus:outline-none disabled:opacity-60"
                                    />
                                    <span className="text-stone-400 text-lg">%</span>
                                </div>
                                <p className="text-xs text-stone-500 mt-2">Includes excise taxes</p>
                            </div>

                            {/* Tobacco */}
                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Cigarette className="h-5 w-5 text-amber-400" />
                                    <label className="text-white font-medium">Tobacco Tax Rate</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.tobaccoTaxRate}
                                        onChange={(e) => setSettings(prev => ({ ...prev, tobaccoTaxRate: parseFloat(e.target.value) || 0 }))}
                                        disabled={!canEdit}
                                        className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-amber-500 focus:outline-none disabled:opacity-60"
                                    />
                                    <span className="text-stone-400 text-lg">%</span>
                                </div>
                                <p className="text-xs text-stone-500 mt-2">Per-pack excise tax typically in wholesale price</p>
                            </div>

                            {/* Grocery */}
                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShoppingCart className="h-5 w-5 text-green-400" />
                                    <label className="text-white font-medium">Grocery Tax Rate</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.groceryTaxRate}
                                        onChange={(e) => setSettings(prev => ({ ...prev, groceryTaxRate: parseFloat(e.target.value) || 0 }))}
                                        disabled={!canEdit}
                                        className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-green-500 focus:outline-none disabled:opacity-60"
                                    />
                                    <span className="text-stone-400 text-lg">%</span>
                                </div>
                                <p className="text-xs text-stone-500 mt-2">Often reduced or 0% for qualifying food</p>
                            </div>

                            {/* Prepared Food */}
                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Utensils className="h-5 w-5 text-orange-400" />
                                    <label className="text-white font-medium">Prepared Food Tax Rate</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.preparedFoodTaxRate}
                                        onChange={(e) => setSettings(prev => ({ ...prev, preparedFoodTaxRate: parseFloat(e.target.value) || 0 }))}
                                        disabled={!canEdit}
                                        className="flex-1 px-4 py-3 bg-stone-900 border border-stone-600 rounded-lg text-white text-lg font-mono focus:border-orange-500 focus:outline-none disabled:opacity-60"
                                    />
                                    <span className="text-stone-400 text-lg">%</span>
                                </div>
                                <p className="text-xs text-stone-500 mt-2">Hot food, ready-to-eat items</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Provider-only notice */}
            {!canEdit && (
                <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
                    <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-blue-400" />
                        <div className="text-sm text-stone-400">
                            Tax settings are configured by your provider. Contact support if you need changes.
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

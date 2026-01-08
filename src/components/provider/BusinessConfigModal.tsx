'use client'

import { useState, useEffect } from 'react'
import { Settings, Check, X, Loader2 } from 'lucide-react'

interface BusinessConfig {
    id: string
    franchisorId: string

    // Core Features
    usesCommissions: boolean
    usesInventory: boolean
    usesAppointments: boolean
    usesScheduling: boolean
    usesLoyalty: boolean
    usesGiftCards: boolean
    usesMemberships: boolean
    usesReferrals: boolean
    usesTipping: boolean
    usesDiscounts: boolean
    usesRetailProducts: boolean
    usesServices: boolean
    usesEmailMarketing: boolean
    usesSMSMarketing: boolean
    usesReviewManagement: boolean
    usesMultiLocation: boolean
    usesTimeTracking: boolean
    usesPayroll: boolean

    // Cash Discount
    cashDiscountEnabled: boolean
    cashDiscountPercent: number

    // Workflow
    reviewRequestTiming: string
    commissionCalculation: string
    commissionVisibility: string
}

interface Props {
    franchisorId: string
    franchisorName: string
    onClose: () => void
}

export default function BusinessConfigModal({ franchisorId, franchisorName, onClose }: Props) {
    const [config, setConfig] = useState<BusinessConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        fetchConfig()
    }, [franchisorId])

    const fetchConfig = async () => {
        try {
            setError(null)
            const response = await fetch(`/api/business-config/${franchisorId}`)
            if (response.ok) {
                const data = await response.json()
                setConfig(data)
            } else {
                const errData = await response.json().catch(() => ({}))
                setError(errData.error || 'Failed to load configuration')
            }
        } catch (error) {
            console.error('Error fetching config:', error)
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!config) return

        setSaving(true)
        try {
            const response = await fetch(`/api/business-config/${franchisorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (response.ok) {
                setToast({ message: 'Settings saved successfully!', type: 'success' })
                onClose()
            } else {
                setToast({ message: 'Failed to save settings', type: 'error' })
            }
        } catch (error) {
            console.error('Error saving:', error)
            setToast({ message: 'Error saving settings', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const toggleFeature = (key: keyof BusinessConfig) => {
        if (!config) return
        setConfig({ ...config, [key]: !config[key] })
    }

    const updateValue = (key: keyof BusinessConfig, value: any) => {
        if (!config) return
        setConfig({ ...config, [key]: value })
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-stone-900 rounded-xl p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            </div>
        )
    }

    if (!config) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-stone-900 rounded-xl p-6 max-w-md w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-stone-100">Configure Settings</h2>
                        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="text-center py-6">
                        <div className="text-red-400 mb-4">
                            <X className="h-12 w-12 mx-auto" />
                        </div>
                        <p className="text-red-400 font-medium mb-2">{error || 'Failed to load configuration'}</p>
                        <p className="text-stone-400 text-sm mb-4">Please try again or contact support.</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Settings className="h-6 w-6 text-orange-400" />
                        <div>
                            <h2 className="text-2xl font-bold text-stone-100">
                                Configure Business Settings
                            </h2>
                            <p className="text-stone-400 text-sm">
                                {franchisorName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-200"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Core Features */}
                    <Section title="Core Features">
                        <FeatureToggle label="Commissions" checked={config.usesCommissions} onChange={() => toggleFeature('usesCommissions')} />
                        <FeatureToggle label="Inventory Management" checked={config.usesInventory} onChange={() => toggleFeature('usesInventory')} />
                        <FeatureToggle label="Appointments" checked={config.usesAppointments} onChange={() => toggleFeature('usesAppointments')} />
                        <FeatureToggle label="Scheduling" checked={config.usesScheduling} onChange={() => toggleFeature('usesScheduling')} />
                        <FeatureToggle label="Time Tracking" checked={config.usesTimeTracking} onChange={() => toggleFeature('usesTimeTracking')} />
                        <FeatureToggle label="Payroll" checked={config.usesPayroll} onChange={() => toggleFeature('usesPayroll')} />
                    </Section>

                    {/* Customer Features */}
                    <Section title="Customer Features">
                        <FeatureToggle label="Loyalty Program" checked={config.usesLoyalty} onChange={() => toggleFeature('usesLoyalty')} />
                        <FeatureToggle label="Gift Cards" checked={config.usesGiftCards} onChange={() => toggleFeature('usesGiftCards')} />
                        <FeatureToggle label="Memberships" checked={config.usesMemberships} onChange={() => toggleFeature('usesMemberships')} />
                        <FeatureToggle label="Referrals" checked={config.usesReferrals} onChange={() => toggleFeature('usesReferrals')} />
                    </Section>

                    {/* Sales Features */}
                    <Section title="Sales Features">
                        <FeatureToggle label="Tipping" checked={config.usesTipping} onChange={() => toggleFeature('usesTipping')} />
                        <FeatureToggle label="Discounts" checked={config.usesDiscounts} onChange={() => toggleFeature('usesDiscounts')} />
                        <FeatureToggle label="Retail Products" checked={config.usesRetailProducts} onChange={() => toggleFeature('usesRetailProducts')} />
                        <FeatureToggle label="Services" checked={config.usesServices} onChange={() => toggleFeature('usesServices')} />
                    </Section>

                    {/* Marketing */}
                    <Section title="Marketing">
                        <FeatureToggle label="Email Marketing" checked={config.usesEmailMarketing} onChange={() => toggleFeature('usesEmailMarketing')} />
                        <FeatureToggle label="SMS Marketing" checked={config.usesSMSMarketing} onChange={() => toggleFeature('usesSMSMarketing')} />
                        <FeatureToggle label="Review Management" checked={config.usesReviewManagement} onChange={() => toggleFeature('usesReviewManagement')} />
                    </Section>

                    {/* Cash Discount */}
                    <Section title="Cash Discount Program">
                        <FeatureToggle
                            label="Enable Cash Discount"
                            checked={config.cashDiscountEnabled}
                            onChange={() => toggleFeature('cashDiscountEnabled')}
                        />
                        {config.cashDiscountEnabled && (
                            <div className="ml-8 mt-2">
                                <label className="block text-sm text-stone-400 mb-1">
                                    Discount Percentage
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.cashDiscountPercent}
                                    onChange={(e) => updateValue('cashDiscountPercent', parseFloat(e.target.value))}
                                    className="w-32 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                />
                                <span className="ml-2 text-stone-400">%</span>
                            </div>
                        )}
                    </Section>

                    {/* Workflow Settings */}
                    <Section title="Workflow Settings">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-300 mb-2">
                                    Review Request Timing
                                </label>
                                <select
                                    value={config.reviewRequestTiming}
                                    onChange={(e) => updateValue('reviewRequestTiming', e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                >
                                    <option value="MANUAL">Manual</option>
                                    <option value="AT_CHECKOUT">At Checkout</option>
                                    <option value="1_HOUR_AFTER">1 Hour After</option>
                                    <option value="24_HOURS_AFTER">24 Hours After</option>
                                    <option value="NEVER">Never</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-stone-300 mb-2">
                                    Commission Calculation
                                </label>
                                <select
                                    value={config.commissionCalculation}
                                    onChange={(e) => updateValue('commissionCalculation', e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                >
                                    <option value="AUTOMATIC">Automatic</option>
                                    <option value="MANUAL_APPROVAL">Manual Approval</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-stone-300 mb-2">
                                    Commission Visibility
                                </label>
                                <select
                                    value={config.commissionVisibility}
                                    onChange={(e) => updateValue('commissionVisibility', e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                >
                                    <option value="ALWAYS">Always Visible</option>
                                    <option value="PAY_PERIOD_ONLY">Pay Period Only</option>
                                    <option value="NEVER">Never (Owner Only)</option>
                                </select>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-stone-800">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="h-5 w-5" />
                                Save Settings
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-stone-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-stone-100 mb-3">{title}</h3>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    )
}

function FeatureToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className="flex items-center justify-between w-full px-4 py-2 rounded-lg hover:bg-stone-700/50 transition-colors group"
        >
            <span className="text-stone-200">{label}</span>
            <div className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-stone-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full m-0.5 transition-transform ${checked ? 'translate-x-6' : ''}`} />
            </div>
        </button>
    )
}


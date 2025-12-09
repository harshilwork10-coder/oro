'use client'

import { useState } from 'react'
import { useBusinessConfig, BusinessConfig } from '@/hooks/useBusinessConfig'
import {
    Save,
    Loader2,
    CheckCircle2,
    Briefcase,
    Users,
    DollarSign,
    ShoppingBag,
    Mail,
    Zap,
    Package,
    Calendar,
    Heart,
    Gift,
    Crown,
    UserPlus,
    Percent,
    TrendingUp,
    Globe,
    Building2,
    Clock,
    Monitor
} from 'lucide-react'

export default function BusinessSettingsPage() {
    const { data: config, mutate } = useBusinessConfig()
    const [formData, setFormData] = useState<Partial<BusinessConfig> | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Initialize form data when config loads
    if (config && !formData) {
        setFormData(config)
    }

    const handleToggle = (key: keyof BusinessConfig) => {
        if (!formData) return
        setFormData({
            ...formData,
            [key]: !formData[key]
        })
    }

    const handleSave = async () => {
        if (!formData) return
        setSaving(true)
        setSaved(false)

        try {
            const response = await fetch('/api/business-config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Failed to save')

            setSaved(true)
            mutate() // Revalidate SWR cache

            setTimeout(() => setSaved(false), 3000)
        } catch (error) {
            console.error('Error saving config:', error)
            alert('Failed to save configuration')
        } finally {
            setSaving(false)
        }
    }

    if (!formData) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-stone-500" />
            </div>
        )
    }

    const FeatureCheckbox = ({
        icon: Icon,
        label,
        description,
        value,
        onChange,
        recommended
    }: any) => (
        <div
            onClick={onChange}
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${value
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-stone-700 hover:border-stone-600'
                }`}
        >
            <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${value ? 'text-orange-400' : 'text-stone-500'}`} />
                <div>
                    <p className={`font-medium ${value ? 'text-orange-100' : 'text-stone-300'}`}>
                        {label}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5">{description}</p>
                    {recommended && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                            Recommended: {recommended}
                        </span>
                    )}
                </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${value ? 'bg-orange-500 border-orange-500' : 'border-stone-600'
                }`}>
                {value && <CheckCircle2 className="h-4 w-4 text-white" />}
            </div>
        </div>
    )

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100">Business Configuration</h1>
                <p className="text-stone-400 mt-2">
                    Customize which features you use. Disabled features will be hidden from your sidebar and dashboard.
                </p>
            </div>

            {/* Core Features */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-orange-400" />
                    Core Operations
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={Percent}
                        label="Commission & Payroll"
                        description="Calculate stylist commissions and track payroll"
                        value={formData.usesCommissions}
                        onChange={() => handleToggle('usesCommissions')}
                        recommended="Salons, Spas"
                    />
                    <FeatureCheckbox
                        icon={Package}
                        label="Inventory Management"
                        description="Track product stock levels and orders"
                        value={formData.usesInventory}
                        onChange={() => handleToggle('usesInventory')}
                        recommended="Salons, Spas"
                    />
                    <FeatureCheckbox
                        icon={Calendar}
                        label="Appointment Booking"
                        description="Online booking and appointment calendar"
                        value={formData.usesAppointments}
                        onChange={() => handleToggle('usesAppointments')}
                        recommended="Salons, Spas"
                    />
                    <FeatureCheckbox
                        icon={Calendar}
                        label="Staff Scheduling"
                        description="Create and manage employee shifts"
                        value={formData.usesScheduling}
                        onChange={() => handleToggle('usesScheduling')}
                    />
                </div>
            </div>

            {/* Hardware Configuration */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-cyan-400" />
                    Hardware Configuration
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={Monitor}
                        label="Virtual Keypad"
                        description="Enable on-screen numeric keypads for touchscreens"
                        value={formData.usesVirtualKeypad}
                        onChange={() => handleToggle('usesVirtualKeypad')}
                        recommended="Tablets, All-in-One POS"
                    />
                </div>
            </div>

            {/* Customer Features */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-400" />
                    Customer Features
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={Heart}
                        label="Loyalty Program"
                        description="Points and rewards for repeat customers"
                        value={formData.usesLoyalty}
                        onChange={() => handleToggle('usesLoyalty')}
                    />
                    <FeatureCheckbox
                        icon={Gift}
                        label="Gift Cards"
                        description="Sell and redeem gift cards"
                        value={formData.usesGiftCards}
                        onChange={() => handleToggle('usesGiftCards')}
                    />
                    <FeatureCheckbox
                        icon={Crown}
                        label="Memberships"
                        description="Monthly subscription packages"
                        value={formData.usesMemberships}
                        onChange={() => handleToggle('usesMemberships')}
                        recommended="Spas"
                    />
                    <FeatureCheckbox
                        icon={UserPlus}
                        label="Referral Tracking"
                        description="Track and reward customer referrals"
                        value={formData.usesReferrals}
                        onChange={() => handleToggle('usesReferrals')}
                    />
                </div>
            </div>

            {/* Financial Features */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    Financial Features
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={TrendingUp}
                        label="Royalty Tracking"
                        description="Track royalty fees from franchisees (Franchisors only)"
                        value={formData.usesRoyalties}
                        onChange={() => handleToggle('usesRoyalties')}
                        recommended="Brand Franchisors"
                    />
                    <FeatureCheckbox
                        icon={DollarSign}
                        label="Tip Management"
                        description="Track and distribute tips to staff"
                        value={formData.usesTipping}
                        onChange={() => handleToggle('usesTipping')}
                    />
                    <FeatureCheckbox
                        icon={Percent}
                        label="Discounts & Promotions"
                        description="Create discounts and promotional campaigns"
                        value={formData.usesDiscounts}
                        onChange={() => handleToggle('usesDiscounts')}
                    />

                    {/* Tax Settings */}
                    <div className="pt-4 border-t border-stone-800 mt-2">
                        <h3 className="text-sm font-medium text-stone-400 mb-3">Tax Configuration</h3>
                        <div className="grid gap-3">
                            <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-stone-800 rounded-lg text-emerald-400">
                                        <Percent className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">Tax Rate</h3>
                                        <p className="text-sm text-stone-400">Global tax percentage</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={formData.taxRate ? (formData.taxRate * 100).toFixed(2) : '0.00'}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value)
                                            setFormData(prev => ({ ...prev, taxRate: isNaN(val) ? 0 : val / 100 }))
                                        }}
                                        className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white w-24 text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                    />
                                    <span className="text-stone-400">%</span>
                                </div>
                            </div>

                            <FeatureCheckbox
                                icon={Briefcase}
                                label="Tax Services"
                                description="Apply tax to service items"
                                value={formData.taxServices}
                                onChange={() => handleToggle('taxServices')}
                            />

                            <FeatureCheckbox
                                icon={ShoppingBag}
                                label="Tax Products"
                                description="Apply tax to retail products"
                                value={formData.taxProducts}
                                onChange={() => handleToggle('taxProducts')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Features */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-blue-400" />
                    Sales Features
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={ShoppingBag}
                        label="Retail Products"
                        description="Sell retail products at checkout"
                        value={formData.usesRetailProducts}
                        onChange={() => handleToggle('usesRetailProducts')}
                        recommended="Salons, Spas"
                    />
                    <FeatureCheckbox
                        icon={Briefcase}
                        label="Service Catalog"
                        description="Manage service menu and pricing"
                        value={formData.usesServices}
                        onChange={() => handleToggle('usesServices')}
                    />
                </div>
            </div>

            {/* Marketing Features */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-pink-400" />
                    Marketing Features
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={Mail}
                        label="Email Marketing"
                        description="Send email campaigns to customers"
                        value={formData.usesEmailMarketing}
                        onChange={() => handleToggle('usesEmailMarketing')}
                    />
                    <FeatureCheckbox
                        icon={Mail}
                        label="SMS Marketing"
                        description="Send text message promotions"
                        value={formData.usesSMSMarketing}
                        onChange={() => handleToggle('usesSMSMarketing')}
                    />
                    <FeatureCheckbox
                        icon={Users}
                        label="Review Management"
                        description="Collect and manage customer reviews"
                        value={formData.usesReviewManagement}
                        onChange={() => handleToggle('usesReviewManagement')}
                    />
                </div>
            </div>

            {/* Advanced Features */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-stone-200 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Advanced Features
                </h2>
                <div className="grid gap-3">
                    <FeatureCheckbox
                        icon={Building2}
                        label="Multi-Location Management"
                        description="Manage multiple store locations"
                        value={formData.usesMultiLocation}
                        onChange={() => handleToggle('usesMultiLocation')}
                        recommended="Multi-Location Owners"
                    />
                    <FeatureCheckbox
                        icon={Globe}
                        label="Franchise Management"
                        description="Manage franchisees and territories"
                        value={formData.usesFranchising}
                        onChange={() => handleToggle('usesFranchising')}
                        recommended="Brand Franchisors"
                    />
                    <FeatureCheckbox
                        icon={Clock}
                        label="Time Clock"
                        description="Employee clock in/out tracking"
                        value={formData.usesTimeTracking}
                        onChange={() => handleToggle('usesTimeTracking')}
                    />
                    <FeatureCheckbox
                        icon={DollarSign}
                        label="Payroll Integration"
                        description="Integration with payroll providers"
                        value={formData.usesPayroll}
                        onChange={() => handleToggle('usesPayroll')}
                    />
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-6 border-t border-stone-800">
                <p className="text-sm text-stone-500">
                    Changes will update your sidebar and dashboard instantly
                </p>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${saved
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30'
                        : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:shadow-lg hover:shadow-orange-900/20'
                        }`}
                >
                    {saving ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
                    ) : saved ? (
                        <><CheckCircle2 className="h-5 w-5" /> Saved!</>
                    ) : (
                        <><Save className="h-5 w-5" /> Save Configuration</>
                    )}
                </button>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Calendar, CreditCard, MessageSquare, Users, Sparkles, Eye,
    DollarSign, Clock, Star, Bell, Loader2, Check, AlertCircle,
    Zap, UserPlus, Wallet, Brain, Scissors, Rocket
} from 'lucide-react'

interface FeatureSettings {
    enableOnlineBooking: boolean
    enableAddOnServices: boolean
    enableGroupBooking: boolean
    enableWaitlist: boolean
    enableWaitlistAutoFill: boolean
    enablePrepayment: boolean
    prepaymentType: string
    prepaymentAmount: number
    enableNoShowCharge: boolean
    noShowFeeType: string
    noShowFeeAmount: number
    enableSmsReminders: boolean
    enableReviewBooster: boolean
    enableMarketingCampaigns: boolean
    enableAutoPayroll: boolean
    enableRentCollection: boolean
    enableSmartRebooking: boolean
    enableBarberProfiles: boolean
    enableIndividualLinks: boolean
}

interface FeatureToggleProps {
    title: string
    description: string
    enabled: boolean
    onChange: (enabled: boolean) => void
    icon: React.ReactNode
    badge?: string
    disabled?: boolean
    comingSoon?: boolean
}

function FeatureToggle({ title, description, enabled, onChange, icon, badge, disabled, comingSoon }: FeatureToggleProps) {
    const isDisabled = disabled || comingSoon
    return (
        <div className={`flex items-start gap-4 p-4 bg-stone-900/50 border border-stone-800 rounded-xl hover:border-stone-700 transition-all ${isDisabled ? 'opacity-60' : ''}`}>
            <div className={`p-2.5 rounded-lg flex-shrink-0 ${comingSoon ? 'bg-stone-700/50 text-stone-500' : 'bg-violet-500/10 text-violet-400'}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold ${comingSoon ? 'text-stone-400' : 'text-white'}`}>{title}</h3>
                    {comingSoon && (
                        <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 text-xs rounded-full flex items-center gap-1 border border-violet-500/20">
                            <Rocket className="h-3 w-3" />
                            Coming Soon
                        </span>
                    )}
                    {badge && !comingSoon && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-sm text-stone-400 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => !isDisabled && onChange(!enabled)}
                disabled={isDisabled}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                    comingSoon ? 'bg-stone-800 cursor-not-allowed' :
                    enabled ? 'bg-violet-600' : 'bg-stone-700'
                } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all shadow ${
                    comingSoon ? 'bg-stone-600 left-1' :
                    enabled ? 'bg-white left-7' : 'bg-white left-1'
                }`} />
            </button>
        </div>
    )
}

export default function SalonFeaturesPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        }
    })

    const user = session?.user as any
    const [settings, setSettings] = useState<FeatureSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/features')
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = async (key: keyof FeatureSettings, value: any) => {
        if (!settings) return

        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        setSaving(true)

        try {
            const res = await fetch('/api/settings/features', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: value })
            })

            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } catch (error) {
            console.error('Failed to save:', error)
        } finally {
            setSaving(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            </>
        )
    }

    if (!settings) {
        return (
            <>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                    <p className="text-stone-400">Failed to load settings</p>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-violet-500/10 rounded-xl">
                            <Scissors className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Salon Features</h1>
                            <p className="text-stone-400">Enable or disable features for your shop</p>
                        </div>
                    </div>
                    {saving ? (
                        <div className="flex items-center gap-2 text-stone-400 px-4 py-2 bg-stone-800 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </div>
                    ) : saved ? (
                        <div className="flex items-center gap-2 text-emerald-400 px-4 py-2 bg-emerald-500/10 rounded-lg">
                            <Check className="h-4 w-4" />
                            Saved
                        </div>
                    ) : null}
                </div>

                {/* Booking Features */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-violet-400" />
                        Booking Features
                    </h2>
                    <div className="space-y-3">
                        <FeatureToggle
                            title="Online Booking"
                            description="Let clients book appointments from your website"
                            enabled={settings.enableOnlineBooking}
                            onChange={(v) => updateSetting('enableOnlineBooking', v)}
                            icon={<Calendar className="h-5 w-5" />}
                        />
                        <FeatureToggle
                            title="Add-on Services"
                            description="Upsell extra services when clients book"
                            enabled={settings.enableAddOnServices}
                            onChange={(v) => updateSetting('enableAddOnServices', v)}
                            icon={<Sparkles className="h-5 w-5" />}
                        />
                        <FeatureToggle
                            title="Group Booking"
                            description="Allow families or friends to book together"
                            enabled={false}
                            onChange={() => {}}
                            icon={<Users className="h-5 w-5" />}
                            comingSoon
                        />
                        <FeatureToggle
                            title="Waitlist"
                            description="Let clients join waitlist when fully booked"
                            enabled={settings.enableWaitlist}
                            onChange={(v) => updateSetting('enableWaitlist', v)}
                            icon={<Clock className="h-5 w-5" />}
                        />
                        <FeatureToggle
                            title="Waitlist Auto-Fill"
                            description="Auto-text waitlist when a spot opens"
                            enabled={false}
                            onChange={() => {}}
                            icon={<Zap className="h-5 w-5" />}
                            comingSoon
                        />
                    </div>
                </section>

                {/* Payment & Protection */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-emerald-400" />
                        Payment & Protection
                    </h2>
                    <div className="space-y-3">
                        <FeatureToggle
                            title="Prepayment / Deposits"
                            description="Require payment when booking to reduce no-shows"
                            enabled={false}
                            onChange={() => {}}
                            icon={<Wallet className="h-5 w-5" />}
                            comingSoon
                        />
                        <FeatureToggle
                            title="No-Show Charge"
                            description="Automatically charge for no-shows and late cancellations"
                            enabled={false}
                            onChange={() => {}}
                            icon={<DollarSign className="h-5 w-5" />}
                            comingSoon
                        />
                    </div>
                </section>

                {/* Communication */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-400" />
                        Communication
                    </h2>
                    <div className="space-y-3">
                        <FeatureToggle
                            title="SMS Reminders"
                            description="Send text reminders before appointments"
                            enabled={false}
                            onChange={() => {}}
                            icon={<Bell className="h-5 w-5" />}
                            comingSoon
                        />
                        <FeatureToggle
                            title="Google Reviews Booster"
                            description="Auto-request 5-star reviews from happy clients"
                            enabled={(settings as any).hasGooglePlaceId ? settings.enableReviewBooster : false}
                            onChange={(v) => updateSetting('enableReviewBooster', v)}
                            icon={<Star className="h-5 w-5" />}
                            disabled={!(settings as any).hasGooglePlaceId}
                            badge={!(settings as any).hasGooglePlaceId ? "Needs Place ID" : undefined}
                        />
                        <FeatureToggle
                            title="Marketing Campaigns"
                            description="Send text and email campaigns to clients"
                            enabled={false}
                            onChange={() => {}}
                            icon={<MessageSquare className="h-5 w-5" />}
                            comingSoon
                        />
                    </div>
                </section>

                {/* Staff & Payroll */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-amber-400" />
                        Staff & Payroll
                    </h2>
                    <div className="space-y-3">
                        <FeatureToggle
                            title="Auto Payroll"
                            description="Auto-calculate barber commissions and payouts"
                            enabled={false}
                            onChange={() => {}}
                            icon={<DollarSign className="h-5 w-5" />}
                            comingSoon
                        />
                        <FeatureToggle
                            title="Rent Auto-Collection"
                            description="Automatically charge booth renters on due dates"
                            enabled={false}
                            onChange={() => {}}
                            icon={<Wallet className="h-5 w-5" />}
                            comingSoon
                        />
                    </div>
                </section>

                {/* AI Features */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5 text-fuchsia-400" />
                        AI Features
                    </h2>
                    <div className="space-y-3">
                        <FeatureToggle
                            title="Smart Rebooking"
                            description="AI suggests when clients are due for their next visit"
                            enabled={false}
                            onChange={() => {}}
                            icon={<Sparkles className="h-5 w-5" />}
                            comingSoon
                        />
                    </div>
                </section>

                {/* Visibility */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-cyan-400" />
                        Visibility
                    </h2>
                    <div className="space-y-3">
                        <FeatureToggle
                            title="Public Barber Profiles"
                            description="Show barber profiles on your booking page"
                            enabled={settings.enableBarberProfiles}
                            onChange={(v) => updateSetting('enableBarberProfiles', v)}
                            icon={<UserPlus className="h-5 w-5" />}
                        />
                        <FeatureToggle
                            title="Individual Booking Links"
                            description="Each barber gets their own shareable booking link"
                            enabled={settings.enableIndividualLinks}
                            onChange={(v) => updateSetting('enableIndividualLinks', v)}
                            icon={<Users className="h-5 w-5" />}
                        />
                    </div>
                </section>
            </div>
        </>
    )
}

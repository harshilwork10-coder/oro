'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Trophy,
    Crown,
    Star,
    Gift,
    Users,
    Zap,
    Calendar,
    Package,
    TrendingUp,
    Save,
    Loader2,
    ChevronRight,
    Sparkles,
    Heart,
    Clock,
    AlertCircle,
    Check,
    DollarSign,
    Cake,
    UserPlus,
    Timer,
    Award
} from 'lucide-react'

// VIP Tier Configuration
interface VIPTier {
    name: string
    icon: string
    color: string
    minSpend: number
    pointsMultiplier: number
    perks: string[]
}

const DEFAULT_VIP_TIERS: VIPTier[] = [
    {
        name: 'Bronze',
        icon: '🥉',
        color: 'amber',
        minSpend: 0,
        pointsMultiplier: 1.0,
        perks: ['Earn 1 point per $1', 'Birthday email']
    },
    {
        name: 'Silver',
        icon: '🥈',
        color: 'gray',
        minSpend: 500,
        pointsMultiplier: 1.5,
        perks: ['1.5x points on all services', 'Free add-on service monthly', 'Priority booking']
    },
    {
        name: 'Gold',
        icon: '🥇',
        color: 'yellow',
        minSpend: 2000,
        pointsMultiplier: 2.0,
        perks: ['2x points on all services', 'Free monthly service', 'VIP priority booking', '10% off all services']
    },
    {
        name: 'Platinum',
        icon: '💎',
        color: 'purple',
        minSpend: 5000,
        pointsMultiplier: 3.0,
        perks: ['3x points on all services', 'Free premium service monthly', 'Exclusive VIP pricing', 'Birthday gift package', 'Free guest passes']
    }
]

// Prepaid Package Template
interface PrepaidPackage {
    id: string
    name: string
    serviceId: string
    serviceName: string
    quantity: number
    bonusQuantity: number
    price: number
    savings: number
    isActive: boolean
}

export default function RetentionDashboardPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') },
    })

    const [activeTab, setActiveTab] = useState<'rules' | 'vip' | 'packages' | 'streaks' | 'birthday' | 'referral' | 'lapsing' | 'prebook'>('rules')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // FAIR DISCOUNT SYSTEM - Best Offer + Credit Banking
    const [fairDiscountSystem, setFairDiscountSystem] = useState({
        // Best Offer Mode - auto applies highest value discount
        bestOfferMode: true,

        // Credit Banking - unused offers saved for later
        creditBanking: true,
        creditExpiryDays: 90, // Days before banked credits expire

        // What always stacks (never blocked)
        alwaysStack: {
            loyaltyPoints: true, // Always earn points
            vipTierBenefits: true, // VIP perks always apply (except discounts)
        },

        // Max discount cap (safety net)
        maxDiscountPercent: 30,

        // Show customer what they're saving
        showSavingsMessage: true,
        showBankedCredits: true,
    })

    // Smart Recommendations based on avg service price
    const [avgServicePrice, setAvgServicePrice] = useState(75) // $75 default
    const recommendations = {
        birthdayCredit: Math.round(avgServicePrice * 0.3), // 30% of avg
        referralReward: Math.round(avgServicePrice * 0.35), // 35% of avg
        refereeReward: Math.round(avgServicePrice * 0.35), // 35% of avg  
        minPurchase: Math.round(avgServicePrice * 0.75), // 75% of avg
        maxDiscountPercent: 25, // Safe cap
        prebookDiscount: 10, // Standard
        winbackDiscounts: { day30: 10, day60: 15, day90: 20 }
    }

    // VIP Tiers
    const [vipEnabled, setVipEnabled] = useState(true)
    const [vipTiers, setVipTiers] = useState(DEFAULT_VIP_TIERS)

    // Prepaid Packages
    const [packagesEnabled, setPackagesEnabled] = useState(true)
    const [packages, setPackages] = useState<PrepaidPackage[]>([
        { id: '1', name: '5-Pack Massage', serviceId: 's1', serviceName: 'Swedish Massage', quantity: 5, bonusQuantity: 1, price: 400, savings: 100, isActive: true },
        { id: '2', name: '10-Pack Facial', serviceId: 's2', serviceName: 'Signature Facial', quantity: 10, bonusQuantity: 2, price: 750, savings: 250, isActive: true }
    ])

    // Streak Bonuses
    const [streaksEnabled, setStreaksEnabled] = useState(true)
    const [streakConfig, setStreakConfig] = useState({
        threeMonthBonus: 500,
        sixMonthBonus: 1000,
        twelveMonthBonus: 2500,
        twelveMonthReward: 'Free Premium Service'
    })

    // Birthday Rewards
    const [birthdayEnabled, setBirthdayEnabled] = useState(true)
    const [birthdayConfig, setBirthdayConfig] = useState({
        rewardType: 'credit', // 'credit' | 'discount' | 'freeService'
        creditAmount: 25,
        discountPercent: 20,
        freeServiceId: '',
        validDays: 30 // Days before/after birthday
    })

    // Referral Program
    const [referralEnabled, setReferralEnabled] = useState(true)
    const [referralConfig, setReferralConfig] = useState({
        referrerReward: 25, // $ credit
        refereeReward: 25, // $ credit for new customer
        minPurchase: 50 // Minimum purchase to qualify
    })

    // Lapsing Customer Alerts
    const [lapsingEnabled, setLapsingEnabled] = useState(true)
    const [lapsingConfig, setLapsingConfig] = useState({
        day30Alert: true,
        day30Discount: 10,
        day60Alert: true,
        day60Discount: 15,
        day90Alert: true,
        day90Discount: 20,
        autoEmail: true,
        staffAlert: true
    })

    // Pre-booking Discount
    const [prebookEnabled, setPrebookEnabled] = useState(true)
    const [prebookConfig, setPrebookConfig] = useState({
        discountPercent: 10,
        validWithin: 7 // Days to book ahead
    })

    useEffect(() => {
        // Simulate loading
        setTimeout(() => setLoading(false), 500)
    }, [])

    // Apply smart recommendations
    const applyRecommendations = () => {
        setBirthdayConfig({ ...birthdayConfig, creditAmount: recommendations.birthdayCredit })
        setReferralConfig({
            referrerReward: recommendations.referralReward,
            refereeReward: recommendations.refereeReward,
            minPurchase: recommendations.minPurchase
        })
        setPrebookConfig({ ...prebookConfig, discountPercent: recommendations.prebookDiscount })
        setLapsingConfig({
            ...lapsingConfig,
            day30Discount: recommendations.winbackDiscounts.day30,
            day60Discount: recommendations.winbackDiscounts.day60,
            day90Discount: recommendations.winbackDiscounts.day90
        })
        setFairDiscountSystem({ ...fairDiscountSystem, maxDiscountPercent: recommendations.maxDiscountPercent })
        setToast({ message: 'Smart recommendations applied based on $' + avgServicePrice + ' average service price!', type: 'success' })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Save all retention settings
            const settings = {
                fairDiscountSystem,
                vip: { enabled: vipEnabled, tiers: vipTiers },
                packages: { enabled: packagesEnabled, items: packages },
                streaks: { enabled: streaksEnabled, config: streakConfig },
                birthday: { enabled: birthdayEnabled, config: birthdayConfig },
                referral: { enabled: referralEnabled, config: referralConfig },
                lapsing: { enabled: lapsingEnabled, config: lapsingConfig },
                prebook: { enabled: prebookEnabled, config: prebookConfig }
            }
            console.log('Saving retention settings:', settings)
            // TODO: Save to API
            await new Promise(r => setTimeout(r, 1000))
            setToast({ message: 'Settings saved successfully!', type: 'success' })
        } catch (error) {
            console.error('Error saving:', error)
            setToast({ message: 'Failed to save settings', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
            </div>
        )
    }

    const tabs = [
        { id: 'rules', label: '⚠️ Rules', icon: AlertCircle, color: 'red' },
        { id: 'vip', label: 'VIP Tiers', icon: Crown, color: 'purple' },
        { id: 'packages', label: 'Packages', icon: Package, color: 'blue' },
        { id: 'streaks', label: 'Streaks', icon: Zap, color: 'amber' },
        { id: 'birthday', label: 'Birthday', icon: Cake, color: 'pink' },
        { id: 'referral', label: 'Referral', icon: UserPlus, color: 'green' },
        { id: 'lapsing', label: 'Win-Back', icon: Heart, color: 'red' },
        { id: 'prebook', label: 'Pre-Book', icon: Calendar, color: 'cyan' }
    ]

    return (
        <div className="p-4 md:p-8 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-purple-500" />
                        Customer Retention Suite
                    </h1>
                    <p className="text-stone-400 mt-2">Powerful tools to keep customers coming back</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    {saving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${isActive
                                ? `bg-${tab.color}-600 text-white`
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white'
                                }`}
                            style={isActive ? { backgroundColor: `var(--${tab.color}-600, #9333ea)` } : {}}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* FAIR DISCOUNT SYSTEM */}
                {activeTab === 'rules' && (
                    <div className="space-y-6">
                        {/* Success Banner */}
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Check className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-emerald-400 mb-1">🤝 Fair for Everyone</h3>
                                    <p className="text-sm text-stone-300">
                                        Customers always get their <strong className="text-white">best offer</strong>,
                                        unused credits are <strong className="text-white">saved for later</strong>,
                                        and your profits stay <strong className="text-white">protected</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Best Offer Mode */}
                        <div className="glass-panel p-6 rounded-xl border-l-4 border-purple-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <Star className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Best Offer Auto-Apply</h3>
                                        <p className="text-sm text-stone-400">System picks the highest value discount for customer</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFairDiscountSystem({ ...fairDiscountSystem, bestOfferMode: !fairDiscountSystem.bestOfferMode })}
                                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${fairDiscountSystem.bestOfferMode ? 'bg-emerald-500' : 'bg-stone-700'
                                        }`}
                                >
                                    <span className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${fairDiscountSystem.bestOfferMode ? 'translate-x-10' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>

                            {fairDiscountSystem.bestOfferMode && (
                                <div className="p-4 bg-stone-800/50 rounded-lg">
                                    <p className="text-sm text-stone-300 mb-2">
                                        <span className="text-purple-400 font-medium">Example:</span> Customer has Birthday ($25) + Referral ($20) + Pre-book (10%)
                                    </p>
                                    <p className="text-sm text-white">
                                        → System applies <span className="text-emerald-400 font-bold">Birthday $25</span> (highest value) ✓
                                    </p>
                                    <p className="text-xs text-stone-500 mt-2">
                                        Customer always feels they got the best deal. No complaints!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Credit Banking */}
                        <div className="glass-panel p-6 rounded-xl border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <Gift className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Credit Banking</h3>
                                        <p className="text-sm text-stone-400">Unused offers saved for future visits</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFairDiscountSystem({ ...fairDiscountSystem, creditBanking: !fairDiscountSystem.creditBanking })}
                                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${fairDiscountSystem.creditBanking ? 'bg-emerald-500' : 'bg-stone-700'
                                        }`}
                                >
                                    <span className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${fairDiscountSystem.creditBanking ? 'translate-x-10' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>

                            {fairDiscountSystem.creditBanking && (
                                <>
                                    <div className="p-4 bg-stone-800/50 rounded-lg mb-4">
                                        <p className="text-sm text-stone-300 mb-2">
                                            <span className="text-blue-400 font-medium">Example:</span> Birthday used, Referral $20 saved
                                        </p>
                                        <p className="text-sm text-white">
                                            → Message: "You saved $25 with Birthday Credit! 🎂 Your <span className="text-blue-400">$20 Referral Credit</span> is banked for next visit!"
                                        </p>
                                        <p className="text-xs text-emerald-400 mt-2">
                                            ✨ Customer has a reason to come back!
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="text-sm text-stone-400">Credits expire after:</label>
                                        <input
                                            type="number"
                                            value={fairDiscountSystem.creditExpiryDays}
                                            onChange={(e) => setFairDiscountSystem({ ...fairDiscountSystem, creditExpiryDays: parseInt(e.target.value) })}
                                            className="w-20 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            min={30}
                                            max={365}
                                        />
                                        <span className="text-stone-400">days</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Always Stack - Points & VIP */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-amber-400" />
                                What ALWAYS Applies (No Blocking)
                            </h3>
                            <p className="text-sm text-stone-400 mb-4">
                                These benefits always work, regardless of which discount is applied:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 bg-stone-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Star className="h-5 w-5 text-amber-400" />
                                        <div>
                                            <p className="font-medium text-white">Loyalty Points</p>
                                            <p className="text-xs text-stone-500">Always earn points on every purchase</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFairDiscountSystem({
                                            ...fairDiscountSystem,
                                            alwaysStack: { ...fairDiscountSystem.alwaysStack, loyaltyPoints: !fairDiscountSystem.alwaysStack.loyaltyPoints }
                                        })}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${fairDiscountSystem.alwaysStack.loyaltyPoints ? 'bg-emerald-500' : 'bg-stone-600'
                                            }`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${fairDiscountSystem.alwaysStack.loyaltyPoints ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-stone-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Crown className="h-5 w-5 text-purple-400" />
                                        <div>
                                            <p className="font-medium text-white">VIP Tier Benefits</p>
                                            <p className="text-xs text-stone-500">Priority booking, free add-ons, etc.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFairDiscountSystem({
                                            ...fairDiscountSystem,
                                            alwaysStack: { ...fairDiscountSystem.alwaysStack, vipTierBenefits: !fairDiscountSystem.alwaysStack.vipTierBenefits }
                                        })}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${fairDiscountSystem.alwaysStack.vipTierBenefits ? 'bg-emerald-500' : 'bg-stone-600'
                                            }`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${fairDiscountSystem.alwaysStack.vipTierBenefits ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Safety Net */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-400" />
                                Safety Net
                            </h3>

                            <div className="flex items-center gap-4">
                                <label className="text-sm text-stone-300">Maximum Discount Cap:</label>
                                <input
                                    type="number"
                                    value={fairDiscountSystem.maxDiscountPercent}
                                    onChange={(e) => setFairDiscountSystem({ ...fairDiscountSystem, maxDiscountPercent: parseInt(e.target.value) })}
                                    className="w-20 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                    max={50}
                                    min={10}
                                />
                                <span className="text-stone-400">%</span>
                            </div>
                            <p className="text-xs text-stone-500 mt-2">
                                Even the "best offer" won't exceed this cap.
                            </p>
                        </div>

                        {/* Customer Messaging */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-cyan-400" />
                                Customer Communication
                            </h3>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-stone-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-white">Show Savings Message</p>
                                        <p className="text-xs text-stone-500">"You saved $25 with Birthday Credit! 🎉"</p>
                                    </div>
                                    <button
                                        onClick={() => setFairDiscountSystem({ ...fairDiscountSystem, showSavingsMessage: !fairDiscountSystem.showSavingsMessage })}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${fairDiscountSystem.showSavingsMessage ? 'bg-emerald-500' : 'bg-stone-600'
                                            }`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${fairDiscountSystem.showSavingsMessage ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-stone-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-white">Show Banked Credits</p>
                                        <p className="text-xs text-stone-500">"Your $20 Referral Credit is saved for next time!"</p>
                                    </div>
                                    <button
                                        onClick={() => setFairDiscountSystem({ ...fairDiscountSystem, showBankedCredits: !fairDiscountSystem.showBankedCredits })}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${fairDiscountSystem.showBankedCredits ? 'bg-emerald-500' : 'bg-stone-600'
                                            }`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${fairDiscountSystem.showBankedCredits ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Smart Recommendations */}
                        <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border border-emerald-500/30 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-emerald-400" />
                                Smart Recommendations
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded-full">AI</span>
                            </h3>
                            <p className="text-sm text-stone-400 mb-6">
                                Enter your average service price and we'll calculate optimal reward amounts.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-stone-800/50 rounded-xl">
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Your Average Service Price
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl text-stone-400">$</span>
                                        <input
                                            type="number"
                                            value={avgServicePrice}
                                            onChange={(e) => setAvgServicePrice(parseInt(e.target.value) || 50)}
                                            className="w-32 px-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-white text-xl font-bold"
                                            min={10}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-stone-800/50 rounded-xl">
                                    <p className="text-sm font-medium text-emerald-300 mb-3">📊 Recommended:</p>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-stone-400">Birthday:</span>
                                            <span className="text-white font-bold">${recommendations.birthdayCredit}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-400">Referral:</span>
                                            <span className="text-white font-bold">${recommendations.referralReward}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-400">Max Cap:</span>
                                            <span className="text-white font-bold">{recommendations.maxDiscountPercent}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={applyRecommendations}
                                className="mt-6 w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Sparkles className="h-5 w-5" />
                                Apply All Recommendations
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="glass-panel p-4 rounded-xl bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                            <h4 className="font-bold text-white mb-3">🎯 How Your System Works:</h4>
                            <div className="space-y-2 text-sm">
                                <p className="flex items-center gap-2 text-emerald-400">
                                    <Check className="h-4 w-4" />
                                    Customer always gets their <strong>BEST</strong> discount
                                </p>
                                <p className="flex items-center gap-2 text-blue-400">
                                    <Check className="h-4 w-4" />
                                    Unused credits <strong>BANKED</strong> for {fairDiscountSystem.creditExpiryDays} days
                                </p>
                                <p className="flex items-center gap-2 text-amber-400">
                                    <Check className="h-4 w-4" />
                                    Points + VIP benefits <strong>ALWAYS</strong> apply
                                </p>
                                <p className="flex items-center gap-2 text-orange-400">
                                    <Check className="h-4 w-4" />
                                    Max discount <strong>CAPPED</strong> at {fairDiscountSystem.maxDiscountPercent}%
                                </p>
                            </div>
                            <p className="text-xs text-stone-500 mt-3">
                                ✨ Fair for customers (best deal + nothing lost) • Protected profits (only 1 discount + cap)
                            </p>
                        </div>
                    </div>
                )}

                {/* VIP TIERS */}
                {activeTab === 'vip' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="VIP Tier Program"
                            description="Reward your best customers with escalating perks"
                            enabled={vipEnabled}
                            onToggle={() => setVipEnabled(!vipEnabled)}
                            icon={Crown}
                            color="purple"
                        />

                        {vipEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {vipTiers.map((tier, index) => (
                                    <div
                                        key={tier.name}
                                        className={`p-5 rounded-2xl border ${index === 3 ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/30 border-purple-500/50' :
                                            index === 2 ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30' :
                                                index === 1 ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/30 border-gray-500/30' :
                                                    'bg-stone-800/50 border-stone-700'
                                            }`}
                                    >
                                        <div className="text-4xl mb-3">{tier.icon}</div>
                                        <h4 className="text-lg font-bold text-white mb-1">{tier.name}</h4>
                                        <p className="text-sm text-stone-400 mb-3">
                                            ${tier.minSpend.toLocaleString()}+ spent
                                        </p>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`px-2 py-1 rounded text-sm font-bold ${tier.pointsMultiplier > 2 ? 'bg-purple-500/20 text-purple-300' :
                                                tier.pointsMultiplier > 1.5 ? 'bg-yellow-500/20 text-yellow-300' :
                                                    tier.pointsMultiplier > 1 ? 'bg-gray-500/20 text-gray-300' :
                                                        'bg-amber-500/20 text-amber-300'
                                                }`}>
                                                {tier.pointsMultiplier}x Points
                                            </span>
                                        </div>
                                        <ul className="space-y-1">
                                            {tier.perks.map((perk, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-stone-300">
                                                    <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                                                    {perk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PREPAID PACKAGES */}
                {activeTab === 'packages' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="Prepaid Packages"
                            description="Let customers buy service bundles at a discount"
                            enabled={packagesEnabled}
                            onToggle={() => setPackagesEnabled(!packagesEnabled)}
                            icon={Package}
                            color="blue"
                        />

                        {packagesEnabled && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {packages.map(pkg => (
                                        <div key={pkg.id} className="glass-panel p-5 rounded-xl">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="text-lg font-bold text-white">{pkg.name}</h4>
                                                    <p className="text-sm text-stone-400">{pkg.serviceName}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
                                                    Save ${pkg.savings}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-stone-300">
                                                <span>Buy {pkg.quantity}</span>
                                                <span className="text-purple-400">+{pkg.bonusQuantity} FREE</span>
                                                <span className="ml-auto text-xl font-bold text-white">${pkg.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="px-4 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-white flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Create New Package
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* STREAK BONUSES */}
                {activeTab === 'streaks' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="Streak Bonuses"
                            description="Reward customers for consistent visits"
                            enabled={streaksEnabled}
                            onToggle={() => setStreaksEnabled(!streaksEnabled)}
                            icon={Zap}
                            color="amber"
                        />

                        {streaksEnabled && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-amber-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="h-5 w-5 text-amber-400" />
                                            <span className="font-bold text-white">3-Month Streak</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={streakConfig.threeMonthBonus}
                                                onChange={(e) => setStreakConfig({ ...streakConfig, threeMonthBonus: parseInt(e.target.value) })}
                                                className="w-24 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">bonus points</span>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-orange-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap className="h-5 w-5 text-orange-400" />
                                            <span className="font-bold text-white">6-Month Streak</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={streakConfig.sixMonthBonus}
                                                onChange={(e) => setStreakConfig({ ...streakConfig, sixMonthBonus: parseInt(e.target.value) })}
                                                className="w-24 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">bonus points</span>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-red-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Award className="h-5 w-5 text-red-400" />
                                            <span className="font-bold text-white">12-Month Streak</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="number"
                                                value={streakConfig.twelveMonthBonus}
                                                onChange={(e) => setStreakConfig({ ...streakConfig, twelveMonthBonus: parseInt(e.target.value) })}
                                                className="w-24 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">bonus points</span>
                                        </div>
                                        <p className="text-sm text-purple-400">+ {streakConfig.twelveMonthReward}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BIRTHDAY REWARDS */}
                {activeTab === 'birthday' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="Birthday Rewards"
                            description="Make customers feel special on their birthday"
                            enabled={birthdayEnabled}
                            onToggle={() => setBirthdayEnabled(!birthdayEnabled)}
                            icon={Cake}
                            color="pink"
                        />

                        {birthdayEnabled && (
                            <div className="glass-panel p-6 rounded-xl">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-stone-300 mb-2">Reward Type</label>
                                        <div className="flex gap-3">
                                            {['credit', 'discount', 'freeService'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setBirthdayConfig({ ...birthdayConfig, rewardType: type })}
                                                    className={`px-4 py-2 rounded-lg font-medium ${birthdayConfig.rewardType === type
                                                        ? 'bg-pink-600 text-white'
                                                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                                        }`}
                                                >
                                                    {type === 'credit' ? '💵 Credit' : type === 'discount' ? '🏷️ Discount' : '🎁 Free Service'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {birthdayConfig.rewardType === 'credit' && (
                                        <div>
                                            <label className="block text-sm font-medium text-stone-300 mb-2">Credit Amount</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-stone-400">$</span>
                                                <input
                                                    type="number"
                                                    value={birthdayConfig.creditAmount}
                                                    onChange={(e) => setBirthdayConfig({ ...birthdayConfig, creditAmount: parseInt(e.target.value) })}
                                                    className="w-32 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {birthdayConfig.rewardType === 'discount' && (
                                        <div>
                                            <label className="block text-sm font-medium text-stone-300 mb-2">Discount Percentage</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={birthdayConfig.discountPercent}
                                                    onChange={(e) => setBirthdayConfig({ ...birthdayConfig, discountPercent: parseInt(e.target.value) })}
                                                    className="w-32 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                                />
                                                <span className="text-stone-400">% off</span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-stone-300 mb-2">Valid Period</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={birthdayConfig.validDays}
                                                onChange={(e) => setBirthdayConfig({ ...birthdayConfig, validDays: parseInt(e.target.value) })}
                                                className="w-20 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">days before/after birthday</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* REFERRAL PROGRAM */}
                {activeTab === 'referral' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="Referral Program"
                            description="Turn customers into brand ambassadors"
                            enabled={referralEnabled}
                            onToggle={() => setReferralEnabled(!referralEnabled)}
                            icon={UserPlus}
                            color="green"
                        />

                        {referralEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="glass-panel p-5 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Gift className="h-5 w-5 text-green-400" />
                                        <span className="font-bold text-white">Referrer Gets</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-stone-400">$</span>
                                        <input
                                            type="number"
                                            value={referralConfig.referrerReward}
                                            onChange={(e) => setReferralConfig({ ...referralConfig, referrerReward: parseInt(e.target.value) })}
                                            className="w-24 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                        />
                                        <span className="text-stone-400">credit</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-5 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <UserPlus className="h-5 w-5 text-blue-400" />
                                        <span className="font-bold text-white">New Customer Gets</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-stone-400">$</span>
                                        <input
                                            type="number"
                                            value={referralConfig.refereeReward}
                                            onChange={(e) => setReferralConfig({ ...referralConfig, refereeReward: parseInt(e.target.value) })}
                                            className="w-24 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                        />
                                        <span className="text-stone-400">credit</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-5 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <DollarSign className="h-5 w-5 text-amber-400" />
                                        <span className="font-bold text-white">Min Purchase</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-stone-400">$</span>
                                        <input
                                            type="number"
                                            value={referralConfig.minPurchase}
                                            onChange={(e) => setReferralConfig({ ...referralConfig, minPurchase: parseInt(e.target.value) })}
                                            className="w-24 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                        />
                                        <span className="text-stone-400">to qualify</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LAPSING CUSTOMER ALERTS */}
                {activeTab === 'lapsing' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="Win-Back Campaigns"
                            description="Automatically reach out to customers who haven't visited"
                            enabled={lapsingEnabled}
                            onToggle={() => setLapsingEnabled(!lapsingEnabled)}
                            icon={Heart}
                            color="red"
                        />

                        {lapsingEnabled && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-yellow-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="h-5 w-5 text-yellow-400" />
                                            <span className="font-bold text-white">30 Days</span>
                                        </div>
                                        <p className="text-sm text-stone-400 mb-3">"We miss you" email</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={lapsingConfig.day30Discount}
                                                onChange={(e) => setLapsingConfig({ ...lapsingConfig, day30Discount: parseInt(e.target.value) })}
                                                className="w-16 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">% off offer</span>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-orange-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="h-5 w-5 text-orange-400" />
                                            <span className="font-bold text-white">60 Days</span>
                                        </div>
                                        <p className="text-sm text-stone-400 mb-3">"Come back" campaign</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={lapsingConfig.day60Discount}
                                                onChange={(e) => setLapsingConfig({ ...lapsingConfig, day60Discount: parseInt(e.target.value) })}
                                                className="w-16 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">% off offer</span>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-red-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                            <span className="font-bold text-white">90 Days</span>
                                        </div>
                                        <p className="text-sm text-stone-400 mb-3">"Last chance" offer</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={lapsingConfig.day90Discount}
                                                onChange={(e) => setLapsingConfig({ ...lapsingConfig, day90Discount: parseInt(e.target.value) })}
                                                className="w-16 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">% off offer</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={lapsingConfig.staffAlert}
                                            onChange={(e) => setLapsingConfig({ ...lapsingConfig, staffAlert: e.target.checked })}
                                            className="h-5 w-5 rounded border-stone-600 bg-stone-800 text-purple-600"
                                        />
                                        <div>
                                            <p className="font-medium text-white">Alert Staff</p>
                                            <p className="text-sm text-stone-500">Notify front desk to call customer</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PRE-BOOKING DISCOUNT */}
                {activeTab === 'prebook' && (
                    <div className="space-y-6">
                        <FeatureToggle
                            title="Pre-Booking Discount"
                            description="Incentivize customers to book their next appointment before leaving"
                            enabled={prebookEnabled}
                            onToggle={() => setPrebookEnabled(!prebookEnabled)}
                            icon={Calendar}
                            color="cyan"
                        />

                        {prebookEnabled && (
                            <div className="glass-panel p-6 rounded-xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-stone-300 mb-2">Discount Amount</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={prebookConfig.discountPercent}
                                                onChange={(e) => setPrebookConfig({ ...prebookConfig, discountPercent: parseInt(e.target.value) })}
                                                className="w-24 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">% off next visit</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-stone-300 mb-2">Must Book Within</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={prebookConfig.validWithin}
                                                onChange={(e) => setPrebookConfig({ ...prebookConfig, validWithin: parseInt(e.target.value) })}
                                                className="w-24 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                            />
                                            <span className="text-stone-400">days</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-cyan-400">
                                    💡 Tip: Train staff to ask "Would you like to book your next appointment now and save {prebookConfig.discountPercent}%?"
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

// Feature Toggle Component
function FeatureToggle({
    title,
    description,
    enabled,
    onToggle,
    icon: Icon,
    color
}: {
    title: string
    description: string
    enabled: boolean
    onToggle: () => void
    icon: any
    color: string
}) {
    return (
        <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-${color}-500/20`}>
                        <Icon className={`h-6 w-6 text-${color}-400`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                        <p className="text-sm text-stone-400">{description}</p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-stone-700'
                        }`}
                >
                    <span
                        className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-10' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>
        </div>
    )
}

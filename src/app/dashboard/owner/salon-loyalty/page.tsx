'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ArrowLeft, RefreshCw, BarChart3, CheckCircle } from 'lucide-react'
import SalonLoyaltyWizard from '@/components/loyalty/SalonLoyaltyWizard'

export default function SalonLoyaltyOwnerPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [activeProgram, setActiveProgram] = useState<any>(null)
    const [showWizard, setShowWizard] = useState(false)
    const [message, setMessage] = useState('')
    const [analytics, setAnalytics] = useState<any>(null)
    const [analyticsLoading, setAnalyticsLoading] = useState(false)

    useEffect(() => {
        fetchProgram()
    }, [])

    useEffect(() => {
        if (activeProgram) {
            fetchAnalytics(activeProgram.id)
        }
    }, [activeProgram])

    const fetchAnalytics = async (programId: string) => {
        setAnalyticsLoading(true)
        try {
            const res = await fetch(`/api/salon/loyalty/analytics?programId=${programId}`)
            if (res.ok) {
                const data = await res.json()
                setAnalytics(data.data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setAnalyticsLoading(false)
        }
    }

    const fetchProgram = async () => {
        setLoading(true)
        try {
            // Check if they have an active program
            // For MVP, we use the same endpoint but via a GET method to check existence (We haven't built the GET yet actually)
            // Wait, we need to build a quick GET fallback or just assume none right now.
            // Let's implement a quick GET query on the exact same endpoint or use a try-catch pattern.
            const res = await fetch('/api/salon/loyalty/program')
            if (res.ok) {
                const data = await res.json()
                setActiveProgram(data.program)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateProgram = async (config: any) => {
        setLoading(true)
        try {
            const res = await fetch('/api/salon/loyalty/program', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            if (res.ok) {
                const data = await res.json()
                setActiveProgram(data.program)
                setShowWizard(false)
                setMessage('Beauty Loop successfully launched!')
            } else {
                const err = await res.json()
                setMessage(err.error || 'Failed to initialize program')
            }
        } catch (e) {
            setMessage('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-4 md:p-6 overflow-x-hidden">
            {/* Header */}
            <div className="max-w-5xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            <Sparkles className="h-7 w-7 text-violet-400" />
                            Salon Loyalty (Beauty Loop)
                        </h1>
                        <p className="text-stone-500 text-sm">Advanced logic for service-based retention</p>
                    </div>
                </div>
            </div>

            {message && (
                <div className="max-w-5xl mx-auto mb-6 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {message}
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {showWizard ? (
                    <SalonLoyaltyWizard 
                        onComplete={handleCreateProgram}
                        onCancel={() => setShowWizard(false)}
                    />
                ) : loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                ) : activeProgram ? (
                    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <div className="inline-flex px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wide mb-3">
                                    Active Program
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-2">{activeProgram.name}</h2>
                                <p className="text-stone-400 font-mono text-sm">{activeProgram.code}</p>
                            </div>
                            
                            <button className="px-5 py-2.5 bg-stone-800 text-stone-300 font-bold rounded-xl border border-stone-700 hover:bg-stone-700 transition">
                                Pause Program
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6">
                                <p className="text-stone-500 uppercase text-xs font-bold mb-2">Milestone</p>
                                <p className="text-3xl font-black text-white">{activeProgram.punchesRequired} <span className="text-lg text-stone-400 font-medium ml-1">{activeProgram.customerLabel}</span></p>
                            </div>
                            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px]"></div>
                                <p className="text-stone-500 uppercase text-xs font-bold mb-2">Reward</p>
                                <p className="text-3xl font-black text-emerald-400">
                                    {activeProgram.rewardType === 'PERCENT_OFF' ? `${activeProgram.rewardValue}%` : `$${activeProgram.rewardValue}`} <span className="text-lg font-medium ml-1">Off</span>
                                </p>
                            </div>
                            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6">
                                <p className="text-stone-500 uppercase text-xs font-bold mb-2">Loop Urgency</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {activeProgram.timingWindowDays ? `${activeProgram.timingWindowDays} Days` : 'Infinite'}
                                </p>
                            </div>
                        </div>
                        
                        {activeProgram.stackWithDiscounts && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3 mb-8">
                                <div className="text-amber-400 font-bold">&middot;</div>
                                <p className="text-amber-200 text-sm">Discount stacking is currently permitted. Staff can apply manual discounts on top of loyalty rewards.</p>
                            </div>
                        )}

                        {/* LOY-12 Analytics Component */}
                        <div className="border-t border-stone-800 pt-8 mt-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-stone-400" />
                                Loyalty Performance
                            </h3>
                            {analyticsLoading ? (
                                <div className="h-32 flex items-center justify-center">
                                    <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
                                </div>
                            ) : analytics ? (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                        <p className="text-xs text-stone-500 font-bold uppercase mb-1">Active Loops</p>
                                        <p className="text-2xl font-bold text-white">{analytics.activeLoops}</p>
                                    </div>
                                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                        <p className="text-xs text-emerald-500/70 font-bold uppercase mb-1">Redemption Rev</p>
                                        <p className="text-2xl font-bold text-emerald-400">${(analytics.redemptionRevenue || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                        <p className="text-xs text-emerald-500/70 font-bold uppercase mb-1">Member Rev</p>
                                        <p className="text-2xl font-bold text-emerald-400">${(analytics.memberRevenue || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                        <p className="text-xs text-stone-500 font-bold uppercase mb-1">Rewards Claimed</p>
                                        <p className="text-2xl font-bold text-white">{analytics.rewardsClaimed}</p>
                                    </div>
                                    <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                                        <p className="text-xs text-amber-500 font-bold uppercase mb-1">Overrides</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-2xl font-bold text-amber-400">{analytics.manualAdjustCount}</p>
                                            {(analytics.manualPositiveAdjustCount > 0 || analytics.manualNegativeAdjustCount > 0) ? (
                                                <span className="text-xs text-amber-500/70 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                                    +{analytics.manualPositiveAdjustCount} / {analytics.manualNegativeAdjustCount}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                    </div>
                ) : (
                    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center animate-in fade-in duration-500">
                        <div className="w-24 h-24 bg-violet-900/30 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-900/20">
                            <Sparkles className="w-10 h-10 text-violet-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">No Beauty Loop Configured</h2>
                        <p className="text-stone-400 max-w-lg mx-auto mb-8 text-lg">
                            Ditch the punch cards. Build an intelligent loop that brings your best customers back exactly when you need them.
                        </p>
                        <button 
                            onClick={() => setShowWizard(true)}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Sparkles className="w-5 h-5" />
                            Create A Program
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

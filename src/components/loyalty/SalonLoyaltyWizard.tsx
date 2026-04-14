'use client'

import React, { useState } from 'react'
import { Check, ChevronRight, ChevronLeft, Sparkles, AlertTriangle, Infinity } from 'lucide-react'

// Step data schemas
interface BeautyLoopConfig {
    name: string
    code: string
    customerLabel: string
    goal: string
    punchesRequired: number
    rewardType: string
    rewardValue: number
    timingWindowDays: number | null
    rewardExpiryDays: number | null
    stackWithDiscounts: boolean
    autoEnroll: boolean
}

interface SalonLoyaltyWizardProps {
    onComplete: (config: BeautyLoopConfig) => void
    onCancel: () => void
}

export default function SalonLoyaltyWizard({ onComplete, onCancel }: SalonLoyaltyWizardProps) {
    const [step, setStep] = useState(1)
    const [showWarningModal, setShowWarningModal] = useState(false)
    const [config, setConfig] = useState<BeautyLoopConfig>({
        name: 'Signature Beauty Loop',
        code: 'BEAUTY_LOOP_V1',
        customerLabel: 'Visits',
        goal: 'REPEAT_VISITS',
        punchesRequired: 5,
        rewardType: 'PERCENT_OFF',
        rewardValue: 100, // Default 100% off a service
        timingWindowDays: 45, // Default 45 day rebooking loop
        rewardExpiryDays: 30,
        stackWithDiscounts: false,
        autoEnroll: true
    })

    const totalSteps = 6

    const nextStep = () => {
        if (step === totalSteps) {
            if (config.stackWithDiscounts && !showWarningModal) {
                setShowWarningModal(true)
                return
            }
            onComplete(config)
        } else {
            setStep(s => s + 1)
        }
    }

    const prevStep = () => setStep(s => s - 1)

    const update = (key: keyof BeautyLoopConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    // Modal logic for Double Discounting Warning
    if (showWarningModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="max-w-md w-full bg-stone-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl shadow-red-500/20">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Discount Stacking Enabled!</h2>
                    <p className="text-stone-300 text-center text-sm mb-6">
                        You have chosen to allow customers to apply a Loyalty Reward ON TOP OF other system discounts. This can lead to mathematically free or negative-cost tickets. Ensure your staff is trained.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                update('stackWithDiscounts', false)
                                setShowWarningModal(false)
                            }}
                            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold transition-all"
                        >
                            Disable Stacking
                        </button>
                        <button 
                            onClick={() => {
                                setShowWarningModal(false)
                                onComplete(config) // Proceed anyway
                            }}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
            {/* Header Progress */}
            <div className="bg-stone-950 p-6 border-b border-stone-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-violet-400 w-6 h-6" />
                        Beauty Loop Setup
                    </h2>
                    <button onClick={onCancel} className="text-stone-500 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>
                
                {/* Stepper */}
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -mt-0.5 w-full h-1 bg-stone-800 rounded-full"></div>
                    <div 
                        className="absolute left-0 top-1/2 -mt-0.5 h-1 bg-violet-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" 
                        style={{ width: `\${((step - 1) / (totalSteps - 1)) * 100}%` }}
                    ></div>
                    
                    {Array.from({ length: totalSteps }).map((_, i) => {
                        const stepNum = i + 1
                        const isActive = step === stepNum
                        const isPast = step > stepNum
                        
                        return (
                            <div 
                                key={stepNum} 
                                className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 \${
                                    isActive ? 'bg-violet-500 text-white shadow-xl scale-110' :
                                    isPast ? 'bg-emerald-500 text-black' : 'bg-stone-800 text-stone-500 border border-stone-700'
                                }`}
                            >
                                {isPast ? <Check className="w-4 h-4 text-emerald-950 font-bold" /> : stepNum}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 flex flex-col justify-center overflow-y-auto">
                <div className="max-w-xl mx-auto w-full">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-white mb-3">Name Your Loop</h3>
                                <p className="text-stone-400">What do you want to call this loyalty program?</p>
                            </div>
                            <input 
                                type="text"
                                value={config.name}
                                onChange={(e) => update('name', e.target.value)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-xl text-white font-medium text-center focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                placeholder="e.g. The Highlight Loop"
                            />
                            <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800/50">
                                <label className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-2 block">System Code</label>
                                <input 
                                    type="text"
                                    value={config.code}
                                    onChange={(e) => update('code', e.target.value.toUpperCase().replace(/\W/g, '_'))}
                                    className="w-full bg-transparent text-stone-400 font-mono focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-white mb-3">Set The Goal</h3>
                                <p className="text-stone-400">How many qualified visits before a reward?</p>
                            </div>
                            
                            <div className="flex items-center justify-center gap-6">
                                <button 
                                    onClick={() => update('punchesRequired', Math.max(1, config.punchesRequired - 1))}
                                    className="w-16 h-16 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-3xl font-light text-stone-300 transition-colors"
                                >
                                    -
                                </button>
                                <div className="w-32 h-32 rounded-3xl bg-stone-950 border-2 border-violet-500/50 flex flex-col items-center justify-center shadow-lg shadow-violet-500/10">
                                    <span className="text-5xl font-black text-white">{config.punchesRequired}</span>
                                    <span className="text-sm font-medium text-violet-400 mt-1 uppercase">{config.customerLabel}</span>
                                </div>
                                <button 
                                    onClick={() => update('punchesRequired', config.punchesRequired + 1)}
                                    className="w-16 h-16 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-3xl font-light text-stone-300 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                            
                            <div className="mt-8">
                                <label className="text-sm text-stone-400 block mb-2">Customer Display Label</label>
                                <input 
                                    type="text"
                                    value={config.customerLabel}
                                    onChange={(e) => update('customerLabel', e.target.value)}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:border-violet-500 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-white mb-3">Define The Reward</h3>
                                <p className="text-stone-400">What happens when they reach {config.punchesRequired} {config.customerLabel}?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button
                                    onClick={() => update('rewardType', 'PERCENT_OFF')}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 \${config.rewardType === 'PERCENT_OFF' ? 'border-violet-500 bg-violet-500/10' : 'border-stone-800 bg-stone-950 hover:border-stone-700'}`}
                                >
                                    <span className="text-2xl">✂️</span>
                                    <span className="font-bold text-white">% Off Service</span>
                                </button>
                                <button
                                    onClick={() => update('rewardType', 'FIXED_OFF')}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 \${config.rewardType === 'FIXED_OFF' ? 'border-violet-500 bg-violet-500/10' : 'border-stone-800 bg-stone-950 hover:border-stone-700'}`}
                                >
                                    <span className="text-2xl">💵</span>
                                    <span className="font-bold text-white">$ Off Ticket</span>
                                </button>
                            </div>

                            <div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
                                <label className="text-sm text-stone-400 block mb-3">
                                    {config.rewardType === 'PERCENT_OFF' ? 'Discount Percentage' : 'Discount Dollar Amount'}
                                </label>
                                <div className="flex items-center gap-3">
                                    {config.rewardType === 'FIXED_OFF' && <span className="text-3xl text-stone-500 font-bold">$</span>}
                                    <input 
                                        type="number"
                                        value={config.rewardValue}
                                        onChange={(e) => update('rewardValue', Number(e.target.value))}
                                        className="bg-transparent text-4xl font-black text-white w-24 focus:outline-none"
                                    />
                                    {config.rewardType === 'PERCENT_OFF' && <span className="text-3xl text-stone-500 font-bold">%</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-white mb-3">Rebooking Urgency</h3>
                                <p className="text-stone-400">Enforce loop frequency to drive retention.</p>
                            </div>

                            <div className="space-y-4">
                                <div className={`border-2 rounded-xl p-4 transition-all cursor-pointer \${config.timingWindowDays !== null ? 'border-violet-500 bg-violet-500/5' : 'border-stone-800 bg-stone-950'}`} onClick={() => update('timingWindowDays', config.timingWindowDays === null ? 45 : null)}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-bold text-white text-lg">Timed Loop</h4>
                                            <p className="text-sm text-stone-400">Punches expire if they don't visit within window.</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center \${config.timingWindowDays !== null ? 'border-violet-500 bg-violet-500 text-white' : 'border-stone-700'}`}>
                                            {config.timingWindowDays !== null && <Check className="w-3 h-3 font-bold" />}
                                        </div>
                                    </div>
                                    {config.timingWindowDays !== null && (
                                        <div className="flex items-center gap-3 mt-4" onClick={e => e.stopPropagation()}>
                                            <input type="number" className="w-20 bg-stone-900 border border-stone-700 p-2 rounded text-white text-center" value={config.timingWindowDays} onChange={e => update('timingWindowDays', Number(e.target.value))} />
                                            <span className="text-stone-300">Days allowed between visits</span>
                                        </div>
                                    )}
                                </div>

                                <div className={`border-2 rounded-xl p-4 transition-all cursor-pointer \${config.timingWindowDays === null ? 'border-violet-500 bg-violet-500/5' : 'border-stone-800 bg-stone-950'}`} onClick={() => update('timingWindowDays', null)}>
                                    <div className="flex items-center gap-4">
                                        <Infinity className="w-8 h-8 text-stone-500" />
                                        <div>
                                            <h4 className="font-bold text-white text-lg">Infinite Loop</h4>
                                            <p className="text-sm text-stone-400">Punches never expire. No friction.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-white mb-3">Advanced Rules</h3>
                                <p className="text-stone-400">Configure double-dipping blocks and enrollment.</p>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-start gap-4 p-4 border border-stone-800 rounded-xl bg-stone-950 cursor-pointer hover:border-stone-700 transition-all">
                                    <input 
                                        type="checkbox" 
                                        checked={config.stackWithDiscounts}
                                        onChange={(e) => update('stackWithDiscounts', e.target.checked)}
                                        className="mt-1 w-5 h-5 accent-violet-500 bg-stone-900 border-stone-700 rounded"
                                    />
                                    <div>
                                        <p className="font-bold text-white">Allow Discount Stacking</p>
                                        <p className="text-sm text-stone-500">If checked, a loyal customer can use their {config.rewardType === 'PERCENT_OFF' ? `\${config.rewardValue}%` : `$\${config.rewardValue}`} reward on top of other promotions.</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 p-4 border border-stone-800 rounded-xl bg-stone-950 cursor-pointer hover:border-stone-700 transition-all">
                                    <input 
                                        type="checkbox" 
                                        checked={config.autoEnroll}
                                        onChange={(e) => update('autoEnroll', e.target.checked)}
                                        className="mt-1 w-5 h-5 accent-violet-500 bg-stone-900 border-stone-700 rounded"
                                    />
                                    <div>
                                        <p className="font-bold text-white">Auto-Enroll Customers</p>
                                        <p className="text-sm text-stone-500">Automatically add a customer into this loop on their first qualifying visit, completely frictionless.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-bold text-emerald-400 flex items-center justify-center gap-2">
                                    <Check className="w-8 h-8" />
                                    Review & Launch
                                </h3>
                                <p className="text-stone-400">Verify your physics before activating.</p>
                            </div>

                            <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 divide-y divide-stone-800">
                                <div className="py-3 flex justify-between">
                                    <span className="text-stone-500">Program</span>
                                    <span className="text-white font-bold">{config.name} ({config.code})</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-stone-500">Milestone</span>
                                    <span className="text-white font-bold">{config.punchesRequired} {config.customerLabel}</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-stone-500">Reward Setup</span>
                                    <span className="text-white font-bold">{config.rewardType === 'PERCENT_OFF' ? `\${config.rewardValue}%` : `$\${config.rewardValue}`} Off</span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-stone-500">Expirations</span>
                                    <span className="text-white font-bold">
                                        {config.timingWindowDays ? `Must return in \${config.timingWindowDays} days` : 'Punches never expire'}
                                    </span>
                                </div>
                                <div className="py-3 flex justify-between">
                                    <span className="text-stone-500">Discount Stacking</span>
                                    <span className={config.stackWithDiscounts ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                                        {config.stackWithDiscounts ? 'ALLOWED (WARNING)' : 'BLOCKED'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer Navigation */}
            <div className="bg-stone-950 p-6 border-t border-stone-800 flex justify-between items-center">
                <button 
                    onClick={prevStep}
                    disabled={step === 1}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all \${step === 1 ? 'hidden' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'}`}
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                </button>
                
                <div className={step === 1 ? 'ml-auto' : ''}>
                    <button 
                        onClick={nextStep}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:scale-105 active:scale-95 \${step === totalSteps ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20'}`}
                    >
                        {step === totalSteps ? 'Launch Program' : 'Continue'}
                        {step !== totalSteps && <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}

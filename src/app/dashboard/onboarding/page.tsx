'use client'

/**
 * Onboarding Wizard — Step-by-step setup for new stores
 *
 * Zero API calls for the wizard itself — only saves on completion.
 * Guides owners through: store info, operating hours, POS stations,
 * payment setup, first items, and go-live.
 */

import { useState } from 'react'
import { Check, ChevronRight, ChevronLeft, Store, Clock, Monitor, CreditCard, Package, Rocket } from 'lucide-react'

const STEPS = [
    { id: 'store', title: 'Store Information', icon: Store, description: 'Set up your store name, address, and contact details' },
    { id: 'hours', title: 'Operating Hours', icon: Clock, description: 'Configure your business hours and holidays' },
    { id: 'stations', title: 'POS Stations', icon: Monitor, description: 'Set up your registers and printers' },
    { id: 'payments', title: 'Payment Setup', icon: CreditCard, description: 'Configure PAX terminal and payment methods' },
    { id: 'inventory', title: 'First Items', icon: Package, description: 'Import or add your first products' },
    { id: 'launch', title: 'Go Live!', icon: Rocket, description: 'Review and activate your store' },
]

export default function OnboardingPage() {
    const [step, setStep] = useState(0)
    const [completed, setCompleted] = useState<Set<number>>(new Set())
    const [formData, setFormData] = useState<Record<string, any>>({})

    const markComplete = () => {
        setCompleted(new Set([...completed, step]))
        if (step < STEPS.length - 1) setStep(step + 1)
    }

    const progress = (completed.size / STEPS.length) * 100

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white flex">
            {/* Steps Sidebar */}
            <div className="w-80 border-r border-stone-800 p-6">
                <h2 className="text-xl font-bold mb-1">Store Setup</h2>
                <p className="text-xs text-stone-500 mb-6">{completed.size}/{STEPS.length} complete</p>

                {/* Progress bar */}
                <div className="h-1.5 bg-stone-800 rounded-full mb-6 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="space-y-2">
                    {STEPS.map((s, i) => (
                        <button key={s.id} onClick={() => setStep(i)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${i === step ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-stone-800'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${completed.has(i) ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-400'}`}>
                                {completed.has(i) ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${i === step ? 'text-white' : 'text-stone-400'}`}>{s.title}</p>
                                <p className="text-[10px] text-stone-600">{s.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8">
                <div className="max-w-2xl mx-auto">
                    {/* Step Header */}
                    <div className="flex items-center gap-3 mb-8">
                        {(() => { const Icon = STEPS[step].icon; return <Icon className="h-8 w-8 text-blue-400" /> })()}
                        <div>
                            <h1 className="text-2xl font-bold">{STEPS[step].title}</h1>
                            <p className="text-stone-400">{STEPS[step].description}</p>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                        {step === 0 && (
                            <div className="space-y-4">
                                <div><label className="block text-sm text-stone-400 mb-1">Store Name</label>
                                    <input className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" value={formData.storeName || ''} onChange={e => setFormData({ ...formData, storeName: e.target.value })} placeholder="My Awesome Store" /></div>
                                <div><label className="block text-sm text-stone-400 mb-1">Address</label>
                                    <input className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-stone-400 mb-1">Phone</label>
                                        <input className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
                                    <div><label className="block text-sm text-stone-400 mb-1">Email</label>
                                        <input className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="store@example.com" /></div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-3">
                                <p className="text-sm text-stone-400 mb-4">Set your regular operating hours:</p>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <div key={day} className="flex items-center gap-4">
                                        <span className="w-24 text-sm">{day}</span>
                                        <input type="time" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm" defaultValue="09:00" />
                                        <span className="text-stone-500">to</span>
                                        <input type="time" className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm" defaultValue="21:00" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <p className="text-sm text-stone-400 mb-4">Configure your POS stations — each register needs a name:</p>
                                <div className="bg-stone-800 rounded-xl p-4 flex items-center gap-4">
                                    <Monitor className="h-8 w-8 text-blue-400" />
                                    <div className="flex-1">
                                        <p className="font-medium">Station 1 (Primary)</p>
                                        <p className="text-xs text-stone-500">Main checkout register</p>
                                    </div>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Active</span>
                                </div>
                                <button className="text-sm text-blue-400 hover:text-blue-300">+ Add another station</button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4">
                                    <CreditCard className="h-8 w-8 text-emerald-400" />
                                    <div>
                                        <p className="font-medium text-emerald-400">PAX Terminal</p>
                                        <p className="text-sm text-stone-400">Your in-person card processor is ready to configure</p>
                                    </div>
                                </div>
                                <p className="text-sm text-stone-400">Enter your PAX terminal IP and port from the terminal&apos;s network settings.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-stone-400 mb-1">Terminal IP</label>
                                        <input className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" placeholder="192.168.1.100" /></div>
                                    <div><label className="block text-sm text-stone-400 mb-1">Port</label>
                                        <input className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" placeholder="10009" defaultValue="10009" /></div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-4">
                                <p className="text-sm text-stone-400 mb-4">Add your first items — you can import from CSV or add manually:</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button className="bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-xl p-6 text-center">
                                        <Package className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                                        <p className="font-medium">Import CSV</p>
                                        <p className="text-xs text-stone-500 mt-1">Upload a spreadsheet</p>
                                    </button>
                                    <button className="bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-xl p-6 text-center">
                                        <Package className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                                        <p className="font-medium">Add Manually</p>
                                        <p className="text-xs text-stone-500 mt-1">One at a time</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="text-center py-8">
                                <Rocket className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                                <h2 className="text-2xl font-bold mb-2">You&apos;re Ready!</h2>
                                <p className="text-stone-400 mb-6">Your store is configured and ready to start selling.</p>
                                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
                                    {[
                                        { label: 'Store Info', done: completed.has(0) },
                                        { label: 'Hours', done: completed.has(1) },
                                        { label: 'Stations', done: completed.has(2) },
                                        { label: 'Payments', done: completed.has(3) },
                                        { label: 'Inventory', done: completed.has(4) },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center gap-2 text-sm">
                                            {item.done ? <Check className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 border border-stone-600 rounded" />}
                                            <span className={item.done ? 'text-emerald-400' : 'text-stone-500'}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
                                    onClick={() => window.location.href = '/pos'}>
                                    🚀 Launch POS
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
                        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl disabled:opacity-30">
                            <ChevronLeft className="h-4 w-4" /> Back
                        </button>
                        {step < STEPS.length - 1 ? (
                            <button onClick={markComplete} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl">
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button onClick={markComplete} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl">
                                <Check className="h-4 w-4" /> Complete Setup
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

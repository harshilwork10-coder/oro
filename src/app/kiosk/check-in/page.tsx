'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Check, ChevronRight } from 'lucide-react'
import OroLogo from '@/components/ui/OroLogo'

export default function KioskCheckInPage() {
    const router = useRouter()
    const [step, setStep] = useState<'phone' | 'name' | 'waiver' | 'loyalty' | 'welcome'>('phone')
    const [phone, setPhone] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [isExistingCustomer, setIsExistingCustomer] = useState(false)
    const [waiverAccepted, setWaiverAccepted] = useState(false)

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Check if customer exists
            const res = await fetch(`/api/franchise/customers/search?phone=${phone}`)
            if (res.ok) {
                const data = await res.json()
                if (data.length > 0) {
                    // Existing customer - go to waiver
                    setFirstName(data[0].name.split(' ')[0])
                    setIsExistingCustomer(true)
                    setStep('waiver')
                } else {
                    // New customer - collect name first
                    setIsExistingCustomer(false)
                    setStep('name')
                }
            }
        } catch (error) {
            console.error('Error searching customer:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Create new customer
            const res = await fetch('/api/franchise/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${firstName} ${lastName}`,
                    phone: phone
                })
            })

            if (res.ok) {
                setStep('waiver')
            }
        } catch (error) {
            console.error('Error creating customer:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLoyaltyChoice = async (enrollInLoyalty: boolean) => {
        setLoading(true)
        try {
            // TODO: Update customer with loyalty preference
            // For now, just proceed to welcome
            setStep('welcome')
        } finally {
            setLoading(false)
        }
    }

    // Waiver step
    if (step === 'waiver') {
        return (
            <div className="h-screen bg-stone-950 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-stone-900 to-stone-950 z-0" />
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full z-0" />

                <div className="relative z-10 bg-stone-900/50 backdrop-blur-md border-b border-stone-800 p-6 shadow-lg flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <OroLogo size={32} />
                        <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">OroNext</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                    <div className="max-w-2xl w-full glass-panel rounded-3xl shadow-2xl p-8 border border-stone-800">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-stone-100 mb-2">Liability Waiver</h2>
                            <p className="text-stone-400">Please review and accept our terms</p>
                        </div>

                        <div className="bg-stone-900/50 rounded-2xl p-6 mb-6 max-h-64 overflow-y-auto border border-stone-800">
                            <h3 className="text-lg font-semibold text-orange-400 mb-3">Terms & Conditions</h3>
                            <div className="text-sm text-stone-300 space-y-3">
                                <p>By checking in, I acknowledge and agree to the following:</p>
                                <ul className="list-disc list-inside space-y-2 pl-2">
                                    <li>I have disclosed any allergies or sensitivities to products or ingredients</li>
                                    <li>I understand that results may vary and are not guaranteed</li>
                                    <li>I release Oro from any liability for adverse reactions</li>
                                    <li>I consent to the services being performed by licensed professionals</li>
                                    <li>I agree to follow aftercare instructions provided</li>
                                </ul>
                            </div>
                        </div>

                        <label className="flex items-start gap-4 p-4 bg-stone-800/30 rounded-xl border-2 border-stone-700 hover:border-orange-500/50 cursor-pointer transition-all mb-6">
                            <input
                                type="checkbox"
                                checked={waiverAccepted}
                                onChange={(e) => setWaiverAccepted(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-stone-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-stone-900 cursor-pointer"
                            />
                            <span className="text-stone-200 font-medium">
                                I have read and accept the terms and conditions
                            </span>
                        </label>

                        <button
                            onClick={() => setStep('loyalty')}
                            disabled={!waiverAccepted}
                            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            Continue
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Loyalty program step
    if (step === 'loyalty') {
        return (
            <div className="h-screen bg-stone-950 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-stone-900 to-stone-950 z-0" />
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full z-0" />

                <div className="relative z-10 bg-stone-900/50 backdrop-blur-md border-b border-stone-800 p-6 shadow-lg flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <OroLogo size={32} />
                        <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-transparent">OroNext</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                    <div className="max-w-lg w-full glass-panel rounded-3xl shadow-2xl p-8 border border-stone-800">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-stone-100 mb-2">Join Our Loyalty Program?</h2>
                            <p className="text-stone-400">Earn points with every visit and get exclusive rewards!</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl p-6 mb-8 border border-orange-500/20">
                            <h3 className="text-lg font-semibold text-orange-400 mb-3">Benefits:</h3>
                            <ul className="text-sm text-stone-300 space-y-2">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-orange-400" />
                                    Earn 1 point for every dollar spent
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-orange-400" />
                                    Get $10 off for every 100 points
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-orange-400" />
                                    Exclusive member-only discounts
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-orange-400" />
                                    Birthday rewards and special offers
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleLoyaltyChoice(true)}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? 'Enrolling...' : 'Of course! Sign me up'}
                                <Check className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => handleLoyaltyChoice(false)}
                                disabled={loading}
                                className="w-full py-4 bg-stone-800/50 hover:bg-stone-800 text-stone-200 rounded-2xl font-medium text-lg border border-stone-700 hover:border-orange-500/50 transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                Not today
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (step === 'welcome') {
        return (
            <div className="h-screen bg-stone-950 flex items-center justify-center p-6 text-white text-center relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-900/20 to-stone-900/50 z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full z-0" />

                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                        <Check className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-100">Welcome, {firstName}!</h1>
                    <p className="text-xl text-stone-300">You're all checked in. Please have a seat, and we'll be with you shortly.</p>
                    <button
                        onClick={() => {
                            setStep('phone')
                            setPhone('')
                            setFirstName('')
                            setLastName('')
                        }}
                        className="mt-12 px-8 py-3 bg-stone-800/50 hover:bg-stone-800 border border-stone-700 hover:border-orange-500/50 rounded-full text-sm font-medium transition-all text-stone-300 hover:text-white"
                    >
                        Check in another person
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen bg-stone-950 flex flex-col relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-stone-900 to-stone-950 z-0" />
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 blur-[120px] rounded-full z-0" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-amber-600/5 blur-[120px] rounded-full z-0" />

            {/* Header */}
            <div className="relative z-10 bg-stone-900/50 backdrop-blur-md border-b border-stone-800 p-6 shadow-lg flex items-center justify-center">
                <div className="flex items-center gap-3 group">
                    <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <OroLogo size={32} className="relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-amber-200 to-orange-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-text-shimmer">
                        Oro
                    </span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="max-w-md w-full glass-panel rounded-2xl shadow-2xl p-6 border border-stone-800">
                    {step === 'phone' ? (
                        <form onSubmit={handlePhoneSubmit} className="space-y-4">
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-bold text-stone-100">Welcome! 👋</h2>
                                <p className="text-stone-400 text-sm">Please enter your mobile number to check in.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-stone-400 mb-1">MOBILE NUMBER</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    readOnly
                                    className="w-full text-2xl font-bold p-3 bg-stone-900/50 border-2 border-stone-800 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 text-center tracking-widest text-white placeholder-stone-700 transition-all cursor-default"
                                    placeholder="(555) 555-5555"
                                />
                            </div>

                            {/* Numeric Keypad - Compact */}
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setPhone(prev => prev.length < 10 ? prev + num : prev)}
                                        className="h-12 text-xl font-bold bg-stone-800/50 hover:bg-stone-700 text-stone-200 rounded-lg transition-all active:scale-95 border border-stone-700 hover:border-orange-500/50"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPhone('')}
                                    className="h-12 text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all active:scale-95"
                                >
                                    ⌫
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPhone(prev => prev.length < 10 ? prev + '0' : prev)}
                                    className="h-12 text-xl font-bold bg-stone-800/50 hover:bg-stone-700 text-stone-200 rounded-lg transition-all active:scale-95 border border-stone-700 hover:border-orange-500/50"
                                >
                                    0
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || phone.length < 10}
                                    className="h-12 text-sm font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    Enter
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || phone.length < 10}
                                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? 'Checking...' : 'Continue'}
                                {!loading && <ChevronRight className="h-5 w-5" />}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleNameSubmit} className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-stone-100">Nice to meet you!</h2>
                                <p className="text-stone-400">Please tell us your name.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full text-xl p-4 bg-stone-900/50 border-2 border-stone-800 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 text-white placeholder-stone-700 transition-all"
                                        placeholder="Jane"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-400 mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full text-xl p-4 bg-stone-900/50 border-2 border-stone-800 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 text-white placeholder-stone-700 transition-all"
                                        placeholder="Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !firstName || !lastName}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? 'Saving...' : 'Check In'}
                                {!loading && <Check className="h-5 w-5" />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}


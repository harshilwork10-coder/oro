'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import BreadLogo from '@/components/ui/BreadLogo'
import VirtualKeyboard from './VirtualKeyboard'

export default function CheckIn() {
    const [step, setStep] = useState<'phone' | 'name' | 'liability' | 'loyalty' | 'welcome'>('phone')
    const [phone, setPhone] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPhoneKeyboard, setShowPhoneKeyboard] = useState(true)
    const [showNameKeyboard, setShowNameKeyboard] = useState<'first' | 'last' | null>(null)
    const [liabilitySigned, setLiabilitySigned] = useState(false)
    const [loyaltyJoined, setLoyaltyJoined] = useState(false)

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/franchise/customers/search?phone=${phone}`)
            if (res.ok) {
                const data = await res.json()
                if (data.length > 0) {
                    const customer = data[0]
                    setFirstName(customer.firstName)
                    setLastName(customer.lastName)

                    // Check if they need to sign liability or join loyalty
                    if (!customer.liabilitySigned) {
                        setStep('liability')
                    } else if (!customer.loyaltyJoined) {
                        setStep('loyalty')
                    } else {
                        setStep('welcome')
                    }
                } else {
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
        setStep('liability')
    }

    const handleLiabilitySubmit = async (signed: boolean) => {
        setLiabilitySigned(signed)
        if (signed) {
            setStep('loyalty')
        } else {
            // Can't proceed without liability? Or maybe just skip to loyalty?
            // Assuming mandatory for now based on "checked and accept" requirement
            alert('You must accept the liability waiver to proceed.')
        }
    }

    const handleLoyaltySubmit = async (join: boolean) => {
        setLoyaltyJoined(join)
        setLoading(true)

        try {
            const res = await fetch('/api/franchise/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${firstName} ${lastName}`,
                    phone: phone,
                    liabilitySigned: liabilitySigned,
                    loyaltyJoined: join
                })
            })

            if (res.ok) {
                setStep('welcome')
            }
        } catch (error) {
            console.error('Error creating/updating customer:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (step === 'welcome') {
            const timer = setTimeout(() => {
                setStep('phone')
                setPhone('')
                setFirstName('')
                setLastName('')
                setLiabilitySigned(false)
                setLoyaltyJoined(false)
            }, 30000) // 30 seconds

            return () => clearTimeout(timer)
        }
    }, [step])

    if (step === 'welcome') {
        return (
            <div className="min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/40 via-stone-950 to-stone-950 flex items-center justify-center p-6 text-stone-100 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8 glass-panel p-12 rounded-3xl border-orange-500/20 shadow-2xl shadow-orange-900/20">
                    <div className="mx-auto w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mb-6 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                        <Check className="h-12 w-12 text-orange-500" />
                    </div>
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">Welcome, {firstName}!</h1>
                    <p className="text-xl text-stone-400">You're all checked in. Please have a seat, and we'll be with you shortly.</p>
                    <button
                        onClick={() => {
                            setStep('phone')
                            setPhone('')
                            setFirstName('')
                            setLastName('')
                            setLiabilitySigned(false)
                            setLoyaltyJoined(false)
                        }}
                        className="mt-12 px-8 py-3 bg-stone-800 hover:bg-stone-700 rounded-full text-sm font-medium transition-colors text-stone-300 border border-stone-700"
                    >
                        Check in another person
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-stone-950 to-stone-950 flex flex-col relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-orange-500/10 blur-[120px] pointer-events-none" />

            <div className="p-6 flex items-center justify-center relative z-10">
                <div className="flex items-center gap-3 glass-panel px-6 py-3 rounded-full">
                    <div className="h-24 w-24 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <BreadLogo size={100} />
                    </div>
                    <span className="text-2xl font-bold text-stone-100 tracking-tight">
                        Aura Salon
                    </span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="max-w-2xl w-full glass-panel rounded-[2rem] shadow-2xl border-orange-500/10 p-8 md:p-12 backdrop-blur-xl">
                    {step === 'phone' && (
                        <form onSubmit={handlePhoneSubmit} className="space-y-8">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-stone-100 mb-2">Welcome! 👋</h2>
                                <p className="text-stone-400 text-lg">Please enter your mobile number to check in.</p>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2 text-center">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onFocus={() => setShowPhoneKeyboard(true)}
                                    readOnly
                                    className="w-full text-4xl font-bold p-6 bg-stone-900/50 border-2 border-stone-800 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 text-center tracking-[0.2em] cursor-pointer text-stone-100 placeholder-stone-700 transition-all"
                                    placeholder="(555) 555-5555"
                                    required
                                />
                                {showPhoneKeyboard && (
                                    <div className="mt-6">
                                        <VirtualKeyboard
                                            value={phone}
                                            onChange={setPhone}
                                            mode="numeric"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || phone.length < 10}
                                className="w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-xl hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? 'Checking...' : 'Continue'}
                                {!loading && <ChevronRight className="h-6 w-6" />}
                            </button>
                        </form>
                    )}

                    {step === 'name' && (
                        <form onSubmit={handleNameSubmit} className="space-y-8">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-stone-100 mb-2">Nice to meet you!</h2>
                                <p className="text-stone-400 text-lg">Please tell us your name.</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        onClick={() => setShowNameKeyboard('first')}
                                        onFocus={() => setShowNameKeyboard('first')}
                                        readOnly
                                        className="w-full text-2xl p-5 bg-stone-900/50 border-2 border-stone-800 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer text-stone-100 placeholder-stone-700 transition-all"
                                        placeholder="Jane"
                                        required
                                    />
                                    {showNameKeyboard === 'first' && (
                                        <div className="mt-4">
                                            <VirtualKeyboard
                                                value={firstName}
                                                onChange={setFirstName}
                                                mode="full"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        onClick={() => setShowNameKeyboard('last')}
                                        onFocus={() => setShowNameKeyboard('last')}
                                        readOnly
                                        className="w-full text-2xl p-5 bg-stone-900/50 border-2 border-stone-800 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer text-stone-100 placeholder-stone-700 transition-all"
                                        placeholder="Doe"
                                        required
                                    />
                                    {showNameKeyboard === 'last' && (
                                        <div className="mt-4">
                                            <VirtualKeyboard
                                                value={lastName}
                                                onChange={setLastName}
                                                mode="full"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !firstName || !lastName}
                                className="w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-xl hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                Continue
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </form>
                    )}

                    {step === 'liability' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-stone-100 mb-2">One last thing...</h2>
                                <p className="text-stone-400 text-lg">Please review and accept our liability waiver.</p>
                            </div>

                            <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-800 h-64 overflow-y-auto text-sm text-stone-400 leading-relaxed">
                                <p className="mb-4">
                                    <strong>LIABILITY WAIVER AND RELEASE FORM</strong>
                                </p>
                                <p className="mb-4">
                                    I hereby acknowledge that I am voluntarily participating in services provided by Aura Salon. I understand that these services may involve risks, including but not limited to allergic reactions to products, minor cuts, or other injuries.
                                </p>
                                <p className="mb-4">
                                    I agree to release and hold harmless Aura Salon, its employees, and agents from any and all liability, claims, or causes of action arising out of my participation in these services.
                                </p>
                                <p>
                                    By clicking "Accept", I acknowledge that I have read and understood this waiver and agree to its terms.
                                </p>
                            </div>

                            <button
                                onClick={() => handleLiabilitySubmit(true)}
                                className="w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-xl hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                I Accept
                                <Check className="h-6 w-6" />
                            </button>
                        </div>
                    )}

                    {step === 'loyalty' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center mb-8">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                                    <span className="text-4xl">🎁</span>
                                </div>
                                <h2 className="text-3xl font-bold text-stone-100 mb-2">Join Aura Rewards?</h2>
                                <p className="text-stone-400 text-lg">Earn points on every visit and get exclusive offers!</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => handleLoyaltySubmit(true)}
                                    className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    Yes, sign me up!
                                    <span className="text-2xl">✨</span>
                                </button>
                                <button
                                    onClick={() => handleLoyaltySubmit(false)}
                                    className="w-full py-4 bg-transparent text-stone-500 font-medium hover:text-stone-300 transition-colors"
                                >
                                    No thanks, maybe later
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

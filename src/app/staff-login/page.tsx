'use client'

import { useState } from 'react'
import { Phone, Lock, AlertCircle, ArrowRight, Smartphone } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OroLogo from '@/components/ui/OroLogo'

export default function StaffLoginPage() {
    const [phone, setPhone] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 10)
        if (digits.length >= 6) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
        } else if (digits.length >= 3) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
        }
        return digits
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value))
    }

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
        setPin(value)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Call phone + PIN login API
            const res = await fetch('/api/auth/phone-pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone.replace(/\D/g, ''),
                    pin
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                // Sign in with credentials to create session
                const result = await signIn('credentials', {
                    email: data.user.email,
                    password: 'PHONE_PIN_VERIFIED_' + pin,
                    redirect: false
                })

                if (result?.ok) {
                    // Redirect to barber dashboard for commission-based employees
                    router.push('/barber')
                } else {
                    setError('Login failed')
                }
            } else {
                setError(data.error || 'Invalid phone or PIN')
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <OroLogo size="lg" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Staff Login</h1>
                    <p className="text-gray-400 mt-1">Enter your phone and PIN</p>
                </div>

                {/* Login Card */}
                <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    <span className="text-red-300 text-sm">{error}</span>
                                </div>
                            )}

                            {/* Phone Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500"
                                        placeholder="(555) 123-4567"
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>

                            {/* PIN Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    4-Digit PIN
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={handlePinChange}
                                        maxLength={4}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-600 rounded-xl text-white text-2xl tracking-[0.5em] text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500"
                                        placeholder="••••"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || phone.length < 14 || pin.length !== 4}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-900 px-8 py-4 text-center">
                        <p className="text-gray-500 text-sm">
                            <Smartphone className="inline w-4 h-4 mr-1" />
                            Your phone and PIN were set by your manager
                        </p>
                    </div>
                </div>

                {/* Back to Owner Login */}
                <div className="mt-6 text-center">
                    <a href="/login" className="text-gray-500 text-sm hover:text-gray-400 transition-colors">
                        Owner / Manager Login
                    </a>
                </div>
            </div>
        </div>
    )
}

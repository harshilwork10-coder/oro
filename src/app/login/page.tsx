'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                // Check for suspended/terminated account errors
                if (result.error.includes('ACCOUNT_SUSPENDED') || result.error.includes('ACCOUNT_TERMINATED')) {
                    router.push('/auth/suspended')
                    return
                }
                setError('Invalid credentials')
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-stone-950">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 p-12 flex-col justify-between relative overflow-hidden">
                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/30 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

                {/* Logo + Slogan */}
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-20 w-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg overflow-hidden">
                            <img src="/Oronex-logo.png" alt="Oronex" className="w-16 h-16 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-bold text-white drop-shadow-lg">Oronex</h1>
                            <p className="text-orange-100 text-lg font-medium">Ultimate Business Solution</p>
                        </div>
                    </div>
                </div>

                {/* Selling Features */}
                <div className="space-y-4 relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-300" />
                            </div>
                            <h3 className="text-white font-bold text-lg">Boost Revenue 35%</h3>
                        </div>
                        <p className="text-orange-50 text-sm">Smart upselling, loyalty programs & retention tools</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-blue-300" />
                            </div>
                            <h3 className="text-white font-bold text-lg">Real-Time Analytics</h3>
                        </div>
                        <p className="text-orange-50 text-sm">Track sales, inventory & staff across all locations</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Shield className="h-5 w-5 text-purple-300" />
                            </div>
                            <h3 className="text-white font-bold text-lg">Fraud Prevention</h3>
                        </div>
                        <p className="text-orange-50 text-sm">Cash drawer monitoring & complete audit trails</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/15 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Zap className="h-5 w-5 text-amber-300" />
                            </div>
                            <h3 className="text-white font-bold text-lg">Multi-Location Control</h3>
                        </div>
                        <p className="text-orange-50 text-sm">Manage unlimited franchises from one dashboard</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-stone-950 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-900/10 via-stone-950 to-stone-950">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"></div>
                            <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/Oronex-logo.png" alt="Oronex" className="w-16 h-16 object-contain" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Oronex</h1>
                        <p className="text-stone-400 text-sm">Ultimate Business Solution</p>
                    </div>

                    <div className="glass-panel rounded-2xl p-8 border border-stone-800">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-stone-100">Welcome back! 👋</h2>
                            <p className="mt-2 text-stone-400">Sign in to your Oronex account</p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-medium text-stone-300 mb-2">
                                    Email address
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-orange-900/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-stone-500">
                                Demo: <span className="text-stone-400 font-medium">admin@example.com / admin123</span>
                            </p>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-sm text-stone-600">
                        © 2024 Oronex POS System. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}

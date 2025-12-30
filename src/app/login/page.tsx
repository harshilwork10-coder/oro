'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, TrendingUp, Shield, Zap, BarChart3, KeyRound, Mail, Lock, ArrowRight, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mfaCode, setMfaCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isPairedDevice, setIsPairedDevice] = useState(false)
    const [focusedInput, setFocusedInput] = useState<string | null>(null)

    // MFA state
    const [mfaRequired, setMfaRequired] = useState(false)
    const [mfaUserId, setMfaUserId] = useState<string | null>(null)
    const [mfaUserName, setMfaUserName] = useState<string | null>(null)

    // Check if this device is paired to a station (configured POS device)
    useEffect(() => {
        const pairedStationId = localStorage.getItem('pairedStationId')
        if (pairedStationId) {
            setIsPairedDevice(true)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Step 1: Pre-login to check password and MFA requirement
            if (!mfaRequired) {
                const preLoginRes = await fetch('/api/auth/pre-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })

                const preLoginData = await preLoginRes.json()

                if (!preLoginRes.ok) {
                    if (preLoginData.locked) {
                        setError(preLoginData.error || 'Account is locked')
                    } else {
                        setError(preLoginData.error || 'Invalid credentials')
                    }
                    setLoading(false)
                    return
                }

                // Check if MFA is required
                if (preLoginData.mfaRequired) {
                    setMfaRequired(true)
                    setMfaUserId(preLoginData.userId)
                    setMfaUserName(preLoginData.userName)
                    setLoading(false)
                    return
                }
            }

            // Step 2: If MFA is required, verify the code first
            if (mfaRequired && mfaUserId) {
                if (!mfaCode || mfaCode.length < 6) {
                    setError('Please enter your 6-digit authentication code')
                    setLoading(false)
                    return
                }

                const mfaRes = await fetch('/api/auth/mfa/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: mfaUserId, token: mfaCode })
                })

                const mfaData = await mfaRes.json()

                if (!mfaRes.ok) {
                    setError(mfaData.error || 'Invalid authentication code')
                    setLoading(false)
                    return
                }
            }

            // Step 3: Complete login with NextAuth
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                if (result.error.includes('ACCOUNT_SUSPENDED') || result.error.includes('ACCOUNT_TERMINATED')) {
                    router.push('/auth/suspended')
                    return
                }
                setError('Invalid credentials')
            } else {
                // Role-based routing after successful login
                try {
                    const sessionRes = await fetch('/api/auth/session');
                    const session = await sessionRes.json();
                    const role = session?.user?.role;
                    const businessType = session?.user?.businessType;

                    if (role === 'PROVIDER' || role === 'ADMIN') {
                        router.push('/provider/home');
                    } else if (role === 'FRANCHISOR') {
                        // BRAND_FRANCHISOR goes to franchisor dashboard
                        // MULTI_LOCATION_OWNER goes to regular dashboard
                        if (businessType === 'BRAND_FRANCHISOR') {
                            router.push('/franchisor');
                        } else {
                            router.push('/dashboard');
                        }
                    } else if (role === 'OWNER') {
                        router.push('/owner');
                    } else if (role === 'EMPLOYEE' || role === 'MANAGER') {
                        router.push('/employee');
                    } else {
                        router.push('/dashboard');
                    }
                } catch {
                    router.push('/dashboard');
                }
                router.refresh()
            }
        } catch (err) {
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const resetMFA = () => {
        setMfaRequired(false)
        setMfaUserId(null)
        setMfaUserName(null)
        setMfaCode('')
        setError('')
    }


    const features = [
        {
            icon: TrendingUp,
            title: 'Boost Revenue 35%',
            description: 'Smart upselling, loyalty programs & retention tools',
            color: 'from-emerald-500 to-teal-500',
            bgColor: 'bg-emerald-500/10',
            delay: '0s'
        },
        {
            icon: BarChart3,
            title: 'Real-Time Analytics',
            description: 'Track sales, inventory & staff across all locations',
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-500/10',
            delay: '0.1s'
        },
        {
            icon: Shield,
            title: 'Fraud Prevention',
            description: 'Cash drawer monitoring & complete audit trails',
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-500/10',
            delay: '0.2s'
        },
        {
            icon: Zap,
            title: 'Multi-Location Control',
            description: 'Manage unlimited franchises from one dashboard',
            color: 'from-orange-500 to-amber-500',
            bgColor: 'bg-orange-500/10',
            delay: '0.3s'
        }
    ]

    return (
        <div className="flex min-h-screen bg-stone-950">
            {/* Left Side - Branding with Premium Design */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-12 flex-col justify-between relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0">
                    {/* Floating Orbs */}
                    <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-orange-300/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>

                    {/* Floating Particles */}
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-white/30 rounded-full animate-bounce"
                            style={{
                                left: `${15 + i * 15}%`,
                                top: `${20 + (i % 3) * 25}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${2 + i * 0.5}s`
                            }}
                        ></div>
                    ))}
                </div>

                {/* Logo + Slogan */}
                <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-4">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-white/20 rounded-2xl blur group-hover:bg-white/30 transition-all"></div>
                            <div className="relative h-20 w-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl overflow-hidden">
                                <img src="/oronext-logo.jpg" alt="OroNext" className="w-14 h-14 object-contain drop-shadow-lg" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">OroNext</h1>
                            <p className="text-orange-100/90 text-lg font-medium mt-1 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Ultimate Business Solution
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feature Cards with Stagger Animation */}
                <div className="space-y-3 relative z-10">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/20 hover:scale-[1.02] hover:border-white/30 transition-all duration-300 cursor-default"
                            style={{
                                animation: 'slideInLeft 0.5s ease-out forwards',
                                animationDelay: feature.delay,
                                opacity: 0,
                                transform: 'translateX(-20px)'
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-lg group-hover:text-orange-100 transition-colors">{feature.title}</h3>
                                    <p className="text-orange-100/80 text-sm mt-0.5">{feature.description}</p>
                                </div>
                                <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Benefits */}
                <div className="relative z-10 flex gap-8 mt-8">
                    <div className="text-center">
                        <p className="text-3xl font-black text-white">24/7</p>
                        <p className="text-orange-100/70 text-sm">Support</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-black text-white">Free</p>
                        <p className="text-orange-100/70 text-sm">Setup</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-black text-white">Easy</p>
                        <p className="text-orange-100/70 text-sm">To Use</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-stone-950 relative overflow-hidden">
                {/* Subtle Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-stone-950 to-stone-950"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[80px]"></div>

                <div className="w-full max-w-md relative z-10">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex flex-col items-center gap-3 mb-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-full scale-150"></div>
                            <div className="relative h-20 w-20 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden bg-gradient-to-br from-orange-500 to-amber-500 p-2">
                                <img src="/oronext-logo.jpg" alt="OroNext" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">OroNext</h1>
                        <p className="text-stone-400 text-sm">Ultimate Business Solution</p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-stone-900/50 backdrop-blur-xl rounded-3xl p-8 border border-stone-800/50 shadow-2xl">
                        {/* MFA Verification Step */}
                        {mfaRequired ? (
                            <>
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl mb-4 border border-blue-500/20">
                                        <ShieldCheck className="h-7 w-7 text-blue-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
                                    <p className="mt-2 text-stone-400">
                                        Hi {mfaUserName || 'there'}! Enter the code from your authenticator app
                                    </p>
                                </div>

                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    {/* MFA Code Input */}
                                    <div className="relative">
                                        <label htmlFor="mfa-code" className="block text-sm font-medium text-stone-300 mb-2">
                                            Authentication Code
                                        </label>
                                        <input
                                            id="mfa-code"
                                            name="mfaCode"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            required
                                            maxLength={9}
                                            className="w-full px-4 py-4 bg-stone-900 border-2 border-stone-700 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-stone-500 focus:ring-0 focus:border-blue-500 transition-all duration-200"
                                            placeholder="------"
                                            value={mfaCode}
                                            onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 9))}
                                            autoFocus
                                        />
                                        <p className="text-stone-500 text-xs mt-2 text-center">
                                            Enter 6-digit code or backup code (XXXX-XXXX)
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || mfaCode.length < 6}
                                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="h-5 w-5" />
                                                Verify & Sign In
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetMFA}
                                        className="w-full flex items-center justify-center gap-2 text-stone-400 hover:text-white py-2 transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to login
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl mb-4 border border-orange-500/20">
                                        <span className="text-3xl">👋</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">Welcome back!</h2>
                                    <p className="mt-2 text-stone-400">Sign in to your Oro account</p>
                                </div>

                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    {/* Email Input */}
                                    <div className="relative">
                                        <label htmlFor="email-address" className="block text-sm font-medium text-stone-300 mb-2">
                                            Email address
                                        </label>
                                        <div className="relative">
                                            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${focusedInput === 'email' ? 'text-orange-400' : 'text-stone-500'}`} />
                                            <input
                                                id="email-address"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 bg-stone-900 border-2 border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-0 focus:border-orange-500 transition-all duration-200"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onFocus={() => setFocusedInput('email')}
                                                onBlur={() => setFocusedInput(null)}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div className="relative">
                                        <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${focusedInput === 'password' ? 'text-orange-400' : 'text-stone-500'}`} />
                                            <input
                                                id="password"
                                                name="password"
                                                type="password"
                                                autoComplete="current-password"
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 bg-stone-900 border-2 border-stone-700 rounded-xl text-white placeholder-stone-500 focus:ring-0 focus:border-orange-500 transition-all duration-200"
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onFocus={() => setFocusedInput('password')}
                                                onBlur={() => setFocusedInput(null)}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 group"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                Sign in
                                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Employee PIN Login Section */}
                                <div className="mt-6 pt-6 border-t border-stone-700/50">
                                    {isPairedDevice && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            <p className="text-emerald-400 text-sm font-medium">
                                                Configured POS Device
                                            </p>
                                        </div>
                                    )}
                                    <a
                                        href="/employee-login"
                                        className={`w-full flex items-center justify-center gap-3 font-semibold py-3.5 px-4 rounded-xl transition-all border-2 group ${isPairedDevice
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent hover:shadow-lg hover:shadow-orange-500/25'
                                            : 'bg-stone-800/50 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-700 hover:border-stone-600'
                                            }`}
                                    >
                                        <KeyRound className="h-5 w-5" />
                                        {isPairedDevice ? 'Employee PIN Login (Recommended)' : 'Employee? Use PIN Login'}
                                        <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </a>
                                    {isPairedDevice && (
                                        <p className="text-stone-500 text-xs text-center mt-3">
                                            Owner? Use email login above for dashboard access
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <p className="mt-8 text-center text-sm text-stone-600">
                        © 2024 Oro POS System. All rights reserved.
                    </p>
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    )
}



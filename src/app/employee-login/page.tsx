'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OroLogo from '@/components/ui/OroLogo'
import { Building2, Store, Key, Loader2, Settings, X } from 'lucide-react'

interface TerminalConfig {
    business: { id: string; name: string; industryType: string; logo?: string | null }
    location: { id: string; name: string }
}

export default function EmployeeLoginPage() {
    const [step, setStep] = useState<'LOADING' | 'ENTER_CODE' | 'ENTER_PIN'>('LOADING')
    const [terminalConfig, setTerminalConfig] = useState<TerminalConfig | null>(null)

    // Setup code entry
    const [setupCode, setSetupCode] = useState('')
    const [codeError, setCodeError] = useState('')
    const [validating, setValidating] = useState(false)

    // PIN entry
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Admin unlock for reconfiguring
    const [showAdminUnlock, setShowAdminUnlock] = useState(false)
    const [adminPin, setAdminPin] = useState('')
    const [unlockError, setUnlockError] = useState('')

    const router = useRouter()

    // Check for existing terminal config on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('terminal_config')
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig) as TerminalConfig
                if (config.business && config.location) {
                    setTerminalConfig(config)
                    setStep('ENTER_PIN')
                } else {
                    localStorage.removeItem('terminal_config')
                    setStep('ENTER_CODE')
                }
            } catch {
                localStorage.removeItem('terminal_config')
                setStep('ENTER_CODE')
            }
        } else {
            setStep('ENTER_CODE')
        }
    }, [])

    // Validate setup code
    const handleValidateCode = async () => {
        if (!setupCode.trim()) {
            setCodeError('Please enter a setup code')
            return
        }

        setValidating(true)
        setCodeError('')

        try {
            const res = await fetch('/api/pos/validate-setup-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: setupCode.toUpperCase().trim() })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                const config: TerminalConfig = {
                    business: data.business,
                    location: data.location
                }
                localStorage.setItem('terminal_config', JSON.stringify(config))
                setTerminalConfig(config)
                setStep('ENTER_PIN')
            } else {
                setCodeError(data.error || 'Invalid setup code')
            }
        } catch (err) {
            setCodeError('Failed to validate code')
        } finally {
            setValidating(false)
        }
    }

    // Handle PIN input
    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            const newPin = pin + digit
            setPin(newPin)
            setError('')
            if (newPin.length === 4) {
                handleLogin(newPin)
            }
        }
    }

    const handleClear = () => {
        setPin('')
        setError('')
    }

    const handleBackspace = () => {
        setPin(pin.slice(0, -1))
        setError('')
    }

    // Login with PIN
    const handleLogin = async (pinCode: string) => {
        if (!terminalConfig?.location) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: pinCode,
                    locationId: terminalConfig.location.id
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                const result = await signIn('credentials', {
                    email: data.user.email,
                    password: 'PIN_VERIFIED_' + pinCode,
                    redirect: false
                })

                if (result?.ok) {
                    const industryType = data.user.industryType || terminalConfig.business.industryType || 'RETAIL'
                    if (industryType === 'SERVICE' || industryType === 'SALON') {
                        router.push('/dashboard/pos/salon')
                    } else {
                        router.push('/dashboard/pos/retail')
                    }
                } else {
                    setError('Login failed')
                    setPin('')
                }
            } else {
                setError(data.error || 'Invalid PIN')
                setPin('')
            }
        } catch {
            setError('Login failed')
            setPin('')
        } finally {
            setLoading(false)
        }
    }

    // Admin unlock to reconfigure terminal (requires owner/manager PIN)
    const handleAdminUnlock = async () => {
        if (adminPin.length < 4) {
            setUnlockError('Enter owner or manager PIN')
            return
        }

        try {
            const res = await fetch('/api/pos/verify-owner-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: adminPin })
            })

            const data = await res.json()
            if (data.success) {
                // Clear terminal config and show setup
                localStorage.removeItem('terminal_config')
                setTerminalConfig(null)
                setShowAdminUnlock(false)
                setAdminPin('')
                setStep('ENTER_CODE')
            } else {
                setUnlockError('Invalid admin PIN')
            }
        } catch {
            setUnlockError('Verification failed')
        }
    }

    // Loading state
    if (step === 'LOADING') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    // Step 1: Enter Setup Code
    if (step === 'ENTER_CODE') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="flex justify-center mb-8">
                        <OroLogo className="h-12 w-auto" />
                    </div>

                    <div className="bg-stone-900 rounded-2xl p-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Key className="h-5 w-5 text-orange-400" />
                            <h1 className="text-xl font-bold">Terminal Setup</h1>
                        </div>
                        <p className="text-stone-400 text-center text-sm mb-6">
                            Enter the setup code provided by your business owner
                        </p>

                        <input
                            type="text"
                            value={setupCode}
                            onChange={(e) => {
                                setSetupCode(e.target.value.toUpperCase())
                                setCodeError('')
                            }}
                            placeholder="e.g. MIKE-1234"
                            className="w-full px-4 py-4 bg-stone-800 border border-stone-700 rounded-xl text-white text-center text-xl font-mono tracking-widest placeholder:text-stone-600 placeholder:text-base placeholder:tracking-normal focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleValidateCode()
                            }}
                        />

                        {codeError && (
                            <p className="text-red-400 text-sm text-center mt-3">{codeError}</p>
                        )}

                        <button
                            onClick={handleValidateCode}
                            disabled={validating || !setupCode.trim()}
                            className="w-full mt-4 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:text-stone-500 rounded-xl font-bold transition-colors"
                        >
                            {validating ? 'Validating...' : 'Pair Terminal'}
                        </button>

                        <p className="text-stone-500 text-xs text-center mt-4">
                            Contact your business owner for the setup code
                        </p>
                    </div>

                    <div className="mt-8 text-center">
                        <a href="/login" className="text-stone-500 text-sm hover:text-stone-400">
                            Owner/Admin Login →
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Step 2: Enter PIN (terminal is configured)
    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Show store logo if available, otherwise show ORO logo */}
                <div className="flex justify-center mb-8">
                    {terminalConfig?.business.logo ? (
                        <img
                            src={terminalConfig.business.logo}
                            alt={terminalConfig.business.name}
                            className="h-16 w-auto object-contain max-w-[200px]"
                        />
                    ) : (
                        <OroLogo className="h-12 w-auto" />
                    )}
                </div>

                {/* Terminal Info */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-orange-400" />
                        <div>
                            <p className="text-sm font-medium text-white">{terminalConfig?.business.name}</p>
                            <p className="text-xs text-stone-500">{terminalConfig?.location.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAdminUnlock(true)}
                        className="p-2 text-stone-500 hover:text-orange-400 rounded-lg hover:bg-stone-800"
                        title="Reconfigure Terminal"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                </div>

                <div className="bg-stone-900 rounded-2xl p-6 mb-6">
                    <h1 className="text-xl font-bold text-center mb-6">Enter Your PIN</h1>

                    <div className="flex justify-center gap-4 mb-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-5 h-5 rounded-full border-2 transition-colors ${pin.length > i
                                    ? 'bg-orange-500 border-orange-500'
                                    : 'border-stone-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
                    {loading && <p className="text-stone-400 text-center text-sm mb-4">Logging in...</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                if (key === 'C') handleClear()
                                else if (key === '⌫') handleBackspace()
                                else handlePinInput(key)
                            }}
                            disabled={loading}
                            className={`h-16 rounded-xl text-2xl font-bold transition-colors ${key === 'C'
                                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                : key === '⌫'
                                    ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                    : 'bg-stone-800 text-white hover:bg-stone-700'
                                } disabled:opacity-50`}
                        >
                            {key}
                        </button>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <a href="/login" className="text-stone-500 text-sm hover:text-stone-400">
                        Owner/Admin Login →
                    </a>
                </div>
            </div>

            {/* Admin Unlock Modal */}
            {showAdminUnlock && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Reconfigure Terminal</h2>
                            <button onClick={() => { setShowAdminUnlock(false); setAdminPin(''); setUnlockError('') }} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>
                        <p className="text-stone-400 text-sm mb-4">
                            Enter owner or manager PIN to change terminal settings
                        </p>
                        <input
                            type="password"
                            value={adminPin}
                            onChange={(e) => {
                                setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                                setUnlockError('')
                            }}
                            placeholder="Admin PIN"
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white text-center text-xl font-mono tracking-widest focus:border-orange-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAdminUnlock() }}
                        />
                        {unlockError && <p className="text-red-400 text-sm text-center mt-2">{unlockError}</p>}
                        <button
                            onClick={handleAdminUnlock}
                            className="w-full mt-4 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold"
                        >
                            Unlock & Reconfigure
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}


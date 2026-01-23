'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OroLogo from '@/components/ui/OroLogo'
import EmployeeTiles from '@/components/pos/EmployeeTiles'
import { DeviceTrust } from '@/lib/device-trust'
import { Building2, ArrowLeft, Key, Loader2, Settings, X } from 'lucide-react'

interface TerminalConfig {
    business: { id: string; name: string; industryType: string; logo?: string | null }
    location: { id: string; name: string }
    station?: { id: string; name: string; pairingCode: string; paymentMode?: string }
}

export default function EmployeeLoginPage() {
    const [step, setStep] = useState<'LOADING' | 'ENTER_CODE' | 'SELECT_EMPLOYEE' | 'ENTER_PIN' | 'RESTORING'>('LOADING')
    const [terminalConfig, setTerminalConfig] = useState<TerminalConfig | null>(null)

    // Selected employee for PIN entry
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null)

    // Station code entry
    const [stationCode, setStationCode] = useState('')
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
        const attemptRestore = async () => {
            const savedConfig = localStorage.getItem('terminal_config')

            // 1. If we have config, we assume we are good (Normal Flow)
            if (savedConfig) {
                try {
                    const config = JSON.parse(savedConfig) as TerminalConfig
                    if (config.business && config.location) {
                        setTerminalConfig(config)
                        setStep('SELECT_EMPLOYEE') // Show employee tiles first
                        return
                    }
                } catch {
                    localStorage.removeItem('terminal_config')
                }
            }

            // If NO config (Cookies cleared?), try "Cockroach" Restore
            setStep('RESTORING')

            try {
                // Ensure we have a Device ID (make one if needed)
                const deviceId = await DeviceTrust.getDeviceId()
                if (!deviceId) throw new Error('No device ID')

                // Try to restore from server
                const res = await fetch('/api/auth/restore-device', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceId })
                })

                const data = await res.json()

                if (res.ok && data.restored && data.loginToken) {
                    // Auto-login to restore session cookie
                    const result = await signIn('credentials', {
                        password: data.loginToken, // Special token
                        redirect: false
                    })

                    if (result?.ok && data.config) {
                        // Restore the UI config
                        localStorage.setItem('terminal_config', JSON.stringify(data.config))
                        if (data.stationId) localStorage.setItem('station_id', data.stationId)

                        setTerminalConfig(data.config)
                        setStep('SELECT_EMPLOYEE') // Show employee tiles
                        return
                    }
                }
            } catch {
                // Device trust restore failed, falling back to pairing code
            }

            // 3. Fallback to Pairing Code
            setStep('ENTER_CODE')
        }

        attemptRestore()
    }, [])

    // Validate setup code
    const handleValidateCode = async () => {
        if (!stationCode.trim()) {
            setCodeError('Please enter a station code')
            return
        }

        setValidating(true)
        setCodeError('')

        try {
            // Attempt to get Device ID, but don't block login if it fails (e.g. private mode / basic browser)
            let deviceId = undefined
            try {
                deviceId = await DeviceTrust.getDeviceId()
            } catch {
                // Private mode or basic browser - continue without device ID
            }

            const res = await fetch('/api/pos/validate-setup-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: stationCode.toUpperCase().trim(),
                    deviceId,
                    meta: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        deviceName: `Browser (${navigator.platform})`
                    }
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                const config: TerminalConfig = {
                    business: data.business,
                    location: data.location,
                    station: data.station
                }
                localStorage.setItem('terminal_config', JSON.stringify(config))
                // Store station ID separately for quick access
                if (data.station?.id) {
                    localStorage.setItem('station_id', data.station.id)
                }
                // CRITICAL: Store stationToken for PIN login (required for security)
                if (data.stationToken) {
                    localStorage.setItem('station_token', data.stationToken)
                }
                setTerminalConfig(config)
                setStep('SELECT_EMPLOYEE') // Show employee tiles
            } else {
                // Show detailed error if available
                const detailedError = data.error ? `${data.error} (${res.status})` : `Invalid code (${res.status})`
                setCodeError(detailedError)
            }
        } catch (err) {
            console.error('Validation Error:', err)
            setCodeError('Connection failed. Please try again.')
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
            // Get stationToken from localStorage (required for security)
            const stationToken = localStorage.getItem('station_token')
            const deviceId = localStorage.getItem('device_id') // From device-trust

            const res = await fetch('/api/auth/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: pinCode,
                    stationToken,   // Server derives locationId from this
                    deviceId,       // For fingerprint verification
                    employeeId: selectedEmployee?.id // For targeted PIN verification
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
                // Clear terminal config and station ID, then show setup
                localStorage.removeItem('terminal_config')
                localStorage.removeItem('station_id')
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
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-stone-500 text-sm">Loading configuration...</p>
            </div>
        )
    }

    if (step === 'RESTORING') {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-stone-500 text-sm font-medium">Restoring secure connection...</p>
                <div className="w-48 h-1 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 animate-[shimmer_1s_infinite] w-full origin-left" />
                </div>
            </div>
        )
    }

    // Step 1: Enter Setup Code
    if (step === 'ENTER_CODE') {
        const handleKeyPress = (key: string) => {
            if (key === '⌫') {
                setStationCode(prev => prev.slice(0, -1))
            } else if (key === 'C') {
                setStationCode('')
            } else if (stationCode.length < 8) {
                setStationCode(prev => prev + key)
            }
            setCodeError('')
        }

        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-6">
                        <OroLogo className="h-10 w-auto" />
                    </div>

                    <div className="bg-stone-900 rounded-2xl p-5">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Key className="h-5 w-5 text-orange-400" />
                            <h1 className="text-lg font-bold">Terminal Setup</h1>
                        </div>
                        <p className="text-stone-400 text-center text-xs mb-4">
                            Enter the station code from your business owner
                        </p>

                        {/* Code Display */}
                        <div className="bg-stone-800 border-2 border-orange-500/50 rounded-xl px-4 py-4 mb-4">
                            <p className="text-white text-center text-2xl font-mono tracking-[0.3em] min-h-[1.5em]">
                                {stationCode || <span className="text-stone-600">------</span>}
                            </p>
                        </div>

                        {codeError && (
                            <p className="text-red-400 text-sm text-center mb-3">{codeError}</p>
                        )}

                        {/* Alphanumeric Keypad */}
                        <div className="grid grid-cols-6 gap-2 mb-4">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeyPress(key)}
                                    className="h-12 rounded-lg bg-stone-800 text-white text-lg font-bold hover:bg-stone-700 active:bg-stone-600 transition-colors border border-stone-700"
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        {/* Bottom Row: Clear and Backspace */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => handleKeyPress('C')}
                                disabled={!stationCode}
                                className="h-12 rounded-lg bg-red-600/20 text-red-400 font-bold hover:bg-red-600/30 transition-colors border border-red-600/30 disabled:opacity-30"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeyPress('⌫')}
                                disabled={!stationCode}
                                className="h-12 rounded-lg bg-stone-800 text-amber-400 font-bold hover:bg-stone-700 transition-colors border border-stone-700 disabled:opacity-30"
                            >
                                ⌫ Delete
                            </button>
                        </div>

                        <button
                            onClick={handleValidateCode}
                            disabled={validating || !stationCode.trim()}
                            className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:text-stone-500 rounded-xl font-bold transition-colors"
                        >
                            {validating ? 'Validating...' : 'Pair Terminal'}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <a href="/login" className="text-stone-500 text-sm hover:text-stone-400">
                            Owner/Admin Login →
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Step 2: Select Employee (tap to continue to PIN entry)
    if (step === 'SELECT_EMPLOYEE') {
        const stationToken = typeof window !== 'undefined' ? localStorage.getItem('station_token') : null

        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    {/* Header with store info and settings */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            {terminalConfig?.business.logo ? (
                                <img
                                    src={terminalConfig.business.logo}
                                    alt={terminalConfig.business.name}
                                    className="h-10 w-auto object-contain"
                                />
                            ) : (
                                <OroLogo className="h-8 w-auto" />
                            )}
                            <div>
                                <p className="text-white font-medium">{terminalConfig?.business.name}</p>
                                <p className="text-stone-500 text-sm">
                                    {terminalConfig?.location.name}
                                    {terminalConfig?.station && ` • ${terminalConfig.station.name}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAdminUnlock(true)}
                            className="p-2 text-stone-500 hover:text-orange-400 rounded-lg hover:bg-stone-800"
                            title="Reconfigure Terminal"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Employee Tiles */}
                    <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6">
                        <h1 className="text-2xl font-bold text-white text-center mb-2">
                            Who's clocking in?
                        </h1>

                        <EmployeeTiles
                            stationToken={stationToken}
                            onEmployeeSelect={(employee) => {
                                setSelectedEmployee(employee)
                                setStep('ENTER_PIN')
                            }}
                            isLoading={loading}
                        />
                    </div>

                    <div className="mt-6 text-center">
                        <a href="/login" className="text-stone-500 text-sm hover:text-stone-400">
                            Owner/Admin Login →
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Step 3: Enter PIN for selected employee
    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Back button and selected employee */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => {
                            setSelectedEmployee(null)
                            setPin('')
                            setError('')
                            setStep('SELECT_EMPLOYEE')
                        }}
                        className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <p className="text-white font-medium">
                            {selectedEmployee?.name || 'Employee'}
                        </p>
                        <p className="text-stone-500 text-sm">Enter your PIN</p>
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


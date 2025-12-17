'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OronexLogo from '@/components/ui/OronexLogo'
import { Building2, Store, ChevronRight, Loader2 } from 'lucide-react'

interface Business {
    id: string
    name: string
    industryType: string
    locations: { id: string, name: string }[]
}

export default function EmployeeLoginPage() {
    const [step, setStep] = useState<'SELECT_BUSINESS' | 'ENTER_PIN'>('SELECT_BUSINESS')
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
    const [selectedLocation, setSelectedLocation] = useState<{ id: string, name: string } | null>(null)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingBusinesses, setLoadingBusinesses] = useState(true)
    const router = useRouter()

    // Load businesses on mount
    useEffect(() => {
        loadBusinesses()

        // Check if terminal is already configured (stored in localStorage)
        const savedConfig = localStorage.getItem('terminal_config')
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig)
                setSelectedBusiness(config.business)
                setSelectedLocation(config.location)
                setStep('ENTER_PIN')
            } catch (e) {
                localStorage.removeItem('terminal_config')
            }
        }
    }, [])

    const loadBusinesses = async () => {
        try {
            const res = await fetch('/api/pos/businesses')
            if (res.ok) {
                const data = await res.json()
                setBusinesses(data.businesses || [])
            }
        } catch (error) {
            console.error('Error loading businesses:', error)
        } finally {
            setLoadingBusinesses(false)
        }
    }

    const handleSelectBusiness = (business: Business) => {
        setSelectedBusiness(business)
        // If only one location, auto-select it
        if (business.locations.length === 1) {
            handleSelectLocation(business, business.locations[0])
        }
    }

    const handleSelectLocation = (business: Business, location: { id: string, name: string }) => {
        setSelectedLocation(location)
        // Save terminal config
        localStorage.setItem('terminal_config', JSON.stringify({
            business: { id: business.id, name: business.name, industryType: business.industryType },
            location
        }))
        setStep('ENTER_PIN')
    }

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

    const handleChangeTerminal = () => {
        localStorage.removeItem('terminal_config')
        setSelectedBusiness(null)
        setSelectedLocation(null)
        setStep('SELECT_BUSINESS')
        setPin('')
        setError('')
    }

    const handleLogin = async (pinCode: string) => {
        if (!selectedLocation) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/pin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: pinCode,
                    locationId: selectedLocation.id  // Only search this location
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
                    const industryType = data.user.industryType || selectedBusiness?.industryType || 'RETAIL'
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
        } catch (error) {
            console.error('Login error:', error)
            setError('Login failed')
            setPin('')
        } finally {
            setLoading(false)
        }
    }

    // Step 1: Select Business/Location
    if (step === 'SELECT_BUSINESS') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <div className="flex justify-center mb-8">
                        <OronexLogo className="h-12 w-auto" />
                    </div>

                    <div className="bg-stone-900 rounded-2xl p-6">
                        <h1 className="text-xl font-bold text-center mb-2">Terminal Setup</h1>
                        <p className="text-stone-400 text-center text-sm mb-6">
                            Select which business this terminal belongs to
                        </p>

                        {loadingBusinesses ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                        ) : businesses.length === 0 ? (
                            <div className="text-center py-8 text-stone-400">
                                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No businesses found</p>
                                <p className="text-sm mt-2">Ask your administrator to set up the system</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {businesses.map((business) => (
                                    <div key={business.id}>
                                        {/* If business has multiple locations, show expandable */}
                                        {business.locations.length > 1 ? (
                                            <div className="bg-stone-800 rounded-xl overflow-hidden">
                                                <button
                                                    onClick={() => handleSelectBusiness(business)}
                                                    className={`w-full flex items-center gap-4 p-4 hover:bg-stone-700 transition-colors text-left ${selectedBusiness?.id === business.id ? 'bg-stone-700' : ''}`}
                                                >
                                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                                                        <Building2 className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-white">{business.name}</p>
                                                        <p className="text-sm text-stone-400">{business.industryType} • {business.locations.length} locations</p>
                                                    </div>
                                                    <ChevronRight className={`h-5 w-5 text-stone-400 transition-transform ${selectedBusiness?.id === business.id ? 'rotate-90' : ''}`} />
                                                </button>
                                                {selectedBusiness?.id === business.id && (
                                                    <div className="border-t border-stone-700 p-2 space-y-1">
                                                        {business.locations.map((loc) => (
                                                            <button
                                                                key={loc.id}
                                                                onClick={() => handleSelectLocation(business, loc)}
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-stone-600 rounded-lg text-left"
                                                            >
                                                                <Store className="h-4 w-4 text-stone-400" />
                                                                <span className="text-stone-200">{loc.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleSelectBusiness(business)}
                                                className="w-full flex items-center gap-4 p-4 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors text-left"
                                            >
                                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                                                    <Building2 className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-white">{business.name}</p>
                                                    <p className="text-sm text-stone-400">{business.industryType}</p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-stone-400" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
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

    // Step 2: Enter PIN
    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex justify-center mb-8">
                    <OronexLogo className="h-12 w-auto" />
                </div>

                {/* Terminal Info */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-orange-400" />
                        <div>
                            <p className="text-sm font-medium text-white">{selectedBusiness?.name}</p>
                            <p className="text-xs text-stone-500">{selectedLocation?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleChangeTerminal}
                        className="text-xs text-stone-500 hover:text-orange-400"
                    >
                        Change
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
        </div>
    )
}


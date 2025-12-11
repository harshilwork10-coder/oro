'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
    CheckCircle, XCircle, Lock, Loader2, ArrowRight, CheckSquare,
    Building2, User, FileText, Upload, CreditCard, ChevronRight, ChevronLeft,
    Quote, Star, ShieldCheck, Zap, Globe, Eye, EyeOff, Palette, Phone
} from 'lucide-react'
import OronexLogo from '@/components/ui/OronexLogo'

export default function MagicLinkPage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter()
    const unwrappedParams = use(params)
    const token = unwrappedParams.token

    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'completed' | 'success'>('loading')
    const [step, setStep] = useState<'identity' | 'security' | 'processing'>('identity')
    const [error, setError] = useState('')
    const [user, setUser] = useState<{ id: string, name: string, email: string } | null>(null)
    const [franchisor, setFranchisor] = useState<{ name: string, supportFee: string, type?: string, businessType?: string } | null>(null)
    const [franchise, setFranchise] = useState<{ id: string, name: string } | null>(null)

    // Form Data
    const [formData, setFormData] = useState({
        // Identity
        storeName: '', storeAddress: '', storePhone: '',
        ownerName: '', ownerAddress: '',
        businessType: 'SINGLE_LOCATION',
        industryType: '',

        // Security
        password: '', confirmPassword: '',

        // Processing
        ssn: '', fein: '',
        routingNumber: '', accountNumber: '',
        needToDiscussProcessing: false,

        // Documents
        dl: null as File | { name: string, s3Key: string, uploaded: boolean } | null,
        voidedCheck: null as File | { name: string, s3Key: string, uploaded: boolean } | null,
        feinLetter: null as File | { name: string, s3Key: string, uploaded: boolean } | null,

        // Branding
        brandColorPrimary: '#9333ea', // Default purple
    })

    const [showPassword, setShowPassword] = useState(false)
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const validated = useRef(false)

    useEffect(() => {
        if (!validated.current && token) {
            validated.current = true
            validateToken()
        }
    }, [token])

    const validateToken = async () => {
        try {
            const res = await fetch(`/api/auth/magic-link/${token}`)
            const data = await res.json()

            if (res.ok) {
                if (data.completed) {
                    setStatus('completed')
                } else {
                    setUser(data.user)
                    setFranchisor(data.franchisor || { name: 'Your Business', supportFee: '99.00', type: 'BRAND', businessType: 'MULTI_LOCATION_OWNER' })
                    if (data.franchise) {
                        setFranchise(data.franchise)
                    }
                    setStatus('valid')
                    // Pre-fill known data
                    setFormData(prev => ({
                        ...prev,
                        ownerName: data.user.name || '',
                        email: data.user.email || '',
                        businessType: data.franchisor?.businessType || 'MULTI_LOCATION_OWNER',
                        storeName: data.franchise?.name || '', // Pre-fill for Franchisee
                    }))
                }
            } else {
                if (data.completed) {
                    setStatus('completed')
                } else {
                    setError(data.error || 'Invalid or expired link')
                    setStatus('invalid')
                }
            }
        } catch (err) {
            setError('An error occurred while validating the link')
            setStatus('invalid')
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        let formattedValue = value

        // Phone number: only digits, max 10
        if (name === 'storePhone') {
            formattedValue = value.replace(/\D/g, '').slice(0, 10)
        }
        // SSN: only digits, max 9
        else if (name === 'ssn') {
            formattedValue = value.replace(/\D/g, '').slice(0, 9)
        }
        // FEIN: only digits and dash, max 10 chars (XX-XXXXXXX)
        else if (name === 'fein') {
            const digits = value.replace(/\D/g, '')
            if (digits.length <= 2) formattedValue = digits
            else formattedValue = `${digits.slice(0, 2)}-${digits.slice(2, 9)}`
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }))
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            try {
                const uploadFormData = new FormData()
                uploadFormData.append('file', file)
                uploadFormData.append('userId', user?.id || 'temp')
                uploadFormData.append('documentType', field)

                // Use onboarding-specific upload endpoint
                const response = await fetch('/api/upload/onboarding', { method: 'POST', body: uploadFormData })
                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Upload failed')
                }
                const data = await response.json()

                setFormData(prev => ({
                    ...prev,
                    [field]: { name: data.fileName, s3Key: data.s3Key, uploaded: true }
                }))
            } catch (error: any) {
                console.error('Error uploading file:', error)
                setError(`Failed to upload ${field}: ${error.message}`)
            }
        }
    }

    const nextStep = () => {
        setError('')
        if (step === 'identity') {
            if (!formData.storeName || !formData.storeAddress || !formData.ownerName) return setError('Please fill in all required fields.')
            if (!acceptedTerms) return setError('Please accept the terms.')
            setStep('security')
        } else if (step === 'security') {
            if (formData.password.length < 8) return setError('Password must be at least 8 characters.')
            if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.')
            setStep('processing')
        } else if (step === 'processing') {
            if (!formData.needToDiscussProcessing) {
                if (!formData.ssn && !formData.fein) return setError('Please provide SSN or FEIN.')
                // Ideally check for docs too, but we can be lenient or strict. Let's be strict-ish.
                if (!formData.voidedCheck || !formData.dl) return setError('Please upload required documents or select "I need help".')
            }
            // setStep('branding') -> Removed, now we are done or show completion button
        }
    }

    const prevStep = () => {
        setError('')
        if (step === 'security') setStep('identity')
        else if (step === 'processing') setStep('security')
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setError('')

        try {
            const res = await fetch('/api/auth/onboarding/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    userId: user?.id,
                    password: formData.password,
                    acceptedTerms: true,
                    formData: {
                        ...formData,
                        // Extract S3 keys
                        dl: (formData.dl as any)?.s3Key || null,
                        voidedCheck: (formData.voidedCheck as any)?.s3Key || null,
                        feinLetter: (formData.feinLetter as any)?.s3Key || null,
                    }
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to complete onboarding')
            }

            // Login
            const result = await signIn('credentials', {
                email: user?.email,
                password: formData.password,
                redirect: false
            })

            if (result?.error) throw new Error('Login failed')

            setStatus('success')
            setTimeout(() => router.push('/auth/pending-approval'), 2000)

        } catch (err: any) {
            console.error('Onboarding error:', err)
            setError(err.message || 'An error occurred')
            setSubmitting(false)
        }
    }

    if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>

    if (status === 'success') return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
            <div className="text-center">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-stone-900">All Set!</h2>
                <p className="text-stone-600">Redirecting you to your status page...</p>
            </div>
        </div>
    )

    const isFranchisee = (user as any)?.role === 'FRANCHISEE'

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-stone-50">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-xl mx-auto w-full">
                    <div className="mb-8">
                        <img src="/Oronex-logo.png" alt="Oronex" className="h-24 object-contain" />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-stone-900 mb-2">Welcome, {user?.name}!</h1>
                        <p className="text-stone-500">Let's get your {isFranchisee ? 'location' : 'business'} set up in 4 simple steps.</p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-8">
                        {['identity', 'security', 'processing'].map((s, i) => {
                            const isActive = s === step
                            const isCompleted = ['identity', 'security', 'processing'].indexOf(step) > i
                            return (
                                <div key={s} className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-purple-600 w-full' : isActive ? 'bg-purple-600 w-1/2' : 'w-0'}`} />
                                </div>
                            )
                        })}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                            <XCircle className="h-4 w-4" /> {error}
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 lg:p-8">

                        {/* STEP 1: IDENTITY */}
                        {step === 'identity' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-purple-600" /> {isFranchisee ? 'Location Details' : 'Business Identity'}
                                </h2>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{isFranchisee ? 'Location Name' : 'Business Name'}</label>
                                        <input name="storeName" value={formData.storeName} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-stone-900" placeholder={isFranchisee ? "e.g. Downtown Location" : "e.g. Downtown Bakery"} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{isFranchisee ? 'Location Address' : 'Business Address'}</label>
                                        <input name="storeAddress" value={formData.storeAddress} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-stone-900" placeholder="123 Main St" />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-stone-100">
                                    <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200">
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-purple-600 border-purple-600' : 'border-stone-300'}`}>
                                            {acceptedTerms && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} />
                                        <span className="text-sm text-stone-600 font-medium">I agree to the Terms of Service and Privacy Policy.</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: SECURITY */}
                        {step === 'security' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-rose-600" /> Set Password
                                </h2>
                                <p className="text-sm text-stone-500">Create a secure password to access your dashboard.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-stone-900"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-stone-900"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-sm text-purple-600 font-medium">
                                        {showPassword ? "Hide Passwords" : "Show Passwords"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PROCESSING */}
                        {step === 'processing' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-emerald-600" /> Processing Setup
                                </h2>

                                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl mb-6">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.needToDiscussProcessing ? 'bg-purple-600 border-purple-600' : 'border-stone-300 bg-white'}`}>
                                            {formData.needToDiscussProcessing && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={formData.needToDiscussProcessing} onChange={e => setFormData(prev => ({ ...prev, needToDiscussProcessing: e.target.checked }))} />
                                        <span className="font-medium text-purple-900">I need help / Let's discuss rates first</span>
                                    </label>
                                </div>

                                {!formData.needToDiscussProcessing ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">SSN</label>
                                                <input name="ssn" value={formData.ssn} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-stone-900" placeholder="XXX-XX-XXXX" maxLength={9} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">FEIN</label>
                                                <input name="fein" value={formData.fein} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-stone-900" placeholder="XX-XXXXXXX" maxLength={10} />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-stone-900">Required Documents</p>
                                            {[
                                                { id: 'voidedCheck', label: "Voided Check" },
                                                { id: 'dl', label: "Driver's License" },
                                                { id: 'feinLetter', label: "FEIN Letter" }
                                            ].map(doc => (
                                                <div key={doc.id} className="border border-stone-200 rounded-xl p-3 flex items-center justify-between bg-white">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-stone-100 rounded-lg flex items-center justify-center">
                                                            <Upload className="h-4 w-4 text-stone-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-stone-900">{doc.label}</p>
                                                            {/* @ts-ignore */}
                                                            {formData[doc.id]?.uploaded && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Uploaded</p>}
                                                        </div>
                                                    </div>
                                                    <label className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                                                        Choose
                                                        <input type="file" className="hidden" onChange={(e) => handleFileChange(e, doc.id)} />
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-stone-500">
                                        <Phone className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                                        <p>No problem! An onboarding specialist will contact you shortly to assist with processing setup.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex gap-4 mt-8 pt-6 border-t border-stone-100">
                            {step !== 'identity' && (
                                <button onClick={prevStep} className="px-6 py-3 border border-stone-200 rounded-xl font-medium hover:bg-stone-50 transition-colors flex items-center gap-2 text-stone-600">
                                    <ChevronLeft className="h-4 w-4" /> Back
                                </button>
                            )}

                            {step === 'processing' ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Complete Setup <ArrowRight className="h-5 w-5" /></>}
                                </button>
                            ) : (
                                <button onClick={nextStep} className="flex-1 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all font-medium flex items-center justify-center gap-2">
                                    Continue <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Right Side - Marketing */}
            <div className="hidden lg:flex w-1/2 bg-stone-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold leading-tight mb-6">
                        Powering the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Future</span> of Business.
                    </h1>
                    <p className="text-xl text-stone-400">Setup your account in minutes and start scaling.</p>
                </div>
            </div>
        </div>
    )
}

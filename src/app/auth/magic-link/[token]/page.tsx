'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import {
    CheckCircle, XCircle, Lock, Loader2, ArrowRight, CheckSquare,
    Building2, User, FileText, Upload, CreditCard, ChevronRight, ChevronLeft,
    Quote, Star, ShieldCheck, Zap, Globe, Eye, EyeOff
} from 'lucide-react'
import BreadLogo from '@/components/ui/BreadLogo'

export default function MagicLinkPage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter()
    const unwrappedParams = use(params)
    const token = unwrappedParams.token

    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'completed' | 'success'>('loading')
    const [step, setStep] = useState<'contract' | 'businessType' | 'business' | 'tax' | 'processing' | 'documents' | 'password'>('contract')
    const [error, setError] = useState('')
    const [user, setUser] = useState<{ id: string, name: string, email: string } | null>(null)
    const [franchisor, setFranchisor] = useState<{ name: string, supportFee: string, type?: string } | null>(null)

    // Form Data
    const [formData, setFormData] = useState({
        // Business Type
        businessType: 'MULTI_LOCATION_OWNER', // Default
        // Business Info
        storeName: '', storeAddress: '', storePhone: '',
        corpName: '', corpAddress: '',
        ownerName: '', ownerAddress: '',
        // Tax Info
        ssn: '', fein: '', ss4: '', ebt: '',
        // Processing
        processingType: 'CUSTOMER_CHARGE', // Default recommended
        needToDiscussProcessing: false,
        // Documents
        documentsLater: false,
        dl: null as File | { name: string, s3Key: string, uploaded: boolean } | null,
        voidedCheck: null as File | { name: string, s3Key: string, uploaded: boolean } | null,
        feinLetter: null as File | { name: string, s3Key: string, uploaded: boolean } | null,
        businessLicense: null as File | { name: string, s3Key: string, uploaded: boolean } | null
    })

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
                    setFranchisor(data.franchisor || { name: 'Your Business', supportFee: '99.00', type: 'BRAND' })
                    setStatus('valid')
                    // Pre-fill known data
                    setFormData(prev => ({
                        ...prev,
                        ownerName: data.user.name || '',
                        email: data.user.email || ''
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        // SS4: only digits, max 10
        else if (name === 'ss4') {
            formattedValue = value.replace(/\D/g, '').slice(0, 10)
        }
        // EBT: only alphanumeric, max 20
        else if (name === 'ebt') {
            formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }))
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]

            // Store the file object temporarily
            setFormData(prev => ({ ...prev, [field]: file }))

            // Upload to S3 immediately
            try {
                const uploadFormData = new FormData()
                uploadFormData.append('file', file)
                uploadFormData.append('franchisorId', user?.id || 'temp')
                uploadFormData.append('documentType', field)

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData
                })

                if (!response.ok) {
                    throw new Error('Upload failed')
                }

                const data = await response.json()

                // Store S3 key instead of file object
                setFormData(prev => ({
                    ...prev,
                    [field]: {
                        name: data.fileName,
                        s3Key: data.s3Key,
                        uploaded: true
                    }
                }))

                console.log(`${field} uploaded to S3:`, data.s3Key)

            } catch (error) {
                console.error('Error uploading file:', error)
                setError(`Failed to upload ${field}. Please try again.`)
                // Revert to null on error
                setFormData(prev => ({ ...prev, [field]: null }))
            }
        }
    }

    const nextStep = () => {
        setError('')
        if (step === 'contract') {
            if (!acceptedTerms) return setError('Please accept the terms.')
            setStep('businessType')
        } else if (step === 'businessType') {
            setStep('business')
        } else if (step === 'business') {
            if (!formData.storeName || !formData.storeAddress || !formData.ownerName) {
                return setError('Please fill in all required fields.')
            }
            if (formData.storePhone && formData.storePhone.length !== 10) {
                return setError('Phone number must be exactly 10 digits.')
            }
            setStep('tax')
        } else if (step === 'tax') {
            if (!formData.ssn && !formData.fein) {
                return setError('Please provide SSN or FEIN.')
            }
            if (formData.ssn && formData.ssn.length !== 9) {
                return setError('SSN must be exactly 9 digits.')
            }
            if (formData.fein && formData.fein.replace('-', '').length !== 9) {
                return setError('FEIN must be exactly 9 digits.')
            }
            setStep('processing')
        } else if (step === 'processing') {
            setStep('documents')
        } else if (step === 'documents') {
            if (!formData.documentsLater && (!formData.dl || !formData.voidedCheck)) {
                return setError('Please upload required documents or select "I will provide later".')
            }
            setStep('password')
        }
    }

    const prevStep = () => {
        setError('')
        if (step === 'businessType') setStep('contract')
        else if (step === 'business') setStep('businessType')
        else if (step === 'tax') setStep('business')
        else if (step === 'processing') setStep('tax')
        else if (step === 'documents') setStep('processing')
        else if (step === 'password') setStep('documents')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) return setError('Passwords do not match')
        if (password.length < 8) return setError('Password must be at least 8 characters')

        setSubmitting(true)
        setError('')

        try {
            await new Promise(resolve => setTimeout(resolve, 1000))

            const res = await fetch('/api/auth/onboarding/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    userId: user?.id,
                    password,
                    acceptedTerms: true,
                    formData: {
                        ...formData,
                        businessType: formData.businessType,
                        // Send S3 keys for documents
                        dl: (formData.dl as any)?.s3Key || null,
                        voidedCheck: (formData.voidedCheck as any)?.s3Key || null,
                        feinLetter: (formData.feinLetter as any)?.s3Key || null,
                        businessLicense: (formData.businessLicense as any)?.s3Key || null
                    }
                })
            })

            console.log('API Response status:', res.status)

            if (!res.ok) {
                const data = await res.json()
                console.error('API Error:', data)
                throw new Error(data.error || 'Failed to complete onboarding')
            }

            console.log('Onboarding complete, attempting login...')

            const result = await signIn('credentials', {
                email: user?.email,
                password,
                redirect: false
            })

            if (result?.error) {
                console.error('Login error:', result.error)
                throw new Error('Login failed')
            }

            console.log('Login successful!')
            setStatus('success')
            setTimeout(() => router.push('/dashboard'), 2000)

        } catch (err: any) {
            console.error('Onboarding error:', err)
            setError(err.message || 'An error occurred')
            setSubmitting(false)
        }
    }

    const isIndividual = franchisor?.type === 'INDIVIDUAL'

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-stone-600 font-medium">Preparing your secure experience...</p>
                </div>
            </div>
        )
    }

    if (status === 'completed' || status === 'invalid' || status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-stone-100">
                    <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'completed' ? 'bg-blue-100 text-blue-600' :
                        status === 'invalid' ? 'bg-red-100 text-red-600' :
                            'bg-emerald-100 text-emerald-600'
                        }`}>
                        {status === 'completed' ? <CheckCircle className="h-8 w-8" /> :
                            status === 'invalid' ? <XCircle className="h-8 w-8" /> :
                                <CheckCircle className="h-8 w-8" />}
                    </div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">
                        {status === 'completed' ? 'Already Completed' :
                            status === 'invalid' ? 'Invalid Link' :
                                'All Set!'}
                    </h2>
                    <p className="text-stone-600 mb-6">
                        {status === 'completed' ? 'All required documents and procedures have been completed for this invite.' :
                            status === 'invalid' ? error :
                                'Your account is ready. Redirecting to dashboard...'}
                    </p>
                    {status !== 'success' && (
                        <button onClick={() => router.push('/login')} className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium">
                            Go to Login
                        </button>
                    )}
                    {status === 'success' && <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto" />}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-stone-50">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-xl mx-auto w-full">
                    <div className="mb-8">
                        <BreadLogo size={60} />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-stone-900 mb-2">Welcome, {user?.name}!</h1>
                        <p className="text-stone-500">
                            {isIndividual ? "Let's get your business set up for success." : "Let's get your franchise set up for success."}
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mb-8">
                        {['contract', 'businessType', 'business', 'tax', 'processing', 'documents', 'password'].map((s, i) => {
                            const isActive = s === step
                            const isCompleted = ['contract', 'businessType', 'business', 'tax', 'processing', 'documents', 'password'].indexOf(step) > i
                            return (
                                <div key={s} className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-purple-600 w-full' :
                                        isActive ? 'bg-purple-600 w-1/2' : 'w-0'
                                        }`} />
                                </div>
                            )
                        })}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 lg:p-8">
                        {step === 'contract' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">{isIndividual ? 'Service Agreement' : 'Business Agreement'}</h2>
                                        <p className="text-xs text-stone-500">Step 1 of 6</p>
                                    </div>
                                </div>

                                <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 h-64 overflow-y-auto text-sm text-stone-600 leading-relaxed">
                                    <h3 className="font-bold text-stone-900 mb-4 text-base">{isIndividual ? 'Aura Service Agreement' : 'Aura Business Agreement'}</h3>
                                    <p className="mb-4">This Agreement is made between Aura Systems Inc. ("Provider") and {user?.name} ("{isIndividual ? 'Client' : 'Partner'}").</p>
                                    <p className="mb-4"><strong>1. Services Provided:</strong> Provider agrees to grant {isIndividual ? 'Client' : 'Partner'} access to the Aura POS System, the world's most advanced {isIndividual ? 'business management' : 'business management'} platform.</p>
                                    <p className="mb-4"><strong>2. Fees:</strong> {isIndividual ? 'Client' : 'Partner'} agrees to pay a monthly support fee of <strong>${franchisor?.supportFee}</strong>.</p>
                                    <p className="mb-4"><strong>3. Term:</strong> This agreement is effective immediately upon acceptance.</p>
                                    <p className="mb-4"><strong>4. Compliance:</strong> {isIndividual ? 'Client' : 'Partner'} agrees to adhere to all {isIndividual ? 'usage guidelines' : 'operational guidelines'}.</p>
                                    <p>By clicking "I Accept", you agree to be bound by these terms and conditions.</p>
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200">
                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${acceptedTerms ? 'bg-purple-600 border-purple-600' : 'border-stone-300 group-hover:border-purple-400'}`}>
                                        {acceptedTerms && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} />
                                    <span className="text-sm text-stone-600 font-medium">I have read and agree to the Terms of Service.</span>
                                </label>
                            </div>
                        )}

                        {step === 'businessType' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">Business Type</h2>
                                        <p className="text-xs text-stone-500">Step 2 of 6</p>
                                    </div>
                                </div>
                                <p className="text-sm text-stone-500">Select the option that best describes your business model.</p>

                                <div className="grid grid-cols-1 gap-4">
                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, businessType: 'MULTI_LOCATION_OWNER' }))}
                                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${formData.businessType === 'MULTI_LOCATION_OWNER' ? 'border-purple-600 bg-purple-50' : 'border-stone-200 hover:border-purple-200'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.businessType === 'MULTI_LOCATION_OWNER' ? 'border-purple-600' : 'border-stone-300'}`}>
                                                {formData.businessType === 'MULTI_LOCATION_OWNER' && <div className="h-2.5 w-2.5 rounded-full bg-purple-600" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-stone-900 text-lg mb-1">Multi-Location Operator</h3>
                                                <p className="text-sm text-stone-500 mb-3">I own and operate one or more salon locations directly. I manage employees, inventory, and daily operations.</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-2 py-1 bg-white rounded-md border border-stone-200 text-xs font-medium text-stone-600">POS Access</span>
                                                    <span className="px-2 py-1 bg-white rounded-md border border-stone-200 text-xs font-medium text-stone-600">Employee Mgmt</span>
                                                    <span className="px-2 py-1 bg-white rounded-md border border-stone-200 text-xs font-medium text-stone-600">Inventory</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, businessType: 'BRAND_FRANCHISOR' }))}
                                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${formData.businessType === 'BRAND_FRANCHISOR' ? 'border-purple-600 bg-purple-50' : 'border-stone-200 hover:border-purple-200'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.businessType === 'BRAND_FRANCHISOR' ? 'border-purple-600' : 'border-stone-300'}`}>
                                                {formData.businessType === 'BRAND_FRANCHISOR' && <div className="h-2.5 w-2.5 rounded-full bg-purple-600" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-stone-900 text-lg mb-1">Franchise Brand Owner</h3>
                                                <p className="text-sm text-stone-500 mb-3">I own a brand and sell franchise opportunities to others. My franchisees operate the locations.</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-2 py-1 bg-white rounded-md border border-stone-200 text-xs font-medium text-stone-600">CRM & Leads</span>
                                                    <span className="px-2 py-1 bg-white rounded-md border border-stone-200 text-xs font-medium text-stone-600">Territory Mgmt</span>
                                                    <span className="px-2 py-1 bg-white rounded-md border border-stone-200 text-xs font-medium text-stone-600">Royalties</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'business' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">Business Information</h2>
                                        <p className="text-xs text-stone-500">Step 2 of 5</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Store Name</label>
                                        <input name="storeName" value={formData.storeName} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white" placeholder="e.g. Downtown Bakery" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Store Address</label>
                                        <input name="storeAddress" value={formData.storeAddress} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white" placeholder="123 Main St, City, State, Zip" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Store Phone / Cell</label>
                                        <input
                                            name="storePhone"
                                            value={formData.storePhone}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                            placeholder="1234567890"
                                            type="tel"
                                            maxLength={10}
                                        />
                                    </div>

                                    <div className="col-span-2 pt-4 mt-2">
                                        <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2 text-sm">
                                            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                            {isIndividual ? 'Legal Entity Details' : 'Corporation Details'}
                                        </h3>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{isIndividual ? 'Legal Name' : 'Corporation Name'}</label>
                                        <input name="corpName" value={formData.corpName} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white" placeholder="Legal Entity Name LLC" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{isIndividual ? 'Legal Address' : 'Corporation Address'}</label>
                                        <input name="corpAddress" value={formData.corpAddress} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white" placeholder="Registered Agent Address" />
                                    </div>

                                    <div className="col-span-2 pt-4 mt-2">
                                        <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2 text-sm">
                                            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                            Owner Details
                                        </h3>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Owner Name</label>
                                        <input name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Owner Address</label>
                                        <input name="ownerAddress" value={formData.ownerAddress} onChange={handleInputChange} className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'tax' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">Tax & IDs</h2>
                                        <p className="text-xs text-stone-500">Step 3 of 6</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Social Security Number (SSN)</label>
                                        <input
                                            name="ssn"
                                            value={formData.ssn}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                            placeholder="123456789"
                                            type="text"
                                            maxLength={9}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Federal Employer ID (FEIN)</label>
                                        <input
                                            name="fein"
                                            value={formData.fein}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                            placeholder="12-3456789"
                                            type="text"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">SS4 Number</label>
                                        <input
                                            name="ss4"
                                            value={formData.ss4}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                            placeholder="Optional"
                                            type="text"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">EBT Account Number (Optional)</label>
                                        <input
                                            name="ebt"
                                            value={formData.ebt}
                                            onChange={handleInputChange}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                            placeholder="Optional"
                                            type="text"
                                            maxLength={20}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'processing' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">Processing Options</h2>
                                        <p className="text-xs text-stone-500">Step 4 of 6</p>
                                    </div>
                                </div>
                                <p className="text-sm text-stone-500">Choose how you want to handle credit card processing fees.</p>

                                <div className="grid grid-cols-1 gap-4">
                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, processingType: 'CUSTOMER_CHARGE' }))}
                                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.processingType === 'CUSTOMER_CHARGE' ? 'border-purple-600 bg-purple-50' : 'border-stone-200 hover:border-purple-200'}`}
                                    >
                                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">RECOMMENDED</div>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${formData.processingType === 'CUSTOMER_CHARGE' ? 'border-purple-600' : 'border-stone-300'}`}>
                                                {formData.processingType === 'CUSTOMER_CHARGE' && <div className="h-2.5 w-2.5 rounded-full bg-purple-600" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-stone-900">Customer Charge (Dual Pricing)</h3>
                                                <p className="text-xs text-stone-500">Pass processing fees to the customer. Zero cost to you.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, processingType: 'STANDARD' }))}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.processingType === 'STANDARD' ? 'border-purple-600 bg-purple-50' : 'border-stone-200 hover:border-purple-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${formData.processingType === 'STANDARD' ? 'border-purple-600' : 'border-stone-300'}`}>
                                                {formData.processingType === 'STANDARD' && <div className="h-2.5 w-2.5 rounded-full bg-purple-600" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-stone-900">Standard Processing</h3>
                                                <p className="text-xs text-stone-500">You pay the processing fees. Standard industry rates apply.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.needToDiscussProcessing ? 'bg-purple-600 border-purple-600' : 'border-stone-300 group-hover:border-purple-400'}`}>
                                        {formData.needToDiscussProcessing && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={formData.needToDiscussProcessing} onChange={e => setFormData(prev => ({ ...prev, needToDiscussProcessing: e.target.checked }))} />
                                    <span className="text-sm text-stone-600 font-medium">I need to discuss processing options with a Processing Expert.</span>
                                </label>
                            </div>
                        )}

                        {step === 'documents' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                        <Upload className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">Document Uploads</h2>
                                        <p className="text-xs text-stone-500">Step 5 of 6</p>
                                    </div>
                                </div>
                                <p className="text-sm text-stone-500">Please upload clear copies of the following documents to verify your identity and business.</p>

                                <div className={`space-y-4 transition-opacity duration-300 ${formData.documentsLater ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    {[
                                        { id: 'dl', label: "Driver's License" },
                                        { id: 'voidedCheck', label: "Voided Check" },
                                        { id: 'feinLetter', label: "FEIN Letter" },
                                        { id: 'businessLicense', label: "Business License (Optional)" }
                                    ].map((doc) => (
                                        <div key={doc.id} className="border border-stone-200 rounded-xl p-4 flex items-center justify-between bg-stone-50 hover:bg-white hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center group-hover:border-purple-200 group-hover:text-purple-600 transition-colors">
                                                    <FileText className="h-5 w-5 text-stone-400 group-hover:text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-stone-900">{doc.label}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {/* @ts-ignore */}
                                                        {formData[doc.id] ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {formData[doc.id].name}</span> : 'No file selected'}
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="cursor-pointer px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm">
                                                Upload
                                                <input type="file" className="hidden" onChange={(e) => handleFileChange(e, doc.id)} />
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200 mt-4">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.documentsLater ? 'bg-purple-600 border-purple-600' : 'border-stone-300 group-hover:border-purple-400'}`}>
                                        {formData.documentsLater && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={formData.documentsLater} onChange={e => setFormData(prev => ({ ...prev, documentsLater: e.target.checked }))} />
                                    <span className="text-sm text-stone-600 font-medium">I will provide these documents later.</span>
                                </label>
                            </div>
                        )}

                        {step === 'password' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-stone-900">Secure Your Account</h2>
                                        <p className="text-xs text-stone-500">Step 6 of 6</p>
                                    </div>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-12 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                                placeholder="••••••••"
                                                required
                                                minLength={8}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-10 pr-12 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-stone-900 bg-white"
                                                placeholder="••••••••"
                                                required
                                                minLength={8}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="flex gap-4 mt-8 pt-6 border-t border-stone-100">
                            {step !== 'contract' && (
                                <button onClick={prevStep} className="px-6 py-3 border border-stone-200 rounded-xl font-medium hover:bg-stone-50 transition-colors flex items-center gap-2 text-stone-600">
                                    <ChevronLeft className="h-4 w-4" /> Back
                                </button>
                            )}

                            {step === 'password' ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02] transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Complete Setup <ArrowRight className="h-5 w-5" /></>}
                                </button>
                            ) : (
                                <button onClick={nextStep} className="flex-1 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 hover:shadow-lg hover:scale-[1.02] transition-all font-medium flex items-center justify-center gap-2">
                                    Continue <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Branding & Value Props */}
            <div className="hidden lg:flex w-1/2 bg-stone-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sm font-medium text-purple-200 mb-6">
                        <Star className="h-4 w-4 fill-purple-200" />
                        {isIndividual ? "World's #1 Business POS" : "World's #1 Business POS"}
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
                        {isIndividual ? (
                            <>
                                Empowering Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Business</span> to Reach New Heights.
                            </>
                        ) : (
                            <>
                                Powering the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Future</span> of Business Management.
                            </>
                        )}
                    </h1>
                    <p className="text-xl text-stone-400 max-w-lg leading-relaxed">
                        {isIndividual
                            ? "Join thousands of successful business owners who trust Aura to streamline operations, boost revenue, and scale effortlessly."
                            : "Join thousands of successful business owners who trust Aura to streamline operations, boost revenue, and scale effortlessly."
                        }
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-1 gap-6 mt-12">
                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Lightning Fast</h3>
                        <p className="text-sm text-stone-400">Experience zero-latency transactions and real-time data synchronization.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/20">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Bank-Grade Security</h3>
                        <p className="text-sm text-stone-400">Your data is protected by enterprise-level encryption and compliance standards.</p>
                    </div>
                </div>

                <div className="relative z-10 mt-12">
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/50 to-stone-900/50 backdrop-blur-md border border-white/10">
                        <Quote className="h-8 w-8 text-purple-400 mb-4 opacity-50" />
                        <p className="text-lg font-medium italic text-stone-200 mb-4">
                            {isIndividual
                                ? "\"Aura transformed how I manage my store. The onboarding was seamless, and the support is unmatched. It's simply the best investment I've made.\""
                                : "\"Aura transformed how we manage our 50+ locations. The onboarding was seamless, and the support is unmatched. It's simply the best investment we've made.\""
                            }
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-stone-700 to-stone-600 flex items-center justify-center font-bold text-white">
                                {isIndividual ? 'SM' : 'JD'}
                            </div>
                            <div>
                                <p className="font-bold text-white">{isIndividual ? 'Sarah Miller' : 'John Doe'}</p>
                                <p className="text-sm text-stone-400">{isIndividual ? 'Owner, Boutique Cafe' : 'CEO, FreshBakes'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

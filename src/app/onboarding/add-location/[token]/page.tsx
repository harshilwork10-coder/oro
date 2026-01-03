'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { MapPin, Upload, FileCheck, AlertCircle, Loader2, CheckCircle, Building2 } from 'lucide-react'
import OroLogo from '@/components/ui/OroLogo'

interface FileUpload {
    file: File | null
    uploading: boolean
    uploaded: boolean
    url: string | null
    error: string | null
}

export default function AddLocationPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = params.token as string
    const franchiseId = searchParams.get('fid')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ownerInfo, setOwnerInfo] = useState<{ name: string; email: string; businessName: string } | null>(null)
    const [submitted, setSubmitted] = useState(false)

    // Form fields
    const [locationName, setLocationName] = useState('')
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Document uploads
    const [voidCheck, setVoidCheck] = useState<FileUpload>({
        file: null, uploading: false, uploaded: false, url: null, error: null
    })
    const [driverLicense, setDriverLicense] = useState<FileUpload>({
        file: null, uploading: false, uploaded: false, url: null, error: null
    })
    const [feinLetter, setFeinLetter] = useState<FileUpload>({
        file: null, uploading: false, uploaded: false, url: null, error: null
    })

    const voidCheckRef = useRef<HTMLInputElement>(null)
    const dlRef = useRef<HTMLInputElement>(null)
    const feinRef = useRef<HTMLInputElement>(null)

    // Verify magic link on mount
    useEffect(() => {
        async function verifyToken() {
            if (!token || !franchiseId) {
                setError('Invalid link. Please request a new one.')
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`/api/auth/magic-link/${token}`)
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.error || 'Invalid or expired link')
                }

                const data = await res.json()

                // Get owner info
                setOwnerInfo({
                    name: data.user?.name || 'Owner',
                    email: data.user?.email || '',
                    businessName: data.user?.franchises?.[0]?.name || 'Your Business'
                })
            } catch (err: any) {
                setError(err.message || 'This link is invalid or has expired.')
            } finally {
                setLoading(false)
            }
        }

        verifyToken()
    }, [token, franchiseId])

    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<FileUpload>>,
        docType: string
    ) => {
        const file = e.target.files?.[0]
        if (!file) return

        setter({ file, uploading: true, uploaded: false, url: null, error: null })

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('token', token)
            formData.append('documentType', docType)

            const res = await fetch('/api/upload/onboarding', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Upload failed')
            }

            const data = await res.json()
            setter({ file, uploading: false, uploaded: true, url: data.s3Key, error: null })
        } catch (err: any) {
            setter({ file, uploading: false, uploaded: false, url: null, error: err.message })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!locationName.trim()) {
            setError('Location name is required')
            return
        }

        if (!voidCheck.uploaded) {
            setError('Void check is required for new locations')
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch('/api/franchise/request-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    token,
                    locationName: locationName.trim(),
                    address: address.trim(),
                    phone: phone.trim(),
                    voidCheckUrl: voidCheck.url,
                    driverLicenseUrl: driverLicense.url,
                    feinLetterUrl: feinLetter.url,
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to submit location request')
            }

            setSubmitted(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-stone-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-stone-400">Verifying your link...</p>
                </div>
            </div>
        )
    }

    if (error && !ownerInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-stone-900 to-black flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
                    <p className="text-stone-400 mb-6">{error}</p>
                    <p className="text-stone-500 text-sm">Please contact your provider for a new link.</p>
                </div>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-stone-900 to-black flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Location Submitted!</h1>
                    <p className="text-stone-400 mb-6">
                        Your new location request has been submitted and is pending review.
                    </p>
                    <p className="text-stone-500 text-sm">
                        You'll receive confirmation once your location is approved.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-900 to-black py-8 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <OroLogo size={48} className="mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Add New Location</h1>
                    <p className="text-stone-400">
                        Welcome back, {ownerInfo?.name}! Add a new store to your account.
                    </p>
                </div>

                {/* Business Info Card */}
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Building2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-sm text-stone-400">Adding to</p>
                        <p className="font-medium text-white">{ownerInfo?.businessName}</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Location Info */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-orange-400" />
                            <h2 className="font-semibold text-white">Store Details</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-1">
                                Store Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder="e.g., Downtown Store"
                                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-1">
                                Address
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="123 Main St, City, State 12345"
                                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(555) 123-4567"
                                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* Document Uploads */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                        <h2 className="font-semibold text-white mb-2">Required Documents</h2>
                        <p className="text-xs text-stone-400 mb-4">
                            Each new location requires bank account verification.
                        </p>

                        {/* Void Check */}
                        <div className="mb-3">
                            <label className="block text-sm text-stone-300 mb-1">
                                Void Check <span className="text-red-400">*</span>
                            </label>
                            <input
                                ref={voidCheckRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileUpload(e, setVoidCheck, 'voidCheck')}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => voidCheckRef.current?.click()}
                                disabled={voidCheck.uploading}
                                className={`w-full p-3 border border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${voidCheck.uploaded
                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                    : voidCheck.error
                                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                        : 'border-stone-600 hover:border-orange-500 text-stone-400 hover:text-orange-400'
                                    }`}
                            >
                                {voidCheck.uploading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                                ) : voidCheck.uploaded ? (
                                    <><FileCheck className="h-4 w-4" /> {voidCheck.file?.name}</>
                                ) : (
                                    <><Upload className="h-4 w-4" /> Upload Void Check</>
                                )}
                            </button>
                        </div>

                        {/* Driver License */}
                        <div className="mb-3">
                            <label className="block text-sm text-stone-300 mb-1">
                                Driver's License <span className="text-stone-500">(optional)</span>
                            </label>
                            <input
                                ref={dlRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileUpload(e, setDriverLicense, 'driverLicense')}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => dlRef.current?.click()}
                                disabled={driverLicense.uploading}
                                className={`w-full p-3 border border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${driverLicense.uploaded
                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                    : 'border-stone-600 hover:border-orange-500 text-stone-400 hover:text-orange-400'
                                    }`}
                            >
                                {driverLicense.uploading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                                ) : driverLicense.uploaded ? (
                                    <><FileCheck className="h-4 w-4" /> {driverLicense.file?.name}</>
                                ) : (
                                    <><Upload className="h-4 w-4" /> Upload Driver's License</>
                                )}
                            </button>
                        </div>

                        {/* FEIN Letter */}
                        <div>
                            <label className="block text-sm text-stone-300 mb-1">
                                FEIN Letter <span className="text-stone-500">(optional)</span>
                            </label>
                            <input
                                ref={feinRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileUpload(e, setFeinLetter, 'feinLetter')}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => feinRef.current?.click()}
                                disabled={feinLetter.uploading}
                                className={`w-full p-3 border border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${feinLetter.uploaded
                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                    : 'border-stone-600 hover:border-orange-500 text-stone-400 hover:text-orange-400'
                                    }`}
                            >
                                {feinLetter.uploading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                                ) : feinLetter.uploaded ? (
                                    <><FileCheck className="h-4 w-4" /> {feinLetter.file?.name}</>
                                ) : (
                                    <><Upload className="h-4 w-4" /> Upload FEIN Letter</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || !locationName.trim() || !voidCheck.uploaded}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</>
                        ) : (
                            <>Submit New Location</>
                        )}
                    </button>

                    <p className="text-xs text-stone-500 text-center">
                        Your request will be reviewed by your provider.
                    </p>
                </form>
            </div>
        </div>
    )
}

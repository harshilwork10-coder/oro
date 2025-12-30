'use client'

import { useState, useRef } from 'react'
import { X, MapPin, Upload, FileCheck, AlertCircle, Loader2 } from 'lucide-react'

interface AddLocationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    franchisorId: string
    franchisorName: string
}

interface FileUpload {
    file: File | null
    uploading: boolean
    uploaded: boolean
    url: string | null
    error: string | null
}

export default function AddLocationModal({
    isOpen,
    onClose,
    onSuccess,
    franchisorId,
    franchisorName
}: AddLocationModalProps) {
    const [locationName, setLocationName] = useState('')
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            formData.append('userId', franchisorId)
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
                    franchisorId,
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

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <MapPin className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Add New Location</h2>
                            <p className="text-xs text-stone-400">for {franchisorName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-stone-700 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Location Info */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-1">
                            Location Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            placeholder="e.g., Downtown Store"
                            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Document Uploads */}
                    <div className="pt-4 border-t border-stone-700">
                        <h3 className="text-sm font-semibold text-stone-200 mb-3">
                            Required Documents
                        </h3>
                        <p className="text-xs text-stone-400 mb-4">
                            Each new location requires bank account verification and identity documents.
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
                                            : 'border-stone-600 hover:border-purple-500 text-stone-400 hover:text-purple-400'
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
                            {voidCheck.error && (
                                <p className="text-xs text-red-400 mt-1">{voidCheck.error}</p>
                            )}
                        </div>

                        {/* Driver License */}
                        <div className="mb-3">
                            <label className="block text-sm text-stone-300 mb-1">
                                Driver's License
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
                                        : driverLicense.error
                                            ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                            : 'border-stone-600 hover:border-purple-500 text-stone-400 hover:text-purple-400'
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
                        <div className="mb-3">
                            <label className="block text-sm text-stone-300 mb-1">
                                FEIN Letter
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
                                        : feinLetter.error
                                            ? 'border-red-500/50 bg-red-500/10 text-red-400'
                                            : 'border-stone-600 hover:border-purple-500 text-stone-400 hover:text-purple-400'
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

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !locationName.trim() || !voidCheck.uploaded}
                            className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                            ) : (
                                'Submit Request'
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-stone-500 text-center">
                        This request will be reviewed by the platform administrator.
                    </p>
                </form>
            </div>
        </div>
    )
}


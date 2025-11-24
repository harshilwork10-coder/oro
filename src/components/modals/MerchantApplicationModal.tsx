'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Building2, User, Upload, Loader2, Check, FileText } from 'lucide-react'

interface MerchantApplicationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function MerchantApplicationModal({ isOpen, onClose, onSuccess }: MerchantApplicationModalProps) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [uploadingFile, setUploadingFile] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        storeName: '',
        storeAddress: '',
        ownerName: '',
        ownerPhone: '',
        ownerSSN: '',
        voidedCheckPath: '',
        driverLicensePath: '',
        feinLetterPath: '',
        businessLicensePath: ''
    })

    const handleFileUpload = async (file: File, fieldName: string) => {
        setUploadingFile(fieldName)
        setError('')

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to upload file')
            }

            const data = await response.json()
            setFormData(prev => ({ ...prev, [fieldName]: data.path }))
        } catch (err: any) {
            setError(err.message || 'File upload failed')
        } finally {
            setUploadingFile(null)
        }
    }

    const handleSubmit = async () => {
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/franchisee/merchant-application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to submit application')
            }

            setFormData({
                storeName: '',
                storeAddress: '',
                ownerName: '',
                ownerPhone: '',
                ownerSSN: '',
                voidedCheckPath: '',
                driverLicensePath: '',
                feinLetterPath: '',
                businessLicensePath: ''
            })
            setStep(1)
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const FileUploadField = ({ label, fieldName, required = false }: { label: string; fieldName: string; required?: boolean }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && '*'}
            </label>
            <div className="relative">
                <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, fieldName)
                    }}
                    className="hidden"
                    id={fieldName}
                />
                <label
                    htmlFor={fieldName}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${formData[fieldName as keyof typeof formData]
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                >
                    {uploadingFile === fieldName ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-600">Uploading...</span>
                        </>
                    ) : formData[fieldName as keyof typeof formData] ? (
                        <>
                            <Check className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">File uploaded</span>
                        </>
                    ) : (
                        <>
                            <Upload className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-600">Click to upload (PDF, JPG, PNG)</span>
                        </>
                    )}
                </label>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Apply for Payment Processing</h2>
                        <p className="text-sm text-gray-600">Step {step} of 3</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`flex-1 h-2 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); step === 3 ? handleSubmit() : setStep(step + 1) }}>
                    {/* Step 1: Business Information */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Store Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.storeName}
                                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="My Awesome Salon"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Store Address *
                                </label>
                                <textarea
                                    value={formData.storeAddress}
                                    onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="123 Main St, City, State, ZIP"
                                    rows={3}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Owner Information */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <User className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Owner Information</h3>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Owner Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.ownerName}
                                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Owner Phone *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.ownerPhone}
                                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="(555) 123-4567"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Owner SSN *
                                </label>
                                <input
                                    type="password"
                                    value={formData.ownerSSN}
                                    onChange={(e) => setFormData({ ...formData, ownerSSN: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="###-##-####"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">🔒 Securely encrypted</p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Document Upload */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Upload className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
                            </div>

                            <FileUploadField label="Voided Check / Bank Letter" fieldName="voidedCheckPath" />
                            <FileUploadField label="Driver's License" fieldName="driverLicensePath" />
                            <FileUploadField label="FEIN / SS4 Letter" fieldName="feinLetterPath" />
                            <FileUploadField label="Business License" fieldName="businessLicensePath" />

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                <p className="text-xs text-blue-800">
                                    📄 Accepted formats: PDF, JPG, PNG • Maximum size: 5MB per file
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-6 mt-6 border-t">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                Back
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading || uploadingFile !== null}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : step === 3 ? (
                                <>
                                    <Check className="h-5 w-5" />
                                    Submit Application
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

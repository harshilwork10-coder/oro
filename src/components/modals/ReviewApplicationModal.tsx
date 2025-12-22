'use client'

import { X, FileText, Check, Ban, Building2, CreditCard, Shield } from 'lucide-react'
import { useState } from 'react'

interface ReviewApplicationModalProps {
    isOpen: boolean
    onClose: () => void
    onApprove: () => void
    onReject: () => void
    data: any // Type this properly based on Franchisor/Franchise
    type: 'FRANCHISOR' | 'FRANCHISE'
}

export default function ReviewApplicationModal({
    isOpen,
    onClose,
    onApprove,
    onReject,
    data,
    type
}: ReviewApplicationModalProps) {
    if (!isOpen || !data) return null

    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState(data)
    const [uploading, setUploading] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    const handleReject = () => {
        onReject()
    }

    const validateSSN = (ssn: string) => {
        if (!ssn) return ''
        // Remove non-digits
        const digits = ssn.replace(/\D/g, '')
        if (digits.length !== 9) return 'SSN must be 9 digits'
        return ''
    }

    const validateFEIN = (fein: string) => {
        if (!fein) return ''
        const digits = fein.replace(/\D/g, '')
        if (digits.length !== 9) return 'FEIN must be 9 digits'
        return ''
    }

    const validateRoutingNumber = (routing: string) => {
        if (!routing) return ''
        const digits = routing.replace(/\D/g, '')
        if (digits.length !== 9) return 'Routing number must be 9 digits'
        return ''
    }

    const validateAccountNumber = (account: string) => {
        if (!account) return ''
        const digits = account.replace(/\D/g, '')
        if (digits.length < 4 || digits.length > 17) return 'Account number must be 4-17 digits'
        return ''
    }

    const formatSSN = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 9)
        if (digits.length <= 3) return digits
        if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
        return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
    }

    const formatFEIN = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 9)
        if (digits.length <= 2) return digits
        return `${digits.slice(0, 2)}-${digits.slice(2)}`
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        let processedValue = value

        // Auto-format SSN and FEIN
        if (name === 'ssn') {
            processedValue = formatSSN(value)
        } else if (name === 'fein') {
            processedValue = formatFEIN(value)
        }

        setFormData((prev: any) => ({ ...prev, [name]: processedValue }))

        // Clear error for this field
        setErrors(prev => ({ ...prev, [name]: '' }))
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(fieldName)
        try {
            const uploadData = new FormData()
            uploadData.append('file', file)
            const entityId = type === 'FRANCHISOR' ? data.id : data.franchisorId || data.id
            uploadData.append('franchisorId', entityId)
            uploadData.append('documentType', fieldName)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData
            })

            if (res.ok) {
                const result = await res.json()
                setFormData((prev: any) => ({ ...prev, [fieldName]: result.s3Key }))
            } else {
                setToast({ message: 'Upload failed', type: 'error' })
            }
        } catch (error) {
            console.error('Upload error:', error)
            setToast({ message: 'Upload error', type: 'error' })
        } finally {
            setUploading(null)
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name?.trim()) {
            newErrors.name = 'Business name is required'
        }

        if (!formData.needToDiscussProcessing) {
            const ssnError = validateSSN(formData.ssn)
            const feinError = validateFEIN(formData.fein)
            const routingError = validateRoutingNumber(formData.routingNumber)
            const accountError = validateAccountNumber(formData.accountNumber)

            if (ssnError) newErrors.ssn = ssnError
            if (feinError) newErrors.fein = feinError
            if (routingError) newErrors.routingNumber = routingError
            if (accountError) newErrors.accountNumber = accountError

            // At least SSN or FEIN required
            if (!formData.ssn && !formData.fein) {
                newErrors.ssn = 'Either SSN or FEIN is required'
                newErrors.fein = 'Either SSN or FEIN is required'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validateForm()) {
            return
        }

        setSaving(true)
        try {
            const endpoint = type === 'FRANCHISOR' ? `/api/franchisors/${data.id}` : `/api/franchises/${data.id}`
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setIsEditing(false)
                setToast({ message: 'Changes saved successfully', type: 'success' })
            } else {
                const errorData = await res.json().catch(() => ({}))
                const errorMsg = errorData.error || `Failed to save changes (${res.status})`
                console.error('Save failed:', errorMsg, errorData)
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error) {
            console.error('Save error:', error)
            setToast({ message: 'Error saving changes: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const DocumentRow = ({ label, value, fieldName }: { label: string, value: string | null, fieldName: string }) => (
        <div className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg border border-stone-700">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-stone-700 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-stone-400" />
                </div>
                <span className="text-sm font-medium text-stone-200">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value ? (
                    <a
                        href={`/api/documents?key=${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-md transition-colors border border-purple-500/20"
                    >
                        View
                    </a>
                ) : (
                    <span className="text-xs text-stone-500 italic">Not uploaded</span>
                )}
                {isEditing && (
                    <label className="cursor-pointer text-xs bg-stone-700 hover:bg-stone-600 text-white px-3 py-1.5 rounded-md transition-colors">
                        {uploading === fieldName ? '...' : 'Upload'}
                        <input type="file" className="hidden" onChange={(e) => handleFileChange(e, fieldName)} />
                    </label>
                )}
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-700">
                    <div>
                        <h2 className="text-xl font-bold text-stone-100">Review Application</h2>
                        <p className="text-sm text-stone-400">Review details for {data.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                        >
                            {isEditing ? 'Done Editing' : 'Edit Details'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-lg transition-colors">
                            <X className="h-5 w-5 text-stone-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Business Info */}
                    <section>
                        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Business Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50">
                                <label className="text-xs text-stone-500 block mb-1">Business Name</label>
                                {isEditing ? (
                                    <>
                                        <input name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" />
                                        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                                    </>
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.name}</p>
                                )}
                            </div>
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50">
                                <label className="text-xs text-stone-500 block mb-1">Type</label>
                                {isEditing ? (
                                    <input name="businessType" value={formData.businessType || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" />
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.businessType || 'N/A'}</p>
                                )}
                            </div>
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50 col-span-2">
                                <label className="text-xs text-stone-500 block mb-1">Address</label>
                                {isEditing ? (
                                    <input name="address" value={formData.address || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" />
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.address || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Tax & Processing */}
                    <section>
                        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" /> Processing & Tax
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50">
                                <label className="text-xs text-stone-500 block mb-1">SSN</label>
                                {isEditing ? (
                                    <>
                                        <input name="ssn" value={formData.ssn || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" placeholder="XXX-XX-XXXX" />
                                        {errors.ssn && <p className="text-xs text-red-400 mt-1">{errors.ssn}</p>}
                                    </>
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.ssn || 'N/A'}</p>
                                )}
                            </div>
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50">
                                <label className="text-xs text-stone-500 block mb-1">FEIN</label>
                                {isEditing ? (
                                    <>
                                        <input name="fein" value={formData.fein || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" placeholder="XX-XXXXXXX" />
                                        {errors.fein && <p className="text-xs text-red-400 mt-1">{errors.fein}</p>}
                                    </>
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.fein || 'N/A'}</p>
                                )}
                            </div>
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50">
                                <label className="text-xs text-stone-500 block mb-1">Routing Number</label>
                                {isEditing ? (
                                    <>
                                        <input name="routingNumber" value={formData.routingNumber || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" placeholder="9 digits" maxLength={9} />
                                        {errors.routingNumber && <p className="text-xs text-red-400 mt-1">{errors.routingNumber}</p>}
                                    </>
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.routingNumber || 'N/A'}</p>
                                )}
                            </div>
                            <div className="p-4 bg-stone-800/30 rounded-xl border border-stone-700/50">
                                <label className="text-xs text-stone-500 block mb-1">Account Number</label>
                                {isEditing ? (
                                    <>
                                        <input name="accountNumber" value={formData.accountNumber || ''} onChange={handleInputChange} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 text-sm" placeholder="4-17 digits" maxLength={17} />
                                        {errors.accountNumber && <p className="text-xs text-red-400 mt-1">{errors.accountNumber}</p>}
                                    </>
                                ) : (
                                    <p className="text-stone-200 font-medium">{formData.accountNumber || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                        {formData.needToDiscussProcessing && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm flex items-center gap-2">
                                <Shield className="h-4 w-4" /> User requested assistance with processing setup.
                            </div>
                        )}
                    </section>

                    {/* Documents */}
                    <section>
                        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Documents
                        </h3>
                        <div className="space-y-3">
                            <DocumentRow label="Voided Check" value={formData.voidCheckUrl} fieldName="voidCheckUrl" />
                            <DocumentRow label="Driver's License" value={formData.driverLicenseUrl} fieldName="driverLicenseUrl" />
                            <DocumentRow label="FEIN Letter" value={formData.feinLetterUrl} fieldName="feinLetterUrl" />
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-stone-700 bg-stone-900/50 rounded-b-2xl flex gap-3">
                    {isEditing ? (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onReject}
                                className="flex-1 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Ban className="h-4 w-4" /> Reject Application
                            </button>
                            <button
                                onClick={onApprove}
                                className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                            >
                                <Check className="h-4 w-4" /> Approve Application
                            </button>
                        </>
                    )}
                </div>
            </div>
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState } from 'react'
import { X, Building2, Mail, User, Loader2, Store, CheckCircle2, DollarSign, Phone, Check } from 'lucide-react'

interface AddFranchisorModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddFranchisorModal({ isOpen, onClose, onSuccess }: AddFranchisorModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        companyName: '',
        storeName: '', // DBA name for the location
        supportFee: '0',
        businessType: 'MULTI_LOCATION_OWNER',
        industryType: 'SERVICE', // SERVICE, RETAIL, RESTAURANT
        serviceType: 'POS_AND_PROCESSING' // POS_ONLY or POS_AND_PROCESSING
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [magicLink, setMagicLink] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (!formData.name || !formData.email || !formData.companyName) {
                setError('All fields are required')
                setLoading(false)
                return
            }

            const response = await fetch('/api/admin/franchisors/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    type: formData.businessType === 'BRAND_FRANCHISOR' ? 'BRAND' : 'INDIVIDUAL',
                    businessType: formData.businessType,
                    industryType: formData.industryType,
                    processingType: formData.serviceType, // POS_ONLY or POS_AND_PROCESSING
                    billingMethod: 'DIRECT',
                    enableCommission: true,
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create franchisor')
            }

            setMagicLink(data.magicLink)
            setFormData({ name: '', email: '', phone: '', companyName: '', storeName: '', supportFee: '0', businessType: 'MULTI_LOCATION_OWNER', industryType: 'SERVICE', serviceType: 'POS_AND_PROCESSING' })
            onSuccess() // Refresh list in background
            // Don't auto-close so user can copy link

        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null


    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors z-10">
                    <X className="h-6 w-6" />
                </button>

                <div className="mb-4">
                    <h2 className="text-xl font-bold text-stone-100">Add New Client</h2>
                    <p className="text-xs text-stone-400">Enter the details below to generate an invite.</p>
                </div>

                {magicLink && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-emerald-400 font-semibold mb-1">✅ Invite Sent!</p>
                        <div className="flex items-center gap-2 bg-stone-950/50 p-2 rounded-lg border border-emerald-500/20">
                            <code className="text-xs text-emerald-300/80 truncate flex-1 font-mono">
                                {magicLink}
                            </code>
                            <button
                                onClick={() => navigator.clipboard.writeText(magicLink)}
                                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Row 1: Owner Name, Email, Phone */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Owner Name</label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="Jane Doe"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="jane@company.com"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Cell Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                                        let formatted = digits.length > 0 ? '(' + digits.slice(0, 3) : ''
                                        if (digits.length >= 3) formatted += ') ' + digits.slice(3, 6)
                                        if (digits.length >= 6) formatted += '-' + digits.slice(6, 10)
                                        setFormData({ ...formData, phone: formatted })
                                    }}
                                    className="w-full pl-8 pr-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="(555) 123-4567"
                                    maxLength={14}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Company, Store, Owner Type, Support Fee */}
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Legal Company</label>
                            <div className="relative">
                                <Building2 className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="Salon LLC"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Store Name (DBA)</label>
                            <div className="relative">
                                <Store className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                <input
                                    type="text"
                                    value={formData.storeName}
                                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="Mike's Barbershop"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Owner Type</label>
                            <select
                                value={formData.businessType}
                                onChange={(e) => setFormData({ ...formData, businessType: e.target.value as 'MULTI_LOCATION_OWNER' | 'BRAND_FRANCHISOR' })}
                                className="w-full px-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                required
                            >
                                <option value="MULTI_LOCATION_OWNER">Multi-Location</option>
                                <option value="BRAND_FRANCHISOR">Franchise Brand</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1 uppercase tracking-wider">Monthly Fee</label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                <input
                                    type="number"
                                    value={formData.supportFee}
                                    onChange={(e) => setFormData({ ...formData, supportFee: e.target.value })}
                                    className="w-full pl-8 pr-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Service Package + Industry Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Service Package</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, serviceType: 'POS_AND_PROCESSING' })}
                                    className={`relative p-2.5 rounded-lg border-2 text-left transition-all flex items-center gap-2 ${formData.serviceType === 'POS_AND_PROCESSING'
                                        ? 'border-orange-500 bg-orange-500/15'
                                        : 'border-stone-700 bg-stone-800/50 hover:border-stone-500'
                                        }`}
                                >
                                    {formData.serviceType === 'POS_AND_PROCESSING' && (
                                        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center">
                                            <Check className="w-2 h-2 text-white" />
                                        </div>
                                    )}
                                    <span className="text-lg">💳</span>
                                    <div className="min-w-0">
                                        <span className="block text-xs font-bold text-white">POS + Processing</span>
                                        <span className="block text-[10px] text-orange-400">Void Check, DL, FEIN</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, serviceType: 'POS_ONLY' })}
                                    className={`relative p-2.5 rounded-lg border-2 text-left transition-all flex items-center gap-2 ${formData.serviceType === 'POS_ONLY'
                                        ? 'border-purple-500 bg-purple-500/15'
                                        : 'border-stone-700 bg-stone-800/50 hover:border-stone-500'
                                        }`}
                                >
                                    {formData.serviceType === 'POS_ONLY' && (
                                        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 flex items-center justify-center">
                                            <Check className="w-2 h-2 text-white" />
                                        </div>
                                    )}
                                    <span className="text-lg">📱</span>
                                    <div className="min-w-0">
                                        <span className="block text-xs font-bold text-white">POS Only</span>
                                        <span className="block text-[10px] text-purple-400">Void Check only</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Industry Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'SERVICE', icon: '💇', label: 'Service' },
                                    { value: 'RETAIL', icon: '🏪', label: 'Retail' },
                                    { value: 'RESTAURANT', icon: '🍽️', label: 'Restaurant', disabled: true }
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={option.disabled}
                                        onClick={() => !option.disabled && setFormData({ ...formData, industryType: option.value })}
                                        className={`relative p-2.5 rounded-lg border-2 text-center transition-all ${formData.industryType === option.value
                                            ? 'border-purple-500 bg-purple-500/15'
                                            : option.disabled
                                                ? 'border-stone-700/50 bg-stone-900/30 opacity-50 cursor-not-allowed'
                                                : 'border-stone-700 bg-stone-800/50 hover:border-stone-500'
                                            }`}
                                    >
                                        {formData.industryType === option.value && (
                                            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                                                <Check className="w-2 h-2 text-white" />
                                            </div>
                                        )}
                                        <div className="text-lg mb-0.5">{option.icon}</div>
                                        <span className="block text-xs font-medium text-white">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="pt-4 flex gap-3 border-t border-stone-700/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg transition-all text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send Invite →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}


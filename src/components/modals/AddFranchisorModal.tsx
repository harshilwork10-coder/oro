'use client'

import { useState } from 'react'
import { X, Building2, Mail, User, Loader2, Store, CheckCircle2, DollarSign, Phone } from 'lucide-react'

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
        supportFee: '0',
        businessType: 'MULTI_LOCATION_OWNER',
        industryType: 'SERVICE' // SERVICE, RETAIL, RESTAURANT
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
                    billingMethod: 'DIRECT',
                    enableCommission: true,
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create franchisor')
            }

            setMagicLink(data.magicLink)
            setFormData({ name: '', email: '', phone: '', companyName: '', supportFee: '0', businessType: 'MULTI_LOCATION_OWNER', industryType: 'SERVICE' })
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
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors z-10">
                    <X className="h-6 w-6" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-stone-100">Add New Client</h2>
                    <p className="text-sm text-stone-400">Enter the details below to generate an invite.</p>
                </div>

                {magicLink && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-emerald-400 font-semibold mb-2">✅ Invite Sent!</p>
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
                        <p className="text-[10px] text-emerald-500/50 mt-2">
                            (In production, this link is emailed. For testing, copy it here.)
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Owner Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="Jane Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="jane@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Cell Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        // Strip non-digits
                                        const digits = e.target.value.replace(/\D/g, '')
                                        // Limit to 10 digits
                                        const limited = digits.slice(0, 10)
                                        // Format as (XXX) XXX-XXXX
                                        let formatted = ''
                                        if (limited.length > 0) {
                                            formatted = '(' + limited.slice(0, 3)
                                        }
                                        if (limited.length >= 3) {
                                            formatted += ') ' + limited.slice(3, 6)
                                        }
                                        if (limited.length >= 6) {
                                            formatted += '-' + limited.slice(6, 10)
                                        }
                                        setFormData({ ...formData, phone: formatted })
                                    }}
                                    className="w-full pl-9 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="(555) 123-4567"
                                    maxLength={14}
                                />
                            </div>
                            <p className="text-xs text-stone-500 mt-1">
                                Required if "Needs Call" for processing setup
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">
                                Company Name
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="Company Name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Owner Type</label>
                            <select
                                value={formData.businessType}
                                onChange={(e) => setFormData({ ...formData, businessType: e.target.value as 'MULTI_LOCATION_OWNER' | 'BRAND_FRANCHISOR' })}
                                className="w-full px-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                required
                            >
                                <option value="MULTI_LOCATION_OWNER">Multi-Location Operator</option>
                                <option value="BRAND_FRANCHISOR">Franchise Brand Owner</option>
                            </select>
                            <p className="text-xs text-stone-500 mt-1">
                                {formData.businessType === 'BRAND_FRANCHISOR'
                                    ? 'Sells franchise opportunities to others'
                                    : 'Operates own locations directly'}
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Industry Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'SERVICE', label: '🎨 Service', desc: 'Salon, Spa, Barbershop' },
                                    { value: 'RETAIL', label: '🏪 Retail', desc: 'Liquor, Convenience, Smoke' },
                                    { value: 'RESTAURANT', label: '🍽️ Restaurant', desc: 'Coming Soon', disabled: true }
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={option.disabled}
                                        onClick={() => !option.disabled && setFormData({ ...formData, industryType: option.value })}
                                        className={`p-3 rounded-lg border text-left transition-all ${formData.industryType === option.value
                                                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                : option.disabled
                                                    ? 'border-stone-700 bg-stone-900/30 text-stone-600 cursor-not-allowed'
                                                    : 'border-stone-700 bg-stone-900/50 text-stone-300 hover:border-stone-600'
                                            }`}
                                    >
                                        <span className="block text-sm font-medium">{option.label}</span>
                                        <span className="block text-xs text-stone-500">{option.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Monthly Support Fee</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="number"
                                    value={formData.supportFee}
                                    onChange={(e) => setFormData({ ...formData, supportFee: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <p className="text-xs text-stone-500 mt-1">
                                Auto-calculated · Direct billing
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-transparent hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-lg transition-all text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

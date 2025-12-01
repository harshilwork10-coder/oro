'use client'

import { useState } from 'react'
import { X, Building2, Mail, User, Loader2, Store, CheckCircle2, DollarSign } from 'lucide-react'

interface AddFranchisorModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddFranchisorModal({ isOpen, onClose, onSuccess }: AddFranchisorModalProps) {
    const [accountType, setAccountType] = useState<'BRAND' | 'INDIVIDUAL'>('INDIVIDUAL')
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        companyName: '',
        supportFee: '99'
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [magicLink, setMagicLink] = useState('')

    const handleTypeSelect = (type: 'BRAND' | 'INDIVIDUAL') => {
        setAccountType(type)
        setFormData(prev => ({
            ...prev,
            supportFee: type === 'BRAND' ? '499' : '99'
        }))
    }

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
                    type: accountType,
                    billingMethod: 'DIRECT',
                    enableCommission: true,
                    // We no longer send numberOfStations - stations are managed by the franchisor later
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create franchisor')
            }

            setMagicLink(data.magicLink)
            setFormData({ name: '', email: '', companyName: '', supportFee: '99' })
            setAccountType('INDIVIDUAL')

            setMagicLink(data.magicLink)
            setFormData({ name: '', email: '', companyName: '', supportFee: '99' })
            setAccountType('INDIVIDUAL')
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
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-2xl p-0 relative overflow-hidden flex flex-col md:flex-row">

                {/* Left Side - Plan Selection */}
                <div className="w-full md:w-5/12 bg-stone-900/50 border-r border-stone-800 p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-stone-100 mb-2">Select Account Type</h3>

                    <button
                        type="button"
                        onClick={() => handleTypeSelect('BRAND')}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group ${accountType === 'BRAND'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-stone-800 bg-stone-900/30 hover:border-stone-700'
                            }`}
                    >
                        {accountType === 'BRAND' && (
                            <div className="absolute top-3 right-3 text-purple-500">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        )}
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${accountType === 'BRAND' ? 'bg-purple-500 text-white' : 'bg-stone-800 text-stone-400 group-hover:text-stone-300'
                            }`}>
                            <Building2 className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-stone-100">Franchise Brand</h4>
                        <p className="text-xs text-stone-400 mt-1 leading-relaxed">For businesses managing multiple locations and franchisees.</p>
                        <div className="mt-3 text-sm font-medium text-purple-400">$499<span className="text-stone-500 text-xs">/mo</span></div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTypeSelect('INDIVIDUAL')}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 group ${accountType === 'INDIVIDUAL'
                            ? 'border-pink-500 bg-pink-500/10'
                            : 'border-stone-800 bg-stone-900/30 hover:border-stone-700'
                            }`}
                    >
                        {accountType === 'INDIVIDUAL' && (
                            <div className="absolute top-3 right-3 text-pink-500">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        )}
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${accountType === 'INDIVIDUAL' ? 'bg-pink-500 text-white' : 'bg-stone-800 text-stone-400 group-hover:text-stone-300'
                            }`}>
                            <Store className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-stone-100">Individual Store</h4>
                        <p className="text-xs text-stone-400 mt-1 leading-relaxed">For single or few location owners.</p>
                        <div className="mt-3 text-sm font-medium text-pink-400">$99<span className="text-stone-500 text-xs">/mo</span></div>
                    </button>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors z-10">
                        <X className="h-6 w-6" />
                    </button>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-stone-100">
                            {accountType === 'BRAND' ? 'New Brand' : 'New Store'}
                        </h2>
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
                                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">
                                    {accountType === 'BRAND' ? 'Brand Name' : 'Store Name'}
                                </label>
                                <div className="relative">
                                    {accountType === 'BRAND' ? (
                                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    ) : (
                                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    )}
                                    <input
                                        type="text"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                                        placeholder={accountType === 'BRAND' ? "Aura Franchise Group" : "Joe's Coffee Shop"}
                                        required
                                    />
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
                                className={`flex-1 px-4 py-2.5 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${accountType === 'BRAND'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-900/20'
                                    : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-pink-900/20'
                                    }`}
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Send Invite'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

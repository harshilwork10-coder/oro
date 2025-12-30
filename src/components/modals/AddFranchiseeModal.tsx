'use client'

import { useState } from 'react'
import { X, UserPlus, Mail, Building2, Loader2, MapPin } from 'lucide-react'

interface AddFranchiseeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddFranchiseeModal({ isOpen, onClose, onSuccess }: AddFranchiseeModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        locationName: '',
        locationAddress: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [tempPassword, setTempPassword] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Input validation on client side
            if (!formData.name || !formData.email) {
                setError('Name and email are required')
                setLoading(false)
                return
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(formData.email)) {
                setError('Please enter a valid email address')
                setLoading(false)
                return
            }

            const response = await fetch('/api/franchisee/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to invite franchisee')
            }

            setSuccess(true)
            if (data.tempPassword) {
                setTempPassword(data.tempPassword)
            }

            // Reset form after delay
            setTimeout(() => {
                setFormData({ name: '', email: '', locationName: '', locationAddress: '' })
                onSuccess()
                onClose()
                setSuccess(false)
                setTempPassword('')
            }, 5000)
        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors"
                    aria-label="Close"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                        <UserPlus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-stone-100">Invite Franchisee</h2>
                        <p className="text-sm text-stone-400">Add a new franchisee to your network</p>
                    </div>
                </div>

                {/* Success message */}
                {success && (
                    <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-sm text-emerald-400 font-semibold mb-2">✅ Franchisee invited!</p>
                        {tempPassword && (
                            <div className="mt-2 p-2 bg-stone-900 rounded-lg">
                                <p className="text-xs text-stone-400">Temporary Password:</p>
                                <p className="text-sm font-mono text-orange-400 mt-1">{tempPassword}</p>
                                <p className="text-xs text-stone-500 mt-2">Share this securely with the franchisee.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name field */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Franchisee Name *
                        </label>
                        <div className="relative">
                            <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                placeholder="John Smith"
                                required
                            />
                        </div>
                    </div>

                    {/* Email field */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Email Address *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-stone-700"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-stone-800 px-3 text-xs text-stone-500 uppercase tracking-wider">
                                First Location (Optional)
                            </span>
                        </div>
                    </div>

                    {/* Location name field */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Location Name
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                            <input
                                type="text"
                                value={formData.locationName}
                                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                placeholder="McDonald's Dallas"
                            />
                        </div>
                    </div>

                    {/* Location address field */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Location Address
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                            <input
                                type="text"
                                value={formData.locationAddress}
                                onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                placeholder="123 Main St, Dallas, TX 75201"
                            />
                        </div>
                    </div>

                    {/* Info notice */}
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <p className="text-xs text-orange-400">
                            🔐 A temporary password will be created. The franchisee can change it after their first login.
                        </p>
                    </div>

                    {/* Submit button */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl transition-all font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-900/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Inviting...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Invite Franchisee
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}



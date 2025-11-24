'use client'

import { useState } from 'react'
import { X, UserPlus, Mail, Building2, Loader2 } from 'lucide-react'

interface AddFranchiseeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function AddFranchiseeModal({ isOpen, onClose, onSuccess }: AddFranchiseeModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        franchiseName: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [magicLink, setMagicLink] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Input validation on client side
            if (!formData.name || !formData.email || !formData.franchiseName) {
                setError('All fields are required')
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

            // Length validation
            if (formData.name.length > 100 || formData.franchiseName.length > 100) {
                setError('Name fields must be less than 100 characters')
                setLoading(false)
                return
            }

            const response = await fetch('/api/admin/franchisees/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create franchisee')
            }

            setMagicLink(data.magicLink)

            // Reset form
            setFormData({ name: '', email: '', franchiseName: '' })

            // Show success and close after delay
            setTimeout(() => {
                onSuccess()
                onClose()
                setMagicLink('')
            }, 3000)
        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
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
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <UserPlus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-stone-100">Add Franchisee</h2>
                        <p className="text-sm text-stone-400">Create a new franchisee account</p>
                    </div>
                </div>

                {/* Success message */}
                {magicLink && (
                    <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-sm text-emerald-400 font-semibold mb-2">✅ Franchisee created successfully!</p>
                        <p className="text-xs text-emerald-300">Welcome email sent with magic link.</p>
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
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="John Smith"
                                maxLength={100}
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
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="john@example.com"
                                maxLength={255}
                                required
                            />
                        </div>
                    </div>

                    {/* Franchise name field */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Franchise Name *
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                            <input
                                type="text"
                                value={formData.franchiseName}
                                onChange={(e) => setFormData({ ...formData, franchiseName: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="John's Downtown Franchise"
                                maxLength={100}
                                required
                            />
                        </div>
                    </div>

                    {/* Security notice */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-xs text-blue-400">
                            🔒 A secure magic link will be sent to the franchisee's email. The link expires in 24 hours.
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
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-900/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Create Franchisee
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

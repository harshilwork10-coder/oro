'use client'

import { useState } from 'react'
import { X, Shield, User, Mail, Loader2, CheckCircle2 } from 'lucide-react'

interface AddTeamMemberModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const ROLES = [
    {
        id: 'SUPER_ADMIN',
        name: 'Super Admin',
        description: 'Full access to all system features and settings.',
        color: 'purple'
    },
    {
        id: 'MANAGER',
        name: 'Manager',
        description: 'Can manage team and view all data, but cannot delete sensitive records.',
        color: 'blue'
    },
    {
        id: 'SUPPORT',
        name: 'Support',
        description: 'Can view franchisors and franchises to assist customers. Read-only access to sensitive data.',
        color: 'emerald'
    },
    {
        id: 'SALES',
        name: 'Sales',
        description: 'Can view and add new franchisors. No access to financial data.',
        color: 'amber'
    }
]

export default function AddTeamMemberModal({ isOpen, onClose, onSuccess }: AddTeamMemberModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'SUPPORT'
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create team member')
            }

            setFormData({ name: '', email: '', role: 'SUPPORT' })
            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel rounded-2xl shadow-2xl w-full max-w-4xl p-0 relative overflow-hidden flex flex-col md:flex-row h-[600px]">

                {/* Left Side - Role Selection */}
                <div className="w-full md:w-5/12 bg-stone-900/50 border-r border-stone-800 p-6 overflow-y-auto custom-scrollbar">
                    <h3 className="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-400" />
                        Select Role
                    </h3>

                    <div className="space-y-3">
                        {ROLES.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, role: role.id })}
                                className={`w-full relative p-4 rounded-xl border-2 text-left transition-all duration-200 group ${formData.role === role.id
                                    ? `border-${role.color}-500 bg-${role.color}-500/10`
                                    : 'border-stone-800 bg-stone-900/30 hover:border-stone-700'
                                    }`}
                            >
                                {formData.role === role.id && (
                                    <div className={`absolute top-3 right-3 text-${role.color}-500`}>
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                )}
                                <h4 className={`font-bold text-stone-100 group-hover:text-${role.color}-400 transition-colors`}>{role.name}</h4>
                                <p className="text-xs text-stone-400 mt-1 leading-relaxed">{role.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 p-8 relative flex flex-col">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors z-10"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-stone-100">Add Team Member</h2>
                        <p className="text-sm text-stone-400 mt-1">Invite a new administrator to your team.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                        <div>
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-9 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-9 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    placeholder="john@oronex.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-auto pt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-transparent hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-xl transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-900/20 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

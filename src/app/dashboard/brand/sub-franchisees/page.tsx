'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    MapPin,
    MoreHorizontal,
    CheckCircle,
    Clock,
    XCircle,
    Shield
} from 'lucide-react'

// Simple mock components for UI speed (in real app, use shared UI lib)
const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => {
    const colors: any = {
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        red: 'bg-red-500/10 text-red-400 border-red-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.blue}`}>
            {children}
        </span>
    )
}

export default function SubFranchiseesPage() {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [subFranchisees, setSubFranchisees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

    useEffect(() => {
        fetchSubFranchisees()
    }, [])

    const fetchSubFranchisees = async () => {
        try {
            const res = await fetch('/api/brand/sub-franchisees')
            if (res.ok) {
                const data = await res.json()
                setSubFranchisees(data)
            }
        } catch (error) {
            console.error('Failed to load sub-franchisees:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Sub-Franchisees</h1>
                    <p className="text-stone-400 mt-2">Manage your franchise operators and their permissions.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Invite Operator
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            ) : subFranchisees.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-stone-700">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-800/50 mb-4">
                        <Users className="h-8 w-8 text-stone-600" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-200">No Sub-Franchisees Yet</h3>
                    <p className="text-stone-500 mt-2 max-w-sm mx-auto">
                        Invite your first operator to start managing multiple locations under your brand.
                    </p>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="mt-6 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors border border-stone-700/50"
                    >
                        Send Invitation
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {subFranchisees.map((sf) => (
                        <div key={sf.id} className="glass-panel p-6 rounded-xl hover:border-stone-600 transition-all group">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-900/20">
                                        {sf.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold text-stone-100">{sf.name}</h3>
                                            <Badge color={sf.status === 'ACTIVE' ? 'green' : 'yellow'}>
                                                {sf.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {sf.email}
                                            </span>
                                            {sf.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {sf.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-800">
                                    <div className="text-center px-4 border-r border-stone-800">
                                        <p className="text-2xl font-bold text-stone-200">{sf.franchises?.length || 0}</p>
                                        <p className="text-xs text-stone-500">Locations</p>
                                    </div>
                                    <div className="text-center px-4">
                                        <p className="text-2xl font-bold text-stone-200">
                                            {sf.invitedAt ? new Date(sf.invitedAt).toLocaleDateString() : '-'}
                                        </p>
                                        <p className="text-xs text-stone-500">Invited</p>
                                    </div>
                                    <button className="p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-200">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Permissions Summary (Mock) */}
                            {sf.permissions && (
                                <div className="mt-4 pt-4 border-t border-stone-800/50 flex items-center gap-2 text-xs text-stone-500">
                                    <Shield className="h-3 w-3" />
                                    <span>Permissions: Custom</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Invite Modal (Inline for speed) */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-stone-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-stone-100">Invite Operator</h2>
                            <button onClick={() => setIsInviteModalOpen(false)} className="text-stone-500 hover:text-stone-300">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <InviteForm onClose={() => { setIsInviteModalOpen(false); fetchSubFranchisees(); }} />
                    </div>
                </div>
            )}
        </div>
    )
}

function InviteForm({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            permissions: {
                canEditPricing: formData.get('perm_pricing') === 'on',
                canEditServices: formData.get('perm_services') === 'on'
            }
        }

        try {
            const res = await fetch('/api/brand/sub-franchisees/invite', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || 'Failed to invite')
            }

            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Operator Name</label>
                    <input name="name" required className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-100 focus:ring-2 focus:ring-orange-500/50 outline-none" placeholder="e.g. John Doe" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Email Address</label>
                    <input name="email" type="email" required className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-100 focus:ring-2 focus:ring-orange-500/50 outline-none" placeholder="john@example.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Phone (Optional)</label>
                    <input name="phone" className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-100 focus:ring-2 focus:ring-orange-500/50 outline-none" placeholder="+1 (555) 000-0000" />
                </div>

                <div className="pt-2">
                    <p className="text-sm font-medium text-stone-400 mb-2">Initial Permissions</p>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="perm_pricing" className="rounded bg-stone-800 border-stone-700 text-orange-500 focus:ring-orange-500" />
                            <span className="text-stone-300 text-sm">Can edit pricing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="perm_services" className="rounded bg-stone-800 border-stone-700 text-orange-500 focus:ring-orange-500" />
                            <span className="text-stone-300 text-sm">Can add/remove services</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg font-medium transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                    {loading ? 'Sending...' : 'Send Invite'}
                </button>
            </div>
        </form>
    )
}

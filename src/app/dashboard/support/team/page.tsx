'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Users,
    Plus,
    Mail,
    Phone,
    Headphones,
    Trash2,
    Edit2,
    X,
    Check,
    Shield
} from 'lucide-react'

interface SupportTeamMember {
    id: string
    name: string
    email: string
    phone?: string
    role: string
    canAccessSupport: boolean
    createdAt: string
}

export default function SupportTeamPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [teamMembers, setTeamMembers] = useState<SupportTeamMember[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    })
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchTeamMembers()
    }, [])

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch('/api/support/team')
            if (res.ok) {
                const data = await res.json()
                setTeamMembers(data)
            }
        } catch (error) {
            console.error('Failed to fetch team:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const addTeamMember = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            alert('Please fill in all required fields')
            return
        }

        setIsSaving(true)
        try {
            const res = await fetch('/api/support/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setShowAddModal(false)
                setFormData({ name: '', email: '', phone: '', password: '' })
                fetchTeamMembers()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to add team member')
            }
        } catch (error) {
            console.error('Failed to add team member:', error)
            alert('Failed to add team member')
        } finally {
            setIsSaving(false)
        }
    }

    const removeTeamMember = async (id: string) => {
        if (!confirm('Are you sure you want to remove this team member?')) return

        try {
            const res = await fetch(`/api/support/team/${id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                fetchTeamMembers()
            }
        } catch (error) {
            console.error('Failed to remove team member:', error)
        }
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-indigo-400" />
                        </div>
                        Support Team
                    </h1>
                    <p className="text-stone-400 mt-1">
                        Manage your support staff who can respond to customer messages
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Team Member
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <Headphones className="h-5 w-5 text-indigo-400 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-indigo-300">How it works</h3>
                        <p className="text-sm text-stone-400 mt-1">
                            Support team members can log in with their email and password. They will only see the Support Inbox
                            and can respond to customer messages.
                        </p>
                    </div>
                </div>
            </div>

            {/* Team List */}
            <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-800">
                    <h2 className="font-semibold text-white">Team Members ({teamMembers.length})</h2>
                </div>

                {teamMembers.length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No support team members yet</p>
                        <p className="text-sm mt-1">Add team members to help respond to customer messages</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-800">
                        {teamMembers.map(member => (
                            <div
                                key={member.id}
                                className="px-6 py-4 flex items-center justify-between hover:bg-stone-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                        <span className="text-lg font-bold text-indigo-400">
                                            {member.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">{member.name}</h3>
                                        <div className="flex items-center gap-4 text-sm text-stone-500">
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                {member.email}
                                            </span>
                                            {member.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {member.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-medium flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        Support Staff
                                    </span>
                                    <button
                                        onClick={() => removeTeamMember(member.id)}
                                        className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-stone-900 rounded-2xl border border-stone-700 w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Add Support Team Member</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-stone-500 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">
                                    Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="John Smith"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">
                                    Email <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    placeholder="(555) 123-4567"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">
                                    Password <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="password"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white placeholder:text-stone-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-stone-500 mt-1">
                                    They will use this to log in to the support dashboard
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-stone-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-stone-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addTeamMember}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Add Member
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { User, Lock, Mail, Briefcase, Check } from 'lucide-react'
import SetPinModal from '@/components/profile/SetPinModal'

export default function ProfilePage() {
    const { data: session } = useSession()
    const [showPinModal, setShowPinModal] = useState(false)
    const [pinSuccess, setPinSuccess] = useState(false)

    const handlePinSuccess = () => {
        setPinSuccess(true)
        setTimeout(() => setPinSuccess(false), 3000)
    }

    return (
        <div className="min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/10 via-stone-950 to-stone-950 p-6">
            <SetPinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handlePinSuccess}
            />

            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-semibold text-stone-100 mb-2">
                        My Profile
                    </h1>
                    <p className="text-stone-400">Manage your account settings and preferences</p>
                </div>

                {pinSuccess && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in">
                        <Check className="h-5 w-5 text-emerald-400" />
                        <p className="text-emerald-300 font-medium">PIN updated successfully!</p>
                    </div>
                )}

                <div className="glass-panel rounded-2xl overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-8 text-white rounded-t-2xl">
                        <div className="flex items-center gap-6">
                            <div className="h-24 w-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/30">
                                <User className="h-12 w-12" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{session?.user?.name || 'User'}</h2>
                                <p className="text-orange-100">{session?.user?.email}</p>
                                <div className="mt-2 inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium">
                                    {(session?.user as any)?.role || 'USER'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="p-8 space-y-6 bg-stone-900/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-2 bg-blue-500/20 rounded-lg">
                                    <Mail className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-stone-500 mb-1">Email Address</p>
                                    <p className="font-medium text-stone-100">{session?.user?.email || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-2 bg-purple-500/20 rounded-lg">
                                    <Briefcase className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-stone-500 mb-1">Role</p>
                                    <p className="font-medium text-stone-100 capitalize">
                                        {((session?.user as any)?.role || 'user').toLowerCase()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className="pt-6 border-t border-stone-800">
                            <h3 className="text-lg font-semibold text-stone-100 mb-4 flex items-center gap-2">
                                <Lock className="h-5 w-5 text-stone-400" />
                                Security Settings
                            </h3>

                            <div className="bg-stone-900/50 rounded-xl p-6 border border-stone-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-medium text-stone-100 mb-1">Lock Terminal PIN</h4>
                                        <p className="text-sm text-stone-400">
                                            Set a 4-digit PIN to quickly unlock the POS terminal without re-entering your password.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowPinModal(true)}
                                        className="ml-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-colors font-medium whitespace-nowrap shadow-lg shadow-orange-900/20"
                                    >
                                        Set PIN
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Section (if applicable) */}
                        {(session?.user as any)?.role !== 'ADMIN' && (session?.user as any)?.role !== 'FRANCHISOR' && (
                            <div className="pt-6 border-t border-stone-800">
                                <h3 className="text-lg font-semibold text-stone-100 mb-4">Permissions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Add Services', key: 'canAddServices' },
                                        { label: 'Add Products', key: 'canAddProducts' },
                                        { label: 'Manage Inventory', key: 'canManageInventory' },
                                        { label: 'View Reports', key: 'canViewReports' },
                                        { label: 'Process Refunds', key: 'canProcessRefunds' },
                                        { label: 'Manage Schedule', key: 'canManageSchedule' },
                                        { label: 'Manage Employees', key: 'canManageEmployees' },
                                    ].map((perm) => (
                                        <div
                                            key={perm.key}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium ${(session?.user as any)?.[perm.key]
                                                ? 'bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/30'
                                                : 'bg-stone-800 text-stone-500'
                                                }`}
                                        >
                                            {perm.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}


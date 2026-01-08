'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { AlertTriangle, LogOut, Download, Mail, Calendar } from 'lucide-react'

export default function AccountSuspendedPage() {
    const { data: session } = useSession()
    const [accountInfo, setAccountInfo] = useState<{
        status: string
        suspendedReason?: string
        scheduledDeletionAt?: string
    } | null>(null)

    useEffect(() => {
        // Fetch account status
        fetch('/api/account/status')
            .then(r => r.json())
            .then(data => setAccountInfo(data))
            .catch(() => { })
    }, [])

    const daysRemaining = accountInfo?.scheduledDeletionAt
        ? Math.max(0, Math.ceil((new Date(accountInfo.scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-stone-900 border border-stone-700 rounded-2xl p-8 text-center">
                {/* Warning Icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-2">
                    Account {accountInfo?.status === 'PENDING_DELETION' ? 'Scheduled for Deletion' : 'Suspended'}
                </h1>

                {/* Reason */}
                {accountInfo?.suspendedReason && (
                    <p className="text-gray-400 mb-6">
                        Reason: {accountInfo.suspendedReason}
                    </p>
                )}

                {/* Deletion Countdown */}
                {accountInfo?.status === 'PENDING_DELETION' && daysRemaining !== null && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-red-300 mb-2">
                            <Calendar className="w-5 h-5" />
                            <span className="font-semibold">Data Deletion in {daysRemaining} Days</span>
                        </div>
                        <p className="text-sm text-red-200/70">
                            All your data will be permanently deleted on {new Date(accountInfo.scheduledDeletionAt!).toLocaleDateString()}.
                            Contact support if you need to export your data.
                        </p>
                    </div>
                )}

                {/* What This Means */}
                <div className="bg-stone-800 rounded-xl p-4 mb-6 text-left">
                    <h3 className="text-white font-medium mb-3">What this means:</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start gap-2">
                            <span className="text-red-400">✕</span>
                            You cannot access the POS or dashboard
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400">✕</span>
                            Your employees cannot log in
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            Your data is preserved (for now)
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <a
                        href="mailto:support@oropos.com?subject=Account Reactivation Request"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        Contact Support
                    </a>

                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

                {/* User Info */}
                {session?.user && (
                    <p className="text-xs text-gray-500 mt-6">
                        Logged in as: {session.user.email}
                    </p>
                )}
            </div>
        </div>
    )
}


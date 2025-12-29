'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { CreditCard, Mail, Phone, RefreshCw, CheckCircle } from 'lucide-react'

export default function PaymentDuePage() {
    const { data: session } = useSession()
    const [accountInfo, setAccountInfo] = useState<{
        status: string
        suspendedReason?: string
    } | null>(null)
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        fetchStatus()
    }, [])

    const fetchStatus = async () => {
        setChecking(true)
        try {
            const res = await fetch('/api/account/status')
            const data = await res.json()
            setAccountInfo(data)

            // If status is now ACTIVE, redirect to dashboard
            if (data.status === 'ACTIVE') {
                window.location.href = '/dashboard'
            }
        } catch (e) {
            console.error('Failed to fetch status')
        } finally {
            setChecking(false)
        }
    }

    // Extract amount from reason if present
    const amountMatch = accountInfo?.suspendedReason?.match(/\$(\d+(?:\.\d{2})?)/)
    const amountDue = amountMatch ? amountMatch[0] : 'N/A'

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-stone-900 border border-stone-700 rounded-2xl p-8 text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <CreditCard className="w-10 h-10 text-amber-400" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-2">
                    Payment Required
                </h1>

                <p className="text-gray-400 mb-6">
                    Your access is temporarily restricted due to an outstanding payment.
                </p>

                {/* Amount Due Card */}
                <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-6 mb-6">
                    <p className="text-sm text-amber-200/70 mb-2">Amount Due</p>
                    <p className="text-4xl font-bold text-amber-300">{amountDue}</p>
                    {accountInfo?.suspendedReason && (
                        <p className="text-xs text-amber-200/50 mt-2">
                            {accountInfo.suspendedReason}
                        </p>
                    )}
                </div>

                {/* What's Happening */}
                <div className="bg-stone-800 rounded-xl p-4 mb-6 text-left">
                    <h3 className="text-white font-medium mb-3">Why am I seeing this?</h3>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-400">•</span>
                            Your monthly subscription payment is past due
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            Your data is safe and will NOT be deleted
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            Access will be restored immediately upon payment
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {/* Check Status Button */}
                    <button
                        onClick={fetchStatus}
                        disabled={checking}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {checking ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        {checking ? 'Checking...' : 'I\'ve Made My Payment'}
                    </button>

                    <a
                        href="mailto:billing@oropos.com?subject=Payment Inquiry"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        Contact Billing
                    </a>

                    <a
                        href="tel:+18001234567"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-stone-800 hover:bg-stone-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        Call Support
                    </a>
                </div>

                {/* User Info */}
                {session?.user && (
                    <div className="mt-6 pt-4 border-t border-stone-700">
                        <p className="text-xs text-gray-500">
                            Account: {session.user.email}
                        </p>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="text-xs text-gray-400 hover:text-white mt-2"
                        >
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

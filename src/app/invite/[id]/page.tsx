'use client'

import { useSession } from "next-auth/react"
import { redirect, useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, ArrowRight, Building2 } from "lucide-react"
import Link from "next/link"

export default function AcceptInvitePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // Redirect to login but keep the current URL as callback
            const currentPath = window.location.pathname
            redirect(`/login?callbackUrl=${encodeURIComponent(currentPath)}`)
        },
    })

    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleAccept = async () => {
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/accept-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subFranchiseeId: params.id })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to accept invitation')
            }

            setSuccess(true)
            // Redirect after a short delay
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-stone-800 shadow-2xl">
                {!success ? (
                    <>
                        <div className="text-center mb-8">
                            <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-900/20 mb-6">
                                <Building2 className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-stone-100 mb-2">Join Franchise Brand</h1>
                            <p className="text-stone-400">
                                You have been invited to manage a franchise location.
                            </p>
                        </div>

                        <div className="bg-stone-900/50 rounded-xl p-4 mb-8 border border-stone-800">
                            <p className="text-sm text-stone-500 mb-1 uppercase tracking-wider font-semibold">Accepting as</p>
                            <div className="flex items-center gap-3">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt={session.user.name || ''} className="h-10 w-10 rounded-full" />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-stone-700 flex items-center justify-center text-stone-300 font-bold">
                                        {session?.user?.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-stone-200">{session?.user?.name}</p>
                                    <p className="text-sm text-stone-500">{session?.user?.email}</p>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-stone-500 text-center">
                                Not you? <button onClick={() => window.location.href = '/api/auth/signout'} className="text-orange-500 hover:text-orange-400 font-medium">Sign out</button>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-400">{error}</div>
                            </div>
                        )}

                        <button
                            onClick={handleAccept}
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    Accept Invitation <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <div className="h-20 w-20 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center mb-6">
                            <CheckCircle className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-emerald-400 mb-2">Welcome Aboard!</h2>
                        <p className="text-stone-400 mb-8">
                            Your account has been successfully linked. Redirecting you to your dashboard...
                        </p>
                        <div className="animate-pulse text-sm text-stone-500">
                            Please wait...
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

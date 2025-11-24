'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { CheckCircle, XCircle, Lock, Loader2, ArrowRight } from 'lucide-react'
import AuraLogo from '@/components/ui/AuraLogo'

export default function MagicLinkPage({ params }: { params: { token: string } }) {
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading')
    const [error, setError] = useState('')
    const [user, setUser] = useState<{ id: string, name: string, email: string } | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        validateToken()
    }, [])

    const validateToken = async () => {
        try {
            const res = await fetch(`/api/auth/magic-link/${params.token}`)
            const data = await res.json()

            if (res.ok) {
                setUser(data.user)
                setStatus('valid')
            } else {
                setError(data.error || 'Invalid or expired link')
                setStatus('invalid')
            }
        } catch (err) {
            setError('An error occurred while validating the link')
            setStatus('invalid')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            // Set password
            const res = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, password })
            })

            if (!res.ok) {
                throw new Error('Failed to set password')
            }

            // Auto login
            const result = await signIn('credentials', {
                email: user?.email,
                password,
                redirect: false
            })

            if (result?.error) {
                throw new Error('Login failed')
            }

            setStatus('success')
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)

        } catch (err: any) {
            setError(err.message || 'An error occurred')
            setSubmitting(false)
        }
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">Verifying your secure link...</p>
                </div>
            </div>
        )
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
                    <p className="text-gray-600 mb-6">Your account is ready. Redirecting to dashboard...</p>
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <AuraLogo />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
                    <p className="text-gray-600 mt-2">Set your password to complete setup.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                Complete Setup
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

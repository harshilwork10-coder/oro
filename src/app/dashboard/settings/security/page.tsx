'use client'

import { useSession } from 'next-auth/react'
import { ArrowLeft, Shield, Key, Clock, Smartphone } from 'lucide-react'
import Link from 'next/link'
import MFASettings from '@/components/security/MFASettings'

export default function SecuritySettingsPage() {
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Settings
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Security Settings</h1>
                            <p className="text-gray-400">Manage your account security and authentication</p>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                {session?.user && (
                    <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                        </div>
                        <div>
                            <p className="font-semibold text-white">{session.user.name || 'User'}</p>
                            <p className="text-sm text-gray-400">{session.user.email}</p>
                        </div>
                        <div className="ml-auto px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                            {(session.user as any).role}
                        </div>
                    </div>
                )}

                {/* Security Sections */}
                <div className="space-y-6">
                    {/* MFA Section */}
                    <MFASettings />

                    {/* Session Info */}
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Active Sessions</h3>
                                <p className="text-sm text-gray-400">Manage devices where you&apos;re logged in</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-green-400" />
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">Current Session</p>
                                    <p className="text-gray-400 text-xs">This device • Active now</p>
                                </div>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm mt-3">
                            Session management across devices coming soon.
                        </p>
                    </div>

                    {/* Password Section */}
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Key className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Password</h3>
                                <p className="text-sm text-gray-400">Last changed: Unknown</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                            Change Password
                        </button>
                    </div>

                    {/* Security Tips */}
                    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/30">
                        <h3 className="font-semibold text-white mb-3">🔒 Security Tips</h3>
                        <ul className="space-y-2 text-gray-300 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                Enable two-factor authentication for extra security
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                Use a unique, strong password you don&apos;t use elsewhere
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                Save your backup codes in a secure location
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                Review active sessions regularly
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { signOut } from 'next-auth/react'
import { AlertTriangle, Mail, Phone, LogOut } from 'lucide-react'

export default function AccountSuspendedPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Card */}
                <div className="bg-stone-800/50 backdrop-blur-xl rounded-2xl border border-stone-700 p-8 shadow-2xl">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-red-500/20 rounded-full">
                            <AlertTriangle className="h-12 w-12 text-red-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-center text-white mb-2">
                        Account Suspended
                    </h1>

                    {/* Message */}
                    <p className="text-stone-400 text-center mb-8">
                        Your account access has been temporarily suspended. This may be due to a payment issue or account review.
                    </p>

                    {/* Divider */}
                    <div className="border-t border-stone-700 my-6" />

                    {/* Contact Info */}
                    <div className="space-y-4 mb-8">
                        <h3 className="text-sm font-medium text-stone-300 text-center">
                            Contact Support to Resolve
                        </h3>

                        <a
                            href="mailto:support@Oropos.com"
                            className="flex items-center gap-3 p-3 bg-stone-900/50 rounded-lg hover:bg-stone-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Mail className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Email</p>
                                <p className="text-stone-200 group-hover:text-purple-400 transition-colors">
                                    support@Oropos.com
                                </p>
                            </div>
                        </a>

                        <a
                            href="tel:+18001234567"
                            className="flex items-center gap-3 p-3 bg-stone-900/50 rounded-lg hover:bg-stone-700/50 transition-colors group"
                        >
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <Phone className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Phone</p>
                                <p className="text-stone-200 group-hover:text-emerald-400 transition-colors">
                                    1-800-123-4567
                                </p>
                            </div>
                        </a>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="w-full py-3 px-4 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>

                {/* Footer text */}
                <p className="text-center text-stone-500 text-sm mt-6">
                    If you believe this is an error, please contact us immediately.
                </p>
            </div>
        </div>
    )
}


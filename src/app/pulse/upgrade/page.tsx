'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Zap, CheckCircle, Phone, Mail } from 'lucide-react'
import OroLogo from '@/components/ui/OroLogo'

export default function PulseUpgradePage() {
    const router = useRouter()
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        // Check if user actually has access (maybe they landed here by mistake)
        const checkAccess = async () => {
            try {
                const res = await fetch('/api/pulse/access')
                const data = await res.json()
                if (data.hasAccess) {
                    router.push('/pulse')
                }
            } catch (e) {
                console.error(e)
            } finally {
                setChecking(false)
            }
        }
        checkAccess()
    }, [router])

    if (checking) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-4 py-8">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <OroLogo size={48} showText={false} />
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <span className="text-orange-500">Oro</span>
                                <span className="text-gray-300">Pulse</span>
                                <Zap className="w-5 h-5 text-yellow-400" />
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Lock Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Lock className="w-12 h-12 text-orange-400" />
                    </div>
                </div>

                {/* Message */}
                <div className="text-center mb-8">
                    <h2 className="text-xl font-bold mb-2">Upgrade Required</h2>
                    <p className="text-gray-400">
                        Oro Pulse is a premium feature that lets you monitor your business from anywhere on your phone.
                    </p>
                </div>

                {/* Features */}
                <div className="bg-gray-800/50 rounded-2xl p-5 mb-6 border border-gray-700">
                    <h3 className="font-semibold mb-4 text-orange-400">What You Get:</h3>
                    <ul className="space-y-3">
                        {[
                            'Live sales dashboard on your phone',
                            'Real-time void & refund alerts',
                            'See who\'s clocked in',
                            'Top selling products today',
                            'Cash drawer monitoring',
                            'Auto-refresh every 30 seconds'
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-3 text-gray-300">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact */}
                <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-2xl p-5 text-center">
                    <h3 className="font-bold text-lg mb-2">Ready to Upgrade?</h3>
                    <p className="text-orange-100 text-sm mb-4">
                        Contact your Oro representative to add Pulse to your subscription.
                    </p>
                    <div className="flex flex-col gap-2">
                        <a
                            href="tel:+18001234567"
                            className="flex items-center justify-center gap-2 bg-white text-orange-600 rounded-xl py-3 font-bold active:scale-95 transition-transform"
                        >
                            <Phone className="w-5 h-5" />
                            Call Support
                        </a>
                        <a
                            href="mailto:sales@oro.com"
                            className="flex items-center justify-center gap-2 bg-white/20 text-white rounded-xl py-3 font-semibold active:scale-95 transition-transform"
                        >
                            <Mail className="w-5 h-5" />
                            Email Sales
                        </a>
                    </div>
                </div>

                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full mt-4 py-3 text-gray-400 text-sm"
                >
                    ← Back to Dashboard
                </button>
            </div>
        </div>
    )
}

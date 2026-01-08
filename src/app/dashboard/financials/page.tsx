'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    DollarSign,
    CreditCard,
    FileText,
    TrendingUp,
    ArrowRightLeft,
    Users,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function FinancialsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-stone-100">Financial Management</h1>
                <p className="text-stone-400 mt-2">Track revenue, fees, and financial analytics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
                    <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-100">Processing Fees</h3>
                        <p className="text-sm text-stone-400 mt-1">Monitor payment processing revenue</p>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
                    <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                        <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-100">Invoicing</h3>
                        <p className="text-sm text-stone-400 mt-1">Generate and manage invoices</p>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex items-start gap-4">
                    <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                        <DollarSign className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-100">Revenue Analytics</h3>
                        <p className="text-sm text-stone-400 mt-1">Detailed financial reports and insights</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-blue-500/20">
                <p className="text-sm text-blue-400">
                    <strong>Note:</strong> Financial management features require payment gateway integration and will be implemented in a future update.
                </p>
            </div>
            {/* Configuration Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/dashboard/financials/split-payouts" className="glass-panel p-6 rounded-xl hover:border-emerald-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
                            <ArrowRightLeft className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-100">Split Payouts</h3>
                            <p className="text-sm text-stone-500">Configure automated royalty & fee distribution</p>
                        </div>
                        <ArrowRight className="ml-auto h-5 w-5 text-stone-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                </Link>

                <Link href="/dashboard/financials/commissions" className="glass-panel p-6 rounded-xl hover:border-blue-500/50 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-100">Commission Rules</h3>
                            <p className="text-sm text-stone-500">Manage staff compensation tiers</p>
                        </div>
                        <ArrowRight className="ml-auto h-5 w-5 text-stone-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                </Link>
            </div>
        </div>
    )
}


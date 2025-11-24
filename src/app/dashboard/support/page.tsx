'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Headphones, MessageSquare, CheckCircle, Clock } from 'lucide-react'

export default function SupportPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full"></div>
                        <div className="relative h-20 w-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-900/20">
                            <Headphones className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-stone-100 mb-2">Support Ticketing</h1>
                    <p className="text-stone-400">Coming Soon</p>
                </div>

                <div className="glass-panel p-8 rounded-2xl mb-6">
                    <h2 className="text-xl font-bold text-stone-100 mb-4">Planned Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            <MessageSquare className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Ticket Creation</h3>
                                <p className="text-sm text-stone-400 mt-1">Franchisees can submit support requests</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <Clock className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Status Tracking</h3>
                                <p className="text-sm text-stone-400 mt-1">Track ticket progress and resolution</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                            <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Resolution Management</h3>
                                <p className="text-sm text-stone-400 mt-1">Assign and resolve support tickets</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <Headphones className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-medium text-stone-100">Priority Levels</h3>
                                <p className="text-sm text-stone-400 mt-1">Categorize tickets by urgency</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                    <p className="text-sm text-amber-200">
                        <strong>Note:</strong> For now, consider using external support tools like Zendesk, Intercom, or Freshdesk. Native ticketing will be added in a future update.
                    </p>
                </div>
            </div>
        </div>
    )
}

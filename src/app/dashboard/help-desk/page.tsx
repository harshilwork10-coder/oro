'use client'

import { Phone, Mail } from 'lucide-react'

export default function HelpDeskPage() {
    return (
        <div className="p-6 bg-stone-950 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Simple Support Line */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                    <h1 className="text-xl font-bold text-white mb-4">Need Help?</h1>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                        <a
                            href="tel:+16305551234"
                            className="flex items-center gap-2 text-stone-300 hover:text-emerald-400 transition-colors"
                        >
                            <Phone className="h-4 w-4" />
                            <span className="font-medium">630-408-xxxx</span>
                        </a>
                        <span className="text-stone-700">|</span>
                        <a
                            href="mailto:support@oro9.com"
                            className="flex items-center gap-2 text-stone-300 hover:text-emerald-400 transition-colors"
                        >
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">support@oro9.com</span>
                        </a>
                        <span className="text-stone-500 ml-auto">24/7 Support</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

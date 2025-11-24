'use client'

import { Construction, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ComingSoonProps {
    title: string
    description?: string
}

export default function ComingSoon({ title, description = "This feature is currently under development and will be available in a future update." }: ComingSoonProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="h-24 w-24 bg-stone-900 rounded-full flex items-center justify-center mb-6 border border-stone-800 shadow-xl shadow-orange-900/10">
                <Construction className="h-10 w-10 text-orange-500" />
            </div>
            <h1 className="text-4xl font-bold text-stone-100 mb-4">{title}</h1>
            <p className="text-stone-400 max-w-md mb-8 text-lg">{description}</p>
            <Link
                href="/dashboard"
                className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 transition-all flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
            </Link>
        </div>
    )
}

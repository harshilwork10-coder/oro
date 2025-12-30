'use client'

import { MapPin, Plus } from 'lucide-react'
import Link from 'next/link'

export default function TerritoriesPage() {
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Territories</h1>
                    <p className="text-stone-400 mt-1">Manage your franchise territories and availability</p>
                </div>
                <Link
                    href="/dashboard/territories/new"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Territory
                </Link>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <MapPin className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Territories Yet</h3>
                <p className="text-stone-400 max-w-md mx-auto mb-6">
                    Start defining your franchise territories to track availability and sales regions.
                </p>
                <Link
                    href="/dashboard/territories/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="h-5 w-5" />
                    Create Your First Territory
                </Link>
            </div>
        </div>
    )
}


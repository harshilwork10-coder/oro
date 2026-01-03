'use client'

import { Briefcase, Plus, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function ServicesCatalogPage() {
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Services Catalog</h1>
                    <p className="text-stone-400 mt-1">Manage services offered across your franchise network</p>
                </div>
                <Link
                    href="/dashboard/services/catalog/new"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Service
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Briefcase className="h-6 w-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-stone-400 text-sm">Total Services</p>
                    <p className="text-3xl font-bold text-white mt-1">0</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                            <DollarSign className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-stone-400 text-sm">Avg Price</p>
                    <p className="text-3xl font-bold text-white mt-1">$0</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Briefcase className="h-6 w-6 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-stone-400 text-sm">Categories</p>
                    <p className="text-3xl font-bold text-white mt-1">0</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <Briefcase className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Services Defined</h3>
                <p className="text-stone-400 max-w-md mx-auto mb-6">
                    Build your service catalog to standardize offerings across all franchise locations.
                </p>
                <Link
                    href="/dashboard/services/catalog/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="h-5 w-5" />
                    Add Your First Service
                </Link>
            </div>
        </div>
    )
}


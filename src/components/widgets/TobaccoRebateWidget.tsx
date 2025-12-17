'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Package, TrendingUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface RebateData {
    weekly: {
        packCount: number
        cartonCount: number
        estimatedRebate: number
    }
    monthly: {
        packCount: number
        cartonCount: number
        loyaltyBonus: number
        estimatedRebate: number
    }
    rates: {
        packRate: number
        cartonRate: number
    }
    activeDeals: number
    configuredManufacturers: number
}

export default function TobaccoRebateWidget() {
    const [data, setData] = useState<RebateData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/tobacco-scan/rebate-estimate')
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (error) {
                console.error('Failed to fetch rebate data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)
    }

    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-xl animate-pulse">
                <div className="h-4 bg-stone-700 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-stone-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-stone-700 rounded w-2/3"></div>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-100 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    Tobacco Rebates
                </h3>
                <Link
                    href="/dashboard/reports/tobacco-scan/deals"
                    className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                    Manage Deals
                    <ExternalLink className="h-3 w-3" />
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-stone-500 uppercase mb-1">This Week</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(data.weekly.estimatedRebate)}</p>
                    <p className="text-xs text-stone-500">
                        {data.weekly.packCount} packs · {data.weekly.cartonCount} cartons
                    </p>
                </div>
                <div>
                    <p className="text-xs text-stone-500 uppercase mb-1">This Month</p>
                    <p className="text-2xl font-bold text-purple-400">{formatCurrency(data.monthly.estimatedRebate)}</p>
                    <p className="text-xs text-stone-500">
                        {data.monthly.loyaltyBonus > 0 && `+${formatCurrency(data.monthly.loyaltyBonus)} bonus`}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-stone-700 pt-3">
                <div className="flex items-center gap-4">
                    <span className="text-stone-500">
                        <Package className="h-4 w-4 inline mr-1" />
                        {data.configuredManufacturers}/3 configured
                    </span>
                    <span className="text-stone-500">
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        {data.activeDeals} active deals
                    </span>
                </div>
            </div>
        </div>
    )
}

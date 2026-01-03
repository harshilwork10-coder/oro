'use client'

import { useState, useCallback } from 'react'
import type { LiveStats, StoreBreakdown, TopSeller, LowStockItem, EmployeeOnClock, PaymentBreakdown } from './types'

interface UsePulseStatsReturn {
    stats: LiveStats
    storeBreakdown: StoreBreakdown[]
    topSellers: TopSeller[]
    lowStockItems: LowStockItem[]
    employeesOnClock: EmployeeOnClock[]
    paymentBreakdown: PaymentBreakdown
    taxCollected: number
    voidCount: number
    refundCount: number
    loading: boolean
    error: string | null
    fetchStats: (locationId?: string, allowedLocationIds?: string[] | null) => Promise<void>
}

const defaultStats: LiveStats = {
    todaySales: 0,
    yesterdaySales: 0,
    weekSales: 0,
    transactionCount: 0,
    averageTicket: 0
}

/**
 * Custom hook for fetching Pulse dashboard statistics
 */
export function usePulseStats(): UsePulseStatsReturn {
    const [stats, setStats] = useState<LiveStats>(defaultStats)
    const [storeBreakdown, setStoreBreakdown] = useState<StoreBreakdown[]>([])
    const [topSellers, setTopSellers] = useState<TopSeller[]>([])
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
    const [employeesOnClock, setEmployeesOnClock] = useState<EmployeeOnClock[]>([])
    const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({ cash: 0, card: 0, other: 0 })
    const [taxCollected, setTaxCollected] = useState(0)
    const [voidCount, setVoidCount] = useState(0)
    const [refundCount, setRefundCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = useCallback(async (
        locationId?: string,
        allowedLocationIds?: string[] | null
    ) => {
        setLoading(true)
        setError(null)

        try {
            // Build location filter
            let locationParam = ''
            if (locationId && locationId !== 'all') {
                locationParam = `?locationId=${locationId}`
            } else if (allowedLocationIds && allowedLocationIds.length > 0) {
                locationParam = `?locationIds=${allowedLocationIds.join(',')}`
            }

            // Parallel fetch all data
            const [statsRes, breakdownRes, topRes, lowStockRes, employeesRes, paymentsRes] = await Promise.all([
                fetch(`/api/pulse/stats${locationParam}`),
                fetch(`/api/pulse/breakdown${locationParam}`),
                fetch(`/api/pulse/top-sellers${locationParam}`),
                fetch(`/api/pulse/low-stock${locationParam}`),
                fetch(`/api/pulse/employees-on-clock${locationParam}`),
                fetch(`/api/pulse/payments${locationParam}`)
            ])

            if (statsRes.ok) {
                const data = await statsRes.json()
                setStats({
                    todaySales: data.todaySales || 0,
                    yesterdaySales: data.yesterdaySales || 0,
                    weekSales: data.weekSales || 0,
                    transactionCount: data.transactionCount || 0,
                    averageTicket: data.averageTicket || 0
                })
            }

            if (breakdownRes.ok) {
                const data = await breakdownRes.json()
                setStoreBreakdown(data.breakdown || [])
            }

            if (topRes.ok) {
                const data = await topRes.json()
                setTopSellers(data.topSellers || [])
            }

            if (lowStockRes.ok) {
                const data = await lowStockRes.json()
                setLowStockItems(data.items || [])
            }

            if (employeesRes.ok) {
                const data = await employeesRes.json()
                setEmployeesOnClock(data.employees || [])
            }

            if (paymentsRes.ok) {
                const data = await paymentsRes.json()
                setPaymentBreakdown({
                    cash: data.cash || 0,
                    card: data.card || 0,
                    other: data.other || 0
                })
                setTaxCollected(data.taxCollected || 0)
                setVoidCount(data.voidCount || 0)
                setRefundCount(data.refundCount || 0)
            }
        } catch (err) {
            console.error('Error fetching pulse stats:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        stats,
        storeBreakdown,
        topSellers,
        lowStockItems,
        employeesOnClock,
        paymentBreakdown,
        taxCollected,
        voidCount,
        refundCount,
        loading,
        error,
        fetchStats
    }
}

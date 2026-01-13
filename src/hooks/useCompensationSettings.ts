'use client'

import { useState, useEffect } from 'react'

interface CompensationSettings {
    compensationType: string | null
    requiresTimeClock: boolean
    canSetOwnPrices: boolean
    commissionSplit?: number | null
    hourlyRate?: number | null
    salaryAmount?: number | null
    chairRentAmount?: number | null
}

export function useCompensationSettings() {
    const [settings, setSettings] = useState<CompensationSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/employees/compensation-settings')
                if (res.ok) {
                    const data = await res.json()
                    setSettings(data)
                } else {
                    // Not an employee or no compensation plan - use defaults
                    setSettings({
                        compensationType: null,
                        requiresTimeClock: false,
                        canSetOwnPrices: false,
                    })
                }
            } catch (err) {
                console.error('Failed to fetch compensation settings:', err)
                setError('Failed to load settings')
                setSettings({
                    compensationType: null,
                    requiresTimeClock: false,
                    canSetOwnPrices: false,
                })
            } finally {
                setLoading(false)
            }
        }

        fetchSettings()
    }, [])

    return { settings, loading, error }
}

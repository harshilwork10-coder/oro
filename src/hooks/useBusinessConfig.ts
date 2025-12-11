'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export interface BusinessConfig {
    id: string | null
    franchisorId: string
    // Core Features
    usesCommissions: boolean
    usesInventory: boolean
    usesAppointments: boolean
    usesScheduling: boolean
    usesVirtualKeypad: boolean
    // Customer Features
    usesLoyalty: boolean
    usesGiftCards: boolean
    usesMemberships: boolean
    usesReferrals: boolean
    // Financial Features
    usesRoyalties: boolean
    usesTipping: boolean
    usesDiscounts: boolean
    // Tax Configuration
    taxRate: number
    taxServices: boolean
    taxProducts: boolean
    // Sales Features
    usesRetailProducts: boolean
    usesServices: boolean
    // Marketing Features
    usesEmailMarketing: boolean
    usesSMSMarketing: boolean
    usesReviewManagement: boolean
    // Advanced Features
    usesMultiLocation: boolean
    usesFranchising: boolean
    usesTimeTracking: boolean
    usesPayroll: boolean
    enableResources: boolean  // Enable resources/equipment booking
    createdAt: Date
    updatedAt: Date
}

export function useBusinessConfig() {
    return useSWR<BusinessConfig>('/api/business-config', fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false
    })
}

export function useFeature(featureName: keyof Omit<BusinessConfig, 'id' | 'franchisorId' | 'createdAt' | 'updatedAt'>) {
    const { data: config } = useBusinessConfig()
    return config?.[featureName] ?? true // Default to true if not loaded yet
}

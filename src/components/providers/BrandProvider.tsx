'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

type BrandingContextType = {
    primaryColor: string
    secondaryColor: string
    logoUrl: string
    loading: boolean
}

const BrandingContext = createContext<BrandingContextType>({
    primaryColor: '#9D7DD9',
    secondaryColor: '#5B9FE3',
    logoUrl: '/aura-logo-v2.png',
    loading: true
})

export const useBranding = () => useContext(BrandingContext)

export default function BrandProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession()
    const [branding, setBranding] = useState({
        primaryColor: '#9D7DD9',
        secondaryColor: '#5B9FE3',
        logoUrl: '/aura-logo-v2.png',
        loading: true
    })

    useEffect(() => {
        async function fetchBranding() {
            try {
                const res = await fetch('/api/branding')
                if (res.ok) {
                    const data = await res.json()
                    setBranding({
                        primaryColor: data.primary,
                        secondaryColor: data.secondary,
                        logoUrl: data.logoUrl,
                        loading: false
                    })

                    // Apply CSS variables
                    document.documentElement.style.setProperty('--brand-primary', data.primary)
                    document.documentElement.style.setProperty('--brand-secondary', data.secondary)
                } else {
                    // Even if request fails, stop loading
                    setBranding(prev => ({ ...prev, loading: false }))
                }
            } catch (error) {
                console.error('Error loading branding:', error)
                setBranding(prev => ({ ...prev, loading: false }))
            }
        }

        fetchBranding()
    }, [status])

    return (
        <BrandingContext.Provider value={branding}>
            {children}
        </BrandingContext.Provider>
    )
}

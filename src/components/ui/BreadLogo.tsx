'use client'

import React from 'react'
import { useBranding } from '@/components/providers/BrandProvider'

interface BreadLogoProps {
    size?: number
    className?: string
}

export default function BreadLogo({ size = 60, className = '' }: BreadLogoProps) {
    const { logoUrl } = useBranding()

    return (
        <img
            src={logoUrl || "/aura-logo-v2.png"}
            alt="Logo"
            width={size}
            height={size}
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
        />
    )
}

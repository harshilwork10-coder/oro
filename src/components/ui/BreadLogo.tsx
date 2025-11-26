import React from 'react'

interface BreadLogoProps {
    size?: number
    className?: string
}

export default function BreadLogo({ size = 60, className = '' }: BreadLogoProps) {
    return (
        <img
            src="/aura-logo.png"
            alt="Aura Logo"
            width={size}
            height={size}
            className={`object-contain ${className}`}
            style={{ width: size, height: size }}
        />
    )
}

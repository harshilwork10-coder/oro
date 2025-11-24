import React from 'react'

interface BreadLogoProps {
    size?: number
    className?: string
}

export default function BreadLogo({ size = 32, className = '' }: BreadLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="breadGradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F59E0B" /> {/* Amber-500 */}
                    <stop offset="100%" stopColor="#EA580C" /> {/* Orange-600 */}
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Main Bread Shape - Geometric & Modern */}
            <path
                d="M6 10C6 6.68629 8.68629 4 12 4H20C23.3137 4 26 6.68629 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z"
                fill="url(#breadGradient)"
                stroke="#F97316"
                strokeWidth="1.5"
                filter="url(#glow)"
            />

            {/* Crust Detail - Top Curve */}
            <path
                d="M8 10C8 7.79086 9.79086 6 12 6H20C22.2091 6 24 7.79086 24 10"
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            {/* Toasted Lines - Abstract Heat */}
            <path d="M11 16H21" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M13 20H19" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    )
}

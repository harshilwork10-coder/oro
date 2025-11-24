interface AuraLogoProps {
    size?: number
    className?: string
}

export default function AuraLogo({ size = 48, className = '' }: AuraLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Gradient Definitions - Muted for eye comfort */}
            <defs>
                <linearGradient id="auraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9D7DD9" /> {/* Muted purple */}
                    <stop offset="100%" stopColor="#5B9FE3" /> {/* Muted blue */}
                </linearGradient>

                <linearGradient id="auraGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9D7DD9" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#5B9FE3" stopOpacity="0.1" />
                </linearGradient>

                {/* Subtle Glow Filter - reduced for eye comfort */}
                <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer Glow Ring */}
            <circle
                cx="50"
                cy="50"
                r="42"
                fill="url(#auraGlow)"
                opacity="0.3"
            />

            {/* Main Ring */}
            <circle
                cx="50"
                cy="50"
                r="35"
                stroke="url(#auraGradient)"
                strokeWidth="6"
                fill="none"
                filter="url(#glow)"
            />

            {/* Inner Accent Ring */}
            <circle
                cx="50"
                cy="50"
                r="25"
                stroke="url(#auraGradient)"
                strokeWidth="3"
                fill="none"
                opacity="0.5"
            />

            {/* Center Sparkle/Star */}
            <g transform="translate(50, 50)">
                {/* Vertical line */}
                <line
                    x1="0"
                    y1="-12"
                    x2="0"
                    y2="12"
                    stroke="url(#auraGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                {/* Horizontal line */}
                <line
                    x1="-12"
                    y1="0"
                    x2="12"
                    y2="0"
                    stroke="url(#auraGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                {/* Diagonal lines */}
                <line
                    x1="-8"
                    y1="-8"
                    x2="8"
                    y2="8"
                    stroke="url(#auraGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.7"
                />
                <line
                    x1="8"
                    y1="-8"
                    x2="-8"
                    y2="8"
                    stroke="url(#auraGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.7"
                />
            </g>

            {/* Energy Dots */}
            <circle cx="50" cy="8" r="3" fill="url(#auraGradient)" opacity="0.8" />
            <circle cx="92" cy="50" r="3" fill="url(#auraGradient)" opacity="0.8" />
            <circle cx="50" cy="92" r="3" fill="url(#auraGradient)" opacity="0.8" />
            <circle cx="8" cy="50" r="3" fill="url(#auraGradient)" opacity="0.8" />
        </svg>
    )
}

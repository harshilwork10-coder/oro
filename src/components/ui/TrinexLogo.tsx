interface TrinexLogoProps {
    size?: number
    className?: string
}

export default function TrinexLogo({ size = 48, className = '' }: TrinexLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Gradient Definitions - Orange/Amber POS theme */}
            <defs>
                <linearGradient id="trinexOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" /> {/* Orange-500 */}
                    <stop offset="50%" stopColor="#EA580C" /> {/* Orange-600 */}
                    <stop offset="100%" stopColor="#C2410C" /> {/* Orange-700 */}
                </linearGradient>

                <linearGradient id="trinexAmber" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" /> {/* Amber-500 */}
                    <stop offset="100%" stopColor="#FBBF24" /> {/* Amber-400 */}
                </linearGradient>

                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background glow */}
            <circle cx="50" cy="50" r="46" fill="url(#trinexOrange)" opacity="0.12" />

            {/* Three interconnected nodes - Trinity/Tri-nex concept */}
            {/* Top Node */}
            <circle cx="50" cy="18" r="10" fill="url(#trinexOrange)" filter="url(#glow)" />
            <circle cx="50" cy="18" r="5" fill="url(#trinexAmber)" />

            {/* Bottom Left Node */}
            <circle cx="22" cy="72" r="10" fill="url(#trinexOrange)" filter="url(#glow)" />
            <circle cx="22" cy="72" r="5" fill="url(#trinexAmber)" />

            {/* Bottom Right Node */}
            <circle cx="78" cy="72" r="10" fill="url(#trinexOrange)" filter="url(#glow)" />
            <circle cx="78" cy="72" r="5" fill="url(#trinexAmber)" />

            {/* Connecting lines - forming network/flow */}
            <path
                d="M50 28 L28 65"
                stroke="url(#trinexOrange)"
                strokeWidth="4"
                strokeLinecap="round"
            />
            <path
                d="M50 28 L72 65"
                stroke="url(#trinexOrange)"
                strokeWidth="4"
                strokeLinecap="round"
            />
            <path
                d="M32 72 L68 72"
                stroke="url(#trinexOrange)"
                strokeWidth="4"
                strokeLinecap="round"
            />

            {/* Central hub - the nexus point */}
            <circle cx="50" cy="50" r="12" fill="url(#trinexOrange)" />
            <circle cx="50" cy="50" r="6" fill="url(#trinexAmber)" />
            <circle cx="50" cy="50" r="3" fill="#FFFFFF" opacity="0.9" />

            {/* Data flow pulses - representing real-time insights */}
            <circle cx="40" cy="36" r="3" fill="url(#trinexAmber)" opacity="0.7" />
            <circle cx="60" cy="36" r="3" fill="url(#trinexAmber)" opacity="0.7" />
            <circle cx="35" cy="62" r="3" fill="url(#trinexAmber)" opacity="0.7" />
            <circle cx="65" cy="62" r="3" fill="url(#trinexAmber)" opacity="0.7" />
        </svg>
    )
}

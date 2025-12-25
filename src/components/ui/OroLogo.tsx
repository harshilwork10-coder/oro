'use client'

interface OroLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number
    showText?: boolean
    className?: string
}

export default function OroLogo({ size = 'md', showText = true, className = '' }: OroLogoProps) {
    const sizes = {
        sm: { scale: 0.7 },
        md: { scale: 0.9 },
        lg: { scale: 1.2 },
        xl: { scale: 1.6 }
    }

    const scale = typeof size === 'number' ? size / 40 : sizes[size]?.scale || 0.9

    return (
        <div className={className} style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}>
            <svg width="95" height="45" viewBox="0 0 95 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Gradients */}
                <defs>
                    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FCD34D" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4ADE80" />
                        <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                </defs>

                {/* O - Orange ring */}
                <circle cx="14" cy="16" r="11" stroke="url(#orangeGrad)" strokeWidth="5" fill="none" />

                {/* R - White */}
                <text x="28" y="27" fill="#FFFFFF" fontFamily="Arial Black, sans-serif" fontSize="28" fontWeight="900">R</text>

                {/* O - Green ring */}
                <circle cx="66" cy="16" r="11" stroke="url(#greenGrad)" strokeWidth="5" fill="none" />

                {/* NEXT - Gray below, centered under the letters */}
                {showText && (
                    <text x="36" y="42" fill="#9CA3AF" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="600" letterSpacing="2">NEXT</text>
                )}
            </svg>
        </div>
    )
}

export { OroLogo as OroLogo }

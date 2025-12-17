'use client'

interface OronexLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number
    showText?: boolean
    className?: string
}

export default function OronexLogo({ size = 'md', showText = true, className = '' }: OronexLogoProps) {
    const sizes = {
        sm: { icon: 24, text: 14, gap: 6 },
        md: { icon: 32, text: 18, gap: 8 },
        lg: { icon: 48, text: 24, gap: 10 },
        xl: { icon: 64, text: 32, gap: 12 }
    }

    // Handle numeric size or predefined size
    let icon: number, text: number, gap: number
    if (typeof size === 'number') {
        icon = size
        text = Math.round(size * 0.375) // Proportional text size
        gap = Math.round(size * 0.125) // Proportional gap
    } else {
        const sizeConfig = sizes[size] || sizes.md
        icon = sizeConfig.icon
        text = sizeConfig.text
        gap = sizeConfig.gap
    }

    const orange = '#F97316'
    const lightGray = '#E5E7EB'

    return (
        <div className={`flex items-center ${className}`} style={{ gap }}>
            {/* Icon - Ring with 3 connected circles */}
            <svg
                width={icon}
                height={icon}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Main thick ring */}
                <circle
                    cx="50"
                    cy="50"
                    r="32"
                    stroke={orange}
                    strokeWidth="10"
                    fill="none"
                />
                {/* Circle 1 - Top center */}
                <circle cx="50" cy="14" r="14" fill={orange} />
                {/* Circle 2 - Bottom left */}
                <circle cx="19" cy="68" r="14" fill={orange} />
                {/* Circle 3 - Bottom right */}
                <circle cx="81" cy="68" r="14" fill={orange} />
            </svg>

            {/* Wordmark */}
            {showText && (
                <span
                    style={{
                        fontSize: text,
                        fontWeight: 600,
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        letterSpacing: '-0.02em'
                    }}
                >
                    <span style={{ color: orange }}>o</span>
                    <span style={{ color: lightGray }}>ronex</span>
                </span>
            )}
        </div>
    )
}

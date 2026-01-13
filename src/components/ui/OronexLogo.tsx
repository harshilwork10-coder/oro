'use client'

interface OroLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number
    showText?: boolean
    className?: string
}

export default function OroLogo({ size = 'md', showText = true, className = '' }: OroLogoProps) {
    const sizes = {
        sm: { icon: 32, text: 18, gap: 8 },
        md: { icon: 48, text: 26, gap: 10 },
        lg: { icon: 64, text: 34, gap: 12 },
        xl: { icon: 80, text: 42, gap: 14 }
    }

    // Handle numeric size or predefined size
    let icon: number, text: number, gap: number
    if (typeof size === 'number') {
        icon = size
        text = Math.round(size * 0.5) // Slightly larger text for shorter word
        gap = Math.round(size * 0.125)
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
            {/* Icon - Ring with 2 orbiting circles */}
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
                {/* Circle 1 - Top left */}
                <circle cx="22" cy="30" r="10" fill={orange} />
                {/* Circle 2 - Bottom left */}
                <circle cx="22" cy="70" r="10" fill={orange} />
            </svg>

            {/* Wordmark - "Oro" */}
            {showText && (
                <span
                    style={{
                        fontSize: text,
                        fontWeight: 600,
                        fontFamily: "'Inter', 'Segoe UI', sans-serif",
                        letterSpacing: '-0.02em'
                    }}
                >
                    <span style={{ color: orange }}>O</span>
                    <span style={{ color: lightGray }}>ro 9</span>
                </span>
            )}
        </div>
    )
}

// Keep backward compatibility - export with old name too
export { OroLogo as OroLogo }


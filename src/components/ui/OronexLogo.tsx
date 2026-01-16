'use client'

interface OroLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number
    showText?: boolean
    showTagline?: boolean
    className?: string
}

export default function OroLogo({ size = 'md', showText = true, showTagline = false, className = '' }: OroLogoProps) {
    const sizes = {
        sm: { icon: 28, text: 16, gap: 6 },
        md: { icon: 36, text: 20, gap: 8 },
        lg: { icon: 48, text: 28, gap: 10 },
        xl: { icon: 64, text: 36, gap: 12 }
    }

    let icon: number, text: number, gap: number
    if (typeof size === 'number') {
        icon = size
        text = Math.round(size * 0.55)
        gap = Math.round(size * 0.15)
    } else {
        const sizeConfig = sizes[size] || sizes.md
        icon = sizeConfig.icon
        text = sizeConfig.text
        gap = sizeConfig.gap
    }

    const orange = '#F97316'
    const green = '#22C55E'
    const white = '#FFFFFF'

    return (
        <div className={`flex flex-col ${className}`}>
            <div className="flex items-center" style={{ gap }}>
                {/* POS Terminal Icon */}
                <svg
                    width={icon}
                    height={icon}
                    viewBox="0 0 100 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Terminal body */}
                    <rect x="15" y="10" width="70" height="100" rx="8" stroke={orange} strokeWidth="4" fill="none" />
                    {/* Screen */}
                    <rect x="22" y="18" width="56" height="30" rx="4" stroke={orange} strokeWidth="3" fill="none" />
                    {/* Keypad buttons */}
                    <rect x="24" y="54" width="14" height="10" rx="2" fill={orange} />
                    <rect x="43" y="54" width="14" height="10" rx="2" fill={orange} />
                    <rect x="62" y="54" width="14" height="10" rx="2" fill={orange} />
                    <rect x="24" y="68" width="14" height="10" rx="2" fill={orange} />
                    <rect x="43" y="68" width="14" height="10" rx="2" fill={orange} />
                    <rect x="62" y="68" width="14" height="10" rx="2" fill={orange} />
                    <rect x="24" y="82" width="14" height="10" rx="2" fill="#EF4444" />
                    <rect x="43" y="82" width="14" height="10" rx="2" fill={orange} />
                    <rect x="62" y="82" width="14" height="10" rx="2" fill={green} />
                    {/* Card slot */}
                    <rect x="35" y="96" width="30" height="8" rx="2" stroke={orange} strokeWidth="2" fill="none" />
                </svg>

                {/* Wordmark - "ORO 9" */}
                {showText && (
                    <span
                        style={{
                            fontSize: text,
                            fontWeight: 700,
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            letterSpacing: '-0.02em'
                        }}
                    >
                        <span style={{ color: orange }}>O</span>
                        <span style={{ color: white }}>R</span>
                        <span style={{ color: green }}>O</span>
                        <span style={{ color: white }}> 9</span>
                    </span>
                )}
            </div>
            {/* Tagline */}
            {showTagline && (
                <span style={{
                    fontSize: text * 0.4,
                    color: '#9CA3AF',
                    letterSpacing: '0.1em',
                    marginTop: gap * 0.5
                }}>
                    POWERING EVERYDAY BUSINESS
                </span>
            )}
        </div>
    )
}

// Keep backward compatibility
export { OroLogo as OroLogo }



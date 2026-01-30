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

    // Unified GOLD branding colors
    const gold = '#D4A843'
    const goldLight = '#E8C252'
    const goldBright = '#F5C842'
    const darkBg = '#0A1628'

    return (
        <div className={`flex flex-col ${className}`}>
            <div className="flex items-center" style={{ gap }}>
                {/* ORO 9 Icon - Gold on Dark */}
                <svg
                    width={icon}
                    height={icon}
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Background */}
                    <rect width="100" height="100" rx="12" fill={darkBg} />
                    {/* O */}
                    <text x="10" y="55" fontSize="38" fontWeight="bold" fontFamily="Inter, sans-serif" fill={gold}>O</text>
                    {/* R */}
                    <text x="32" y="55" fontSize="38" fontWeight="bold" fontFamily="Inter, sans-serif" fill={goldLight}>R</text>
                    {/* O */}
                    <text x="54" y="55" fontSize="38" fontWeight="bold" fontFamily="Inter, sans-serif" fill={gold}>O</text>
                    {/* 9 */}
                    <text x="76" y="55" fontSize="38" fontWeight="bold" fontFamily="Inter, sans-serif" fill={goldBright}>9</text>
                </svg>

                {/* Wordmark - "ORO 9" - Gold gradient effect */}
                {showText && (
                    <span
                        style={{
                            fontSize: text,
                            fontWeight: 700,
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            letterSpacing: '-0.02em',
                            background: 'linear-gradient(135deg, #D4A843 0%, #E8C252 50%, #F5C842 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        ORO 9
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


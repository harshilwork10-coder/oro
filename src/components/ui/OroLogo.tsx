'use client'

interface OroLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number
    showText?: boolean
    showTagline?: boolean
    className?: string
}

export default function OroLogo({ size = 'md', className = '' }: OroLogoProps) {
    const sizes = {
        sm: 28,
        md: 36,
        lg: 48,
        xl: 64,
    }

    const px = typeof size === 'number' ? size : (sizes[size] || sizes.md)

    return (
        <img
            src="/oro9-gold.png"
            alt="ORO 9"
            className={`object-contain ${className}`}
            style={{ height: px, width: 'auto' }}
            draggable={false}
        />
    )
}

// Keep backward compatibility
export { OroLogo as OroLogo }

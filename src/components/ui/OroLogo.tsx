'use client'

import Image from 'next/image'

interface OroLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number
    showText?: boolean
    className?: string
}

export default function OroLogo({ size = 'md', className = '' }: OroLogoProps) {
    const sizes = {
        sm: { width: 80, height: 40 },
        md: { width: 120, height: 60 },
        lg: { width: 160, height: 80 },
        xl: { width: 200, height: 100 }
    }

    let width: number, height: number
    if (typeof size === 'number') {
        width = size * 2
        height = size
    } else {
        const sizeConfig = sizes[size] || sizes.md
        width = sizeConfig.width
        height = sizeConfig.height
    }

    return (
        <div className={className}>
            <Image
                src="/Oro-logo.jpg"
                alt="ORO 9"
                width={width}
                height={height}
                style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
                priority
            />
        </div>
    )
}

export { OroLogo as OroLogo }

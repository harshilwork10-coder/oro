'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface DrawerPanelProps {
    open: boolean
    onClose: () => void
    title: string
    subtitle?: string
    children: React.ReactNode
    width?: 'md' | 'lg' | 'xl'
}

const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
}

export default function DrawerPanel({ open, onClose, title, subtitle, children, width = 'lg' }: DrawerPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [open, onClose])

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`
                    relative w-full ${widthClasses[width]}
                    bg-stone-950 border-l border-white/[0.08]
                    flex flex-col h-full
                    animate-slideInRight
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
                    >
                        <X className="h-4 w-4 text-stone-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-slideInRight { animation: slideInRight 0.25s ease-out; }
            `}</style>
        </div>
    )
}

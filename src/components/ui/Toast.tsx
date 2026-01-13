'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

interface ToastProps {
    message: string
    type?: 'success' | 'error' | 'warning' | 'info'
    onClose: () => void
    duration?: number
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    const icons = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertCircle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
    }

    const styles = {
        success: 'bg-emerald-600 text-white shadow-emerald-900/30',
        error: 'bg-red-600 text-white shadow-red-900/30',
        warning: 'bg-amber-600 text-white shadow-amber-900/30',
        info: 'bg-blue-600 text-white shadow-blue-900/30',
    }

    const iconColors = {
        success: 'text-emerald-200',
        error: 'text-red-200',
        warning: 'text-amber-200',
        info: 'text-blue-200',
    }

    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl ${styles[type]} animate-slide-in`}>
            <div className={iconColors[type]}>
                {icons[type]}
            </div>
            <p className="font-medium">{message}</p>
            <button
                onClick={onClose}
                className="ml-2 text-white/70 hover:text-white transition-opacity"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}


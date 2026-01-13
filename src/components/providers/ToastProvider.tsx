'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    message: string
    type: ToastType
    duration: number
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

interface ToastProviderProps {
    children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
        const id = `${Date.now()}-${Math.random()}`
        setToasts(prev => [...prev, { id, message, type, duration }])

        setTimeout(() => {
            removeToast(id)
        }, duration)
    }, [removeToast])

    const success = useCallback((message: string, duration?: number) => {
        showToast(message, 'success', duration)
    }, [showToast])

    const error = useCallback((message: string, duration?: number) => {
        showToast(message, 'error', duration)
    }, [showToast])

    const warning = useCallback((message: string, duration?: number) => {
        showToast(message, 'warning', duration)
    }, [showToast])

    const info = useCallback((message: string, duration?: number) => {
        showToast(message, 'info', duration)
    }, [showToast])

    const icons = {
        success: <CheckCircle className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertCircle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
    }

    const styles = {
        success: 'bg-green-900/90 border-green-700 text-green-100',
        error: 'bg-red-900/90 border-red-700 text-red-100',
        warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
        info: 'bg-blue-900/90 border-blue-700 text-blue-100',
    }

    const iconColors = {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-amber-400',
        info: 'text-blue-400',
    }

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md ${styles[toast.type]} animate-slide-in pointer-events-auto`}
                    >
                        <div className={iconColors[toast.type]}>
                            {icons[toast.type]}
                        </div>
                        <p className="font-medium">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 hover:opacity-70 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

'use client'

import { X } from 'lucide-react'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    confirmColor?: 'emerald' | 'red' | 'purple'
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmColor = 'emerald'
}: ConfirmModalProps) {
    if (!isOpen) return null

    const colorClasses = {
        emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-900/20',
        red: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-red-900/20',
        purple: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-900/20'
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-700">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-stone-100">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-700 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Message */}
                <p className="text-stone-300 mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-medium transition-colors border border-stone-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                        className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg ${colorClasses[confirmColor]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

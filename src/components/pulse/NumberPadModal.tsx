'use client'

import { useState, useEffect } from 'react'
import { X, Delete } from 'lucide-react'

interface NumberPadModalProps {
    title: string
    initialValue: string
    isDecimal?: boolean
    onConfirm: (value: string) => void
    onClose: () => void
}

export default function NumberPadModal({ title, initialValue, isDecimal = false, onConfirm, onClose }: NumberPadModalProps) {
    const [value, setValue] = useState('')
    const [isFirstKey, setIsFirstKey] = useState(true)

    // Reset when modal opens
    useEffect(() => {
        setValue(initialValue || '')
        setIsFirstKey(true)
    }, [initialValue])

    const handleKey = (key: string) => {
        if (key === 'C') {
            setValue('')
            setIsFirstKey(true)
        } else if (key === 'DEL') {
            if (value.length <= 1) {
                setValue('')
                setIsFirstKey(true)
            } else {
                setValue(value.slice(0, -1))
            }
        } else if (key === '.') {
            if (isDecimal && !value.includes('.')) {
                if (isFirstKey || value === '') {
                    setValue('0.')
                } else {
                    setValue(value + '.')
                }
                setIsFirstKey(false)
            }
        } else {
            // Digit key
            if (isFirstKey) {
                setValue(key)
                setIsFirstKey(false)
            } else {
                setValue(value + key)
            }
        }
    }

    const handleConfirm = () => {
        onConfirm(value)
        onClose()
    }

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', isDecimal ? '.' : 'C', '0', 'DEL']

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-end justify-center">
            <div className="bg-gray-900 rounded-t-2xl w-full max-w-md border-t border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-800">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Display */}
                <div className="p-4">
                    <div className="bg-gray-800 rounded-xl p-4 text-right">
                        <span className="text-3xl font-bold text-white">
                            {isDecimal ? '$' : ''}{value || '0'}
                        </span>
                    </div>
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-2 p-4">
                    {keys.map((key) => (
                        <button
                            key={key}
                            onClick={() => handleKey(key)}
                            className={`py-5 rounded-xl text-2xl font-bold active:scale-95 transition ${key === 'DEL'
                                ? 'bg-red-600/50 text-red-300'
                                : key === 'C'
                                    ? 'bg-gray-600 text-gray-300'
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                        >
                            {key === 'DEL' ? <Delete className="w-6 h-6 mx-auto" /> : key}
                        </button>
                    ))}
                </div>

                {/* Confirm Button */}
                <div className="p-4 pt-0">
                    <button
                        onClick={handleConfirm}
                        className="w-full py-4 bg-green-600 rounded-xl text-lg font-bold active:scale-98"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    )
}

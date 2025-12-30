'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Delete, CornerDownLeft, Space } from 'lucide-react'

interface OnScreenKeyboardProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (value: string) => void
    title?: string
    initialValue?: string
    placeholder?: string
    type?: 'text' | 'number' | 'alphanumeric'
}

export default function OnScreenKeyboard({
    isOpen,
    onClose,
    onSubmit,
    title = 'Enter Value',
    initialValue = '',
    placeholder = '',
    type = 'alphanumeric'
}: OnScreenKeyboardProps) {
    const [value, setValue] = useState(initialValue)
    const [isShift, setIsShift] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue)
            setIsShift(false)
        }
    }, [isOpen, initialValue])

    const handleKey = useCallback((key: string) => {
        if (key === 'BACKSPACE') {
            setValue(prev => prev.slice(0, -1))
        } else if (key === 'SPACE') {
            setValue(prev => prev + ' ')
        } else if (key === 'SHIFT') {
            setIsShift(!isShift)
        } else if (key === 'CLEAR') {
            setValue('')
        } else if (key === 'ENTER') {
            onSubmit(value)
            onClose()
        } else {
            setValue(prev => prev + (isShift ? key.toUpperCase() : key.toLowerCase()))
            if (isShift) setIsShift(false)
        }
    }, [isShift, value, onSubmit, onClose])

    if (!isOpen) return null

    // Number row
    const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

    // Letter rows
    const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
    const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
    const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M']

    // Number-only keyboard
    const numpadRows = [
        ['7', '8', '9'],
        ['4', '5', '6'],
        ['1', '2', '3'],
        ['0', '.', 'BACKSPACE']
    ]

    const renderKey = (key: string, width = 'w-10', isSpecial = false) => {
        const displayKey = isShift ? key.toUpperCase() : key.toLowerCase()
        return (
            <button
                key={key}
                onClick={() => handleKey(key)}
                className={`${width} h-12 rounded-lg font-semibold text-lg transition-all active:scale-95 ${isSpecial
                        ? 'bg-stone-700 hover:bg-stone-600 text-orange-400'
                        : 'bg-stone-800 hover:bg-stone-700 text-white'
                    }`}
            >
                {key === 'BACKSPACE' ? <Delete className="w-5 h-5 mx-auto" /> :
                    key === 'SPACE' ? <Space className="w-5 h-5 mx-auto" /> :
                        key === 'ENTER' ? <CornerDownLeft className="w-5 h-5 mx-auto" /> :
                            key === 'SHIFT' ? '⇧' :
                                key === 'CLEAR' ? 'CLR' :
                                    displayKey}
            </button>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-t-2xl w-full max-w-2xl p-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Input Display */}
                <div className="bg-stone-800 rounded-lg p-4 mb-4 min-h-[60px] flex items-center">
                    <span className="text-2xl font-mono text-white">
                        {value || <span className="text-stone-500">{placeholder}</span>}
                    </span>
                    <span className="animate-pulse text-orange-400 ml-1">|</span>
                </div>

                {/* Keyboard */}
                {type === 'number' ? (
                    // Number pad only
                    <div className="space-y-2">
                        {numpadRows.map((row, i) => (
                            <div key={i} className="flex justify-center gap-2">
                                {row.map(key => renderKey(key, 'w-16 h-14', key === 'BACKSPACE'))}
                            </div>
                        ))}
                        <div className="flex justify-center gap-2 mt-2">
                            <button
                                onClick={() => handleKey('CLEAR')}
                                className="w-24 h-12 bg-red-600 hover:bg-red-500 rounded-lg font-bold"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => handleKey('ENTER')}
                                className="w-24 h-12 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    // Full QWERTY keyboard
                    <div className="space-y-2">
                        {/* Number row */}
                        <div className="flex justify-center gap-1">
                            {numberRow.map(key => renderKey(key))}
                            {renderKey('BACKSPACE', 'w-14', true)}
                        </div>

                        {/* Row 1 - QWERTY */}
                        <div className="flex justify-center gap-1">
                            {row1.map(key => renderKey(key))}
                        </div>

                        {/* Row 2 - ASDF */}
                        <div className="flex justify-center gap-1">
                            {row2.map(key => renderKey(key))}
                        </div>

                        {/* Row 3 - ZXCV */}
                        <div className="flex justify-center gap-1">
                            {renderKey('SHIFT', 'w-14', true)}
                            {row3.map(key => renderKey(key))}
                            {renderKey('CLEAR', 'w-14', true)}
                        </div>

                        {/* Space and Enter */}
                        <div className="flex justify-center gap-2 mt-2">
                            <button
                                onClick={() => handleKey('SPACE')}
                                className="flex-1 max-w-xs h-12 bg-stone-700 hover:bg-stone-600 rounded-lg font-bold"
                            >
                                Space
                            </button>
                            <button
                                onClick={() => handleKey('ENTER')}
                                className="w-24 h-12 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


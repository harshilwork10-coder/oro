'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Delete, X, Clock, CheckCircle, ArrowRight } from 'lucide-react'

interface Employee {
    id: string
    name: string
    image?: string
    role?: string
    clockedInAt?: string
}

interface QuickSwitchModalProps {
    isOpen: boolean
    onClose: () => void
    onSwitch: (employeeId: string, pin: string) => Promise<boolean>
    currentEmployeeId?: string
    storeId: string
}

export default function QuickSwitchModal({
    isOpen,
    onClose,
    onSwitch,
    currentEmployeeId,
    storeId
}: QuickSwitchModalProps) {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [switching, setSwitching] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)

    // Fetch clocked-in employees
    useEffect(() => {
        if (isOpen) {
            fetchClockedInEmployees()
            setSelectedEmployee(null)
            setPin('')
            setError('')
        }
    }, [isOpen, storeId])

    const fetchClockedInEmployees = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/pos/timeclock/active?storeId=${storeId}`)
            if (res.ok) {
                const data = await res.json()
                setEmployees(data.employees || [])
            }
        } catch (err) {
            console.error('Failed to fetch clocked-in employees:', err)
        }
        setLoading(false)
    }

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin(prev => prev + num)
            setError('')
        }
    }

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1))
        setError('')
    }

    const handleSubmit = async () => {
        if (!selectedEmployee || pin.length !== 4) return

        setSwitching(true)
        setError('')
        try {
            const success = await onSwitch(selectedEmployee.id, pin)
            if (success) {
                onClose()
            } else {
                setError('Incorrect PIN')
                setPin('')
            }
        } catch (err) {
            setError('Switch failed. Try again.')
            setPin('')
        }
        setSwitching(false)
    }

    // Auto-submit when 4 digits entered
    useEffect(() => {
        if (pin.length === 4 && selectedEmployee) {
            handleSubmit()
        }
    }, [pin])

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div
                ref={modalRef}
                className="w-full max-w-2xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Quick Switch</h2>
                            <p className="text-sm text-slate-400">
                                {selectedEmployee ? 'Enter PIN to switch' : 'Select an employee'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {!selectedEmployee ? (
                        /* Employee Selection Grid */
                        <div>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
                                </div>
                            ) : employees.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No other employees clocked in</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {employees.filter(e => e.id !== currentEmployeeId).map((employee) => (
                                        <button
                                            key={employee.id}
                                            onClick={() => setSelectedEmployee(employee)}
                                            className="p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500/50 rounded-xl transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-lg font-bold text-white group-hover:bg-orange-500/20 transition-colors">
                                                    {employee.image ? (
                                                        <img
                                                            src={employee.image}
                                                            alt={employee.name}
                                                            className="w-full h-full rounded-xl object-cover"
                                                        />
                                                    ) : (
                                                        employee.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white truncate">{employee.name}</p>
                                                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>Clocked In</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* PIN Entry */
                        <div className="max-w-xs mx-auto">
                            {/* Selected Employee */}
                            <div className="text-center mb-6">
                                <button
                                    onClick={() => {
                                        setSelectedEmployee(null)
                                        setPin('')
                                        setError('')
                                    }}
                                    className="text-sm text-slate-500 hover:text-orange-400 mb-4"
                                >
                                    ← Back to employee list
                                </button>
                                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-white">
                                    {selectedEmployee.image ? (
                                        <img
                                            src={selectedEmployee.image}
                                            alt={selectedEmployee.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        selectedEmployee.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-white">{selectedEmployee.name}</h3>
                                <p className="text-sm text-slate-400">Enter PIN to switch</p>
                            </div>

                            {/* PIN Dots */}
                            <div className="flex justify-center gap-4 mb-6">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length
                                            ? error ? 'bg-red-500 scale-125' : 'bg-orange-500 scale-125'
                                            : 'bg-slate-700'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <p className="text-red-500 text-center text-sm mb-4 animate-pulse">
                                    {error}
                                </p>
                            )}

                            {/* Keypad */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumberClick(num)}
                                        disabled={switching}
                                        className="h-16 rounded-xl bg-slate-800 text-white text-xl font-semibold hover:bg-slate-700 active:bg-slate-600 transition-all border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div className="h-16" />
                                <button
                                    onClick={() => handleNumberClick(0)}
                                    disabled={switching}
                                    className="h-16 rounded-xl bg-slate-800 text-white text-xl font-semibold hover:bg-slate-700 active:bg-slate-600 transition-all border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50"
                                >
                                    0
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={switching || pin.length === 0}
                                    className="h-16 rounded-xl bg-slate-800/50 text-red-400 hover:bg-slate-800 hover:text-red-300 active:bg-slate-700 transition-all flex items-center justify-center disabled:opacity-30"
                                >
                                    <Delete className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

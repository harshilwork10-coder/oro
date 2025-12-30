'use client'

import { X, CreditCard, Banknote, FileText, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useBusinessConfig } from '@/hooks/useBusinessConfig'

interface PaymentSelectionModalProps {
    total: number
    onSelect: (method: string) => void
    onClose: () => void
}

export default function PaymentSelectionModal({ total, onSelect, onClose }: PaymentSelectionModalProps) {
    const { data: config } = useBusinessConfig()

    const paymentMethods = [
        { id: 'CASH', label: 'Cash', icon: Banknote, color: 'bg-emerald-600', enabled: true },
        { id: 'CREDIT_CARD', label: 'Card', icon: CreditCard, color: 'bg-blue-600', enabled: true },
        { id: 'EBT', label: 'EBT', icon: CreditCard, color: 'bg-green-600', enabled: config?.acceptsEbt },
        { id: 'CHECK', label: 'Check', icon: FileText, color: 'bg-amber-600', enabled: config?.acceptsChecks },
        { id: 'ON_ACCOUNT', label: 'On Account', icon: Users, color: 'bg-purple-600', enabled: config?.acceptsOnAccount },
    ].filter(m => m.enabled)

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-stone-900 rounded-2xl p-8 max-w-3xl w-full mx-4 border border-stone-700 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-white">Select Payment Method</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-800 rounded-full transition-colors"
                    >
                        <X className="h-8 w-8 text-stone-400 hover:text-white" />
                    </button>
                </div>

                <div className="text-center mb-10 bg-stone-950/50 p-6 rounded-2xl border border-stone-800">
                    <p className="text-stone-400 text-lg mb-2">Total Amount Due</p>
                    <p className="text-6xl font-bold text-emerald-400 tracking-tight">{formatCurrency(total)}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {paymentMethods.map(method => (
                        <button
                            key={method.id}
                            onClick={() => onSelect(method.id)}
                            className="flex flex-col items-center justify-center gap-4 p-8 bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-stone-600 rounded-2xl transition-all group hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className={`h-20 w-20 rounded-full flex items-center justify-center ${method.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <method.icon className="h-10 w-10 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-stone-200">{method.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}


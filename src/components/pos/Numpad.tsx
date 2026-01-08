import { Delete, X } from 'lucide-react'

interface NumpadProps {
    onInput: (value: string) => void
    onClear: () => void
    onBackspace: () => void
    className?: string
}

export default function Numpad({ onInput, onClear, onBackspace, className = '' }: NumpadProps) {
    const keys = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        'C', '0', 'DEL'
    ]

    return (
        <div className={`grid grid-cols-3 gap-3 ${className}`}>
            {keys.map(key => (
                <button
                    key={key}
                    onClick={() => {
                        if (key === 'C') onClear()
                        else if (key === 'DEL') onBackspace()
                        else onInput(key)
                    }}
                    className={`
                        h-20 rounded-xl text-2xl font-bold transition-all active:scale-95 flex items-center justify-center
                        ${key === 'C'
                            ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-500/30'
                            : key === 'DEL'
                                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                : 'bg-stone-800 text-white hover:bg-stone-700 border border-stone-700 hover:border-stone-500'
                        }
                    `}
                >
                    {key === 'DEL' ? <Delete className="h-8 w-8" /> : key}
                </button>
            ))}
        </div>
    )
}


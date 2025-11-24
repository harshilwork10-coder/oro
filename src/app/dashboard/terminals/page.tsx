'use client'

import { useState } from 'react'
import {
    CreditCard,
    Wifi,
    WifiOff,
    RefreshCw,
    Plus,
    MoreVertical,
    Power,
    Settings,
    Activity,
    Smartphone
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// Mock Data for PAX Terminals
const initialTerminals = [
    {
        id: 'term_1',
        model: 'PAX A920',
        serial: 'SN-99283741',
        location: 'Aura Downtown',
        status: 'ONLINE',
        battery: 85,
        lastHeartbeat: 'Just now',
        ip: '192.168.1.45'
    },
    {
        id: 'term_2',
        model: 'PAX A920 Pro',
        serial: 'SN-22384711',
        location: 'Aura Downtown',
        status: 'ONLINE',
        battery: 42,
        lastHeartbeat: '2 mins ago',
        ip: '192.168.1.46'
    },
    {
        id: 'term_3',
        model: 'PAX A80',
        serial: 'SN-88372111',
        location: 'Aura Westside',
        status: 'OFFLINE',
        battery: 0,
        lastHeartbeat: '2 days ago',
        ip: '192.168.1.102'
    },
    {
        id: 'term_4',
        model: 'PAX E700',
        serial: 'SN-77382910',
        location: 'Aura North Hills',
        status: 'ONLINE',
        battery: 100,
        lastHeartbeat: 'Just now',
        ip: '192.168.1.15'
    }
]

export default function TerminalsPage() {
    const { data: session } = useSession()
    const [terminals, setTerminals] = useState(initialTerminals)
    const [isRebooting, setIsRebooting] = useState<string | null>(null)

    // Only Franchisors/Providers can add new terminals (provisioning)
    const canAddTerminal = session?.user?.role === 'FRANCHISOR' || session?.user?.role === 'PROVIDER'

    const handleReboot = (id: string) => {
        setIsRebooting(id)
        // Simulate reboot command sent to PAX Cloud
        setTimeout(() => {
            setIsRebooting(null)
            alert(`Reboot command sent to terminal ${id}`)
        }, 2000)
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <CreditCard className="h-8 w-8 text-orange-500" />
                        Terminal Management
                    </h1>
                    <p className="text-stone-400 mt-2">Monitor and control your PAX payment devices</p>
                </div>
                {canAddTerminal && (
                    <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-orange-900/20">
                        <Plus className="h-4 w-4" />
                        Add New Terminal
                    </button>
                )}
            </div>

            {/* Network Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Online Terminals</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">3</span>
                        <div className="flex items-center text-xs font-medium text-emerald-400">
                            <Wifi className="h-3 w-3 mr-1" />
                            75% Connected
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Offline / Attention</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">1</span>
                        <div className="flex items-center text-xs font-medium text-red-400">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Needs Action
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Total Processed (Today)</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$12,450</span>
                        <div className="flex items-center text-xs font-medium text-blue-400">
                            <Activity className="h-3 w-3 mr-1" />
                            142 Transactions
                        </div>
                    </div>
                </div>
            </div>

            {/* Terminal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {terminals.map((term) => (
                    <div key={term.id} className="glass-panel rounded-xl overflow-hidden group hover:border-orange-500/30 transition-all">
                        {/* Card Header */}
                        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/30">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${term.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-stone-200">{term.model}</h3>
                                    <p className="text-xs text-stone-500">{term.serial}</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${term.status === 'ONLINE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                {term.status}
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-stone-500 text-xs">Location</p>
                                    <p className="text-stone-300 font-medium">{term.location}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">IP Address</p>
                                    <p className="text-stone-300 font-mono">{term.ip}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">Battery</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-12 bg-stone-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${term.battery > 20 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                style={{ width: `${term.battery}%` }}
                                            />
                                        </div>
                                        <span className="text-stone-300">{term.battery}%</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-stone-500 text-xs">Last Heartbeat</p>
                                    <p className="text-stone-300">{term.lastHeartbeat}</p>
                                </div>
                            </div>
                        </div>

                        {/* Card Actions */}
                        <div className="p-3 bg-stone-900/50 border-t border-stone-800 flex items-center justify-between">
                            <button
                                onClick={() => handleReboot(term.id)}
                                disabled={isRebooting === term.id || term.status === 'OFFLINE'}
                                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRebooting === term.id ? 'animate-spin' : ''}`} />
                                {isRebooting === term.id ? 'Rebooting...' : 'Remote Reboot'}
                            </button>
                            <div className="w-px h-6 bg-stone-800 mx-2" />
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors">
                                <Settings className="h-4 w-4" />
                                Config
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

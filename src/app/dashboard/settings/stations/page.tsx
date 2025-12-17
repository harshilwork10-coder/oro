'use client'

import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2, Save, Monitor, CreditCard, DollarSign, Edit2, User, Users } from 'lucide-react'

interface Terminal {
    id: string
    name: string
    terminalIP: string
    terminalPort: string
    terminalType: string
}

interface Employee {
    id: string
    name: string
    email: string
}

interface Station {
    id: string
    name: string
    pairingCode: string
    paymentMode: 'DEDICATED' | 'CASH_ONLY'
    dedicatedTerminal?: Terminal | null
    assignedEmployees?: Employee[]
}

export default function StationsPage() {
    const [stations, setStations] = useState<Station[]>([])
    const [terminals, setTerminals] = useState<Terminal[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [editingStation, setEditingStation] = useState<Station | null>(null)
    const [showAddTerminal, setShowAddTerminal] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // New station form
    const [newStation, setNewStation] = useState({
        name: '',
        pairingCode: '',
        paymentMode: 'CASH_ONLY' as 'DEDICATED' | 'CASH_ONLY',
        terminalId: ''
    })

    // New terminal form
    const [newTerminal, setNewTerminal] = useState({
        name: '',
        terminalIP: '',
        terminalPort: '10009',
        terminalType: 'PAX'
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [stationsRes, terminalsRes, employeesRes] = await Promise.all([
                fetch('/api/settings/stations'),
                fetch('/api/settings/terminals'),
                fetch('/api/employees')
            ])

            if (stationsRes.ok) {
                const data = await stationsRes.json()
                setStations(data.stations || [])
            }
            if (terminalsRes.ok) {
                const data = await terminalsRes.json()
                setTerminals(data.terminals || [])
            }
            if (employeesRes.ok) {
                const data = await employeesRes.json()
                setEmployees(data || [])
            }
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddStation = async () => {
        if (!newStation.name || !newStation.pairingCode) {
            setToast({ message: 'Name and pairing code required', type: 'error' })
            return
        }

        try {
            const res = await fetch('/api/settings/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStation)
            })

            if (res.ok) {
                const data = await res.json()
                setStations([...stations, data.station])
                setNewStation({ name: '', pairingCode: '', paymentMode: 'CASH_ONLY', terminalId: '' })
                setToast({ message: 'Station created!', type: 'success' })
            } else {
                const err = await res.json()
                setToast({ message: err.error || 'Failed to create station', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to create station', type: 'error' })
        }
    }

    const handleAddTerminal = async () => {
        if (!newTerminal.name || !newTerminal.terminalIP) {
            setToast({ message: 'Name and IP address required', type: 'error' })
            return
        }

        try {
            const res = await fetch('/api/settings/terminals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTerminal)
            })

            if (res.ok) {
                const data = await res.json()
                setTerminals([...terminals, data.terminal])
                setNewTerminal({ name: '', terminalIP: '', terminalPort: '10009', terminalType: 'PAX' })
                setShowAddTerminal(false)
                setToast({ message: 'Terminal created!', type: 'success' })
            } else {
                const err = await res.json()
                setToast({ message: err.error || 'Failed to create terminal', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to create terminal', type: 'error' })
        }
    }

    const handleDeleteStation = async (id: string) => {
        if (!confirm('Delete this station?')) return

        try {
            const res = await fetch(`/api/settings/stations?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                setStations(stations.filter(s => s.id !== id))
                setToast({ message: 'Station deleted', type: 'success' })
            }
        } catch (error) {
            setToast({ message: 'Failed to delete', type: 'error' })
        }
    }

    // Assign employee to station
    const handleAssignEmployee = async (stationId: string, employeeId: string) => {
        try {
            const res = await fetch('/api/settings/stations/assign-employee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stationId, employeeId })
            })

            if (res.ok) {
                setToast({ message: 'Employee assigned to station!', type: 'success' })
                fetchData() // Reload to get updated assignments
            } else {
                const err = await res.json()
                setToast({ message: err.error || 'Failed to assign', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to assign employee', type: 'error' })
        }
    }

    // Unassign employee from station
    const handleUnassignEmployee = async (employeeId: string) => {
        try {
            const res = await fetch('/api/settings/stations/assign-employee', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId })
            })

            if (res.ok) {
                setToast({ message: 'Employee unassigned', type: 'success' })
                fetchData()
            } else {
                const err = await res.json()
                setToast({ message: err.error || 'Failed to unassign', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to unassign', type: 'error' })
        }
    }

    // Get unassigned employees
    const getUnassignedEmployees = () => {
        const assignedIds = new Set(
            stations.flatMap(s => (s.assignedEmployees || []).map(e => e.id))
        )
        return employees.filter(e => !assignedIds.has(e.id))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-4">×</button>
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-orange-500/20">
                        <Settings className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">POS Stations & Terminals</h1>
                        <p className="text-stone-400">Configure registers, terminals & employee assignments</p>
                    </div>
                </div>

                {/* Terminals Section */}
                <div className="bg-stone-900 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-400" />
                            Card Terminals
                        </h2>
                        <button
                            onClick={() => setShowAddTerminal(!showAddTerminal)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Terminal
                        </button>
                    </div>

                    {/* Add Terminal Form */}
                    {showAddTerminal && (
                        <div className="mb-4 p-4 bg-stone-800 rounded-xl grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Terminal Name (e.g., Terminal 1)"
                                value={newTerminal.name}
                                onChange={(e) => setNewTerminal({ ...newTerminal, name: e.target.value })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="IP Address (e.g., 192.168.1.101)"
                                value={newTerminal.terminalIP}
                                onChange={(e) => setNewTerminal({ ...newTerminal, terminalIP: e.target.value })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Port (default: 10009)"
                                value={newTerminal.terminalPort}
                                onChange={(e) => setNewTerminal({ ...newTerminal, terminalPort: e.target.value })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            />
                            <select
                                value={newTerminal.terminalType}
                                onChange={(e) => setNewTerminal({ ...newTerminal, terminalType: e.target.value })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            >
                                <option value="PAX">PAX</option>
                                <option value="CLOVER">Clover</option>
                                <option value="STRIPE_READER">Stripe Reader</option>
                            </select>
                            <button
                                onClick={handleAddTerminal}
                                className="col-span-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Terminal
                            </button>
                        </div>
                    )}

                    {/* Terminals List */}
                    <div className="space-y-2">
                        {terminals.length === 0 ? (
                            <p className="text-stone-500 text-center py-4">No terminals configured</p>
                        ) : (
                            terminals.map((terminal) => (
                                <div key={terminal.id} className="flex items-center justify-between p-3 bg-stone-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-blue-400" />
                                        <div>
                                            <p className="font-medium">{terminal.name}</p>
                                            <p className="text-sm text-stone-400">
                                                {terminal.terminalIP}:{terminal.terminalPort} ({terminal.terminalType})
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Stations Section */}
                <div className="bg-stone-900 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-orange-400" />
                            POS Stations
                        </h2>
                    </div>

                    {/* Add Station Form */}
                    <div className="mb-4 p-4 bg-stone-800 rounded-xl">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Station Name (e.g., Register 1)"
                                value={newStation.name}
                                onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Pairing Code (e.g., REG1)"
                                value={newStation.pairingCode}
                                onChange={(e) => setNewStation({ ...newStation, pairingCode: e.target.value.toUpperCase() })}
                                className="px-3 py-2 bg-stone-700 rounded-lg font-mono"
                            />
                            <select
                                value={newStation.paymentMode}
                                onChange={(e) => setNewStation({ ...newStation, paymentMode: e.target.value as 'DEDICATED' | 'CASH_ONLY' })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            >
                                <option value="CASH_ONLY">💵 Cash Only</option>
                                <option value="DEDICATED">💳 Dedicated Terminal</option>
                            </select>
                            {newStation.paymentMode === 'DEDICATED' && (
                                <select
                                    value={newStation.terminalId}
                                    onChange={(e) => setNewStation({ ...newStation, terminalId: e.target.value })}
                                    className="px-3 py-2 bg-stone-700 rounded-lg"
                                >
                                    <option value="">Select Terminal...</option>
                                    {terminals.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.terminalIP})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <button
                            onClick={handleAddStation}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Station
                        </button>
                    </div>

                    {/* Stations List */}
                    <div className="space-y-3">
                        {stations.length === 0 ? (
                            <p className="text-stone-500 text-center py-4">No stations configured</p>
                        ) : (
                            stations.map((station) => (
                                <div key={station.id} className="p-4 bg-stone-800 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${station.paymentMode === 'DEDICATED' ? 'bg-green-500/20' : 'bg-amber-500/20'
                                                }`}>
                                                <span className="text-2xl">
                                                    {station.paymentMode === 'DEDICATED' ? '💳' : '💵'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-bold">{station.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-stone-400">
                                                    <span className="font-mono bg-stone-700 px-2 py-0.5 rounded">
                                                        {station.pairingCode}
                                                    </span>
                                                    {station.paymentMode === 'DEDICATED' && station.dedicatedTerminal && (
                                                        <span>→ {station.dedicatedTerminal.name}</span>
                                                    )}
                                                    {station.paymentMode === 'CASH_ONLY' && (
                                                        <span className="text-amber-400">Cash Only</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteStation(station.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Employee Assignment Section */}
                                    <div className="mt-3 pt-3 border-t border-stone-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm font-medium text-stone-300">Assigned Employees</span>
                                        </div>

                                        {/* Currently assigned employees */}
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(station.assignedEmployees || []).length === 0 ? (
                                                <span className="text-stone-500 text-sm">No employees assigned</span>
                                            ) : (
                                                (station.assignedEmployees || []).map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm"
                                                    >
                                                        <User className="w-3 h-3" />
                                                        {emp.name}
                                                        <button
                                                            onClick={() => handleUnassignEmployee(emp.id)}
                                                            className="hover:text-red-400"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Add employee dropdown */}
                                        {getUnassignedEmployees().length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleAssignEmployee(station.id, e.target.value)
                                                        e.target.value = ''
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-stone-700 rounded-lg text-sm"
                                                defaultValue=""
                                            >
                                                <option value="">+ Assign Employee...</option>
                                                {getUnassignedEmployees().map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-stone-900/50 rounded-xl p-4 text-stone-400 text-sm">
                    <h3 className="font-bold text-stone-300 mb-2">Setup Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Create a station with a unique pairing code (e.g., REG1)</li>
                        <li>Add a terminal if using card payments</li>
                        <li><strong className="text-emerald-400">Assign employees</strong> to stations (required!)</li>
                        <li>On each POS device, employees will auto-connect to their assigned station</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}

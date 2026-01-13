'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings, Plus, Trash2, Save, Monitor, CreditCard, DollarSign, Edit2, User, Users, MapPin, ShieldCheck } from 'lucide-react'

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

interface Location {
    id: string
    name: string
    franchise?: { name: string } | null
}

import EditStationModal from '@/components/modals/EditStationModal'
import { QRCodeSVG } from 'qrcode.react'

export default function StationsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const user = session?.user as any
    const isProvider = user?.role === 'PROVIDER'

    // Non-providers don't need to see this - stations are set up by Oro
    if (status === 'authenticated' && !isProvider) {
        return (
            <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="h-20 w-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">All Set Up!</h2>
                    <p className="text-stone-400 mb-6">
                        Your POS stations and terminals are managed by Oro Support.
                        Just use the POS - everything is already configured for you.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/pos')}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
                    >
                        Go to POS
                    </button>
                </div>
            </div>
        )
    }

    const [stations, setStations] = useState<Station[]>([])
    const [terminals, setTerminals] = useState<Terminal[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocationId, setSelectedLocationId] = useState<string>('')
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

    // Fetch locations for PROVIDER
    useEffect(() => {
        if (isProvider) {
            fetch('/api/locations')
                .then(res => res.json())
                .then(data => {
                    const locs = Array.isArray(data) ? data : []
                    setLocations(locs)
                    if (locs.length > 0 && !selectedLocationId) {
                        setSelectedLocationId(locs[0].id)
                    }
                })
                .catch(console.error)
        }
    }, [isProvider])

    useEffect(() => {
        fetchData()
    }, [selectedLocationId])

    const fetchData = async () => {
        try {
            // For PROVIDER, pass selected locationId to APIs
            const locationParam = isProvider && selectedLocationId ? `?locationId=${selectedLocationId}` : ''
            const [stationsRes, terminalsRes, employeesRes] = await Promise.all([
                fetch(`/api/settings/stations${locationParam}`),
                fetch(`/api/settings/terminals${locationParam}`),
                fetch(`/api/employees${locationParam}`)
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
        if (!newStation.name) {
            setToast({ message: 'Station name required', type: 'error' })
            return
        }

        // Auto-generate pairing code from name (uppercase, no spaces)
        const autoPairingCode = newStation.name.toUpperCase().replace(/\s+/g, '')

        try {
            // Include locationId for PROVIDER
            const payload = isProvider && selectedLocationId
                ? { ...newStation, pairingCode: autoPairingCode, locationId: selectedLocationId }
                : { ...newStation, pairingCode: autoPairingCode }
            const res = await fetch('/api/settings/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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

                {/* Location Selector for PROVIDER */}
                {isProvider && locations.length > 0 && (
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 flex items-center gap-4">
                        <MapPin className="w-5 h-5 text-violet-400" />
                        <div className="flex-1">
                            <label className="text-sm text-violet-300 block mb-1">Select Client Location</label>
                            <select
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white"
                            >
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name} {loc.franchise ? `(${loc.franchise.name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

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
                                placeholder="Station Name (e.g., REG1)"
                                value={newStation.name}
                                onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                                className="px-3 py-2 bg-stone-700 rounded-lg"
                            />
                            {/* Auto-generated pairing code preview */}
                            <div className="px-3 py-2 bg-stone-600/50 rounded-lg font-mono text-stone-400 flex items-center gap-2">
                                <span className="text-xs text-stone-500">Code:</span>
                                <span className="text-emerald-400">{newStation.name ? newStation.name.toUpperCase().replace(/\s+/g, '') : '—'}</span>
                            </div>
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
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingStation(station)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg"
                                                title="Edit Station"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStation(station.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
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

            {/* Edit Modal */}
            {editingStation && (
                <EditStationModal
                    isOpen={!!editingStation}
                    onClose={() => setEditingStation(null)}
                    onSuccess={(updated) => {
                        setStations(stations.map(s => s.id === updated.id ? updated : s))
                        setToast({ message: 'Station updated', type: 'success' })
                    }}
                    station={editingStation}
                    terminals={terminals}
                />
            )}
        </div>
    )
}


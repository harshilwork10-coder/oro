'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Printer, Plus, Trash2, Settings, CheckCircle,
    XCircle, RefreshCw, ArrowLeft, Wifi, WifiOff
} from 'lucide-react'
import Link from 'next/link'

interface PrinterConfig {
    id: string
    name: string
    type: 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL'
    printerLang: 'ESCPOS' | 'ZPL'
    agentUrl: string
    isDefault: boolean
    isActive: boolean
    stationId?: string
    labelWidth?: string
}

export default function PrinterSettingsPage() {
    const { data: session } = useSession()
    const [printers, setPrinters] = useState<PrinterConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // New printer form
    const [showAddForm, setShowAddForm] = useState(false)
    const [newPrinter, setNewPrinter] = useState({
        name: '',
        type: 'RECEIPT' as 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL',
        printerLang: 'ESCPOS' as 'ESCPOS' | 'ZPL',
        agentUrl: 'http://localhost:9100',
        isDefault: false,
        labelWidth: '2.25x1.25'
    })

    // Printer status checks
    const [statuses, setStatuses] = useState<Record<string, 'online' | 'offline' | 'checking'>>({})

    useEffect(() => {
        fetchPrinters()
    }, [])

    async function fetchPrinters() {
        try {
            const res = await fetch('/api/settings/printers')
            if (res.ok) {
                const data = await res.json()
                setPrinters(data)
                // Check status of each printer
                data.forEach((p: PrinterConfig) => checkPrinterStatus(p))
            }
        } catch (error) {
            console.error('Failed to fetch printers:', error)
        } finally {
            setLoading(false)
        }
    }

    async function checkPrinterStatus(printer: PrinterConfig) {
        setStatuses(prev => ({ ...prev, [printer.id]: 'checking' }))
        try {
            const res = await fetch(`${printer.agentUrl}/status`, {
                signal: AbortSignal.timeout(3000)
            })
            setStatuses(prev => ({ ...prev, [printer.id]: res.ok ? 'online' : 'offline' }))
        } catch {
            setStatuses(prev => ({ ...prev, [printer.id]: 'offline' }))
        }
    }

    async function addPrinter() {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/printers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPrinter)
            })

            if (res.ok) {
                const created = await res.json()
                setPrinters([...printers, created])
                setShowAddForm(false)
                setNewPrinter({
                    name: '',
                    type: 'RECEIPT',
                    printerLang: 'ESCPOS',
                    agentUrl: 'http://localhost:9100',
                    isDefault: false,
                    labelWidth: '2.25x1.25'
                })
                setMessage('✅ Printer added!')
                checkPrinterStatus(created)
            } else {
                setMessage('❌ Failed to add printer')
            }
        } catch {
            setMessage('❌ Error adding printer')
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 3000)
        }
    }

    async function deletePrinter(id: string) {
        if (!confirm('Delete this printer?')) return

        try {
            const res = await fetch(`/api/settings/printers?id=${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setPrinters(printers.filter(p => p.id !== id))
                setMessage('✅ Printer removed')
            }
        } catch {
            setMessage('❌ Failed to delete')
        }
        setTimeout(() => setMessage(''), 3000)
    }

    async function setDefaultPrinter(id: string, type: string) {
        try {
            const res = await fetch(`/api/settings/printers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isDefault: true })
            })
            if (res.ok) {
                setPrinters(printers.map(p => ({
                    ...p,
                    isDefault: p.id === id ? true : (p.type === type ? false : p.isDefault)
                })))
                setMessage('✅ Default printer updated')
            }
        } catch {
            setMessage('❌ Failed to update')
        }
        setTimeout(() => setMessage(''), 3000)
    }

    async function testPrinter(printer: PrinterConfig) {
        try {
            const endpoint = printer.printerLang === 'ZPL' ? '/print-label' : '/test'
            const body = printer.printerLang === 'ZPL'
                ? { label: { productName: 'Test Product', price: 9.99, barcode: '123456789012', template: 'FULL' } }
                : {}

            const res = await fetch(`${printer.agentUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                setMessage(`✅ Test print sent to ${printer.name}`)
            } else {
                setMessage(`❌ Test print failed`)
            }
        } catch {
            setMessage(`❌ Cannot connect to ${printer.name}`)
        }
        setTimeout(() => setMessage(''), 3000)
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Printer className="h-6 w-6 text-orange-400" />
                            Printer Configuration
                        </h1>
                        <p className="text-stone-400">Configure receipt and label printers</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
                >
                    <Plus className="h-5 w-5" />
                    Add Printer
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Add Printer Form */}
            {showAddForm && (
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Add New Printer</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Printer Name</label>
                            <input
                                type="text"
                                value={newPrinter.name}
                                onChange={e => setNewPrinter({ ...newPrinter, name: e.target.value })}
                                placeholder="e.g., Register 1 Receipt"
                                className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Printer Type</label>
                            <select
                                value={newPrinter.type}
                                onChange={e => setNewPrinter({
                                    ...newPrinter,
                                    type: e.target.value as any,
                                    printerLang: e.target.value === 'LABEL' ? 'ZPL' : 'ESCPOS'
                                })}
                                className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg"
                            >
                                <option value="RECEIPT">Receipt Printer</option>
                                <option value="KITCHEN">Kitchen Printer</option>
                                <option value="BAR">Bar Printer</option>
                                <option value="LABEL">Label Printer (Zebra)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Agent URL</label>
                            <input
                                type="text"
                                value={newPrinter.agentUrl}
                                onChange={e => setNewPrinter({ ...newPrinter, agentUrl: e.target.value })}
                                placeholder="http://localhost:9100"
                                className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg font-mono text-sm"
                            />
                        </div>
                        {newPrinter.type === 'LABEL' && (
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Label Size</label>
                                <select
                                    value={newPrinter.labelWidth}
                                    onChange={e => setNewPrinter({ ...newPrinter, labelWidth: e.target.value })}
                                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg"
                                >
                                    <option value="2.25x1.25">2.25" x 1.25" (Standard)</option>
                                    <option value="2x1">2" x 1"</option>
                                    <option value="1.5x1">1.5" x 1"</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newPrinter.isDefault}
                                onChange={e => setNewPrinter({ ...newPrinter, isDefault: e.target.checked })}
                                className="h-4 w-4 rounded"
                            />
                            <span className="text-sm">Set as default for this type</span>
                        </label>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={addPrinter}
                            disabled={!newPrinter.name || saving}
                            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg font-medium"
                        >
                            {saving ? 'Adding...' : 'Add Printer'}
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-6 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Printer List */}
            {printers.length === 0 ? (
                <div className="bg-stone-900 rounded-xl border border-stone-800 p-12 text-center">
                    <Printer className="h-16 w-16 mx-auto mb-4 text-stone-600" />
                    <h3 className="text-lg font-semibold mb-2">No Printers Configured</h3>
                    <p className="text-stone-400 mb-6">Add your first printer to get started</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
                    >
                        Add Printer
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {printers.map(printer => (
                        <div key={printer.id} className="bg-stone-900 rounded-xl border border-stone-800 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Status Indicator */}
                                    <div className={`p-2 rounded-lg ${statuses[printer.id] === 'online' ? 'bg-emerald-500/20' :
                                            statuses[printer.id] === 'offline' ? 'bg-red-500/20' :
                                                'bg-stone-800'
                                        }`}>
                                        {statuses[printer.id] === 'online' ? (
                                            <Wifi className="h-5 w-5 text-emerald-400" />
                                        ) : statuses[printer.id] === 'offline' ? (
                                            <WifiOff className="h-5 w-5 text-red-400" />
                                        ) : (
                                            <RefreshCw className="h-5 w-5 text-stone-400 animate-spin" />
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{printer.name}</span>
                                            {printer.isDefault && (
                                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-stone-400 flex items-center gap-3">
                                            <span className="capitalize">{printer.type.toLowerCase()}</span>
                                            <span>•</span>
                                            <span className="font-mono text-xs">{printer.agentUrl}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => checkPrinterStatus(printer)}
                                        className="p-2 hover:bg-stone-800 rounded-lg"
                                        title="Refresh status"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => testPrinter(printer)}
                                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm"
                                    >
                                        Test Print
                                    </button>
                                    {!printer.isDefault && (
                                        <button
                                            onClick={() => setDefaultPrinter(printer.id, printer.type)}
                                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deletePrinter(printer.id)}
                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                                        title="Delete printer"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Help Section */}
            <div className="mt-8 bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                <h3 className="font-semibold mb-3">📖 Setup Guide</h3>
                <div className="space-y-2 text-sm text-stone-400">
                    <p><strong>1. Install Print Agent</strong> - Run the installer on each POS computer</p>
                    <p><strong>2. Add Printer</strong> - Click "Add Printer" and enter the agent URL (usually localhost:9100)</p>
                    <p><strong>3. Test Connection</strong> - Click "Test Print" to verify it works</p>
                    <p><strong>4. Set Defaults</strong> - Mark one receipt and one label printer as default</p>
                </div>
            </div>
        </div>
    )
}

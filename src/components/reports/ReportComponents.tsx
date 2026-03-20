'use client'

import Link from 'next/link'
import { ArrowLeft, RefreshCw, Download, Calendar } from 'lucide-react'
import { ReactNode, useState } from 'react'

// ============ SHARED REPORT UI COMPONENTS ============

/** Report page shell with consistent header, loading, and back nav */
export function ReportShell({ title, subtitle, icon, children, loading, onRefresh, onExportCSV, gradient = 'from-stone-950 via-stone-900 to-stone-950' }: {
    title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; loading?: boolean; onRefresh?: () => void; onExportCSV?: () => void; gradient?: string
}) {
    return (
        <div className={`min-h-screen bg-gradient-to-br ${gradient} text-white p-6`}>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg transition-colors"><ArrowLeft className="h-6 w-6" /></Link>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">{icon}{title}</h1>
                            {subtitle && <p className="text-stone-400 mt-1">{subtitle}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onExportCSV && <button onClick={onExportCSV} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"><Download className="h-4 w-4" />Export CSV</button>}
                        {onRefresh && <button onClick={onRefresh} className="p-2 hover:bg-stone-800 rounded-lg transition-colors"><RefreshCw className="h-5 w-5" /></button>}
                    </div>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="text-center">
                            <RefreshCw className="h-10 w-10 animate-spin mx-auto text-amber-500" />
                            <p className="text-stone-400 mt-4">Loading report...</p>
                        </div>
                    </div>
                ) : children}
            </div>
        </div>
    )
}

/** Colorful KPI metric card */
export function KpiCard({ label, value, subtitle, color = 'text-white', bgGlow, icon }: {
    label: string; value: string | number; subtitle?: string; color?: string; bgGlow?: string; icon?: ReactNode
}) {
    return (
        <div className={`relative overflow-hidden bg-stone-900/80 backdrop-blur border border-stone-700/50 rounded-2xl p-5 transition-all hover:border-stone-600 hover:scale-[1.02]`}>
            {bgGlow && <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${bgGlow}`} />}
            <div className="relative">
                <div className="flex items-center gap-2">
                    {icon && <span className="opacity-60">{icon}</span>}
                    <p className="text-sm text-stone-400 font-medium">{label}</p>
                </div>
                <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
                {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    )
}

/** Period selector dropdown */
export function PeriodSelector({ value, onChange }: { value: number; onChange: (days: number) => void }) {
    return (
        <select value={value} onChange={e => onChange(Number(e.target.value))}
            className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-amber-500 focus:border-amber-500">
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
        </select>
    )
}

/** Colorful data table */
export function ReportTable({ headers, rows, emptyMessage = 'No data' }: {
    headers: { label: string; align?: string }[]; rows: ReactNode[][]; emptyMessage?: string
}) {
    if (rows.length === 0) return <p className="text-stone-500 text-center py-10">{emptyMessage}</p>
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-stone-700">
                        {headers.map((h, i) => <th key={i} className={`py-3 px-4 text-sm font-medium text-stone-400 ${h.align === 'right' ? 'text-right' : 'text-left'}`}>{h.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                            {row.map((cell, j) => <td key={j} className={`py-3 px-4 text-sm ${headers[j]?.align === 'right' ? 'text-right' : ''}`}>{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/** Colored badge */
export function Badge({ text, color }: { text: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' }) {
    const colors = {
        green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        gray: 'bg-stone-500/20 text-stone-400 border-stone-500/30'
    }
    return <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full border ${colors[color]}`}>{text}</span>
}

/** Section header */
export function SectionCard({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div className={`bg-stone-900/80 backdrop-blur border border-stone-700/50 rounded-2xl p-6 ${className}`}>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">{icon}{title}</h2>
            {children}
        </div>
    )
}

/** Mini bar chart (CSS-based, no dep) */
export function MiniBar({ value, max, color = 'bg-emerald-500', label }: { value: number; max: number; color?: string; label?: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            {label && <span className="text-xs text-stone-400 w-12 text-right">{label}</span>}
        </div>
    )
}

/** Fetch helper with error handling */
export async function fetchReport(url: string) {
    const res = await fetch(url)
    const json = await res.json()
    return json.data || json
}

/** Format currency */
export function fmtCurrency(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0)
}

/** Format percentage */
export function fmtPct(v: number) {
    return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** Export data array to CSV and trigger download */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) return
    const headers = Object.keys(data[0])
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const val = row[h]
                const str = val === null || val === undefined ? '' : String(val)
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str
            }).join(',')
        )
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

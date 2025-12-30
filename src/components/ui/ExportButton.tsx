'use client'

import { useState } from 'react'
import { Download, Loader2, Lock } from 'lucide-react'
import { useBusinessConfig } from '@/hooks/useBusinessConfig'

interface ExportButtonProps {
    type: 'data' | 'reports'
    label?: string
    onExport: () => Promise<void>
    className?: string
}

export default function ExportButton({
    type,
    label = 'Export',
    onExport,
    className = ''
}: ExportButtonProps) {
    const { data: config, isLoading: configLoading } = useBusinessConfig()
    const [exporting, setExporting] = useState(false)

    // Check if export is allowed based on type
    const canExport = type === 'data'
        ? config?.canExportData
        : config?.canExportReports

    async function handleExport() {
        if (!canExport) return
        setExporting(true)
        try {
            await onExport()
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setExporting(false)
        }
    }

    if (configLoading) {
        return (
            <button
                disabled
                className={`flex items-center gap-2 px-4 py-2 bg-stone-700 text-stone-400 rounded-lg cursor-not-allowed ${className}`}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{label}</span>
            </button>
        )
    }

    if (!canExport) {
        return (
            <button
                disabled
                title="Export not enabled for your account. Contact your provider to enable this feature."
                className={`flex items-center gap-2 px-4 py-2 bg-stone-800 text-stone-500 rounded-lg cursor-not-allowed ${className}`}
            >
                <Lock className="w-4 h-4" />
                <span>{label}</span>
            </button>
        )
    }

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className={`flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 ${className}`}
        >
            {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            <span>{exporting ? 'Exporting...' : label}</span>
        </button>
    )
}


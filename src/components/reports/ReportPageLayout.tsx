'use client'

import { ArrowLeft, Calendar, Download, Share2 } from "lucide-react"
import Link from "next/link"
import { ReactNode } from "react"

interface ReportPageLayoutProps {
    title: string
    description: string
    children: ReactNode
    actions?: ReactNode
}

export default function ReportPageLayout({ title, description, children, actions }: ReportPageLayoutProps) {
    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        href="/dashboard/reports"
                        className="inline-flex items-center text-sm text-stone-500 hover:text-orange-400 mb-2 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Reports
                    </Link>
                    <h1 className="text-3xl font-bold text-stone-100">{title}</h1>
                    <p className="text-stone-400 mt-1">{description}</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-400 hover:text-stone-100 hover:border-stone-700 transition-colors flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        Last 30 Days
                    </button>
                    <button className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-400 hover:text-stone-100 hover:border-stone-700 transition-colors flex items-center gap-2 text-sm">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                    {actions}
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {children}
            </div>
        </div>
    )
}


'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import {
    Shield,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Calendar,
    FileCheck,
    MapPin,
    Clock
} from "lucide-react"

type ComplianceData = {
    networkCompliance: {
        overall: number
        categories: Array<{
            name: string
            score: number
            trend: string
            issues: number
        }>
    }
    locations: Array<{
        id: string
        name: string
        score: number
        status: string
        lastAudit: string
        nextAudit: string
    }>
    recentAudits: Array<{
        id: string
        location: string
        date: string
        score: number
        auditor: string
        status: string
    }>
    openIssues: Array<{
        id: string
        location: string
        category: string
        severity: string
        description: string
        dueDate: string
    }>
}

export default function CompliancePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchCompliance() {
            try {
                const response = await fetch('/api/compliance')
                if (response.ok) {
                    const data = await response.json()
                    setComplianceData(data)
                }
            } catch (error) {
                console.error('Error fetching compliance:', error)
            } finally {
                setLoading(false)
            }
        }

        if (status === 'authenticated') {
            fetchCompliance()
        }
    }, [status])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    if (!complianceData) {
        return <div className="p-8 text-stone-400">No compliance data available</div>
    }

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400'
        if (score >= 80) return 'text-blue-400'
        if (score >= 70) return 'text-amber-400'
        return 'text-red-400'
    }

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'bg-emerald-500'
        if (score >= 80) return 'bg-blue-500'
        if (score >= 70) return 'bg-amber-500'
        return 'bg-red-500'
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'excellent':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'good':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'needs-attention':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'critical':
                return 'bg-red-500/20 text-red-400 border-red-500/30'
            default:
                return 'bg-stone-700 text-stone-400 border-stone-600'
        }
    }

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-600 text-white'
            case 'high':
                return 'bg-orange-600 text-white'
            case 'medium':
                return 'bg-amber-600 text-white'
            default:
                return 'bg-stone-600 text-white'
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Real-Time Compliance Dashboard</h1>
                    <p className="text-stone-400 mt-2">Monitor brand standards and regulatory compliance across all locations</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all font-medium">
                    Schedule Audit
                </button>
            </div>

            {/* Network Compliance Score */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-stone-100">Network Compliance Score</h2>
                        <p className="text-sm text-stone-400 mt-1">Overall compliance across all locations</p>
                    </div>
                    <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Shield className="h-8 w-8 text-blue-400" />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Score Circle */}
                    <div className="relative h-32 w-32">
                        <svg className="transform -rotate-90 h-32 w-32">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="none"
                                className="text-stone-800"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 56}`}
                                strokeDashoffset={`${2 * Math.PI * 56 * (1 - complianceData.networkCompliance.overall / 100)}`}
                                className="text-blue-500 transition-all duration-1000"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-stone-100">{complianceData.networkCompliance.overall}%</span>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {complianceData.networkCompliance.categories.map((category) => (
                            <div key={category.name} className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-stone-200">{category.name}</span>
                                    {category.trend === 'up' ? (
                                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    ) : category.trend === 'down' ? (
                                        <TrendingDown className="h-4 w-4 text-red-400" />
                                    ) : null}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                                        {category.score}%
                                    </span>
                                    <span className="text-xs text-stone-500">{category.issues} issues</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Location Compliance Heatmap */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-stone-100 mb-4">Location Compliance Scores</h3>
                <div className="space-y-3">
                    {complianceData.locations.map((location) => (
                        <div
                            key={location.id}
                            className="block bg-stone-900/50 rounded-xl p-4 border border-stone-800 hover:border-orange-500/30 transition-all"
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-6 w-6 text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-stone-100">{location.name}</h4>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                                        <span>Last audit: {new Date(location.lastAudit).toLocaleDateString()}</span>
                                        <span>Next: {new Date(location.nextAudit).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`px-3 py-1 rounded-full border text-sm font-semibold ${getStatusBadge(location.status)}`}>
                                        {location.status.replace('-', ' ').toUpperCase()}
                                    </div>
                                    <div className="w-32">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-stone-500">Score</span>
                                            <span className={`text-sm font-bold ${getScoreColor(location.score)}`}>
                                                {location.score}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-stone-800 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${getScoreBg(location.score)}`}
                                                style={{ width: `${location.score}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Audits & Open Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Audits */}
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-stone-100">Recent Audits</h3>
                        <FileCheck className="h-5 w-5 text-stone-500" />
                    </div>
                    <div className="space-y-3">
                        {complianceData.recentAudits.map((audit) => (
                            <div key={audit.id} className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-stone-100">{audit.location}</h4>
                                        <p className="text-sm text-stone-400 mt-1">Auditor: {audit.auditor}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Calendar className="h-4 w-4 text-stone-500" />
                                            <span className="text-xs text-stone-500">{new Date(audit.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                                            <span className="text-2xl font-bold text-emerald-400">{audit.score}%</span>
                                        </div>
                                        <span className="text-xs text-emerald-400 font-semibold">PASSED</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Open Issues */}
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-stone-100">Open Issues</h3>
                        <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="space-y-3">
                        {complianceData.openIssues.map((issue) => (
                            <div key={issue.id} className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(issue.severity)}`}>
                                                {issue.severity.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-stone-500">{issue.category}</span>
                                        </div>
                                        <h4 className="font-bold text-stone-100">{issue.description}</h4>
                                        <p className="text-sm text-stone-400 mt-1">{issue.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Clock className="h-4 w-4 text-red-400" />
                                    <span className="text-xs text-red-400 font-semibold">
                                        Due: {new Date(issue.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

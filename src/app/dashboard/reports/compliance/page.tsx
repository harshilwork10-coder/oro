'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { ShieldCheck, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function ComplianceReportPage() {
    // Mock data
    const complianceData = [
        { id: 1, location: "Aura Downtown", score: 98, healthSafety: 100, brandStandards: 95, operational: 99, status: "EXCELLENT", lastAudit: "2024-11-15" },
        { id: 2, location: "Aura Westside", score: 85, healthSafety: 90, brandStandards: 80, operational: 85, status: "GOOD", lastAudit: "2024-11-10" },
        { id: 3, location: "Aura North Hills", score: 92, healthSafety: 95, brandStandards: 90, operational: 91, status: "EXCELLENT", lastAudit: "2024-11-12" },
        { id: 4, location: "Aura East", score: 72, healthSafety: 75, brandStandards: 70, operational: 71, status: "WARNING", lastAudit: "2024-11-05" },
        { id: 5, location: "Aura South", score: 96, healthSafety: 98, brandStandards: 95, operational: 95, status: "EXCELLENT", lastAudit: "2024-11-18" },
        { id: 6, location: "Aura Uptown", score: 68, healthSafety: 70, brandStandards: 65, operational: 69, status: "CRITICAL", lastAudit: "2024-11-01" },
    ]

    const avgScore = Math.round(complianceData.reduce((sum, item) => sum + item.score, 0) / complianceData.length)

    return (
        <ReportPageLayout
            title="Compliance Scorecard"
            description="Monitor brand standards, health & safety, and operational compliance across the network."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Network Avg Score</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">{avgScore}%</span>
                        <span className="text-xs text-stone-500">Target: 90%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Critical Issues</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">1</span>
                        <span className="text-xs font-medium text-red-400 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs Action
                        </span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Audits Completed</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">6</span>
                        <span className="text-xs text-stone-500">This Month</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Location Compliance Scores</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-center">Overall Score</th>
                                <th className="px-6 py-3 text-center">Health & Safety</th>
                                <th className="px-6 py-3 text-center">Brand Standards</th>
                                <th className="px-6 py-3 text-center">Operational</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Last Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {complianceData.sort((a, b) => b.score - a.score).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-2
                                            ${item.score >= 90 ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                                                item.score >= 75 ? 'border-amber-500 text-amber-400 bg-amber-500/10' :
                                                    'border-red-500 text-red-400 bg-red-500/10'}`}>
                                            {item.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{item.healthSafety}%</td>
                                    <td className="px-6 py-4 text-center">{item.brandStandards}%</td>
                                    <td className="px-6 py-4 text-center">{item.operational}%</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${item.status === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                item.status === 'GOOD' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    item.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {item.status === 'EXCELLENT' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {item.status === 'CRITICAL' && <XCircle className="w-3 h-3 mr-1" />}
                                            {item.status === 'WARNING' && <AlertCircle className="w-3 h-3 mr-1" />}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.lastAudit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}

// Wrap with permission check - Compliance report
export default function ProtectedComplianceReport() {
    return (
        <WithReportPermission reportType="compliance">
            <ComplianceReportPage />
        </WithReportPermission>
    )
}

'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { BarChart3, ArrowRight } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function BenchmarkingReportPage() {
    // Mock data
    const benchmarkData = [
        { id: 1, location: "Aura Downtown", revenuePerSqFt: 450, salesPerLaborHour: 54.40, profitMargin: 23.6, compliance: 98 },
        { id: 2, location: "Aura Westside", revenuePerSqFt: 380, salesPerLaborHour: 50.90, profitMargin: 19.5, compliance: 85 },
        { id: 3, location: "Aura North Hills", revenuePerSqFt: 520, salesPerLaborHour: 55.38, profitMargin: 24.9, compliance: 92 },
        { id: 4, location: "Aura East", revenuePerSqFt: 290, salesPerLaborHour: 44.70, profitMargin: 17.9, compliance: 72 },
        { id: 5, location: "Aura South", revenuePerSqFt: 410, salesPerLaborHour: 53.04, profitMargin: 24.4, compliance: 96 },
    ]

    return (
        <ReportPageLayout
            title="Location Comparison"
            description="Benchmark locations side-by-side across key operational and financial metrics."
        >
            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Performance Benchmarking</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Rev / Sq Ft</th>
                                <th className="px-6 py-3 text-right">Sales / Labor Hr</th>
                                <th className="px-6 py-3 text-right">Profit Margin</th>
                                <th className="px-6 py-3 text-center">Compliance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {benchmarkData.sort((a, b) => b.profitMargin - a.profitMargin).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">${item.revenuePerSqFt}</td>
                                    <td className="px-6 py-4 text-right">${item.salesPerLaborHour.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-400">{item.profitMargin}%</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.compliance >= 90 ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.compliance >= 80 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.compliance}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}

// Wrap with permission check - Benchmarking report
export default function ProtectedBenchmarkingReport() {
    return (
        <WithReportPermission reportType="benchmarking">
            <BenchmarkingReportPage />
        </WithReportPermission>
    )
}

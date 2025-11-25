'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Activity } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function NPSReportPage() {
    const npsData = [
        { id: 1, location: "Aura Downtown", promoters: 75, passive: 15, detractors: 10, nps: 65, trend: "UP" },
        { id: 2, location: "Aura Westside", promoters: 68, passive: 22, detractors: 10, nps: 58, trend: "STABLE" },
        { id: 3, location: "Aura North Hills", promoters: 82, passive: 12, detractors: 6, nps: 76, trend: "UP" },
    ]

    return (
        <ReportPageLayout
            title="Net Promoter Score (NPS)"
            description="Customer satisfaction and loyalty metrics."
        >
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h3 className="font-semibold text-stone-100">NPS Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Promoters</th>
                                <th className="px-6 py-3 text-right">Passive</th>
                                <th className="px-6 py-3 text-right">Detractors</th>
                                <th className="px-6 py-3 text-right">NPS Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {npsData.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right text-emerald-400">{item.promoters}%</td>
                                    <td className="px-6 py-4 text-right text-amber-400">{item.passive}%</td>
                                    <td className="px-6 py-4 text-right text-red-400">{item.detractors}%</td>
                                    <td className="px-6 py-4 text-right font-bold text-stone-100">{item.nps}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedNPSReport() {
    return (
        <WithReportPermission reportType="operational">
            <NPSReportPage />
        </WithReportPermission>
    )
}

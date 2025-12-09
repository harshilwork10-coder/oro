'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { PieChart } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function PnLReportPage() {
    return (
        <ReportPageLayout
            title="Profit & Loss by Location"
            description="Detailed breakdown of revenue, expenses, and net profit margins for each location."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <PieChart className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No P&L Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Profit and Loss data will appear here once revenue and expenses are recorded.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedPnLReport() {
    return (
        <WithReportPermission reportType="financial">
            <PnLReportPage />
        </WithReportPermission>
    )
}

'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Users, FileText } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function LaborReportPage() {
    return (
        <ReportPageLayout
            title="Labor Cost Analysis"
            description="Track labor hours, costs, and productivity across locations."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <Users className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Labor Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Labor metrics will appear here once employee shifts and payroll data are recorded.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedLaborReport() {
    return (
        <WithReportPermission reportType="operational">
            <LaborReportPage />
        </WithReportPermission>
    )
}

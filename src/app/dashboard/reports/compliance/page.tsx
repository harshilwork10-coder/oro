'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { ShieldCheck } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function ComplianceReportPage() {
    return (
        <ReportPageLayout
            title="Compliance Scorecard"
            description="Monitor brand standards, health & safety, and operational compliance across the network."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <ShieldCheck className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Compliance Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Compliance scores will appear here once audits are completed and recorded.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedComplianceReport() {
    return (
        <WithReportPermission reportType="compliance">
            <ComplianceReportPage />
        </WithReportPermission>
    )
}

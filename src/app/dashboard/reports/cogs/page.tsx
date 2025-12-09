'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Package } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function COGSReportPage() {
    return (
        <ReportPageLayout
            title="COGS & Inventory"
            description="Track Cost of Goods Sold, food waste, and inventory turnover rates."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <Package className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Inventory Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        COGS and inventory metrics will appear here once inventory is tracked in the system.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedCOGSReport() {
    return (
        <WithReportPermission reportType="financial">
            <COGSReportPage />
        </WithReportPermission>
    )
}

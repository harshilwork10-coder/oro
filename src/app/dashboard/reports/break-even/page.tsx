'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { TrendingUp } from "lucide-react"

export default function BreakEvenReportPage() {
    return (
        <ReportPageLayout
            title="Break-Even Analysis"
            description="Track locations against their break-even points to ensure financial sustainability."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <TrendingUp className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Break-Even Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Break-even analysis will appear here once revenue and cost data is recorded for your locations.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}

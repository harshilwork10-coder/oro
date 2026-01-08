'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Megaphone } from "lucide-react"

export default function MarketingReportPage() {
    return (
        <ReportPageLayout
            title="Marketing ROI"
            description="Analyze the effectiveness of marketing campaigns and customer acquisition costs."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <Megaphone className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Marketing Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Marketing campaign metrics will appear here once campaigns are tracked.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}


'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { MapPin } from "lucide-react"

export default function TerritoryReportPage() {
    return (
        <ReportPageLayout
            title="Territory Analysis"
            description="Analyze market saturation and identify high-potential zones for expansion."
        >
            <div className="glass-panel rounded-xl p-12">
                <div className="text-center">
                    <MapPin className="w-16 h-16 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-300 mb-2">No Territory Data Available</h3>
                    <p className="text-stone-500 max-w-md mx-auto">
                        Territory analysis will appear here once territories are defined and tracked.
                    </p>
                </div>
            </div>
        </ReportPageLayout>
    )
}


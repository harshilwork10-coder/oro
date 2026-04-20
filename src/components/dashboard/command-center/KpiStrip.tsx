'use client'

import KpiCard from './KpiCard'
import type { KpiCardProps } from './KpiCard'

interface KpiStripProps {
    kpis: KpiCardProps[]
    columns?: 2 | 3 | 4 | 5 | 6
}

export default function KpiStrip({ kpis, columns = 4 }: KpiStripProps) {
    const gridCols: Record<number, string> = {
        2: 'grid-cols-2',
        3: 'grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-4',
        5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    }

    return (
        <div className={`grid ${gridCols[columns]} gap-4`}>
            {kpis.map((kpi, i) => (
                <KpiCard key={i} {...kpi} />
            ))}
        </div>
    )
}

'use client'

import InventoryCommandCenter from '@/components/inventory/InventoryCommandCenter'

export default function InventoryRetailLayout({ children }: { children: React.ReactNode }) {
    return <InventoryCommandCenter>{children}</InventoryCommandCenter>
}

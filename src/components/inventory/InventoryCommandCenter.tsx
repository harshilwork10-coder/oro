'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Package, AlertTriangle, ClipboardList, ArrowLeftRight, Truck, Upload, Wrench,
    ArrowRight, Zap, Tag, FileSpreadsheet, RotateCcw, Barcode, PackageCheck,
    PackageMinus, PackageSearch, Scale, Printer
} from 'lucide-react'

const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
    { id: 'adjustments', label: 'Adjustments', icon: ArrowLeftRight },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'imports', label: 'Imports', icon: Upload },
    { id: 'advanced', label: 'Advanced', icon: Wrench },
]

const tabContent: Record<string, { title: string; cards: { name: string; href: string; icon: any; desc: string }[] }> = {
    alerts: {
        title: 'Inventory Alerts',
        cards: [
            { name: 'Low Stock', href: '/dashboard/inventory/alerts', icon: AlertTriangle, desc: 'Products below reorder point' },
            { name: 'Slow Movers', href: '/dashboard/inventory/alerts', icon: PackageSearch, desc: 'Products not selling (view in Alerts)' },
            { name: 'Smart Ordering', href: '/dashboard/inventory/smart-ordering', icon: Zap, desc: 'AI-powered reorder suggestions' },
        ]
    },
    'purchase-orders': {
        title: 'Purchase Orders',
        cards: [
            { name: 'Purchase Orders', href: '/dashboard/inventory/purchase-orders', icon: ClipboardList, desc: 'Create & manage POs' },
            { name: 'Reorder Suggestions', href: '/dashboard/inventory/reorder-suggestions', icon: RotateCcw, desc: 'Based on sales velocity' },
            { name: 'Auto Reorder', href: '/dashboard/inventory/auto-reorder', icon: Zap, desc: 'Automatic PO generation' },
        ]
    },
    adjustments: {
        title: 'Inventory Adjustments',
        cards: [
            { name: 'Adjustments', href: '/dashboard/inventory/adjustments', icon: ArrowLeftRight, desc: 'Manual stock adjustments' },
            { name: 'Physical Count', href: '/dashboard/inventory/physical-count', icon: Barcode, desc: 'Cycle counts & full audits' },
            { name: 'Shrink Report', href: '/dashboard/inventory/shrink', icon: PackageMinus, desc: 'Track inventory loss' },
            { name: 'Waste Log', href: '/dashboard/inventory/waste-log', icon: PackageMinus, desc: 'Damaged & expired items' },
        ]
    },
    suppliers: {
        title: 'Supplier Management',
        cards: [
            { name: 'Suppliers', href: '/dashboard/owner/vendors', icon: Truck, desc: 'Vendor directory' },
            { name: 'Suppliers (Inv)', href: '/dashboard/inventory/suppliers', icon: Truck, desc: 'Supplier directory' },
        ]
    },
    imports: {
        title: 'Pricing, Import & Invoices',
        cards: [
            { name: 'Vendor Invoices', href: '/dashboard/reports/invoices', icon: FileSpreadsheet, desc: 'Upload, match & post vendor invoices' },
            { name: 'Import Products', href: '/dashboard/inventory/import', icon: Upload, desc: 'CSV/Excel import' },
            { name: 'Invoice Match', href: '/dashboard/inventory/invoice-match', icon: FileSpreadsheet, desc: 'Match invoices to POs' },
            { name: 'Price Book', href: '/dashboard/inventory/price-book', icon: Tag, desc: 'Manage standard price lists' },
            { name: 'Bulk Price Update', href: '/dashboard/inventory/bulk-price-update', icon: Tag, desc: 'Mass price changes' },
            { name: 'Cost History', href: '/dashboard/inventory/cost-history', icon: Scale, desc: 'Track cost changes' },
        ]
    },
    advanced: {
        title: 'Advanced Inventory',
        cards: [
            { name: 'Tag-Along', href: '/dashboard/inventory/tag-along', icon: PackageCheck, desc: 'Auto-add paired products' },
            { name: 'Transfers', href: '/dashboard/owner/transfers', icon: ArrowLeftRight, desc: 'Transfer between locations' },
            { name: 'Print Labels', href: '/dashboard/labels', icon: Printer, desc: 'Shelf & barcode labels' },
            { name: 'Duplicate UPC', href: '/dashboard/inventory/duplicate-upc', icon: Barcode, desc: 'Find duplicate barcodes' },
        ]
    },
}

interface Props {
    children: React.ReactNode
}

export default function InventoryCommandCenter({ children }: Props) {
    const [activeTab, setActiveTab] = useState('products')

    return (
        <div>
            {/* Tab Bar */}
            <div className="border-b border-stone-800 bg-stone-950/80 sticky top-0 z-10">
                <div className="flex overflow-x-auto scrollbar-hide px-4 md:px-8">
                    {tabs.map((tab) => {
                        const TabIcon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                                    activeTab === tab.id
                                        ? 'border-orange-500 text-orange-400'
                                        : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                                }`}
                            >
                                <TabIcon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'products' ? (
                // Products tab renders the existing retail inventory page inline
                children
            ) : (
                // Other tabs render hub card grids
                <div className="p-4 md:p-8">
                    <h2 className="text-2xl font-bold text-stone-100 mb-6">
                        {tabContent[activeTab]?.title || activeTab}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {tabContent[activeTab]?.cards.map((card) => {
                            const CardIcon = card.icon
                            return (
                                <Link
                                    key={card.href}
                                    href={card.href}
                                    className="glass-panel p-5 rounded-xl hover:border-orange-500/30 transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 bg-stone-800/80 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/10 transition-colors">
                                            <CardIcon className="h-5 w-5 text-stone-400 group-hover:text-orange-400 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-stone-200 group-hover:text-orange-200 transition-colors">{card.name}</p>
                                            <p className="text-xs text-stone-500 mt-0.5">{card.desc}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-stone-600 group-hover:text-orange-400 mt-0.5 flex-shrink-0 transition-colors" />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

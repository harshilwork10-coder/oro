'use client'

/**
 * Smart Sidebar — Role-based navigation (zero API calls)
 *
 * Shows different menu items based on user role:
 * - CASHIER: POS, basic inventory
 * - MANAGER: + reports, employee schedule, approvals
 * - OWNER: + full reports, settings, financials, multi-store
 * - ADMIN/PROVIDER: + franchise management, system settings
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, ShoppingCart, Package, BarChart3, Users, Settings,
    DollarSign, Shield, Building2, CalendarClock,
    FileText, ClipboardList, Receipt, Banknote,
    ChevronDown, ChevronRight, Store, Palette, GraduationCap
} from 'lucide-react'

interface NavItem {
    label: string
    href?: string
    icon: any
    roles: string[]
    children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/owner/home', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER', 'ADMIN', 'PROVIDER'] },
    { label: 'POS', href: '/pos', icon: ShoppingCart, roles: ['CASHIER', 'MANAGER', 'OWNER', 'ADMIN'] },
    {
        label: 'Inventory', icon: Package, roles: ['MANAGER', 'OWNER', 'ADMIN'], children: [
            { label: 'Product Manager', href: '/dashboard/inventory/retail', icon: Package, roles: ['MANAGER', 'OWNER', 'ADMIN'] },
            { label: 'Physical Count', href: '/dashboard/inventory/physical-count', icon: ClipboardList, roles: ['MANAGER', 'OWNER'] },
        ]
    },
    {
        label: 'Reports', icon: BarChart3, roles: ['MANAGER', 'OWNER', 'ADMIN', 'PROVIDER'], children: [
            { label: 'Reports Hub', href: '/dashboard/owner/reports-hub', icon: BarChart3, roles: ['OWNER', 'ADMIN'] },
            { label: 'Flash Report', href: '/dashboard/reports/flash-report', icon: DollarSign, roles: ['MANAGER', 'OWNER'] },
            { label: 'Live Sales', href: '/dashboard/reports/realtime-sales', icon: BarChart3, roles: ['MANAGER', 'OWNER'] },
            { label: 'Store Comparison', href: '/dashboard/reports/store-comparison', icon: Building2, roles: ['OWNER', 'ADMIN', 'PROVIDER'] },
            { label: 'Loss Prevention', href: '/dashboard/reports/loss-prevention', icon: Shield, roles: ['OWNER', 'ADMIN'] },
        ]
    },
    { label: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['MANAGER', 'OWNER', 'ADMIN'] },
    { label: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['MANAGER', 'OWNER', 'ADMIN'] },
    {
        label: 'Operations', icon: Banknote, roles: ['OWNER', 'ADMIN'], children: [
            { label: 'Safe Management', href: '/dashboard/owner/safe-management', icon: Banknote, roles: ['OWNER'] },
            { label: 'Approval Queue', href: '/dashboard/owner/approval-queue', icon: ClipboardList, roles: ['OWNER', 'MANAGER'] },
            { label: 'Accounting Export', href: '/dashboard/owner/accounting-export', icon: FileText, roles: ['OWNER'] },
            { label: 'Scheduled Reports', href: '/dashboard/owner/scheduled-reports', icon: CalendarClock, roles: ['OWNER'] },
        ]
    },
    {
        label: 'Settings', icon: Settings, roles: ['OWNER', 'ADMIN', 'PROVIDER'], children: [
            { label: 'Store Hours', href: '/dashboard/owner/store-hours', icon: CalendarClock, roles: ['OWNER'] },
            { label: 'Receipt Template', href: '/dashboard/owner/receipt-template', icon: Receipt, roles: ['OWNER'] },
            { label: 'Payment Processors', href: '/dashboard/settings/payment-processors', icon: DollarSign, roles: ['OWNER', 'ADMIN'] },
            { label: 'Appearance', href: '/dashboard/settings/appearance', icon: Palette, roles: ['OWNER', 'ADMIN'] },
            { label: 'Training Mode', href: '/dashboard/owner/training-mode', icon: GraduationCap, roles: ['OWNER'] },
            { label: 'Stations', href: '/dashboard/settings/stations', icon: Store, roles: ['OWNER', 'ADMIN'] },
        ]
    },
    { label: 'Franchise', href: '/dashboard/franchise', icon: Building2, roles: ['ADMIN', 'PROVIDER'] },
]

interface SmartSidebarProps {
    userRole: string
    collapsed?: boolean
}

export default function SmartSidebar({ userRole, collapsed = false }: SmartSidebarProps) {
    const pathname = usePathname()
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const filteredItems = NAV_ITEMS.filter(item =>
        item.roles.includes(userRole)
    ).map(item => ({
        ...item,
        children: item.children?.filter(c => c.roles.includes(userRole)),
    }))

    const toggleExpand = (label: string) => {
        setExpanded(e => ({ ...e, [label]: !e[label] }))
    }

    return (
        <aside className={`bg-stone-950 border-r border-stone-800 h-screen sticky top-0 overflow-y-auto transition-all ${collapsed ? 'w-16' : 'w-64'}`}>
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 py-5 border-b border-stone-800">
                <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">ORO 9</span>
                {!collapsed && <span className="text-xs text-stone-500 uppercase">{userRole}</span>}
            </div>

            {/* Nav */}
            <nav className="py-3 px-2">
                {filteredItems.map(item => {
                    const isActive = item.href ? pathname === item.href : item.children?.some(c => pathname === c.href)
                    const isExpanded = expanded[item.label] || isActive

                    return (
                        <div key={item.label} className="mb-0.5">
                            {item.children ? (
                                <button onClick={() => toggleExpand(item.label)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-900 hover:text-white'}`}>
                                    <item.icon className="h-4 w-4" />
                                    {!collapsed && <><span className="flex-1 text-left">{item.label}</span>
                                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</>}
                                </button>
                            ) : (
                                <Link href={item.href!}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${pathname === item.href ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-stone-400 hover:bg-stone-900 hover:text-white'}`}>
                                    <item.icon className="h-4 w-4" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            )}

                            {/* Children */}
                            {!collapsed && item.children && isExpanded && (
                                <div className="ml-4 mt-0.5 space-y-0.5">
                                    {item.children.map(child => (
                                        <Link key={child.href} href={child.href!}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${pathname === child.href ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-stone-500 hover:bg-stone-900 hover:text-stone-300'}`}>
                                            <child.icon className="h-3.5 w-3.5" />
                                            <span>{child.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>
        </aside>
    )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
    LayoutDashboard,
    BarChart3,
    Building2,
    Users,
    AlertTriangle,
    Trophy,
    Bell,
    Briefcase,
    MapPin,
    DollarSign,
    Shield,
    FileText,
    ShoppingBag,
    Calendar,
    UserCircle,
    Headphones,
    LogOut,
    X,
    CreditCard,
    Receipt,
    Clock,
    Heart,
    Gift,
    Globe,
    Package,
    Truck
} from 'lucide-react'
import clsx from 'clsx'
import BreadLogo from '@/components/ui/BreadLogo'
import { hasPermission, Role } from '@/lib/permissions'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const role = session?.user?.role

    const businessType = session?.user?.businessType

    // PROVIDER: Platform owner - manages clients & agents ONLY
    const providerLinks = [
        { name: 'Dashboard', href: '/dashboard/provider', icon: LayoutDashboard },
        { name: 'My Clients', href: '/dashboard/franchisors', icon: Building2 },
        { name: 'My Agents', href: '/dashboard/team', icon: Users },
        { name: 'Terminals & Licenses', href: '/dashboard/terminals', icon: Shield },
        { name: 'Shipping', href: '/dashboard/shipping', icon: Truck },
        { name: 'Documents', href: '/dashboard/documents', icon: FileText },
        { name: 'Merchant Applications', href: '/dashboard/merchant-applications', icon: FileText },
    ]

    // BRAND FRANCHISOR: Sells franchises
    const brandFranchisorLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'CRM', href: '/dashboard/crm', icon: Users },
        { name: 'Leads', href: '/dashboard/crm/leads', icon: Users },
        { name: 'Pipeline', href: '/dashboard/crm/pipeline', icon: BarChart3 },
        { name: 'Franchisees', href: '/dashboard/franchisees', icon: Building2 },
        { name: 'Territories', href: '/dashboard/territories', icon: MapPin },
        { name: 'Services Catalog', href: '/dashboard/services/catalog', icon: Briefcase },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
        { name: 'Compliance', href: '/dashboard/compliance', icon: Shield },
        { name: 'Documents', href: '/dashboard/documents', icon: FileText },
    ]

    // MULTI-LOCATION OWNER: Operates salons
    const multiLocationLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'POS', href: '/dashboard/pos', icon: CreditCard },
        { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
        { name: 'Employees', href: '/dashboard/employees', icon: Users },
        { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Inventory', href: '/dashboard/inventory/purchase-orders', icon: ShoppingBag },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Orders', href: '/dashboard/transactions', icon: Receipt },
        { name: 'Reports', href: '/dashboard/reports/daily', icon: FileText },
        { name: 'Financials', href: '/dashboard/financials', icon: DollarSign },
        { name: 'Loyalty', href: '/dashboard/loyalty', icon: Heart },
        { name: 'Gift Cards', href: '/dashboard/gift-cards', icon: Gift },
    ]

    // FRANCHISEE: Location manager
    const franchiseeLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'POS', href: '/dashboard/pos', icon: CreditCard },
        { name: 'Employees', href: '/dashboard/employees', icon: Users },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Inventory', href: '/dashboard/inventory/purchase-orders', icon: ShoppingBag },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Orders', href: '/dashboard/transactions', icon: Receipt },
        { name: 'Reports', href: '/dashboard/reports/daily', icon: FileText },
        { name: 'Loyalty', href: '/dashboard/loyalty', icon: Heart },
        { name: 'Gift Cards', href: '/dashboard/gift-cards', icon: Gift },
    ]

    // MANAGER: Operations manager
    const managerLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'POS', href: '/dashboard/pos', icon: CreditCard },
        { name: 'Employees', href: '/dashboard/employees', icon: Users },
        { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
        { name: 'Time Clock', href: '/dashboard/time-clock', icon: Clock },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Orders', href: '/dashboard/transactions', icon: Receipt },
        { name: 'Reports', href: '/dashboard/reports/daily', icon: FileText },
    ]

    // EMPLOYEE: Front-line staff
    const employeeLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'POS', href: '/dashboard/pos', icon: CreditCard },
        { name: 'Time Clock', href: '/dashboard/time-clock', icon: Clock },
        { name: 'My Schedule', href: '/dashboard/schedule/me', icon: Calendar },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'My Performance', href: '/dashboard/employee/me', icon: UserCircle },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Help Desk', href: '/dashboard/help-desk', icon: Headphones },
    ]

    // Select navigation based on role
    const links =
        session?.user?.role === Role.PROVIDER ? providerLinks :
            session?.user?.role === Role.FRANCHISOR ? (
                businessType === 'BRAND_FRANCHISOR' ? brandFranchisorLinks : multiLocationLinks
            ) :
                session?.user?.role === Role.FRANCHISEE ? franchiseeLinks :
                    session?.user?.role === Role.MANAGER ? managerLinks :
                        employeeLinks

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    'fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity lg:hidden',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <div
                className={clsx(
                    'fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-panel border-r border-stone-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo Header */}
                <div className="flex h-20 items-center justify-between border-b border-stone-800/50 px-6 bg-gradient-to-r from-stone-900/50 to-transparent">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3 group">
                            <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <BreadLogo size={100} className="relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-amber-200 to-orange-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-text-shimmer">
                                Aura
                            </span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-medium tracking-wider uppercase ml-11">The ultimate business solution</p>
                    </div>
                    <button
                        type="button"
                        className="lg:hidden text-stone-400 hover:text-white transition-colors"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close sidebar</span>
                        <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
                    {links.map((link) => {
                        const LinkIcon = link.icon
                        const isActive = pathname === link.href
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => onClose()}
                                className={clsx(
                                    isActive
                                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/5 text-orange-100 border-l-2 border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.1)]'
                                        : 'text-stone-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent hover:border-stone-600',
                                    'group flex items-center rounded-r-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden'
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-50" />
                                )}
                                <LinkIcon
                                    className={clsx(
                                        isActive ? 'text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'text-stone-500 group-hover:text-orange-300',
                                        'mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300 relative z-10'
                                    )}
                                    aria-hidden="true"
                                />
                                <span className="relative z-10">{link.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile Footer */}
                <div className="border-t border-stone-800/50 p-4 bg-stone-900/30 backdrop-blur-md">
                    <div className="flex items-center mb-3 px-2">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-900/20 ring-1 ring-white/10">
                            {session?.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-100 truncate">
                                {session?.user?.name}
                            </p>
                            <p className="text-xs text-stone-500">
                                {role === 'PROVIDER' ? 'Platform Owner' :
                                    role === 'FRANCHISOR' ? 'Salon Owner' :
                                        role === 'FRANCHISEE' ? 'Location Manager' :
                                            role === 'MANAGER' ? 'Operations Manager' : 'Employee'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex w-full items-center justify-center rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all duration-200 group"
                    >
                        <LogOut className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Sign out
                    </button>
                </div>
            </div>
        </>
    )
}

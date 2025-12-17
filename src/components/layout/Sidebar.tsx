'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import OronexLogo from '@/components/ui/OronexLogo'
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
    Truck,
    Monitor,
    MessageSquare,
    Percent,
    Crown,
    Mail,
    Plus,
    Settings
} from 'lucide-react'
import clsx from 'clsx'
import { hasPermission, Role } from '@/lib/permissions'
import { useBusinessConfig } from '@/hooks/useBusinessConfig'
import { Sparkles, Armchair, Ticket, Cigarette, Store, TrendingUp } from 'lucide-react'

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
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Clients', href: '/dashboard/franchisors', icon: Building2 },
        { name: 'Feature Requests', href: '/dashboard/feature-requests', icon: Package },
        { name: 'My Agents', href: '/dashboard/team', icon: Users },
        { name: 'Support Team', href: '/dashboard/support/team', icon: Headphones },
        { name: 'Support Inbox', href: '/dashboard/support', icon: MessageSquare },
        { name: 'SMS Management', href: '/dashboard/provider/sms', icon: MessageSquare },
        { name: 'Terminal Management', href: '/dashboard/terminals', icon: Monitor },
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


    // MULTI-LOCATION OWNER: Manages business remotely (no POS - they don't serve customers)
    const { data: config } = useBusinessConfig()

    // Get industry type from session (SERVICE, RETAIL, RESTAURANT)
    const industryType = (session?.user as any)?.industryType || 'SERVICE'

    const multiLocationLinksBase = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, always: true },
        { name: 'My Stores', href: '/dashboard/locations', icon: MapPin, always: true },
        { name: 'Employees', href: '/dashboard/employees', icon: Users, always: true },
        // SERVICE only - appointments and calendar
        { name: 'Calendar', href: '/dashboard/appointments', icon: Calendar, industry: ['SERVICE'] as const },
        // SERVICE only - services catalog
        { name: 'Services', href: '/dashboard/services', icon: Briefcase, feature: 'usesServices' as const, industry: ['SERVICE'] as const },
        { name: 'Inventory', href: industryType === 'RETAIL' ? '/dashboard/inventory/retail' : '/dashboard/inventory/products', icon: ShoppingBag, feature: 'usesInventory' as const },
        // RETAIL only - Lottery management
        { name: 'Lottery', href: '/dashboard/lottery', icon: Ticket, feature: 'lotteryEnabled' as const, industry: ['RETAIL'] as const },
        { name: 'Customers', href: '/dashboard/customers', icon: Users, always: true },
        { name: 'Orders', href: '/dashboard/transactions', icon: Receipt, always: true },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText, always: true },
        // RETAIL only - Multi-Store Dashboard and Competitor Pricing
        { name: 'Multi-Store', href: '/dashboard/multi-store', icon: Store, industry: ['RETAIL'] as const },
        { name: 'Competitor Pricing', href: '/dashboard/pricing/competitor', icon: TrendingUp, industry: ['RETAIL'] as const },
        { name: 'Marketing', href: '/dashboard/marketing', icon: Mail, feature: 'usesEmailMarketing' as const },
        // SERVICE only - resources (chairs, rooms)
        { name: 'Resources', href: '/dashboard/resources', icon: Armchair, feature: 'enableResources' as const, industry: ['SERVICE'] as const },
        { name: 'Settings', href: '/dashboard/settings/features', icon: Package, always: true },
    ]

    // Filter based on config AND industryType
    const multiLocationLinks = multiLocationLinksBase.filter(link => {
        // Check industry-specific filter
        if (link.industry && !link.industry.includes(industryType)) {
            return false
        }
        if (link.always) return true
        if (!link.feature) return true
        return config?.[link.feature] ?? true // Show by default if config not loaded
    }).map(({ always, feature, industry, ...link }) => link) // Remove filter props


    // FRANCHISEE: Owner who views reports for their locations (no POS - they don't serve customers)
    const franchiseeLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Locations', href: '/dashboard/my-locations', icon: MapPin },
        { name: 'Employees', href: '/dashboard/employees', icon: Users },
        { name: 'Calendar', href: '/dashboard/appointments', icon: Calendar },  // Merged Schedule+Appointments
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },  // Merged Services+Packages
        { name: 'Inventory', href: '/dashboard/inventory/purchase-orders', icon: ShoppingBag },
        { name: 'Customers', href: '/dashboard/customers', icon: Users },  // Merged Customers+Loyalty+GiftCards
        { name: 'Orders', href: '/dashboard/transactions', icon: Receipt },
        { name: 'Reports', href: '/dashboard/reports/daily', icon: FileText },
        { name: 'Settings', href: '/dashboard/settings', icon: Package },
    ]

    // MANAGER: Operations manager
    const managerLinksBase = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, always: true },
        { name: 'POS', href: industryType === 'RETAIL' ? '/dashboard/pos/retail' : '/dashboard/pos/salon', icon: CreditCard, always: true },
        { name: 'Employees', href: '/dashboard/employees', icon: Users, always: true },
        // SERVICE only - calendar
        { name: 'Calendar', href: '/dashboard/appointments', icon: Calendar, industry: ['SERVICE'] as const },
        { name: 'Time Clock', href: '/dashboard/time-clock', icon: Clock, always: true },
        { name: 'Customers', href: '/dashboard/customers', icon: Users, always: true },
        { name: 'Orders', href: '/dashboard/transactions', icon: Receipt, always: true },
        { name: 'Reports', href: '/dashboard/reports/daily', icon: FileText, always: true },
    ]

    const managerLinks = managerLinksBase.filter(link => {
        if (link.industry && !link.industry.includes(industryType)) return false
        return link.always
    }).map(({ always, industry, ...link }) => link)

    // EMPLOYEE: Front-line staff - MINIMAL sidebar for security
    // ONLY "Team" is removed - employees cannot manage other employees
    // All other items are permission-based
    const employeeLinksBase = [
        // Core POS functionality - always visible
        { name: 'POS', href: industryType === 'RETAIL' ? '/dashboard/pos/retail' : '/dashboard/pos/salon', icon: CreditCard, always: true },
        { name: 'Time Clock', href: '/dashboard/time-clock', icon: Clock, permission: 'canClockIn' as const },
        { name: 'My Performance', href: '/dashboard/employee/me', icon: UserCircle, always: true },

        // Permission: canManageInventory - Inventory access
        { name: 'Inventory', href: industryType === 'RETAIL' ? '/dashboard/inventory/retail' : '/dashboard/inventory/products', icon: ShoppingBag, permission: 'canManageInventory' as const },

        // Permission: canViewReports - Reports access
        { name: 'Reports', href: '/dashboard/reports/daily', icon: FileText, permission: 'canViewReports' as const },

        // Permission: canProcessRefunds - Transaction history (for refunds)
        { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt, permission: 'canProcessRefunds' as const },

        // Permission: canManageSchedule - Schedule management
        { name: 'Schedules', href: '/dashboard/schedule', icon: Calendar, permission: 'canManageSchedule' as const, industry: ['SERVICE'] as const },

        // NOTE: Team is REMOVED - employees cannot manage other employees (security)

        // Permission: canAddProducts - Product management
        { name: 'Products', href: '/dashboard/products', icon: Package, permission: 'canAddProducts' as const, industry: ['RETAIL'] as const },

        // Permission: canAddServices - Service management (service businesses)
        { name: 'Services', href: '/dashboard/services', icon: Briefcase, permission: 'canAddServices' as const, industry: ['SERVICE'] as const },

        // Customer access - if they can view reports (usually means trusted employee)
        { name: 'Customers', href: '/dashboard/customers', icon: Users, permission: 'canViewReports' as const },

        // Calendar for service industries (view appointments)
        { name: 'Calendar', href: '/dashboard/appointments', icon: Calendar, industry: ['SERVICE'] as const },

        // Always visible
        { name: 'Help Desk', href: '/dashboard/help-desk', icon: Headphones, always: true },
    ]

    // Filter employee links based on permissions AND industry type
    const employeeLinks = employeeLinksBase.filter(link => {
        // Check industry-specific filter first
        if (link.industry && !link.industry.includes(industryType)) return false
        if (link.always) return true
        if (!link.permission) return true
        // Check if user has the specific permission
        const user = session?.user as any
        return user?.[link.permission] === true
    }).map(({ always, permission, industry, ...link }) => link)

    // SUPPORT_STAFF: Support team members - only see support inbox
    const supportStaffLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Support Inbox', href: '/dashboard/support', icon: Headphones },
    ]

    // Select navigation based on role
    const links =
        session?.user?.role === Role.PROVIDER ? providerLinks :
            session?.user?.role === Role.FRANCHISOR ? (
                businessType === 'BRAND_FRANCHISOR' ? brandFranchisorLinks : multiLocationLinks
            ) :
                session?.user?.role === Role.FRANCHISEE ? franchiseeLinks :
                    session?.user?.role === Role.MANAGER ? managerLinks :
                        session?.user?.role === 'SUPPORT_STAFF' ? supportStaffLinks :
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

            {/* Sidebar - Responsive width */}
            <div
                className={clsx(
                    'fixed inset-y-0 left-0 z-50 flex w-56 xl:w-64 2xl:w-72 flex-col glass-panel border-r border-stone-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo Header - Compact */}
                <div className="flex h-20 xl:h-28 items-center justify-center border-b border-stone-800/50 px-4 bg-gradient-to-r from-stone-900/50 to-transparent">
                    <div className="flex items-center justify-center group">
                        <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                            <img src="/Oronex-logo.png" alt="Oronex" className="h-12 xl:h-16 object-contain" />
                        </div>
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

                {/* Navigation Links - Compact */}
                <nav className="flex-1 space-y-0.5 px-2 py-2 xl:py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
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
                                    'group flex items-center rounded-r-lg px-2 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-medium transition-all duration-200 relative overflow-hidden'
                                )}
                            >
                                {isActive && (
                                    <div
                                        className="absolute inset-0 opacity-10"
                                        style={{ background: 'var(--brand-primary)' }}
                                    />
                                )}
                                <LinkIcon
                                    className={clsx(
                                        'mr-2 xl:mr-3 h-4 xl:h-5 w-4 xl:w-5 flex-shrink-0 transition-all duration-300 relative z-10',
                                        isActive ? '' : 'text-stone-500 group-hover:text-white'
                                    )}
                                    style={isActive ? { color: 'var(--brand-primary)' } : {}}
                                    aria-hidden="true"
                                />
                                <span className="relative z-10 truncate">{link.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile Footer - Compact */}
                <div className="border-t border-stone-800/50 p-2 xl:p-3 bg-stone-900/30 backdrop-blur-md">
                    <div className="flex items-center mb-2 px-1">
                        <div className="h-7 xl:h-8 w-7 xl:w-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs xl:text-sm shadow-lg shadow-orange-900/20 ring-1 ring-white/10">
                            {session?.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-2 flex-1 min-w-0">
                            <p className="text-xs xl:text-sm font-medium text-stone-100 truncate">
                                {session?.user?.name}
                            </p>
                            <p className="text-[10px] xl:text-xs text-stone-500">
                                {role === 'PROVIDER' ? 'Platform Owner' :
                                    role === 'FRANCHISOR' ? 'Owner' :
                                        role === 'FRANCHISEE' ? 'Manager' :
                                            role === 'MANAGER' ? 'Manager' : 'Employee'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex w-full items-center justify-center rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-1.5 text-xs xl:text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all duration-200 group"
                    >
                        <LogOut className="mr-1.5 h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                        Sign out
                    </button>
                </div>
            </div>
        </>
    )
}

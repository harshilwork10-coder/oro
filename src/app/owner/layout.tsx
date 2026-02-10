'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import OroLogo from '@/components/ui/OronexLogo';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import {
    Home, ShoppingCart, Package, Calendar, Users, BarChart3, Settings,
    Menu, X, Bell, Search, ChevronDown, MapPin, Store, Scissors, LogOut,
    CreditCard, Clock, FileText, MessageSquare, Building2, Check, Palette
} from 'lucide-react';

// Business Membership interface
interface BusinessMembership {
    id: string;
    role: string;
    isPrimary: boolean;
    franchisor: {
        id: string;
        name: string;
        businessType: string;
        logoUrl?: string;
    };
}

// Business context for multi-business support
interface BusinessContextType {
    currentBusiness: BusinessMembership | null;
    memberships: BusinessMembership[];
    setCurrentBusiness: (business: BusinessMembership) => void;
    hasMultipleBusinesses: boolean;
}

const BusinessContext = createContext<BusinessContextType>({
    currentBusiness: null,
    memberships: [],
    setCurrentBusiness: () => { },
    hasMultipleBusinesses: false,
});

export const useBusiness = () => useContext(BusinessContext);

// Location context for multi-location support
interface LocationContextType {
    currentLocation: { id: string; name: string; type: 'retail' | 'salon' | 'both' } | null;
    locations: { id: string; name: string; type: 'retail' | 'salon' | 'both' }[];
    setCurrentLocation: (location: { id: string; name: string; type: 'retail' | 'salon' | 'both' }) => void;
}

const LocationContext = createContext<LocationContextType>({
    currentLocation: null,
    locations: [],
    setCurrentLocation: () => { },
});

export const useLocation = () => useContext(LocationContext);

// Location type helper
function deriveLocationType(businessType?: string): 'retail' | 'salon' | 'both' {
    if (!businessType) return 'both';
    const bt = businessType.toUpperCase();
    if (bt.includes('RETAIL') || bt === 'CONVENIENCE' || bt === 'GROCERY') return 'retail';
    if (bt.includes('SALON') || bt.includes('SPA') || bt === 'SERVICE') return 'salon';
    return 'both';
}

// Sidebar nav items - conditional based on business type
function getNavItems(businessType: 'retail' | 'salon' | 'both') {
    const common = [
        { name: 'Dashboard', href: '/owner', icon: Home },
        { name: 'POS', href: '/owner/pos', icon: ShoppingCart },
        { name: 'Transactions', href: '/owner/transactions', icon: CreditCard },
    ];


    const retail = [
        { name: 'Inventory', href: '/owner/inventory', icon: Package },
    ];

    const salon = [
        { name: 'Appointments', href: '/owner/appointments', icon: Calendar },
        { name: 'Services', href: '/owner/services', icon: Scissors },
    ];

    const both = [...retail, ...salon];

    const suffix = [
        { name: 'Employees', href: '/owner/employees', icon: Users },
        { name: 'Time Clock', href: '/owner/time-clock', icon: Clock },
        { name: 'Reports', href: '/owner/reports', icon: BarChart3 },
        { name: 'Documents', href: '/owner/documents', icon: FileText },
        { name: 'Support', href: '/owner/support', icon: MessageSquare },
        { name: 'Settings', href: '/owner/settings', icon: Settings },
    ];

    if (businessType === 'retail') return [...common, ...retail, ...suffix];
    if (businessType === 'salon') return [...common, ...salon, ...suffix];
    return [...common, ...both, ...suffix];
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
    const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
    const [locations, setLocations] = useState<{ id: string; name: string; type: 'retail' | 'salon' | 'both' }[]>([]);
    const [currentLocation, setCurrentLocation] = useState<{ id: string; name: string; type: 'retail' | 'salon' | 'both' } | null>(null);
    const [memberships, setMemberships] = useState<BusinessMembership[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<BusinessMembership | null>(null);
    const pathname = usePathname();

    // Fetch business memberships and locations on mount
    useEffect(() => {
        fetch('/api/auth/status')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.memberships?.length > 0) {
                    setMemberships(data.memberships);
                    // Set first business as current (or primary)
                    const primary = data.memberships.find((m: BusinessMembership) => m.isPrimary) || data.memberships[0];
                    setCurrentBusiness(primary);

                    // Extract real locations from memberships
                    const locs: { id: string; name: string; type: 'retail' | 'salon' | 'both' }[] = [];
                    for (const m of data.memberships) {
                        const fr = m.franchisor;
                        const locType = deriveLocationType(fr?.businessType);
                        if (fr?.franchises) {
                            for (const franchise of fr.franchises) {
                                if (franchise.locations) {
                                    for (const loc of franchise.locations) {
                                        locs.push({ id: loc.id, name: loc.name || fr.name, type: locType });
                                    }
                                }
                            }
                        }
                        // Fallback: if no nested locations, use franchisor itself as a "location"
                        if (locs.length === 0 && fr) {
                            locs.push({ id: fr.id, name: fr.name, type: locType });
                        }
                    }
                    if (locs.length > 0) {
                        setLocations(locs);
                        setCurrentLocation(locs[0]);
                    }
                }
            })
            .catch(console.error);
    }, []);

    const navItems = getNavItems(currentLocation?.type || 'both');
    const hasMultipleBusinesses = memberships.length > 1;

    return (
        <ThemeProvider>
            <BusinessContext.Provider value={{ currentBusiness, memberships, setCurrentBusiness, hasMultipleBusinesses }}>
                <LocationContext.Provider value={{ currentLocation, locations, setCurrentLocation }}>
                    <div className="min-h-screen bg-[var(--theme-bg,var(--background))]">
                        {/* Top Bar */}
                        <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-50 flex items-center px-4">
                            {/* Left: Toggle + Logo */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] mr-3"
                            >
                                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>

                            <div className="flex items-center gap-2">
                                <OroLogo size="sm" showText={true} />
                            </div>

                            {/* Center: Business Switcher (if multiple) + Location Selector */}
                            <div className="flex-1 flex justify-center gap-3">
                                {/* Business Switcher - only shows if user has multiple businesses */}
                                {hasMultipleBusinesses && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
                                            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
                                        >
                                            <Building2 size={16} className="text-amber-400" />
                                            <span className="font-medium text-amber-300 max-w-[120px] truncate">
                                                {currentBusiness?.franchisor.name || 'Select Business'}
                                            </span>
                                            <ChevronDown size={16} className="text-amber-400" />
                                        </button>

                                        {businessDropdownOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setBusinessDropdownOpen(false)}
                                                />
                                                <div className="absolute top-full mt-2 left-0 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-2">
                                                    <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]">
                                                        Switch Business
                                                    </div>
                                                    {memberships.map((m) => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => {
                                                                setCurrentBusiness(m);
                                                                setBusinessDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-hover)] transition-colors ${currentBusiness?.id === m.id ? 'bg-amber-500/10' : ''
                                                                }`}
                                                        >
                                                            <div className="h-8 w-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <Building2 size={16} className="text-amber-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="block text-[var(--text-primary)] font-medium truncate">{m.franchisor.name}</span>
                                                                <span className="block text-xs text-[var(--text-muted)]">{m.role}{m.isPrimary ? ' · Primary' : ''}</span>
                                                            </div>
                                                            {currentBusiness?.id === m.id && (
                                                                <Check size={16} className="text-amber-400" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Location Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] rounded-lg transition-colors"
                                    >
                                        <MapPin size={16} className="text-[var(--primary)]" />
                                        <span className="font-medium text-[var(--text-primary)]">{currentLocation?.name}</span>
                                        <ChevronDown size={16} className="text-[var(--text-muted)]" />
                                    </button>

                                    {locationDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setLocationDropdownOpen(false)}
                                            />
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-2">
                                                <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                                    Select Location
                                                </div>
                                                {locations.map((loc) => (
                                                    <button
                                                        key={loc.id}
                                                        onClick={() => {
                                                            setCurrentLocation(loc);
                                                            setLocationDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors ${currentLocation?.id === loc.id ? 'bg-[var(--primary)]/10' : ''
                                                            }`}
                                                    >
                                                        {loc.type === 'salon' ? (
                                                            <Scissors size={16} className="text-pink-400" />
                                                        ) : loc.type === 'retail' ? (
                                                            <Store size={16} className="text-blue-400" />
                                                        ) : (
                                                            <MapPin size={16} className="text-purple-400" />
                                                        )}
                                                        <span className="text-[var(--text-primary)]">{loc.name}</span>
                                                        <span className="ml-auto text-xs text-[var(--text-muted)] capitalize">{loc.type}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right: Search, Notifications, Profile */}
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]">
                                    <Search size={20} />
                                </button>
                                <button className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] relative">
                                    <Bell size={20} />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                </button>
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium text-sm ml-2">
                                    JD
                                </div>
                            </div>
                        </header>

                        {/* Sidebar */}
                        <aside className={`fixed left-0 top-14 bottom-0 bg-[var(--surface)] border-r border-[var(--border)] z-40 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
                            }`}>
                            <nav className="p-3 space-y-1">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href ||
                                        (item.href !== '/owner' && pathname?.startsWith(item.href));

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                                ? 'bg-[var(--primary)] text-white'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                                }`}
                                        >
                                            <item.icon size={18} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Bottom: Logout */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[var(--border)]">
                                <Link
                                    href="/login"
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-red-400 transition-colors"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </Link>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <main className={`pt-14 min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-0'
                            }`}>
                            <div className="p-6">
                                {children}
                            </div>
                        </main>
                    </div>
                </LocationContext.Provider>
            </BusinessContext.Provider>
        </ThemeProvider>
    );
}



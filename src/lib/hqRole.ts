/**
 * HQ Role Definitions — Single Source of Truth
 *
 * FranchisorMembership roles:
 *   OWNER       — Full HQ access. Can change settings, locks, users, billing.
 *   ADMIN       — Operational access. Cannot manage HQ users or settings.
 *   ACCOUNTANT  — Financial read/write. Royalties + Reports only. No catalog/ops.
 *   VIEWER      — Read-only. Dashboard and reports only. No mutations.
 *
 * Navpages each role can access:
 */

export type HQRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export interface HQRoleDefinition {
    label: string;
    description: string;
    color: string;
    badgeStyle: string;
    allowedPaths: string[]; // StartsWith matching against /franchisor/* routes
    canEdit: boolean;       // Can they mutate data at all?
    canManageUsers: boolean;
    canAccessSettings: boolean;
    canAccessRoyalties: boolean;
    canAccessReports: boolean;
    canAccessCatalog: boolean;
    canAccessFranchisees: boolean;
    canAccessLocations: boolean;
    canAccessExceptions: boolean;
    canAccessCompare: boolean;
    canAccessCompliance: boolean;
}

export const HQ_ROLES: Record<HQRole, HQRoleDefinition> = {
    OWNER: {
        label: 'HQ Owner',
        description: 'Full Brand HQ access. Can manage users, settings, locks, royalties, and all operations.',
        color: 'text-[var(--primary)]',
        badgeStyle: 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30',
        allowedPaths: ['/franchisor'],           // Everything
        canEdit: true,
        canManageUsers: true,
        canAccessSettings: true,
        canAccessRoyalties: true,
        canAccessReports: true,
        canAccessCatalog: true,
        canAccessFranchisees: true,
        canAccessLocations: true,
        canAccessExceptions: true,
        canAccessCompare: true,
        canAccessCompliance: true,
    },
    ADMIN: {
        label: 'HQ Admin',
        description: 'Operational access. Can manage franchisees, locations, exceptions, and catalog. Cannot edit HQ users or brand settings.',
        color: 'text-blue-400',
        badgeStyle: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        allowedPaths: [
            '/franchisor/home',
            '/franchisor/exceptions',
            '/franchisor/franchisees',
            '/franchisor/locations',
            '/franchisor/catalog',
            '/franchisor/reports',
            '/franchisor/compare',
        ],
        canEdit: true,
        canManageUsers: false,
        canAccessSettings: false,
        canAccessRoyalties: false,
        canAccessReports: true,
        canAccessCatalog: true,
        canAccessFranchisees: true,
        canAccessLocations: true,
        canAccessExceptions: true,
        canAccessCompare: true,
        canAccessCompliance: false,
    },
    ACCOUNTANT: {
        label: 'HQ Accountant',
        description: 'Financial access only. Can view royalties, configure royalty rates, and access financial reports. Cannot change operations.',
        color: 'text-emerald-400',
        badgeStyle: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        allowedPaths: [
            '/franchisor/home',
            '/franchisor/royalties',
            '/franchisor/reports',
            '/franchisor/compare',
        ],
        canEdit: false,
        canManageUsers: false,
        canAccessSettings: false,
        canAccessRoyalties: true,
        canAccessReports: true,
        canAccessCatalog: false,
        canAccessFranchisees: false,
        canAccessLocations: false,
        canAccessExceptions: false,
        canAccessCompare: true,
        canAccessCompliance: false,
    },
    VIEWER: {
        label: 'HQ Viewer',
        description: 'Read-only. Can view dashboard and reports. Cannot edit anything.',
        color: 'text-[var(--text-muted)]',
        badgeStyle: 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]',
        allowedPaths: [
            '/franchisor/home',
            '/franchisor/reports',
        ],
        canEdit: false,
        canManageUsers: false,
        canAccessSettings: false,
        canAccessRoyalties: false,
        canAccessReports: true,
        canAccessCatalog: false,
        canAccessFranchisees: false,
        canAccessLocations: false,
        canAccessExceptions: false,
        canAccessCompare: false,
        canAccessCompliance: false,
    },
};

export const HQ_ROLE_ORDER: HQRole[] = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER'];

/**
 * Check if a given HQ role can access a given franchisor path.
 * Used by layout for nav gating and by middleware for route-level guards.
 */
export function canAccessPath(role: HQRole, path: string): boolean {
    const def = HQ_ROLES[role];
    if (!def) return false;
    return def.allowedPaths.some(allowed => path.startsWith(allowed));
}

/**
 * Get the nav items visible to a given HQ role.
 * The layout uses this to show/hide sidebar entries.
 */
export function getVisibleNavPaths(role: HQRole): string[] {
    return HQ_ROLES[role]?.allowedPaths ?? [];
}

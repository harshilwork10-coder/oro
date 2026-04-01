'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Users, Shield, Search, X, Loader2, Eye, EyeOff,
    Crown, MoreHorizontal, ChevronDown, UserX, UserCheck,
    Trash2, Edit3, Check
} from 'lucide-react';
import { HQ_ROLES, HQ_ROLE_ORDER, type HQRole } from '@/lib/hqRole';

type HQTab = 'users' | 'roles';

interface HQMember {
    membershipId: string | null;
    userId: string;
    name: string;
    email: string;
    hqRole: HQRole;
    isPrimary: boolean;
    isOwner: boolean;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string | null;
}

const ROLE_DESCRIPTIONS_COMPACT: Record<HQRole, string> = {
    OWNER: 'Full access',
    ADMIN: 'Ops only',
    ACCOUNTANT: 'Finance only',
    VIEWER: 'Read-only',
};

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState<HQTab>('users');
    const [searchQuery, setSearchQuery] = useState('');
    const [members, setMembers] = useState<HQMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRole, setMyRole] = useState<HQRole>('VIEWER');

    // Inline role editor state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<HQRole>('VIEWER');
    const [savingEdit, setSavingEdit] = useState(false);

    // Action menu state
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Add User modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addError, setAddError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', hqRole: 'ADMIN' as HQRole });

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, roleRes] = await Promise.all([
                fetch('/api/franchisor/users'),
                fetch('/api/franchisor/my-role'),
            ]);
            if (usersRes.ok) {
                const data = await usersRes.json();
                setMembers(data.data || []);
            }
            if (roleRes.ok) {
                const roleData = await roleRes.json();
                setMyRole(roleData.hqRole || 'VIEWER');
            }
        } catch (err) {
            console.error('Failed to fetch HQ members:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    async function handleAddUser() {
        setAddError('');
        if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
            setAddError('Name, email, and password are required.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/franchisor/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newUser.name.trim(),
                    email: newUser.email.trim().toLowerCase(),
                    password: newUser.password,
                    hqRole: newUser.hqRole,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');
            setShowAddModal(false);
            setNewUser({ name: '', email: '', password: '', hqRole: 'ADMIN' });
            await fetchMembers();
            showToast(`${newUser.name} added as ${HQ_ROLES[newUser.hqRole].label}.`);
        } catch (err) {
            setAddError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setSaving(false);
        }
    }

    async function handleRoleSave(membershipId: string) {
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/franchisor/users/${membershipId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hqRole: editRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update role');
            setEditingId(null);
            await fetchMembers();
            showToast('Role updated.');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update');
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleToggleActive(membershipId: string, currentActive: boolean) {
        setActionLoading(membershipId);
        setMenuOpenId(null);
        try {
            const res = await fetch(`/api/franchisor/users/${membershipId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update');
            await fetchMembers();
            showToast(currentActive ? 'User disabled.' : 'User enabled.');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRemove(membershipId: string, name: string) {
        setMenuOpenId(null);
        if (!confirm(`Remove ${name} from Brand HQ? They will lose all HQ access.`)) return;
        setActionLoading(membershipId);
        try {
            const res = await fetch(`/api/franchisor/users/${membershipId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove');
            await fetchMembers();
            showToast(`${name} removed from HQ.`);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to remove');
        } finally {
            setActionLoading(null);
        }
    }

    const filtered = members.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isOwner = myRole === 'OWNER';

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="p-2 bg-[var(--primary)]/20 rounded-lg">
                            <Users size={22} className="text-[var(--primary)]" />
                        </span>
                        HQ Users
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Brand HQ team · {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => { setShowAddModal(true); setAddError(''); }}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        Add HQ User
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-[var(--border)]">
                {([{ id: 'users', label: 'Users', Icon: Users }, { id: 'roles', label: 'Role Matrix', Icon: Shield }] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as HQTab)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <tab.Icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Users tab */}
            {activeTab === 'users' && (
                <>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 max-w-sm relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                        </div>
                        {!isOwner && (
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <Shield size={13} />
                                Your role: <span className="font-medium text-[var(--text-secondary)]">{HQ_ROLES[myRole]?.label}</span>
                            </span>
                        )}
                    </div>

                    <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Member</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">HQ Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Last Login</th>
                                    {isOwner && <th className="px-4 py-3 w-20"></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 size={22} className="animate-spin mx-auto text-[var(--text-muted)]" /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--text-muted)] text-sm">No HQ members found.</td></tr>
                                ) : filtered.map(member => {
                                    const roleDef = HQ_ROLES[member.hqRole] || HQ_ROLES.VIEWER;
                                    const isEditing = editingId === member.membershipId;
                                    const isActioning = actionLoading === member.membershipId;
                                    return (
                                        <tr key={member.userId} className={`border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${!member.isActive ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center shrink-0">
                                                        {member.isOwner
                                                            ? <Crown size={14} className="text-[var(--primary)]" />
                                                            : <span className="text-xs font-bold text-[var(--primary)]">{member.name[0]?.toUpperCase()}</span>
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[var(--text-primary)]">{member.name}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing && member.membershipId ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={editRole}
                                                            onChange={e => setEditRole(e.target.value as HQRole)}
                                                            className="px-2 py-1 bg-[var(--background)] border border-[var(--primary)] rounded-lg text-xs focus:outline-none"
                                                        >
                                                            {HQ_ROLE_ORDER.map(r => (
                                                                <option key={r} value={r}>{HQ_ROLES[r].label}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleRoleSave(member.membershipId!)}
                                                            disabled={savingEdit}
                                                            className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
                                                        >
                                                            {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${roleDef.badgeStyle}`}>
                                                            {member.hqRole}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-muted)]">{ROLE_DESCRIPTIONS_COMPACT[member.hqRole]}</span>
                                                        {isOwner && !member.isOwner && member.membershipId && (
                                                            <button
                                                                onClick={() => { setEditingId(member.membershipId); setEditRole(member.hqRole); }}
                                                                className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Change role"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${member.isActive
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
                                                    }`}>
                                                    {member.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                                                {member.lastLogin
                                                    ? new Date(member.lastLogin).toLocaleDateString()
                                                    : 'Never'
                                                }
                                            </td>
                                            {isOwner && (
                                                <td className="px-4 py-3">
                                                    {!member.isOwner && member.membershipId && (
                                                        isActioning ? (
                                                            <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                                                        ) : (
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setMenuOpenId(menuOpenId === member.membershipId ? null : member.membershipId)}
                                                                    className="p-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                                >
                                                                    <MoreHorizontal size={16} />
                                                                </button>
                                                                {menuOpenId === member.membershipId && (
                                                                    <div className="absolute right-0 top-8 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[160px]">
                                                                        <button
                                                                            onClick={() => { setEditingId(member.membershipId); setEditRole(member.hqRole); setMenuOpenId(null); }}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                        >
                                                                            <Edit3 size={14} /> Change Role
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleToggleActive(member.membershipId!, member.isActive)}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                        >
                                                                            {member.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                                                            {member.isActive ? 'Disable Access' : 'Enable Access'}
                                                                        </button>
                                                                        <div className="border-t border-[var(--border)] my-1" />
                                                                        <button
                                                                            onClick={() => handleRemove(member.membershipId!, member.name)}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                                                        >
                                                                            <Trash2 size={14} /> Remove from HQ
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Roles tab — access matrix */}
            {activeTab === 'roles' && (
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-muted)]">
                        Brand HQ access is controlled by the sub-role assigned in FranchisorMembership.
                        These roles are separate from franchisee-level roles (OWNER, MANAGER, etc.).
                    </p>

                    {/* Role cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {HQ_ROLE_ORDER.map(role => {
                            const def = HQ_ROLES[role];
                            return (
                                <div key={role} className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${def.badgeStyle}`}>{role}</span>
                                        <span className="font-semibold text-[var(--text-primary)] text-sm">{def.label}</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mb-3">{def.description}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Access matrix table */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Access Matrix</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                    <th className="px-4 py-2.5 text-left text-xs text-[var(--text-muted)] font-medium">Section</th>
                                    {HQ_ROLE_ORDER.map(r => (
                                        <th key={r} className="px-4 py-2.5 text-center text-xs text-[var(--text-muted)] font-medium">{r}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Dashboard (Home)', key: 'canAccessExceptions' as const, override: { OWNER: true, ADMIN: true, ACCOUNTANT: true, VIEWER: true } },
                                    { label: 'Exception Board', key: 'canAccessExceptions' as const },
                                    { label: 'Franchisees', key: 'canAccessFranchisees' as const },
                                    { label: 'Locations', key: 'canAccessLocations' as const },
                                    { label: 'Brand Catalog', key: 'canAccessCatalog' as const },
                                    { label: 'Reports', key: 'canAccessReports' as const },
                                    { label: 'Compare Mode', key: 'canAccessCompare' as const },
                                    { label: 'Catalog Compliance', key: 'canAccessCompliance' as const },
                                    { label: 'Royalties', key: 'canAccessRoyalties' as const },
                                    { label: 'Manage Users', key: 'canManageUsers' as const },
                                    { label: 'Settings / Brand Locks', key: 'canAccessSettings' as const },
                                    { label: 'Mutations (edit/delete)', key: 'canEdit' as const },
                                ].map(({ label, key, override }) => (
                                    <tr key={label} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">{label}</td>
                                        {HQ_ROLE_ORDER.map(r => {
                                            const allowed = override ? override[r] : HQ_ROLES[r][key];
                                            return (
                                                <td key={r} className="px-4 py-2.5 text-center">
                                                    {allowed
                                                        ? <span className="text-emerald-400 font-bold text-base">✓</span>
                                                        : <span className="text-[var(--text-muted)] text-xs">—</span>
                                                    }
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Add HQ Team Member</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg"><X size={18} className="text-[var(--text-muted)]" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Full Name</label>
                                <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="Jane Smith" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email Address</label>
                                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="jane@brand.com" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Initial Password</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Min 6 characters" className="w-full px-3 py-2 pr-10 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">HQ Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {HQ_ROLE_ORDER.filter(r => r !== 'OWNER').map(role => {
                                        const def = HQ_ROLES[role];
                                        const selected = newUser.hqRole === role;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setNewUser({ ...newUser, hqRole: role })}
                                                className={`p-3 rounded-xl border text-left transition-all ${selected
                                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                    : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                                                    }`}
                                            >
                                                <span className={`block text-xs font-bold mb-1 ${selected ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>{role}</span>
                                                <span className="block text-xs text-[var(--text-muted)]">{def.description.split('.')[0]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    💡 New OWNER roles must be set manually after creation.
                                </p>
                            </div>

                            {addError && (
                                <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{addError}</p>
                            )}
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm">
                                Cancel
                            </button>
                            <button onClick={handleAddUser} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                {saving ? 'Creating...' : 'Add Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] px-4 py-3 rounded-xl shadow-xl text-sm font-medium z-50">
                    {toast}
                </div>
            )}
        </div>
    );
}

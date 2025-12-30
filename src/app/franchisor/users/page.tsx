'use client';

import { useState } from 'react';
import { Plus, Users, Shield, MoreHorizontal, Search } from 'lucide-react';

type UsersTab = 'users' | 'roles';

const MOCK_USERS = [
    { id: 1, name: 'Admin User', email: 'admin@brand.com', role: 'Admin', status: 'active', lastLogin: '1h ago' },
    { id: 2, name: 'Support Lead', email: 'support@brand.com', role: 'Support', status: 'active', lastLogin: '3h ago' },
    { id: 3, name: 'Reports Viewer', email: 'reports@brand.com', role: 'Viewer', status: 'active', lastLogin: '1d ago' },
];

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState<UsersTab>('users');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs: { id: UsersTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'roles', label: 'Roles', icon: Shield },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                    <Plus size={16} />
                    Add User
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
            </div>

            {activeTab === 'users' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Name</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Email</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Role</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Last Login</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_USERS.map((user) => (
                                <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{user.name}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-[var(--surface-hover)] rounded text-xs">{user.role}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 capitalize">{user.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{user.lastLogin}</td>
                                    <td className="px-4 py-3"><MoreHorizontal size={16} className="text-[var(--text-muted)]" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'roles' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <Shield size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Role Management</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Franchisor-scoped roles only (no system access)</p>
                </div>
            )}
        </div>
    );
}


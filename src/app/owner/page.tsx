'use client';

import { useState } from 'react';
import { useLocation } from './layout';
import {
    DollarSign, TrendingUp, ShoppingCart, Users, Calendar, Clock,
    Package, Scissors, BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// KPI Card Component
function KpiCard({ title, value, change, changeType, icon: Icon }: {
    title: string;
    value: string;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
    return (
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">{title}</span>
                <Icon size={20} className="text-[var(--primary)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
            {change && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${changeType === 'up' ? 'text-emerald-400' :
                    changeType === 'down' ? 'text-red-400' : 'text-[var(--text-muted)]'
                    }`}>
                    {changeType === 'up' ? <ArrowUpRight size={14} /> :
                        changeType === 'down' ? <ArrowDownRight size={14} /> : null}
                    {change}
                </div>
            )}
        </div>
    );
}

// Quick Action Button
function QuickAction({ label, icon: Icon, href }: {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href: string;
}) {
    return (
        <a
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--primary)]/50 transition-all"
        >
            <Icon size={24} className="text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        </a>
    );
}

export default function OwnerDashboard() {
    const { currentLocation } = useLocation();
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

    const isRetail = currentLocation?.type === 'retail' || currentLocation?.type === 'both';
    const isSalon = currentLocation?.type === 'salon' || currentLocation?.type === 'both';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                    <p className="text-[var(--text-secondary)]">{currentLocation?.name}</p>
                </div>
                <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${period === p
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards - Row 1 (Universal) */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard
                    title="Total Sales"
                    value="$4,856"
                    change="+12.5% vs yesterday"
                    changeType="up"
                    icon={DollarSign}
                />
                <KpiCard
                    title="Transactions"
                    value="47"
                    change="+8 vs yesterday"
                    changeType="up"
                    icon={ShoppingCart}
                />
                <KpiCard
                    title="Avg Ticket"
                    value="$103.32"
                    change="-$4.12"
                    changeType="down"
                    icon={TrendingUp}
                />
                <KpiCard
                    title="Staff On Duty"
                    value="4"
                    change=""
                    changeType="neutral"
                    icon={Users}
                />
            </div>

            {/* KPI Cards - Row 2 (Conditional by type) */}
            <div className="grid grid-cols-4 gap-4">
                {isRetail && (
                    <>
                        <KpiCard
                            title="Low Stock Items"
                            value="12"
                            change="Need reorder"
                            changeType="down"
                            icon={Package}
                        />
                        <KpiCard
                            title="Items Sold"
                            value="156"
                            change="+23 vs yesterday"
                            changeType="up"
                            icon={ShoppingCart}
                        />
                    </>
                )}
                {isSalon && (
                    <>
                        <KpiCard
                            title="Appointments Today"
                            value="18"
                            change="3 remaining"
                            changeType="neutral"
                            icon={Calendar}
                        />
                        <KpiCard
                            title="Services Completed"
                            value="15"
                            change="+5 vs yesterday"
                            changeType="up"
                            icon={Scissors}
                        />
                    </>
                )}
                <KpiCard
                    title="Labor Hours"
                    value="32.5h"
                    change="On target"
                    changeType="neutral"
                    icon={Clock}
                />
                <KpiCard
                    title="Labor Cost %"
                    value="18.2%"
                    change="Under budget"
                    changeType="up"
                    icon={BarChart3}
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-6 gap-4">
                    <QuickAction label="Open POS" icon={ShoppingCart} href="/owner/pos" />
                    {isSalon && <QuickAction label="New Appointment" icon={Calendar} href="/owner/appointments/new" />}
                    {isRetail && <QuickAction label="Inventory" icon={Package} href="/owner/inventory" />}
                    <QuickAction label="Time Clock" icon={Clock} href="/owner/time-clock" />
                    <QuickAction label="Reports" icon={BarChart3} href="/owner/reports" />
                    <QuickAction label="Employees" icon={Users} href="/owner/employees" />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-2 gap-6">
                {/* Recent Transactions */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)]">
                        <h3 className="font-semibold text-[var(--text-primary)]">Recent Transactions</h3>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                        {[
                            { id: '#1234', amount: '$45.99', time: '2m ago', status: 'completed' },
                            { id: '#1233', amount: '$128.50', time: '15m ago', status: 'completed' },
                            { id: '#1232', amount: '$23.00', time: '32m ago', status: 'refunded' },
                            { id: '#1231', amount: '$89.99', time: '1h ago', status: 'completed' },
                        ].map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)]">
                                <div>
                                    <span className="font-mono text-sm text-[var(--text-primary)]">{tx.id}</span>
                                    <span className="text-xs text-[var(--text-muted)] ml-2">{tx.time}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-0.5 rounded ${tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                        }`}>{tx.status}</span>
                                    <span className="font-medium text-[var(--text-primary)]">{tx.amount}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Today's Schedule (Salon) or Low Stock (Retail) */}
                {isSalon ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)]">
                            <h3 className="font-semibold text-[var(--text-primary)]">Upcoming Appointments</h3>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {[
                                { time: '2:00 PM', client: 'Sarah M.', service: 'Haircut & Color', stylist: 'Emma' },
                                { time: '2:30 PM', client: 'John D.', service: 'Men\'s Cut', stylist: 'Alex' },
                                { time: '3:00 PM', client: 'Lisa K.', service: 'Manicure', stylist: 'Maria' },
                                { time: '3:30 PM', client: 'Mike T.', service: 'Beard Trim', stylist: 'Emma' },
                            ].map((apt, i) => (
                                <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)]">
                                    <div>
                                        <span className="font-medium text-[var(--text-primary)]">{apt.client}</span>
                                        <span className="text-xs text-[var(--text-muted)] ml-2">{apt.service}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[var(--text-secondary)]">{apt.stylist}</span>
                                        <span className="font-mono text-sm text-[var(--primary)]">{apt.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)]">
                            <h3 className="font-semibold text-[var(--text-primary)]">Low Stock Alert</h3>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {[
                                { name: 'Marlboro Gold', stock: 3, min: 10 },
                                { name: 'Bud Light 12pk', stock: 5, min: 12 },
                                { name: 'Red Bull 4pk', stock: 8, min: 15 },
                                { name: 'Doritos Nacho', stock: 2, min: 8 },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)]">
                                    <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[var(--text-muted)]">Min: {item.min}</span>
                                        <span className="font-mono text-sm text-red-400">{item.stock} left</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


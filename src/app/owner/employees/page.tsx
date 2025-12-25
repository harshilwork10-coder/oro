'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, User, Clock, Shield, DollarSign, X, Phone, Mail } from 'lucide-react';

type EmployeeTab = 'all' | 'active' | 'inactive';

interface Employee {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: 'active' | 'inactive';
    hoursThisWeek: number;
    salesThisWeek: number;
}

const MOCK_EMPLOYEES: Employee[] = [
    { id: 1, name: 'Emma Wilson', email: 'emma@example.com', phone: '(555) 123-4567', role: 'Manager', status: 'active', hoursThisWeek: 38, salesThisWeek: 2450 },
    { id: 2, name: 'Alex Chen', email: 'alex@example.com', phone: '(555) 234-5678', role: 'Stylist', status: 'active', hoursThisWeek: 32, salesThisWeek: 1820 },
    { id: 3, name: 'Maria Garcia', email: 'maria@example.com', phone: '(555) 345-6789', role: 'Cashier', status: 'active', hoursThisWeek: 40, salesThisWeek: 890 },
    { id: 4, name: 'John Smith', email: 'john@example.com', phone: '(555) 456-7890', role: 'Stylist', status: 'inactive', hoursThisWeek: 0, salesThisWeek: 0 },
];

// Phone formatter helper
function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
    let formatted = '';
    if (limited.length > 0) {
        formatted = '(' + limited.slice(0, 3);
    }
    if (limited.length >= 3) {
        formatted += ') ' + limited.slice(3, 6);
    }
    if (limited.length >= 6) {
        formatted += '-' + limited.slice(6, 10);
    }
    return formatted;
}

// Add Employee Modal
function AddEmployeeModal({ isOpen, onClose, onAdd }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (employee: Omit<Employee, 'id' | 'hoursThisWeek' | 'salesThisWeek'>) => void;
}) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Cashier',
        status: 'active' as const,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.name.trim()) newErrors.name = 'Name is required';
        if (!form.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
            newErrors.phone = 'Phone must be 10 digits';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onAdd(form);
            setForm({ name: '', email: '', phone: '', role: 'Cashier', status: 'active' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add New Employee</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg">
                        <X size={20} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Full Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            maxLength={50}
                            className={`w-full bg-[var(--background)] border rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.name ? 'border-red-500' : 'border-[var(--border)]'}`}
                            placeholder="John Doe"
                        />
                        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Email *</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.email ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="john@example.com"
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                                maxLength={14}
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.phone ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Role</label>
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        >
                            <option value="Cashier">Cashier</option>
                            <option value="Stylist">Stylist</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium"
                    >
                        Add Employee
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EmployeesPage() {
    const [activeTab, setActiveTab] = useState<EmployeeTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
    const [showAddModal, setShowAddModal] = useState(false);

    const tabs: { id: EmployeeTab; label: string }[] = [
        { id: 'all', label: 'All Employees' },
        { id: 'active', label: 'Active' },
        { id: 'inactive', label: 'Inactive' },
    ];

    const handleAddEmployee = (newEmp: Omit<Employee, 'id' | 'hoursThisWeek' | 'salesThisWeek'>) => {
        setEmployees([
            ...employees,
            { ...newEmp, id: Date.now(), hoursThisWeek: 0, salesThisWeek: 0 }
        ]);
    };

    const filteredEmployees = employees.filter(emp => {
        if (activeTab === 'active') return emp.status === 'active';
        if (activeTab === 'inactive') return emp.status === 'inactive';
        return true;
    }).filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Employees</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Employee
                </button>
            </div>

            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mb-6">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {filteredEmployees.map((emp) => (
                    <div key={emp.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                                    <User size={24} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">{emp.name}</h3>
                                    <p className="text-sm text-[var(--text-muted)]">{emp.email}</p>
                                    {emp.phone && (
                                        <p className="text-xs text-[var(--text-muted)]">{emp.phone}</p>
                                    )}
                                </div>
                            </div>
                            <button className="p-1 hover:bg-[var(--surface-hover)] rounded">
                                <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <Shield size={14} className="text-[var(--text-muted)]" />
                                <span className="text-[var(--text-secondary)]">{emp.role}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock size={14} className="text-[var(--text-muted)]" />
                                <span className="text-[var(--text-secondary)]">{emp.hoursThisWeek}h this week</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <DollarSign size={14} className="text-[var(--text-muted)]" />
                                <span className="text-[var(--text-secondary)]">${emp.salesThisWeek}</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${emp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                {emp.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Employee Modal */}
            <AddEmployeeModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddEmployee}
            />
        </div>
    );
}

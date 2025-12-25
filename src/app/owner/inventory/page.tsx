'use client';

import { useState } from 'react';
import {
    Search, Plus, Package, AlertTriangle, TrendingDown,
    MoreHorizontal, Download, Upload, X, DollarSign, Hash
} from 'lucide-react';

type InventoryTab = 'all' | 'low-stock' | 'out-of-stock';

interface InventoryItem {
    id: number;
    name: string;
    sku: string;
    category: string;
    stock: number;
    minStock: number;
    price: number;
    status: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
    { id: 1, name: 'Marlboro Gold', sku: 'MAR-001', category: 'Tobacco', stock: 45, minStock: 20, price: 12.99, status: 'in-stock' },
    { id: 2, name: 'Bud Light 12pk', sku: 'BUD-012', category: 'Beer', stock: 5, minStock: 12, price: 14.99, status: 'low-stock' },
    { id: 3, name: 'Red Bull 4pk', sku: 'RB-004', category: 'Energy', stock: 0, minStock: 10, price: 9.99, status: 'out-of-stock' },
    { id: 4, name: 'Doritos Nacho', sku: 'DOR-001', category: 'Snacks', stock: 2, minStock: 8, price: 4.99, status: 'low-stock' },
    { id: 5, name: 'Corona 6pk', sku: 'COR-006', category: 'Beer', stock: 24, minStock: 10, price: 11.99, status: 'in-stock' },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        'in-stock': 'bg-emerald-500/20 text-emerald-400',
        'low-stock': 'bg-amber-500/20 text-amber-400',
        'out-of-stock': 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
        'in-stock': 'In Stock',
        'low-stock': 'Low Stock',
        'out-of-stock': 'Out of Stock',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
            {labels[status]}
        </span>
    );
}

// Add Item Modal with validation
function AddItemModal({ isOpen, onClose, onAdd }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: Omit<InventoryItem, 'id' | 'status'>) => void;
}) {
    const [form, setForm] = useState({
        name: '',
        sku: '',
        category: 'Beer',
        stock: '',
        minStock: '',
        price: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.name.trim()) newErrors.name = 'Name is required';
        if (!form.sku.trim()) newErrors.sku = 'SKU is required';
        if (!form.stock || parseInt(form.stock) < 0) newErrors.stock = 'Valid stock quantity required';
        if (!form.minStock || parseInt(form.minStock) < 0) newErrors.minStock = 'Valid min stock required';
        if (!form.price || parseFloat(form.price) < 0) newErrors.price = 'Valid price required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onAdd({
                name: form.name,
                sku: form.sku.toUpperCase(),
                category: form.category,
                stock: parseInt(form.stock),
                minStock: parseInt(form.minStock),
                price: parseFloat(form.price),
            });
            setForm({ name: '', sku: '', category: 'Beer', stock: '', minStock: '', price: '' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add New Item</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg">
                        <X size={20} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Item Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            maxLength={100}
                            className={`w-full bg-[var(--background)] border rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.name ? 'border-red-500' : 'border-[var(--border)]'}`}
                            placeholder="Bud Light 12pk"
                        />
                        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                    </div>

                    {/* SKU */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">SKU *</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={form.sku}
                                onChange={(e) => {
                                    // Only allow alphanumeric and dashes, uppercase
                                    const filtered = e.target.value.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
                                    setForm({ ...form, sku: filtered });
                                }}
                                maxLength={20}
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.sku ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="BUD-012"
                            />
                        </div>
                        {errors.sku && <p className="text-xs text-red-400 mt-1">{errors.sku}</p>}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        >
                            <option value="Beer">Beer</option>
                            <option value="Wine">Wine</option>
                            <option value="Spirits">Spirits</option>
                            <option value="Tobacco">Tobacco</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Energy">Energy Drinks</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Stock & Min Stock */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Current Stock *</label>
                            <input
                                type="number"
                                value={form.stock}
                                onChange={(e) => {
                                    // Only allow digits
                                    const filtered = e.target.value.replace(/\D/g, '');
                                    setForm({ ...form, stock: filtered });
                                }}
                                min="0"
                                max="99999"
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.stock ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="0"
                            />
                            {errors.stock && <p className="text-xs text-red-400 mt-1">{errors.stock}</p>}
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Min Stock *</label>
                            <input
                                type="number"
                                value={form.minStock}
                                onChange={(e) => {
                                    const filtered = e.target.value.replace(/\D/g, '');
                                    setForm({ ...form, minStock: filtered });
                                }}
                                min="0"
                                max="9999"
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.minStock ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="10"
                            />
                            {errors.minStock && <p className="text-xs text-red-400 mt-1">{errors.minStock}</p>}
                        </div>
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Price *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                step="0.01"
                                min="0"
                                max="99999.99"
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.price ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="9.99"
                            />
                        </div>
                        {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
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
                        Add Item
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<InventoryTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [showAddModal, setShowAddModal] = useState(false);

    const tabs: { id: InventoryTab; label: string; icon?: React.ComponentType<{ size?: number }> }[] = [
        { id: 'all', label: 'All Items' },
        { id: 'low-stock', label: 'Low Stock', icon: TrendingDown },
        { id: 'out-of-stock', label: 'Out of Stock', icon: AlertTriangle },
    ];

    const handleAddItem = (newItem: Omit<InventoryItem, 'id' | 'status'>) => {
        const status = newItem.stock === 0 ? 'out-of-stock' : newItem.stock <= newItem.minStock ? 'low-stock' : 'in-stock';
        setItems([...items, { ...newItem, id: Date.now(), status }]);
    };

    const filteredItems = items.filter(item => {
        if (activeTab === 'low-stock') return item.status === 'low-stock';
        if (activeTab === 'out-of-stock') return item.status === 'out-of-stock';
        return true;
    }).filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inventory</h1>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors">
                        <Download size={16} />
                        Export
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors">
                        <Upload size={16} />
                        Import
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        Add Item
                    </button>
                </div>
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
                        {tab.icon && <tab.icon size={16} />}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
                <select className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)]">
                    <option value="">All Categories</option>
                    <option value="tobacco">Tobacco</option>
                    <option value="beer">Beer</option>
                    <option value="snacks">Snacks</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Item</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">SKU</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Category</th>
                            <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Stock</th>
                            <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Min Stock</th>
                            <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Price</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map((item) => (
                            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Package size={16} className="text-[var(--text-muted)]" />
                                        <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{item.sku}</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{item.category}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={item.stock <= item.minStock ? 'text-red-400 font-medium' : 'text-[var(--text-primary)]'}>
                                        {item.stock}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-[var(--text-muted)]">{item.minStock}</td>
                                <td className="px-4 py-3 text-right text-[var(--text-primary)]">${item.price.toFixed(2)}</td>
                                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                <td className="px-4 py-3">
                                    <button className="p-1 hover:bg-[var(--surface-active)] rounded">
                                        <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Item Modal */}
            <AddItemModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddItem}
            />
        </div>
    );
}

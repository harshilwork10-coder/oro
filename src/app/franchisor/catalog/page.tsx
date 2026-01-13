'use client';

import { useState, useEffect } from 'react';
import { Plus, Package, Scissors, FolderTree, AlertTriangle, Search, MoreHorizontal } from 'lucide-react';

type CatalogTab = 'products' | 'services' | 'categories' | 'compliance';

export default function CatalogPage() {
    const [activeTab, setActiveTab] = useState<CatalogTab>('products');
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch products and services from database
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, servRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/services')
                ])

                if (prodRes.ok) {
                    const data = await prodRes.json()
                    const prodArray = Array.isArray(data) ? data : (data.products || data.data || [])
                    setProducts(prodArray.map((p: any) => ({
                        id: p.id,
                        name: p.name || 'Unknown',
                        sku: p.sku || p.barcode || '',
                        price: Number(p.price) || 0,
                        category: p.category || 'General',
                        status: 'active'
                    })))
                }

                if (servRes.ok) {
                    const data = await servRes.json()
                    const servArray = Array.isArray(data) ? data : (data.services || data.data || [])
                    setServices(servArray.map((s: any) => ({
                        id: s.id,
                        name: s.name || 'Unknown',
                        duration: s.duration || 30,
                        price: Number(s.price) || 0,
                        category: s.category || 'General',
                        status: 'active'
                    })))
                }
            } catch (err) {
                console.error('Failed to fetch catalog:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const tabs: { id: CatalogTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'products', label: 'Products', icon: Package },
        { id: 'services', label: 'Services', icon: Scissors },
        { id: 'categories', label: 'Categories', icon: FolderTree },
        { id: 'compliance', label: 'Compliance', icon: AlertTriangle },
    ];

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Catalog</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                    <Plus size={16} />
                    {activeTab === 'products' ? 'Add Product' : activeTab === 'services' ? 'Add Service' : 'Add Category'}
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
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>
                </div>
            </div>

            {activeTab === 'products' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Name</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">SKU</th>
                                <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Default Price</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Category</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">No products found</td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{product.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{product.sku}</td>
                                        <td className="px-4 py-3 text-right text-[var(--text-primary)]">${product.price.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{product.category}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 capitalize">{product.status}</span>
                                        </td>
                                        <td className="px-4 py-3"><MoreHorizontal size={16} className="text-[var(--text-muted)]" /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'services' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Service Name</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Duration</th>
                                <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Default Price</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Category</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServices.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">No services found</td>
                                </tr>
                            ) : (
                                filteredServices.map((service) => (
                                    <tr key={service.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{service.name}</td>
                                        <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{service.duration} min</td>
                                        <td className="px-4 py-3 text-right text-[var(--text-primary)]">${service.price.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{service.category}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 capitalize">{service.status}</span>
                                        </td>
                                        <td className="px-4 py-3"><MoreHorizontal size={16} className="text-[var(--text-muted)]" /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <FolderTree size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Category Management</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Category tree editor coming soon</p>
                </div>
            )}

            {activeTab === 'compliance' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Compliance Check</h3>
                    <p className="text-[var(--text-secondary)] mt-2">View locations/franchisees deviating from brand standards</p>
                </div>
            )}
        </div>
    );
}


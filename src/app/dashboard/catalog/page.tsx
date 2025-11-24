'use client'

import { useState, useEffect } from 'react'
import {
    Globe,
    Plus,
    Search,
    Filter,
    Edit2,
    Archive,
    ArrowRight,
    Tag,
    Scissors,
    Package
} from 'lucide-react'

export default function GlobalCatalogPage() {
    const [activeTab, setActiveTab] = useState<'services' | 'products'>('services')
    const [services, setServices] = useState([])
    const [products, setProducts] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [servicesRes, productsRes] = await Promise.all([
                    fetch('/api/catalog/services'),
                    fetch('/api/catalog/products')
                ])

                if (servicesRes.ok) setServices(await servicesRes.json())
                if (productsRes.ok) setProducts(await productsRes.json())
            } catch (error) {
                console.error('Failed to fetch catalog:', error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-500" />
                        Global Catalog
                    </h1>
                    <p className="text-stone-400 mt-2">Manage standard services and products across all locations</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 flex items-center gap-2 transition-colors">
                        <Filter className="h-4 w-4" />
                        Filter
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                        <Plus className="h-4 w-4" />
                        Add Global Item
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-stone-800">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'services' ? 'border-blue-500 text-blue-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
                >
                    <Scissors className="h-4 w-4" />
                    Global Services
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'products' ? 'border-blue-500 text-blue-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
                >
                    <Package className="h-4 w-4" />
                    Global Products
                </button>
            </div>

            {/* Content Area */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                        <input
                            type="text"
                            placeholder={`Search global ${activeTab}...`}
                            className="w-full bg-stone-900/50 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-stone-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-stone-500">Loading catalog data...</div>
                    ) : (
                        <table className="w-full text-left text-sm text-stone-400">
                            <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Category</th>
                                    {activeTab === 'services' ? (
                                        <>
                                            <th className="px-6 py-3 text-right">Duration</th>
                                            <th className="px-6 py-3 text-right">Default Price</th>
                                            <th className="px-6 py-3 text-right">Active Locations</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-3">SKU</th>
                                            <th className="px-6 py-3 text-right">Default Cost</th>
                                            <th className="px-6 py-3 text-right">Default Price</th>
                                        </>
                                    )}
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {activeTab === 'services' ? (
                                    services.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                                                No global services found. Add one to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        services.map((service: any) => (
                                            <tr key={service.id} className="hover:bg-stone-800/30 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-stone-200">{service.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700">
                                                        {service.category || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">{service.duration} min</td>
                                                <td className="px-6 py-4 text-right font-medium text-stone-200">${Number(service.defaultPrice).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-emerald-400">{service._count?.localInstances || 0}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-blue-400 transition-colors">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-red-400 transition-colors">
                                                            <Archive className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                ) : (
                                    products.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                                                No global products found. Add one to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product: any) => (
                                            <tr key={product.id} className="hover:bg-stone-800/30 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-stone-200">{product.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700">
                                                        {product.category || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{product.sku || '-'}</td>
                                                <td className="px-6 py-4 text-right">${product.defaultCost ? Number(product.defaultCost).toFixed(2) : '-'}</td>
                                                <td className="px-6 py-4 text-right font-medium text-stone-200">${Number(product.defaultPrice).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-blue-400 transition-colors">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-red-400 transition-colors">
                                                            <Archive className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Search, MapPin, Phone, Clock, ChevronRight, Package } from 'lucide-react';
import { CartProvider } from '@/components/storefront/CartProvider';
import StoreHeader from '@/components/storefront/StoreHeader';
import ProductCard from '@/components/storefront/ProductCard';

interface StoreData {
    name: string;
    slug: string;
    headline?: string;
    address?: string;
    phone?: string;
    bannerImageUrl?: string;
    logoUrl?: string;
    operatingHours?: any;
}

interface Category {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    productCount: number;
}

interface Product {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    brand?: string;
    size?: string;
    stockStatus: string;
    category?: { id: string; name: string; color?: string } | null;
}

function StoreContent() {
    const params = useParams();
    const slug = params.slug as string;

    const [store, setStore] = useState<StoreData | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Fetch store info
    useEffect(() => {
        async function fetchStore() {
            try {
                const res = await fetch(`/api/public/storefront/${slug}`);
                if (!res.ok) {
                    setError(res.status === 404 ? 'Store not found' : 'Failed to load store');
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                setStore(data.store);
            } catch {
                setError('Failed to load store');
            }
        }
        fetchStore();
    }, [slug]);

    // Fetch products
    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (selectedCategory) params.set('category', selectedCategory);
                if (searchDebounced) params.set('search', searchDebounced);
                params.set('limit', '100');

                const res = await fetch(`/api/public/storefront/${slug}/products?${params}`);
                if (!res.ok) {
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                setProducts(data.products || []);
                if (data.categories) setCategories(data.categories);
            } catch {}
            setLoading(false);
        }
        if (store) fetchProducts();
    }, [slug, store, selectedCategory, searchDebounced]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Store Not Available</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            </div>
        );
    }

    return (
        <>
            <StoreHeader store={store} />

            {/* Hero Banner */}
            <section className="relative bg-gradient-to-r from-orange-500 to-amber-500 overflow-hidden">
                {store.bannerImageUrl && (
                    <img
                        src={store.bannerImageUrl}
                        alt={store.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                )}
                <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {store.headline || `Welcome to ${store.name}`}
                    </h2>
                    <p className="text-orange-100 text-lg">Browse products · Reserve online · Pay in store</p>
                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/90">
                        {store.address && (
                            <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {store.address}
                            </span>
                        )}
                        {store.phone && (
                            <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-white">
                                <Phone size={14} />
                                {store.phone}
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* Search Bar */}
            <div className="max-w-6xl mx-auto px-4 -mt-5 relative z-10">
                <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 text-base"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
                {/* Category Sidebar (desktop) */}
                <aside className="hidden md:block w-56 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
                    <nav className="space-y-1">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                !selectedCategory ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            All Products
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                                    selectedCategory === cat.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span>{cat.name}</span>
                                <span className="text-xs text-gray-400">{cat.productCount}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Category Pills (mobile) */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-2 overflow-x-auto">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${
                                !selectedCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                                    selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <main className="flex-1 min-w-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20">
                            <Package size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                {searchDebounced ? `No results for "${searchDebounced}"` : 'This category has no products'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-4">{products.length} product{products.length !== 1 ? 's' : ''}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-20 md:pb-0">
                                {products.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}

export default function StorefrontPage() {
    const params = useParams();
    const slug = params.slug as string;

    return (
        <CartProvider storeSlug={slug}>
            <StoreContent />
        </CartProvider>
    );
}

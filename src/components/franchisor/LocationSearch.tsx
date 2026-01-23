'use client';

/**
 * Location Search Component (Scalable for 5000+ stores)
 * 
 * Features:
 * - Typeahead search
 * - Faceted filters (state, city, region)
 * - Favorites + recent locations
 * - Pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Star, MapPin, Building2, ChevronRight, Filter, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Location {
    id: string;
    name: string;
    storeCode: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    region: string;
    status: string;
    franchisee?: { id: string; name: string };
}

interface Facet {
    value: string;
    count: number;
}

interface SearchResponse {
    locations: Location[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    facets: {
        states: Facet[];
        cities: Facet[];
        regions: Facet[];
    };
}

export default function LocationSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');

    // Favorites & Recent
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentLocations, setRecentLocations] = useState<Location[]>([]);

    // Load favorites and recent from localStorage
    useEffect(() => {
        const savedFavorites = localStorage.getItem('locationFavorites');
        const savedRecent = localStorage.getItem('recentLocations');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
        if (savedRecent) setRecentLocations(JSON.parse(savedRecent));
    }, []);

    // Search function
    const searchLocations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            if (selectedState) params.set('state', selectedState);
            if (selectedCity) params.set('city', selectedCity);
            if (selectedRegion) params.set('region', selectedRegion);
            params.set('pageSize', '20');

            const res = await fetch(`/api/franchisor/locations/search?${params}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, [query, selectedState, selectedCity, selectedRegion]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchLocations();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchLocations]);

    // Toggle favorite
    const toggleFavorite = (locationId: string) => {
        const newFavorites = favorites.includes(locationId)
            ? favorites.filter(id => id !== locationId)
            : [...favorites, locationId];
        setFavorites(newFavorites);
        localStorage.setItem('locationFavorites', JSON.stringify(newFavorites));
    };

    // Navigate to Location 360
    const openLocation = (location: Location) => {
        // Add to recent
        const newRecent = [location, ...recentLocations.filter(l => l.id !== location.id)].slice(0, 10);
        setRecentLocations(newRecent);
        localStorage.setItem('recentLocations', JSON.stringify(newRecent));

        router.push(`/franchisor/locations/${location.id}`);
    };

    // Clear filters
    const clearFilters = () => {
        setSelectedState('');
        setSelectedCity('');
        setSelectedRegion('');
    };

    const hasFilters = selectedState || selectedCity || selectedRegion;

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="p-4 border-b border-stone-800 space-y-3">
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by store name, city, zip, or code..."
                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${showFilters || hasFilters
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasFilters && <span className="text-xs bg-orange-500 text-white px-1.5 rounded">Active</span>}
                    </button>

                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-stone-400 hover:text-white"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </button>
                    )}

                    <span className="ml-auto text-sm text-stone-500">
                        {results?.total || 0} locations
                    </span>
                </div>

                {/* Facet Filters */}
                {showFilters && results?.facets && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-stone-900 rounded-lg">
                        {/* State Filter */}
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">State</label>
                            <select
                                value={selectedState}
                                onChange={(e) => {
                                    setSelectedState(e.target.value);
                                    setSelectedCity(''); // Reset city when state changes
                                }}
                                className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded text-sm"
                            >
                                <option value="">All States</option>
                                {results.facets.states.map(f => (
                                    <option key={f.value} value={f.value}>
                                        {f.value} ({f.count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* City Filter */}
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">City</label>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded text-sm"
                            >
                                <option value="">All Cities</option>
                                {results.facets.cities.map(f => (
                                    <option key={f.value} value={f.value}>
                                        {f.value} ({f.count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Region Filter */}
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">Region</label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded text-sm"
                            >
                                <option value="">All Regions</option>
                                {results.facets.regions.map(f => (
                                    <option key={f.value} value={f.value}>
                                        {f.value} ({f.count})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Locations (when no search) */}
            {!query && recentLocations.length > 0 && (
                <div className="p-4 border-b border-stone-800">
                    <h3 className="text-xs text-stone-500 uppercase tracking-wide mb-2">Recent</h3>
                    <div className="flex flex-wrap gap-2">
                        {recentLocations.slice(0, 5).map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => openLocation(loc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm transition-colors"
                            >
                                <MapPin className="w-3 h-3 text-stone-500" />
                                {loc.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto">
                {results?.locations.map(location => (
                    <div
                        key={location.id}
                        onClick={() => openLocation(location)}
                        className="flex items-center gap-3 p-4 border-b border-stone-800 hover:bg-stone-900 cursor-pointer transition-colors group"
                    >
                        {/* Favorite Star */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(location.id);
                            }}
                            className={`p-1 rounded transition-colors ${favorites.includes(location.id)
                                    ? 'text-yellow-400'
                                    : 'text-stone-600 hover:text-stone-400'
                                }`}
                        >
                            <Star className="w-4 h-4" fill={favorites.includes(location.id) ? 'currentColor' : 'none'} />
                        </button>

                        {/* Location Icon */}
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-orange-400" />
                        </div>

                        {/* Location Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{location.name}</h4>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${location.status === 'ACTIVE'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : location.status === 'PROVISIONING'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-stone-700 text-stone-400'
                                    }`}>
                                    {location.status}
                                </span>
                            </div>
                            <p className="text-sm text-stone-400 truncate">
                                {location.address}, {location.city}, {location.state} {location.zipCode}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                                {location.storeCode && <span>#{location.storeCode}</span>}
                                {location.franchisee && <span>{location.franchisee.name}</span>}
                                {location.region && <span>{location.region}</span>}
                            </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-stone-600 group-hover:text-stone-400 transition-colors" />
                    </div>
                ))}

                {/* Empty State */}
                {results && results.locations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-500">
                        <MapPin className="w-12 h-12 mb-4 opacity-20" />
                        <p>No locations found</p>
                        {hasFilters && (
                            <button onClick={clearFilters} className="mt-2 text-orange-400 hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

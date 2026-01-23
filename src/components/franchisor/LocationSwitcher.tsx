'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Store, Star, Clock, ChevronDown, X, MapPin, Building2 } from 'lucide-react';

interface Location {
    id: string;
    name: string;
    city?: string;
    state?: string;
    status?: string;
    franchisee?: string;
}

interface LocationSwitcherProps {
    selectedLocation: Location | null;
    onLocationChange: (location: Location | null) => void;
    franchisorId?: string;
}

const ALL_LOCATIONS: Location = {
    id: 'ALL',
    name: 'All Locations',
};

export default function LocationSwitcher({ selectedLocation, onLocationChange, franchisorId }: LocationSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('franchisor_favorite_locations');
        if (saved) setFavorites(JSON.parse(saved));

        const recent = localStorage.getItem('franchisor_recent_locations');
        if (recent) setRecentlyViewed(JSON.parse(recent));
    }, []);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search when opening
    useEffect(() => {
        if (isOpen && searchRef.current) {
            searchRef.current.focus();
        }
    }, [isOpen]);

    // Fetch locations on search
    const searchLocations = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/franchisor/locations?search=${encodeURIComponent(query)}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setLocations(data.locations || []);
            }
        } catch (error) {
            console.error('Failed to search locations:', error);
        }
        setLoading(false);
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery.length >= 2) {
            const timer = setTimeout(() => searchLocations(searchQuery), 300);
            return () => clearTimeout(timer);
        } else if (searchQuery.length === 0) {
            // Load favorites and recent when no search
            loadFavoritesAndRecent();
        }
    }, [searchQuery, searchLocations]);

    const loadFavoritesAndRecent = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/franchisor/locations?limit=50');
            if (res.ok) {
                const data = await res.json();
                setLocations(data.locations || []);
            }
        } catch (error) {
            console.error('Failed to load locations:', error);
        }
        setLoading(false);
    };

    const selectLocation = (location: Location) => {
        onLocationChange(location.id === 'ALL' ? null : location);
        setIsOpen(false);
        setSearchQuery('');

        // Add to recently viewed
        if (location.id !== 'ALL') {
            const recent = [location.id, ...recentlyViewed.filter(id => id !== location.id)].slice(0, 5);
            setRecentlyViewed(recent);
            localStorage.setItem('franchisor_recent_locations', JSON.stringify(recent));
        }
    };

    const toggleFavorite = (e: React.MouseEvent, locationId: string) => {
        e.stopPropagation();
        const updated = favorites.includes(locationId)
            ? favorites.filter(id => id !== locationId)
            : [...favorites, locationId];
        setFavorites(updated);
        localStorage.setItem('franchisor_favorite_locations', JSON.stringify(updated));
    };

    const favoriteLocations = locations.filter(l => favorites.includes(l.id));
    const recentLocations = locations.filter(l => recentlyViewed.includes(l.id) && !favorites.includes(l.id));
    const otherLocations = locations.filter(l => !favorites.includes(l.id) && !recentlyViewed.includes(l.id));

    return (
        <div className="relative z-[100]" ref={dropdownRef} style={{ isolation: 'isolate' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] transition-colors min-w-[220px]"
            >
                <Store size={18} className="text-[var(--primary)]" />
                <span className="text-[var(--text-primary)] font-medium truncate flex-1 text-left">
                    {selectedLocation ? selectedLocation.name : 'All Locations'}
                </span>
                <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Selected indicator */}
            {selectedLocation && (
                <button
                    onClick={() => onLocationChange(null)}
                    className="absolute -right-2 -top-2 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)]"
                    title="Clear selection (view all)"
                >
                    <X size={12} className="text-black" />
                </button>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-2xl z-[200] overflow-hidden" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    {/* Search */}
                    <div className="p-3 border-b border-[var(--border)]">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, city, zip..."
                                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            />
                        </div>
                    </div>

                    {/* All Locations Option */}
                    <button
                        onClick={() => selectLocation(ALL_LOCATIONS)}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--surface-hover)] border-b border-[var(--border)] ${!selectedLocation ? 'bg-[var(--primary)]/10' : ''}`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                            <Building2 size={16} className="text-[var(--primary)]" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-medium text-[var(--text-primary)]">All Locations</div>
                            <div className="text-xs text-[var(--text-muted)]">Network-wide view</div>
                        </div>
                        {!selectedLocation && (
                            <span className="text-xs bg-[var(--primary)] text-black px-2 py-0.5 rounded">Active</span>
                        )}
                    </button>

                    {/* Results */}
                    <div className="max-h-64 overflow-auto">
                        {loading ? (
                            <div className="py-8 text-center text-[var(--text-muted)]">Loading...</div>
                        ) : (
                            <>
                                {/* Favorites */}
                                {favoriteLocations.length > 0 && (
                                    <div>
                                        <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] flex items-center gap-1">
                                            <Star size={12} /> Favorites
                                        </div>
                                        {favoriteLocations.map(loc => (
                                            <LocationRow key={loc.id} location={loc} isSelected={selectedLocation?.id === loc.id} isFavorite={true} onSelect={selectLocation} onToggleFavorite={toggleFavorite} />
                                        ))}
                                    </div>
                                )}

                                {/* Recently Viewed */}
                                {recentLocations.length > 0 && !searchQuery && (
                                    <div>
                                        <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] flex items-center gap-1">
                                            <Clock size={12} /> Recently Viewed
                                        </div>
                                        {recentLocations.map(loc => (
                                            <LocationRow key={loc.id} location={loc} isSelected={selectedLocation?.id === loc.id} isFavorite={false} onSelect={selectLocation} onToggleFavorite={toggleFavorite} />
                                        ))}
                                    </div>
                                )}

                                {/* Other Locations */}
                                {otherLocations.length > 0 && (
                                    <div>
                                        {(favoriteLocations.length > 0 || recentLocations.length > 0) && (
                                            <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)]">
                                                {searchQuery ? 'Search Results' : 'All Locations'}
                                            </div>
                                        )}
                                        {otherLocations.map(loc => (
                                            <LocationRow key={loc.id} location={loc} isSelected={selectedLocation?.id === loc.id} isFavorite={false} onSelect={selectLocation} onToggleFavorite={toggleFavorite} />
                                        ))}
                                    </div>
                                )}

                                {locations.length === 0 && searchQuery.length >= 2 && (
                                    <div className="py-8 text-center text-[var(--text-muted)]">No locations found</div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function LocationRow({ location, isSelected, isFavorite, onSelect, onToggleFavorite }: {
    location: Location;
    isSelected: boolean;
    isFavorite: boolean;
    onSelect: (loc: Location) => void;
    onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}) {
    return (
        <button
            onClick={() => onSelect(location)}
            className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--surface-hover)] ${isSelected ? 'bg-[var(--primary)]/10' : ''}`}
        >
            <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                <MapPin size={14} className="text-[var(--text-muted)]" />
            </div>
            <div className="text-left flex-1 min-w-0">
                <div className="font-medium text-[var(--text-primary)] truncate">{location.name}</div>
                {location.city && (
                    <div className="text-xs text-[var(--text-muted)] truncate">
                        {location.city}{location.state ? `, ${location.state}` : ''}
                    </div>
                )}
            </div>
            <button
                onClick={(e) => onToggleFavorite(e, location.id)}
                className="p-1 hover:bg-[var(--surface)] rounded"
            >
                <Star size={14} className={isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text-muted)]'} />
            </button>
        </button>
    );
}

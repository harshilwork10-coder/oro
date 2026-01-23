'use client';

/**
 * ReportDownloadPanel - Shared Component for All Roles
 * 
 * - Report picker with filters
 * - Date range selector
 * - Location search (typeahead)
 * - Download PDF button
 */

import { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Search, Building2, Loader2 } from 'lucide-react';

interface Report {
    key: string;
    name: string;
    priority: string;
}

interface LocationResult {
    id: string;
    name: string;
    address: string;
    franchiseeName: string;
}

interface Props {
    title?: string;
    subtitle?: string;
}

export default function ReportDownloadPanel({
    title = "Download Reports",
    subtitle = "Generate and download PDF reports"
}: Props) {
    const [categories, setCategories] = useState<Record<string, Report[]>>({});
    const [selectedReport, setSelectedReport] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>(getTodayString());
    const [dateTo, setDateTo] = useState<string>(getTodayString());
    const [locations, setLocations] = useState<LocationResult[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Load report catalog
    useEffect(() => {
        fetchCatalog();
    }, []);

    // Search locations on query change
    useEffect(() => {
        if (locationSearch.length >= 2) {
            searchLocations(locationSearch);
        } else {
            setSearchResults([]);
        }
    }, [locationSearch]);

    async function fetchCatalog() {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/catalog');
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories);
            }
        } catch (error) {
            console.error('Failed to load catalog:', error);
        } finally {
            setLoading(false);
        }
    }

    async function searchLocations(query: string) {
        try {
            const res = await fetch(`/api/reports/locations/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.locations);
            }
        } catch (error) {
            console.error('Failed to search locations:', error);
        }
    }

    function addLocation(loc: LocationResult) {
        if (!selectedLocations.includes(loc.id)) {
            setSelectedLocations([...selectedLocations, loc.id]);
            setLocations([...locations, loc]);
        }
        setLocationSearch('');
        setSearchResults([]);
    }

    function removeLocation(id: string) {
        setSelectedLocations(selectedLocations.filter(l => l !== id));
        setLocations(locations.filter(l => l.id !== id));
    }

    async function generateReport() {
        if (!selectedReport) {
            alert('Please select a report type');
            return;
        }

        setGenerating(true);
        try {
            const params = new URLSearchParams({
                reportType: selectedReport,
                from: dateFrom,
                to: dateTo
            });

            if (selectedLocations.length > 0) {
                params.set('locationIds', selectedLocations.join(','));
            }

            const url = `/api/reports/pdf?${params.toString()}`;

            // Open in new window for print/save as PDF
            window.open(url, '_blank');
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold mb-2">{title}</h1>
                <p className="text-[var(--text-muted)]">{subtitle}</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Report Selection */}
                    <div className="glass-panel rounded-xl p-6 border border-[var(--border)]">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[var(--primary)]" />
                            Select Report
                        </h2>
                        <div className="space-y-4">
                            {Object.entries(categories).map(([category, reports]) => (
                                <div key={category}>
                                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">{category}</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {reports.map(report => (
                                            <button
                                                key={report.key}
                                                onClick={() => setSelectedReport(report.key)}
                                                className={`text-left p-3 rounded-lg border transition-colors ${selectedReport === report.key
                                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                                                    }`}
                                            >
                                                <span className="text-sm">{report.name}</span>
                                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${report.priority === 'P0' ? 'bg-green-500/20 text-green-400' :
                                                    report.priority === 'P1' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>{report.priority}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(categories).length === 0 && (
                                <p className="text-[var(--text-muted)] text-center py-8">No reports available for your role</p>
                            )}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="glass-panel rounded-xl p-6 border border-[var(--border)]">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[var(--primary)]" />
                            Date Range
                        </h2>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm text-[var(--text-muted)] mb-1">From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm text-[var(--text-muted)] mb-1">To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2"
                                />
                            </div>
                        </div>
                        {/* Quick presets */}
                        <div className="flex gap-2 mt-3">
                            {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'].map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => applyDatePreset(preset, setDateFrom, setDateTo)}
                                    className="text-xs px-3 py-1 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location Filter */}
                    <div className="glass-panel rounded-xl p-6 border border-[var(--border)]">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[var(--primary)]" />
                            Locations
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mb-3">Leave empty for all locations</p>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                placeholder="Search locations..."
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {searchResults.map(loc => (
                                        <button
                                            key={loc.id}
                                            onClick={() => addLocation(loc)}
                                            className="w-full text-left px-4 py-2 hover:bg-[var(--surface-hover)]"
                                        >
                                            <div className="font-medium">{loc.name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{loc.franchiseeName}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected locations */}
                        {locations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {locations.map(loc => (
                                    <span
                                        key={loc.id}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full text-sm"
                                    >
                                        {loc.name}
                                        <button onClick={() => removeLocation(loc.id)} className="hover:opacity-70">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateReport}
                        disabled={generating || !selectedReport}
                        className="w-full bg-gradient-to-r from-[var(--primary)] to-orange-500 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        Generate PDF Report
                    </button>

                    <p className="text-center text-sm text-[var(--text-muted)]">
                        Report will open in a new tab. Click Download PDF to save.
                    </p>
                </div>
            )}
        </div>
    );
}

// Helper functions
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function applyDatePreset(preset: string, setFrom: (s: string) => void, setTo: (s: string) => void) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (preset) {
        case 'Today':
            setFrom(todayStr);
            setTo(todayStr);
            break;
        case 'Yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split('T')[0];
            setFrom(yStr);
            setTo(yStr);
            break;
        case 'Last 7 Days':
            const week = new Date(today);
            week.setDate(week.getDate() - 7);
            setFrom(week.toISOString().split('T')[0]);
            setTo(todayStr);
            break;
        case 'Last 30 Days':
            const month = new Date(today);
            month.setDate(month.getDate() - 30);
            setFrom(month.toISOString().split('T')[0]);
            setTo(todayStr);
            break;
        case 'This Month':
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            setFrom(start.toISOString().split('T')[0]);
            setTo(todayStr);
            break;
    }
}

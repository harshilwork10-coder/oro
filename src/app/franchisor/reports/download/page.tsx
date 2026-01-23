'use client';

/**
 * Report Download Page - Franchisor HQ
 * 
 * Store-First Flow:
 * 1. Select a Store (or All Stores)
 * 2. Pick a Report type
 * 3. Set Date Range
 * 4. Generate PDF
 */

import { useState, useEffect } from 'react';
import { Calendar, Download, FileText, Building2, Loader2, ChevronRight, ArrowLeft, Check } from 'lucide-react';

interface Report {
    key: string;
    name: string;
    priority: string;
}

interface Location {
    id: string;
    name: string;
    address: string;
    franchiseeName: string;
}

export default function ReportDownloadPage() {
    // Step: 1 = select store, 2 = select report, 3 = generate
    const [step, setStep] = useState(1);

    const [allLocations, setAllLocations] = useState<Location[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [locationFilter, setLocationFilter] = useState('');

    const [categories, setCategories] = useState<Record<string, Report[]>>({});
    const [selectedReport, setSelectedReport] = useState<string>('');

    const [dateFrom, setDateFrom] = useState<string>(getTodayString());
    const [dateTo, setDateTo] = useState<string>(getTodayString());

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Load locations and catalog on mount
    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            // Load locations
            const locRes = await fetch('/api/franchisor/locations?limit=1000');
            if (locRes.ok) {
                const data = await locRes.json();
                // API returns { data: [...] } not { locations: [...] }
                const locs = (data.data || []).map((loc: any) => ({
                    id: loc.id,
                    name: loc.name,
                    address: loc.address || '',
                    franchiseeName: loc.franchiseeName || ''
                }));
                setAllLocations(locs);
            }

            // Load report catalog
            const catRes = await fetch('/api/reports/catalog');
            if (catRes.ok) {
                const data = await catRes.json();
                setCategories(data.categories);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    function selectLocation(locId: string | null) {
        setSelectedLocationId(locId);
        setStep(2);
    }

    function selectReport(reportKey: string) {
        setSelectedReport(reportKey);
        setStep(3);
    }

    function goBack() {
        if (step === 2) {
            setStep(1);
            setSelectedReport('');
        } else if (step === 3) {
            setStep(2);
        }
    }

    async function generateReport() {
        if (!selectedReport) return;

        setGenerating(true);
        try {
            const params = new URLSearchParams({
                reportType: selectedReport,
                from: dateFrom,
                to: dateTo
            });

            if (selectedLocationId) {
                params.set('locationIds', selectedLocationId);
            }

            const url = `/api/reports/pdf?${params.toString()}`;
            window.open(url, '_blank');
        } finally {
            setGenerating(false);
        }
    }

    // Filter locations
    const filteredLocations = locationFilter
        ? allLocations.filter(loc =>
            loc.name.toLowerCase().includes(locationFilter.toLowerCase()) ||
            loc.franchiseeName.toLowerCase().includes(locationFilter.toLowerCase())
        )
        : allLocations;

    // Get selected location name
    const selectedLocationName = selectedLocationId
        ? allLocations.find(l => l.id === selectedLocationId)?.name || 'Unknown'
        : 'All Locations';

    // Get selected report name
    const selectedReportName = selectedReport
        ? Object.values(categories).flat().find(r => r.key === selectedReport)?.name || 'Unknown'
        : '';

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header with Breadcrumb */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Reports</h1>

                {/* Progress Steps - Clickable */}
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => setStep(1)}
                        className={`hover:underline ${step >= 1 ? 'text-amber-400' : 'text-gray-500'} ${step === 1 ? 'font-bold' : ''}`}
                    >
                        1. Store
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                    <button
                        onClick={() => step >= 2 && setStep(2)}
                        disabled={step < 2}
                        className={`hover:underline disabled:cursor-not-allowed disabled:no-underline ${step >= 2 ? 'text-amber-400' : 'text-gray-500'} ${step === 2 ? 'font-bold' : ''}`}
                    >
                        2. Report
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                    <button
                        onClick={() => step >= 3 && setStep(3)}
                        disabled={step < 3}
                        className={`hover:underline disabled:cursor-not-allowed disabled:no-underline ${step >= 3 ? 'text-amber-400' : 'text-gray-500'} ${step === 3 ? 'font-bold' : ''}`}
                    >
                        3. Generate
                    </button>
                </div>
            </div>

            {/* Step 1: Select Store */}
            {step === 1 && (
                <div className="bg-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-500" />
                        Select a Store
                    </h2>

                    {/* All Stores option */}
                    <button
                        onClick={() => selectLocation(null)}
                        className="w-full flex items-center justify-between p-4 mb-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-amber-300">All Stores</div>
                                <div className="text-sm text-gray-400">{allLocations.length} locations</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-amber-400" />
                    </button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-800 text-gray-500">or select a specific store</span>
                        </div>
                    </div>

                    {/* Filter */}
                    <input
                        type="text"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        placeholder="Search stores..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 mb-3 text-sm"
                    />

                    {/* Store tiles grid */}
                    <div className="max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredLocations.map((loc, index) => (
                                <button
                                    key={loc.id}
                                    onClick={() => selectLocation(loc.id)}
                                    className="group relative p-4 bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-700 rounded-xl hover:border-amber-500/50 hover:from-gray-700/70 hover:to-gray-800/70 transition-all duration-200 text-left overflow-hidden"
                                >
                                    {/* Glow effect on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/10 transition-all duration-300 rounded-xl" />

                                    {/* Store number badge */}
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-gray-600/50 rounded-full flex items-center justify-center text-xs text-gray-400 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-all">
                                        {index + 1}
                                    </div>

                                    {/* Icon */}
                                    <div className="w-10 h-10 mb-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-all">
                                        <Building2 className="w-5 h-5 text-amber-400" />
                                    </div>

                                    {/* Name */}
                                    <div className="font-medium text-sm truncate group-hover:text-amber-300 transition-colors">
                                        {loc.name}
                                    </div>

                                    {/* Franchisee name */}
                                    {loc.franchiseeName && (
                                        <div className="text-xs text-gray-500 truncate mt-1">
                                            {loc.franchiseeName}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Select Report */}
            {step === 2 && (
                <div className="bg-gray-800 rounded-xl p-6">
                    {/* Back button and selection summary */}
                    <button
                        onClick={goBack}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="bg-gray-700/50 rounded-lg p-3 mb-6 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-amber-500" />
                        <div>
                            <div className="text-xs text-gray-400">Selected Store</div>
                            <div className="font-semibold text-amber-300">{selectedLocationName}</div>
                        </div>
                    </div>

                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        Select a Report
                    </h2>

                    <div className="space-y-6">
                        {Object.entries(categories).map(([category, reports]) => {
                            // Category-specific colors
                            const categoryStyles: Record<string, string> = {
                                'HQ': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                                'Accounting': 'bg-green-500/20 text-green-400 border-green-500/30',
                                'Compliance': 'bg-red-500/20 text-red-400 border-red-500/30',
                                'Sales': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                'Appointments': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                                'Customers': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
                                'Services': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
                                'Payroll': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                'Staff': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                'Operations': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
                            };
                            const style = categoryStyles[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

                            return (
                                <div key={category}>
                                    <h3 className={`inline-block px-3 py-1.5 rounded-lg border ${style} font-semibold text-sm mb-3`}>
                                        {category} ({reports.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {reports.map(report => (
                                            <button
                                                key={report.key}
                                                onClick={() => selectReport(report.key)}
                                                className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-amber-500/50 transition-all text-left"
                                            >
                                                <span className="text-sm">{report.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${report.priority === 'P0' ? 'bg-green-500/20 text-green-400' :
                                                    report.priority === 'P1' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>{report.priority}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Step 3: Date Range and Generate */}
            {step === 3 && (
                <div className="bg-gray-800 rounded-xl p-6">
                    {/* Back button */}
                    <button
                        onClick={goBack}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    {/* Summary */}
                    <div className="bg-gray-700/50 rounded-lg p-4 mb-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-500" />
                            <div>
                                <div className="text-xs text-gray-400">Store</div>
                                <div className="font-medium">{selectedLocationName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-500" />
                            <div>
                                <div className="text-xs text-gray-400">Report</div>
                                <div className="font-medium">{selectedReportName}</div>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        Select Date Range
                    </h2>

                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                            />
                        </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'].map(preset => (
                            <button
                                key={preset}
                                onClick={() => applyDatePreset(preset, setDateFrom, setDateTo)}
                                className="text-xs px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateReport}
                        disabled={generating}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        Generate PDF Report
                    </button>

                    <p className="text-center text-sm text-gray-500 mt-3">
                        Opens in new tab. Click "Download PDF" to save.
                    </p>

                    {/* Quick Actions - After Generate */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                            ← New Store
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                            ← Change Report
                        </button>
                    </div>
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
            setFrom(yesterday.toISOString().split('T')[0]);
            setTo(yesterday.toISOString().split('T')[0]);
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

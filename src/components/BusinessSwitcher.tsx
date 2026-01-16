'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, X } from 'lucide-react';

interface BusinessMembership {
    id: string;
    role: string;
    isPrimary: boolean;
    franchisor: {
        id: string;
        name: string;
        businessType: string;
        logoUrl?: string;
    };
}

interface BusinessSwitcherProps {
    memberships: BusinessMembership[];
    currentBusinessId: string | null;
    onSwitch: (franchisorId: string) => void;
}

export default function BusinessSwitcher({
    memberships,
    currentBusinessId,
    onSwitch
}: BusinessSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);

    // If only one business, don't show switcher
    if (memberships.length <= 1) {
        return null;
    }

    const currentBusiness = memberships.find(m => m.franchisor.id === currentBusinessId);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl hover:border-orange-500/30 transition-colors"
            >
                <div className="h-8 w-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    {currentBusiness?.franchisor.logoUrl ? (
                        <img
                            src={currentBusiness.franchisor.logoUrl}
                            alt=""
                            className="h-6 w-6 rounded object-cover"
                        />
                    ) : (
                        <Building2 className="h-4 w-4 text-orange-400" />
                    )}
                </div>
                <div className="text-left">
                    <p className="text-sm font-medium text-stone-100 truncate max-w-[140px]">
                        {currentBusiness?.franchisor.name || 'Select Business'}
                    </p>
                    <p className="text-xs text-stone-500">{currentBusiness?.role}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-72 bg-stone-800 border border-stone-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-stone-700">
                            <p className="text-xs text-stone-500 px-2">Switch Business</p>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                            {memberships.map((membership) => (
                                <button
                                    key={membership.id}
                                    onClick={() => {
                                        onSwitch(membership.franchisor.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${membership.franchisor.id === currentBusinessId
                                            ? 'bg-orange-500/20 border border-orange-500/50'
                                            : 'hover:bg-stone-700/50 border border-transparent'
                                        }`}
                                >
                                    <div className="h-10 w-10 bg-stone-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        {membership.franchisor.logoUrl ? (
                                            <img
                                                src={membership.franchisor.logoUrl}
                                                alt=""
                                                className="h-8 w-8 rounded object-cover"
                                            />
                                        ) : (
                                            <Building2 className="h-5 w-5 text-stone-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-stone-100">
                                            {membership.franchisor.name}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {membership.role}
                                            {membership.isPrimary && ' · Primary'}
                                        </p>
                                    </div>
                                    {membership.franchisor.id === currentBusinessId && (
                                        <Check className="h-4 w-4 text-orange-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Modal version for initial selection
export function BusinessSelectorModal({
    memberships,
    onSelect,
    isOpen
}: {
    memberships: BusinessMembership[];
    onSelect: (franchisorId: string) => void;
    isOpen: boolean;
}) {
    if (!isOpen || memberships.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-800 rounded-2xl border border-stone-700 max-w-md w-full shadow-2xl">
                <div className="p-6 border-b border-stone-700">
                    <h2 className="text-xl font-bold text-white">Select Business</h2>
                    <p className="text-stone-400 text-sm mt-1">
                        Choose which business you want to access
                    </p>
                </div>

                <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                    {memberships.map((membership) => (
                        <button
                            key={membership.id}
                            onClick={() => onSelect(membership.franchisor.id)}
                            className="w-full p-4 rounded-xl flex items-center gap-4 bg-stone-700/30 hover:bg-stone-700/60 border border-stone-700 hover:border-orange-500/30 transition-colors"
                        >
                            <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                {membership.franchisor.logoUrl ? (
                                    <img
                                        src={membership.franchisor.logoUrl}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-cover"
                                    />
                                ) : (
                                    <Building2 className="h-6 w-6 text-orange-400" />
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-lg font-medium text-stone-100">
                                    {membership.franchisor.name}
                                </p>
                                <p className="text-sm text-stone-500">
                                    {membership.role}
                                    {membership.isPrimary && ' · Primary Owner'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

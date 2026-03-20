'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Digital Signage / In-Store TV
 * 
 * Full-screen display for behind-the-counter or window screen.
 * Auto-cycles through active deals, promotions, and store info.
 * Designed for 1920x1080 TV resolution, auto-fullscreen.
 * 
 * URL: /signage?rotate=10 (rotate every 10 seconds)
 */

interface Deal {
    id: string;
    name: string;
    rewardLabel: string;
    startDate: string;
    endDate: string;
    items: string[];
}

const GRADIENT_SETS = [
    'from-orange-600 via-red-600 to-pink-600',
    'from-blue-600 via-purple-600 to-indigo-600',
    'from-green-600 via-teal-600 to-cyan-600',
    'from-amber-500 via-orange-500 to-red-500',
    'from-violet-600 via-fuchsia-600 to-pink-500',
    'from-emerald-600 via-green-500 to-lime-500',
];

const EMOJIS = ['🔥', '⭐', '💰', '🎉', '🏷️', '💥', '✨', '🎊'];

export default function SignagePage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [storeName, setStoreName] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [rotateSeconds, setRotateSeconds] = useState(8);

    // Fetch active deals
    const fetchDeals = useCallback(async () => {
        try {
            const res = await fetch('/api/deals?status=active');
            const data = await res.json();
            const activeDeals = (data.deals || data || []).slice(0, 20);
            setDeals(activeDeals);
        } catch {
            // Demo deals if API fails
            setDeals([
                { id: '1', name: '2 for $5 Energy Drinks', rewardLabel: 'Buy 2, Save $3', startDate: '', endDate: '', items: ['Red Bull', 'Monster', 'Celsius'] },
                { id: '2', name: 'BOGO Free Snacks', rewardLabel: 'Buy One Get One FREE', startDate: '', endDate: '', items: ['Doritos', 'Lays', 'Cheetos'] },
                { id: '3', name: '$1 Off Any Coffee', rewardLabel: 'Save $1.00', startDate: '', endDate: '', items: ['Hot Coffee', 'Iced Coffee', 'Cappuccino'] },
                { id: '4', name: 'Fountain Drinks 99¢', rewardLabel: 'Any Size 99¢', startDate: '', endDate: '', items: ['Coke', 'Pepsi', 'Sprite'] },
            ]);
        }
    }, []);

    useEffect(() => {
        fetchDeals();
        const refresh = setInterval(fetchDeals, 5 * 60 * 1000); // refresh deals every 5 min
        return () => clearInterval(refresh);
    }, [fetchDeals]);

    // Read rotate param from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const r = parseInt(params.get('rotate') || '8');
        if (r > 0) setRotateSeconds(r);
        setStoreName(params.get('store') || '');
    }, []);

    // Auto-rotate slides
    useEffect(() => {
        if (deals.length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % deals.length);
        }, rotateSeconds * 1000);
        return () => clearInterval(interval);
    }, [deals.length, rotateSeconds]);

    // Clock update
    useEffect(() => {
        const clock = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clock);
    }, []);

    const deal = deals[currentIndex];
    const gradient = GRADIENT_SETS[currentIndex % GRADIENT_SETS.length];
    const emoji = EMOJIS[currentIndex % EMOJIS.length];

    return (
        <div
            className="h-screen w-screen overflow-hidden cursor-none select-none"
            onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            }}
        >
            {/* Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-all duration-1000`} />

            {/* Animated pattern overlay */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }} />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-16">
                {deal ? (
                    <div className="text-center space-y-8 animate-fadeIn" key={deal.id + currentIndex}>
                        {/* Emoji burst */}
                        <div className="text-8xl mb-4">{emoji}</div>

                        {/* Deal name */}
                        <h1 className="text-7xl font-black tracking-tight leading-tight drop-shadow-2xl"
                            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                            {deal.name}
                        </h1>

                        {/* Reward badge */}
                        <div className="inline-block">
                            <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl px-12 py-6">
                                <p className="text-5xl font-black text-yellow-200 drop-shadow-lg">
                                    {deal.rewardLabel || 'Special Offer'}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        {deal.items && deal.items.length > 0 && (
                            <div className="flex items-center justify-center gap-4 flex-wrap mt-6">
                                {deal.items.slice(0, 5).map((item, i) => (
                                    <span key={i} className="bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full text-2xl font-semibold">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <h1 className="text-6xl font-black">Welcome!</h1>
                        <p className="text-3xl mt-4 opacity-80">Great deals inside</p>
                    </div>
                )}
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-lg px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {storeName && <span className="text-white/90 text-xl font-bold">{storeName}</span>}
                    <span className="text-white/60 text-lg">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Slide indicators */}
                <div className="flex items-center gap-2">
                    {deals.map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/30'}`}
                        />
                    ))}
                </div>

                <span className="text-white/40 text-sm">Powered by ORO 9</span>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.8s ease-out;
                }
            `}</style>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { ShoppingCart, Clock, MapPin, Phone } from 'lucide-react';
import { useCart } from './CartProvider';

interface StoreHeaderProps {
    store: {
        name: string;
        slug: string;
        address?: string | null;
        phone?: string | null;
        operatingHours?: any;
    };
}

function isStoreOpen(hours: any): { isOpen: boolean; label: string } {
    if (!hours) return { isOpen: true, label: '' };
    try {
        const now = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[now.getDay()];
        const todayHours = hours[today];
        if (!todayHours || todayHours.closed) return { isOpen: false, label: 'Closed Today' };

        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = todayHours.open.split(':').map(Number);
        const [closeH, closeM] = todayHours.close.split(':').map(Number);
        const openMin = openH * 60 + openM;
        const closeMin = closeH * 60 + closeM;

        if (nowMinutes >= openMin && nowMinutes < closeMin) {
            return { isOpen: true, label: `Open · Closes ${todayHours.close}` };
        }
        if (nowMinutes < openMin) {
            return { isOpen: false, label: `Opens ${todayHours.open}` };
        }
        return { isOpen: false, label: 'Closed' };
    } catch {
        return { isOpen: true, label: '' };
    }
}

export default function StoreHeader({ store }: StoreHeaderProps) {
    const { itemCount } = useCart();
    const hours = isStoreOpen(store.operatingHours);

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                {/* Store Info */}
                <Link href={`/s/${store.slug}`} className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {store.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold text-gray-900 text-lg leading-tight truncate">{store.name}</h1>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            {hours.label && (
                                <span className={`flex items-center gap-1 ${hours.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                                    <Clock size={10} />
                                    {hours.label}
                                </span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Cart */}
                <Link
                    href={`/s/${store.slug}/checkout`}
                    className="relative flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium text-sm transition-colors"
                >
                    <ShoppingCart size={18} />
                    {itemCount > 0 ? (
                        <span>Cart ({itemCount})</span>
                    ) : (
                        <span>Cart</span>
                    )}
                    {itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                            {itemCount}
                        </span>
                    )}
                </Link>
            </div>
        </header>
    );
}

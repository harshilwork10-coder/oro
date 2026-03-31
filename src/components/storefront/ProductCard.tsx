'use client';

import { useCart } from './CartProvider';
import { Plus, Check } from 'lucide-react';

// Category icon mapping for items without images
const CATEGORY_ICONS: Record<string, string> = {
    'beverages': '🥤', 'drinks': '🥤', 'soda': '🥤', 'water': '💧', 'juice': '🧃',
    'snacks': '🍿', 'chips': '🍿', 'candy': '🍬',
    'dairy': '🥛', 'milk': '🥛',
    'bread': '🍞', 'bakery': '🍞',
    'frozen': '🧊', 'ice cream': '🍦',
    'grocery': '🛒', 'food': '🍽️',
    'household': '🏠', 'cleaning': '🧹',
    'health': '💊', 'medicine': '💊', 'pharmacy': '💊',
    'personal care': '🧴', 'beauty': '💄',
    'pet': '🐾',
    'paper': '🧻',
};

function getCategoryIcon(categoryName?: string): string {
    if (!categoryName) return '📦';
    const lower = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return '📦';
}

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        price: number;
        imageUrl?: string | null;
        brand?: string | null;
        size?: string | null;
        stockStatus: string;
        category?: { name: string; color?: string | null } | null;
    };
}

export default function ProductCard({ product }: ProductCardProps) {
    const { items, addItem } = useCart();
    const inCart = items.find(i => i.itemId === product.id);

    const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK';

    return (
        <div className={`group relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-orange-200 ${isOutOfStock ? 'opacity-60' : ''}`}>
            {/* Product Image / Category Icon */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-5xl">
                        {getCategoryIcon(product.category?.name)}
                    </span>
                )}

                {/* Stock badge */}
                {product.stockStatus === 'LOW_STOCK' && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        Low Stock
                    </span>
                )}
                {isOutOfStock && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                        Out of Stock
                    </span>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                {product.category && (
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {product.category.name}
                    </span>
                )}
                <h3 className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight line-clamp-2">
                    {product.name}
                </h3>
                {product.brand && (
                    <p className="text-xs text-gray-500 mt-0.5">{product.brand}{product.size ? ` · ${product.size}` : ''}</p>
                )}

                <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-gray-900">
                        ${product.price.toFixed(2)}
                    </span>

                    {!isOutOfStock && (
                        <button
                            onClick={() => addItem({
                                itemId: product.id,
                                name: product.name,
                                price: product.price,
                                categoryName: product.category?.name,
                                categoryColor: product.category?.color || undefined,
                                imageUrl: product.imageUrl || undefined,
                            })}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                inCart
                                    ? 'bg-green-500 text-white'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                        >
                            {inCart ? (
                                <>
                                    <Check size={14} />
                                    <span>{inCart.quantity}</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={14} />
                                    <span>Add</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

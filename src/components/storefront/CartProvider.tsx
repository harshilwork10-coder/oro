'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    categoryName?: string;
    categoryColor?: string;
    imageUrl?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    itemCount: number;
    subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = 'oro9_storefront_cart';

export function CartProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(`${CART_KEY}_${storeSlug}`);
            if (stored) {
                setItems(JSON.parse(stored));
            }
        } catch {}
        setLoaded(true);
    }, [storeSlug]);

    // Persist to localStorage on change
    useEffect(() => {
        if (loaded) {
            localStorage.setItem(`${CART_KEY}_${storeSlug}`, JSON.stringify(items));
        }
    }, [items, loaded, storeSlug]);

    function addItem(item: Omit<CartItem, 'quantity'>) {
        setItems(prev => {
            const existing = prev.find(i => i.itemId === item.itemId);
            if (existing) {
                return prev.map(i =>
                    i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    }

    function removeItem(itemId: string) {
        setItems(prev => prev.filter(i => i.itemId !== itemId));
    }

    function updateQuantity(itemId: string, quantity: number) {
        if (quantity <= 0) {
            removeItem(itemId);
            return;
        }
        setItems(prev =>
            prev.map(i => i.itemId === itemId ? { ...i, quantity: Math.min(quantity, 99) } : i)
        );
    }

    function clearCart() {
        setItems([]);
    }

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}

/**
 * Shared types for Pulse components
 */

export interface Location {
    id: string
    name: string
}

export interface StoreBreakdown {
    id: string
    name: string
    todaySales: number
    transactionCount: number
}

export interface LiveStats {
    todaySales: number
    yesterdaySales: number
    weekSales: number
    transactionCount: number
    averageTicket: number
}

export interface TopSeller {
    name: string
    quantity: number
    revenue: number
}

export interface LowStockItem {
    id: string
    name: string
    stock: number
    location: string
}

export interface EmployeeOnClock {
    name: string
    location: string
    since: string
}

export interface LotteryStats {
    sales: number
    payouts: number
    net: number
    salesCount: number
    payoutsCount: number
    topGames: { name: string; price: number; sold: number; revenue: number }[]
}

export interface Product {
    id: string
    name: string
    sku: string
    barcode: string
    price: number
    costPrice: number
    stock: number
    location: string
    locationId: string | null
    category: string
}

export interface Department {
    id: string
    name: string
    icon?: string
    color?: string
    productCount?: number
}

export interface OpenDrawer {
    id: string
    currentCash: number
    location: string
    openedBy: string
}

export interface PaymentBreakdown {
    cash: number
    card: number
    other: number
}

export type TabType = 'sales' | 'lottery' | 'inventory' | 'reports'

/**
 * i18n Translation System
 * 
 * Supports English (en) and Spanish (es)
 * Add more languages by adding new translation objects
 * 
 * Usage:
 *   import { useLanguage } from '@/lib/i18n'
 *   const { t, lang, setLang } = useLanguage()
 *   <p>{t('checkout.total')}</p>
 *   <button onClick={() => setLang('es')}>Español</button>
 */

export type Language = 'en' | 'es'

export interface Translations {
    [key: string]: string | Translations
}

// ─── English (Default) ──────────────────────────────────────────
const en: Translations = {
    // General
    welcome: 'Welcome',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Success',

    // POS Checkout 
    pos: {
        title: 'Point of Sale',
        scanItem: 'Scan item or search',
        addItem: 'Add Item',
        removeItem: 'Remove Item',
        quantity: 'Quantity',
        price: 'Price',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total',
        pay: 'Pay',
        cash: 'Cash',
        card: 'Card',
        giftCard: 'Gift Card',
        ebt: 'EBT',
        changeDue: 'Change Due',
        amountTendered: 'Amount Tendered',
        receipt: 'Receipt',
        printReceipt: 'Print Receipt',
        emailReceipt: 'Email Receipt',
        noReceipt: 'No Receipt',
        voidTransaction: 'Void Transaction',
        voidItem: 'Void Item',
        holdOrder: 'Hold Order',
        recallOrder: 'Recall Order',
        discount: 'Discount',
        managerOverride: 'Manager Override',
        openCashDrawer: 'Open Cash Drawer',
        noSale: 'No Sale',
        endOfDay: 'End of Day',
        itemNotFound: 'Item not found',
        scanBarcode: 'Scan barcode',
        enterPrice: 'Enter price',
        departmentSale: 'Department Sale',
    },

    // Customer Display
    customer: {
        welcome: 'Welcome!',
        yourTotal: 'Your Total',
        thankYou: 'Thank You!',
        haveANiceDay: 'Have a nice day!',
        itemsInCart: 'Items in Cart',
        loyaltyPoints: 'Loyalty Points',
        pointsEarned: 'Points Earned',
        savingsToday: 'Savings Today',
        pleaseSwipeCard: 'Please swipe or insert card',
        processing: 'Processing...',
        approved: 'Approved',
        declined: 'Declined',
    },

    // Age Verification
    ageCheck: {
        title: 'Age Verification Required',
        scanId: 'Scan ID',
        enterDob: 'Enter Date of Birth',
        verified: 'Age Verified',
        denied: 'Under Age — Sale Denied',
        skipWarning: 'Skipping age check may result in fines',
        manualCheck: 'Manual Check',
        customerTooYoung: 'Customer does not meet minimum age',
        minimumAge: 'Minimum Age',
    },

    // Loyalty
    loyalty: {
        title: 'Loyalty Program',
        enterPhone: 'Enter phone number',
        lookupMember: 'Look Up Member',
        newMember: 'New Member',
        pointsBalance: 'Points Balance',
        redeem: 'Redeem Points',
        earnedToday: 'Earned Today',
        memberSince: 'Member Since',
        notAMember: 'Not a member?',
        signUp: 'Sign up now',
    },

    // Inventory
    inventory: {
        title: 'Inventory',
        products: 'Products',
        categories: 'Categories',
        departments: 'Departments',
        addProduct: 'Add Product',
        editProduct: 'Edit Product',
        inStock: 'In Stock',
        lowStock: 'Low Stock',
        outOfStock: 'Out of Stock',
        reorder: 'Reorder',
        barcode: 'Barcode',
        sku: 'SKU',
        cost: 'Cost',
        margin: 'Margin',
        priceBook: 'Price Book',
        bulkPriceChange: 'Bulk Price Change',
        shelfLabels: 'Shelf Labels',
        printLabels: 'Print Labels',
    },

    // Kitchen Display
    kds: {
        title: 'Kitchen Display',
        newOrder: 'New Order',
        preparing: 'Preparing',
        ready: 'Ready',
        completed: 'Completed',
        bumpItem: 'Bump Item',
        bumpOrder: 'Bump Order',
        recall: 'Recall',
        avgWait: 'Avg Wait',
        allClear: 'All Clear',
        noOrders: 'No orders in kitchen',
    },

    // Reports
    reports: {
        title: 'Reports',
        sales: 'Sales',
        dailySummary: 'Daily Summary',
        weeklySummary: 'Weekly Summary',
        topSellers: 'Top Sellers',
        hourlyBreakdown: 'Hourly Breakdown',
        paymentMethods: 'Payment Methods',
        taxReport: 'Tax Report',
        profitMargin: 'Profit Margin',
        export: 'Export',
        download: 'Download',
        print: 'Print',
    },

    // Settings
    settings: {
        title: 'Settings',
        general: 'General',
        language: 'Language',
        english: 'English',
        spanish: 'Español',
        appearance: 'Appearance',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        employees: 'Employees',
        security: 'Security',
        printers: 'Printers',
        scales: 'Scales',
        deliveryPlatforms: 'Delivery Platforms',
        integrations: 'Integrations',
    },

    // Employee
    employee: {
        clockIn: 'Clock In',
        clockOut: 'Clock Out',
        enterPin: 'Enter PIN',
        selectEmployee: 'Select Employee',
        switchEmployee: 'Switch Employee',
        breakStart: 'Start Break',
        breakEnd: 'End Break',
    },
}

// ─── Spanish ──────────────────────────────────────────────────
const es: Translations = {
    welcome: 'Bienvenido',
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    back: 'Atrás',
    next: 'Siguiente',
    search: 'Buscar',
    close: 'Cerrar',
    yes: 'Sí',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Éxito',

    pos: {
        title: 'Punto de Venta',
        scanItem: 'Escanear artículo o buscar',
        addItem: 'Agregar Artículo',
        removeItem: 'Quitar Artículo',
        quantity: 'Cantidad',
        price: 'Precio',
        subtotal: 'Subtotal',
        tax: 'Impuesto',
        total: 'Total',
        pay: 'Pagar',
        cash: 'Efectivo',
        card: 'Tarjeta',
        giftCard: 'Tarjeta de Regalo',
        ebt: 'EBT',
        changeDue: 'Cambio',
        amountTendered: 'Monto Entregado',
        receipt: 'Recibo',
        printReceipt: 'Imprimir Recibo',
        emailReceipt: 'Enviar Recibo por Email',
        noReceipt: 'Sin Recibo',
        voidTransaction: 'Anular Transacción',
        voidItem: 'Anular Artículo',
        holdOrder: 'Retener Orden',
        recallOrder: 'Recuperar Orden',
        discount: 'Descuento',
        managerOverride: 'Autorización de Gerente',
        openCashDrawer: 'Abrir Caja',
        noSale: 'Sin Venta',
        endOfDay: 'Fin del Día',
        itemNotFound: 'Artículo no encontrado',
        scanBarcode: 'Escanear código de barras',
        enterPrice: 'Ingresar precio',
        departmentSale: 'Venta por Departamento',
    },

    customer: {
        welcome: '¡Bienvenido!',
        yourTotal: 'Su Total',
        thankYou: '¡Gracias!',
        haveANiceDay: '¡Que tenga un buen día!',
        itemsInCart: 'Artículos en Carrito',
        loyaltyPoints: 'Puntos de Lealtad',
        pointsEarned: 'Puntos Ganados',
        savingsToday: 'Ahorro de Hoy',
        pleaseSwipeCard: 'Por favor deslice o inserte tarjeta',
        processing: 'Procesando...',
        approved: 'Aprobado',
        declined: 'Rechazado',
    },

    ageCheck: {
        title: 'Verificación de Edad Requerida',
        scanId: 'Escanear ID',
        enterDob: 'Ingresar Fecha de Nacimiento',
        verified: 'Edad Verificada',
        denied: 'Menor de Edad — Venta Denegada',
        skipWarning: 'Omitir verificación puede resultar en multas',
        manualCheck: 'Verificación Manual',
        customerTooYoung: 'El cliente no cumple la edad mínima',
        minimumAge: 'Edad Mínima',
    },

    loyalty: {
        title: 'Programa de Lealtad',
        enterPhone: 'Ingresar número de teléfono',
        lookupMember: 'Buscar Miembro',
        newMember: 'Nuevo Miembro',
        pointsBalance: 'Saldo de Puntos',
        redeem: 'Canjear Puntos',
        earnedToday: 'Ganado Hoy',
        memberSince: 'Miembro Desde',
        notAMember: '¿No es miembro?',
        signUp: 'Regístrese ahora',
    },

    inventory: {
        title: 'Inventario',
        products: 'Productos',
        categories: 'Categorías',
        departments: 'Departamentos',
        addProduct: 'Agregar Producto',
        editProduct: 'Editar Producto',
        inStock: 'En Stock',
        lowStock: 'Stock Bajo',
        outOfStock: 'Agotado',
        reorder: 'Reordenar',
        barcode: 'Código de Barras',
        sku: 'SKU',
        cost: 'Costo',
        margin: 'Margen',
        priceBook: 'Libro de Precios',
        bulkPriceChange: 'Cambio Masivo de Precios',
        shelfLabels: 'Etiquetas de Estante',
        printLabels: 'Imprimir Etiquetas',
    },

    kds: {
        title: 'Pantalla de Cocina',
        newOrder: 'Orden Nueva',
        preparing: 'Preparando',
        ready: 'Listo',
        completed: 'Completado',
        bumpItem: 'Marcar Artículo',
        bumpOrder: 'Completar Orden',
        recall: 'Recuperar',
        avgWait: 'Espera Promedio',
        allClear: 'Todo Listo',
        noOrders: 'Sin órdenes en cocina',
    },

    reports: {
        title: 'Reportes',
        sales: 'Ventas',
        dailySummary: 'Resumen Diario',
        weeklySummary: 'Resumen Semanal',
        topSellers: 'Más Vendidos',
        hourlyBreakdown: 'Desglose por Hora',
        paymentMethods: 'Métodos de Pago',
        taxReport: 'Reporte de Impuestos',
        profitMargin: 'Margen de Ganancia',
        export: 'Exportar',
        download: 'Descargar',
        print: 'Imprimir',
    },

    settings: {
        title: 'Configuración',
        general: 'General',
        language: 'Idioma',
        english: 'English',
        spanish: 'Español',
        appearance: 'Apariencia',
        darkMode: 'Modo Oscuro',
        lightMode: 'Modo Claro',
        employees: 'Empleados',
        security: 'Seguridad',
        printers: 'Impresoras',
        scales: 'Básculas',
        deliveryPlatforms: 'Plataformas de Entrega',
        integrations: 'Integraciones',
    },

    employee: {
        clockIn: 'Registrar Entrada',
        clockOut: 'Registrar Salida',
        enterPin: 'Ingresar PIN',
        selectEmployee: 'Seleccionar Empleado',
        switchEmployee: 'Cambiar Empleado',
        breakStart: 'Iniciar Descanso',
        breakEnd: 'Fin de Descanso',
    },
}

// ─── Translation Registry ──────────────────────────────────────
const translations: Record<Language, Translations> = { en, es }

/**
 * Get a translated string by dot-notation key
 * Example: t('pos.total', 'en') → 'Total'
 *          t('pos.total', 'es') → 'Total'
 */
export function t(key: string, lang: Language = 'en'): string {
    const parts = key.split('.')
    let current: any = translations[lang]

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part]
        } else {
            // Fallback to English
            current = translations.en
            for (const p of parts) {
                if (current && typeof current === 'object' && p in current) {
                    current = current[p]
                } else {
                    return key // Return key if not found
                }
            }
            break
        }
    }

    return typeof current === 'string' ? current : key
}

export { translations }
export default t

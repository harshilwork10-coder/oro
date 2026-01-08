/**
 * Validation Schemas Library
 * Centralized Zod schemas for API request validation
 */

import { z } from 'zod';

// ============ COMMON VALIDATORS ============

export const cuidSchema = z.string().min(20).max(30);
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number');
export const moneySchema = z.union([z.number(), z.string()]).transform(v => Number(v));
export const positiveIntSchema = z.number().int().positive();
export const nonNegativeIntSchema = z.number().int().min(0);
export const dateStringSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// ============ AUTH SCHEMAS ============

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const pinLoginSchema = z.object({
    franchiseId: cuidSchema,
    pin: z.string().length(4, 'PIN must be 4 digits'),
});

export const mfaVerifySchema = z.object({
    token: z.string().length(6, 'MFA token must be 6 digits'),
    userId: cuidSchema.optional(),
});

// ============ POS TRANSACTION SCHEMAS ============

export const transactionItemSchema = z.object({
    itemId: cuidSchema.optional(),
    productId: cuidSchema.optional(),
    serviceId: cuidSchema.optional(),
    name: z.string().min(1),
    quantity: positiveIntSchema,
    unitPrice: moneySchema,
    discount: moneySchema.optional().default(0),
    tax: moneySchema.optional().default(0),
    total: moneySchema,
    staffId: cuidSchema.optional(),
});

export const transactionCreateSchema = z.object({
    items: z.array(transactionItemSchema).min(1, 'Transaction must have at least one item'),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'SPLIT', 'GIFT_CARD', 'EBT']),
    subtotal: moneySchema,
    tax: moneySchema.optional().default(0),
    discount: moneySchema.optional().default(0),
    tip: moneySchema.optional().default(0),
    total: moneySchema,
    clientId: cuidSchema.optional(),
    cashDrawerSessionId: cuidSchema.optional(),
    splitPayments: z.array(z.object({
        method: z.string(),
        amount: moneySchema,
    })).optional(),
    offlineId: z.string().optional(),
});

export const refundSchema = z.object({
    transactionId: cuidSchema,
    amount: moneySchema.optional(),
    reason: z.string().min(3, 'Reason is required'),
    items: z.array(z.object({
        itemId: cuidSchema,
        quantity: positiveIntSchema.optional(),
    })).optional(),
});

export const voidSchema = z.object({
    transactionId: cuidSchema,
    reason: z.string().min(3, 'Reason is required'),
});

// ============ INVENTORY SCHEMAS ============

export const productCreateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: moneySchema,
    costPrice: moneySchema.optional(),
    categoryId: cuidSchema.optional(),
    departmentId: cuidSchema.optional(),
    stock: nonNegativeIntSchema.optional().default(0),
    reorderPoint: nonNegativeIntSchema.optional(),
    isActive: z.boolean().optional().default(true),
    isAlcohol: z.boolean().optional(),
    isTobacco: z.boolean().optional(),
    ageRestricted: z.boolean().optional(),
    minimumAge: z.number().int().min(18).max(21).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const stockAdjustmentSchema = z.object({
    productId: cuidSchema,
    quantity: z.number().int(),
    reason: z.enum(['SALE', 'PURCHASE', 'ADJUSTMENT', 'DAMAGE', 'THEFT', 'COUNT', 'RETURN']),
    notes: z.string().optional(),
});

// ============ CLIENT SCHEMAS ============

export const clientCreateSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    notes: z.string().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

// ============ EMPLOYEE SCHEMAS ============

export const employeeCreateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: emailSchema,
    role: z.enum(['MANAGER', 'SHIFT_SUPERVISOR', 'EMPLOYEE']),
    pin: z.string().length(4).optional(),
    phone: phoneSchema.optional(),
    locationId: cuidSchema.optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

// ============ CASH DRAWER SCHEMAS ============

export const openDrawerSchema = z.object({
    locationId: cuidSchema,
    startingCash: moneySchema,
});

export const closeDrawerSchema = z.object({
    sessionId: cuidSchema,
    endingCash: moneySchema,
    cashDropped: moneySchema.optional(),
});

// ============ PROMOTION SCHEMAS ============

export const promotionCreateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['PERCENTAGE', 'FIXED', 'BOGO', 'BUNDLE', 'MIX_MATCH', 'THRESHOLD']),
    discountType: z.enum(['PERCENT', 'FIXED_AMOUNT', 'FIXED_PRICE', 'FREE_ITEM']),
    discountValue: moneySchema,
    promoCode: z.string().optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    isStoreWide: z.boolean().optional(),
    isActive: z.boolean().optional().default(true),
    minPurchase: moneySchema.optional(),
    maxDiscount: moneySchema.optional(),
    requiredQty: positiveIntSchema.optional(),
    getQty: positiveIntSchema.optional(),
    qualifyingProducts: z.array(cuidSchema).optional(),
    qualifyingCategories: z.array(cuidSchema).optional(),
});

// ============ VALIDATION HELPER ============

export type ZodIssue = { path: (string | number)[]; message: string };

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; details?: ZodIssue[] };

export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): ValidationResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const issues = result.error.issues as ZodIssue[];
    const message = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');

    return {
        success: false,
        error: message,
        details: issues
    };
}

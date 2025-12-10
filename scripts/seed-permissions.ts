/**
 * Seed Default Permissions
 * Run this after schema migration to populate the Permission table
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define all permissions with their categories
const defaultPermissions = [
    // Inventory & Products
    { name: 'ADD_SERVICES', description: 'Can create/edit services', category: 'INVENTORY' },
    { name: 'ADD_PRODUCTS', description: 'Can create/edit products', category: 'INVENTORY' },
    { name: 'MANAGE_INVENTORY', description: 'Can update stock levels', category: 'INVENTORY' },

    // Sales & Transactions
    { name: 'VIEW_REPORTS', description: 'Can access reports dashboard', category: 'SALES' },
    { name: 'PROCESS_REFUNDS', description: 'Can refund transactions', category: 'SALES' },
    { name: 'APPLY_DISCOUNTS', description: 'Can apply manual discounts', category: 'SALES' },
    { name: 'VOID_TRANSACTIONS', description: 'Can void transactions', category: 'SALES' },

    // Employee Management
    { name: 'MANAGE_SCHEDULE', description: 'Can create/edit employee schedules', category: 'EMPLOYEES' },
    { name: 'MANAGE_EMPLOYEES', description: 'Can add/edit employees', category: 'EMPLOYEES' },
    { name: 'VIEW_COMMISSIONS', description: 'Can view commission reports', category: 'EMPLOYEES' },

    // Shift & Time
    { name: 'MANAGE_SHIFTS', description: 'Can open/close cash drawer shifts', category: 'SHIFTS' },
    { name: 'CLOCK_IN', description: 'Can clock in for work', category: 'SHIFTS' },
    { name: 'CLOCK_OUT', description: 'Can clock out from work', category: 'SHIFTS' },

    // Clients
    { name: 'MANAGE_CLIENTS', description: 'Can add/edit client records', category: 'CLIENTS' },
    { name: 'VIEW_CLIENT_HISTORY', description: 'Can view client transaction history', category: 'CLIENTS' },

    // Appointments
    { name: 'MANAGE_APPOINTMENTS', description: 'Can create/edit appointments', category: 'APPOINTMENTS' },
    { name: 'CANCEL_APPOINTMENTS', description: 'Can cancel appointments', category: 'APPOINTMENTS' },
]

// Default permissions per role
const roleDefaults: Record<string, string[]> = {
    'PROVIDER': [
        // Full access
        'ADD_SERVICES', 'ADD_PRODUCTS', 'MANAGE_INVENTORY', 'VIEW_REPORTS',
        'PROCESS_REFUNDS', 'APPLY_DISCOUNTS', 'VOID_TRANSACTIONS',
        'MANAGE_SCHEDULE', 'MANAGE_EMPLOYEES', 'VIEW_COMMISSIONS',
        'MANAGE_SHIFTS', 'CLOCK_IN', 'CLOCK_OUT',
        'MANAGE_CLIENTS', 'VIEW_CLIENT_HISTORY',
        'MANAGE_APPOINTMENTS', 'CANCEL_APPOINTMENTS'
    ],
    'FRANCHISOR': [
        'ADD_SERVICES', 'ADD_PRODUCTS', 'MANAGE_INVENTORY', 'VIEW_REPORTS',
        'PROCESS_REFUNDS', 'APPLY_DISCOUNTS', 'VOID_TRANSACTIONS',
        'MANAGE_SCHEDULE', 'MANAGE_EMPLOYEES', 'VIEW_COMMISSIONS',
        'MANAGE_SHIFTS', 'CLOCK_IN', 'CLOCK_OUT',
        'MANAGE_CLIENTS', 'VIEW_CLIENT_HISTORY',
        'MANAGE_APPOINTMENTS', 'CANCEL_APPOINTMENTS'
    ],
    'MANAGER': [
        'ADD_SERVICES', 'ADD_PRODUCTS', 'MANAGE_INVENTORY', 'VIEW_REPORTS',
        'PROCESS_REFUNDS', 'APPLY_DISCOUNTS',
        'MANAGE_SCHEDULE', 'VIEW_COMMISSIONS',
        'MANAGE_SHIFTS', 'CLOCK_IN', 'CLOCK_OUT',
        'MANAGE_CLIENTS', 'VIEW_CLIENT_HISTORY',
        'MANAGE_APPOINTMENTS', 'CANCEL_APPOINTMENTS'
    ],
    'SHIFT_SUPERVISOR': [
        'MANAGE_INVENTORY', 'VIEW_REPORTS',
        'PROCESS_REFUNDS',
        'MANAGE_SHIFTS', 'CLOCK_IN', 'CLOCK_OUT',
        'VIEW_CLIENT_HISTORY',
        'MANAGE_APPOINTMENTS', 'CANCEL_APPOINTMENTS'
    ],
    'EMPLOYEE': [
        'CLOCK_IN', 'CLOCK_OUT',
        'VIEW_CLIENT_HISTORY',
        'MANAGE_APPOINTMENTS'
    ]
}

async function seedPermissions() {
    console.log('🔐 Seeding permissions...')

    // Create all permissions
    for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
            where: { name: perm.name },
            update: { description: perm.description, category: perm.category },
            create: perm
        })
    }
    console.log(`✅ Created ${defaultPermissions.length} permissions`)

    // Create role default permissions
    let roleDefaultCount = 0
    for (const [role, permNames] of Object.entries(roleDefaults)) {
        for (const permName of permNames) {
            const permission = await prisma.permission.findUnique({
                where: { name: permName }
            })

            if (permission) {
                await prisma.roleDefaultPermission.upsert({
                    where: {
                        role_permissionId: { role, permissionId: permission.id }
                    },
                    update: {},
                    create: {
                        role,
                        permissionId: permission.id
                    }
                })
                roleDefaultCount++
            }
        }
    }
    console.log(`✅ Created ${roleDefaultCount} role default permissions`)

    console.log('🎉 Permission seeding complete!')
}

// Run
seedPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

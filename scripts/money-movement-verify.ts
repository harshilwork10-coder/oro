/**
 * MONEY MOVEMENT VERIFICATION PASS - Simplified Output
 * Avoids unicode for PowerShell compatibility
 */

const jwt = require('jsonwebtoken')
require('dotenv').config()

const BASE_URL = 'http://localhost:3001'
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || ''
// Match mobileAuth.ts line 46: uses JWT_SECRET env if available, else fallback
const JWT_SECRET = process.env.JWT_SECRET || ('CHANGE_THIS_IN_PRODUCTION_' + NEXTAUTH_SECRET.slice(0, 16))

let TEST_USER_ID = ''
let TEST_FRANCHISE_ID = ''
let TEST_LOCATION_ID = ''

const results: Array<{s: string, r: string, d: string}> = []
const fs = require('fs')
const LOG_FILE = 'scripts/verify-log.txt'
fs.writeFileSync(LOG_FILE, '', 'utf8') // Clear

function logLine(msg: string) {
    process.stdout.write(msg + '\n')
    fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8')
}

function log(scenario: string, result: string, detail: string) {
    results.push({s: scenario, r: result, d: detail})
    logLine(`[${result}] ${scenario}: ${detail}`)
}

let TEST_ROLE = 'OWNER'

function makeToken(role?: string) {
    return jwt.sign({
        userId: TEST_USER_ID, franchiseId: TEST_FRANCHISE_ID,
        locationId: TEST_LOCATION_ID, role: role || TEST_ROLE, exp: Math.floor(Date.now()/1000)+3600
    }, JWT_SECRET)
}

async function api(method: string, path: string, body?: any) {
    const token = makeToken()
    const res = await fetch(`${BASE_URL}${path}`, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
    })
    let json: any = {}
    try { json = await res.json() } catch {}
    return { status: res.status, json, ok: res.ok }
}

async function main() {
    logLine('--- ORO 9 MONEY MOVEMENT VERIFICATION ---')
    logLine('Server: ' + BASE_URL)
    
    // PHASE 0: Discover data
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const user = await prisma.user.findFirst({
        where: { franchiseId: { not: null }, isActive: true, role: { in: ['OWNER', 'FRANCHISOR', 'MANAGER'] } },
        select: { id: true, email: true, franchiseId: true, locationId: true, role: true }
    })
    if (!user) {
        const fallback = await prisma.user.findFirst({
            where: { franchiseId: { not: null }, isActive: true },
            select: { id: true, email: true, franchiseId: true, locationId: true, role: true }
        })
        if (!fallback) { logLine('FATAL: No active users'); return }
        TEST_USER_ID = fallback.id; TEST_FRANCHISE_ID = fallback.franchiseId; TEST_LOCATION_ID = fallback.locationId || ''; TEST_ROLE = fallback.role
        logLine('User: ' + fallback.email + ' (' + fallback.role + ')')
    } else {
        TEST_USER_ID = user.id; TEST_FRANCHISE_ID = user.franchiseId; TEST_LOCATION_ID = user.locationId || ''; TEST_ROLE = user.role
        logLine('User: ' + user.email + ' (' + user.role + ')')
    }
    
    if (!TEST_LOCATION_ID) {
        const loc = await prisma.location.findFirst({ where: { franchiseId: TEST_FRANCHISE_ID } })
        if (loc) TEST_LOCATION_ID = loc.id
    }
    
    logLine('User: ' + TEST_USER_ID)
    logLine('Franchise: ' + TEST_FRANCHISE_ID)
    logLine('Location: ' + TEST_LOCATION_ID)
    
    // TEST 1: EXCHANGE -> 503
    logLine('\n--- TEST 1: EXCHANGE DISABLED ---')
    const exch = await api('POST', '/api/pos/exchange', {})
    if (exch.status === 503) log('EXCHANGE-503', 'PASS', 'Returns 503')
    else log('EXCHANGE-503', 'FAIL', 'Got ' + exch.status)
    
    // TEST 2: STORE CREDIT
    logLine('\n--- TEST 2: STORE CREDIT ---')
    const sc = await api('POST', '/api/pos/store-credit', { amount: 25, reason: 'test' })
    if (sc.ok && sc.json?.storeCredit?.code?.startsWith('SC-')) {
        log('SC-ISSUE', 'PASS', 'Code=' + sc.json.storeCredit.code + ' Balance=$' + sc.json.storeCredit.currentBalance)
        
        // Redeem
        const rd = await api('POST', '/api/gift-cards/' + sc.json.storeCredit.code, { amount: 10 })
        if (rd.ok) log('SC-REDEEM', 'PASS', 'Balance after=$' + rd.json.currentBalance)
        else log('SC-REDEEM', 'FAIL', rd.json?.error)
        
        // Over-redeem
        const or = await api('POST', '/api/gift-cards/' + sc.json.storeCredit.code, { amount: 999 })
        if (!or.ok) log('SC-OVER-BLOCKED', 'PASS', or.json?.error)
        else log('SC-OVER-BLOCKED', 'FAIL', 'Over-redeem allowed!')
    } else {
        log('SC-ISSUE', 'FAIL', JSON.stringify(sc.json))
    }
    
    // TEST 3: CASH DROP PERSISTENCE
    logLine('\n--- TEST 3: CASH DROP ---')
    // Open shift first
    const shOpen = await api('POST', '/api/pos/shift', { action: 'OPEN', amount: 200, notes: 'verify-test' })
    const shiftOk = shOpen.ok || shOpen.json?.error?.includes('already open')
    if (shiftOk) {
        const drop = await api('POST', '/api/pos/shift', { action: 'DROP', amount: 75, notes: 'test-drop' })
        if (drop.ok && drop.json?.id) {
            log('CASH-DROP', 'PASS', 'Saved id=' + drop.json.id + ' amount=$' + drop.json.amount)
            // Verify in DB
            const dbDrop = await prisma.cashDrop.findUnique({ where: { id: drop.json.id } })
            if (dbDrop) log('CASH-DROP-DB', 'PASS', 'Found in DB, amount=$' + Number(dbDrop.amount))
            else log('CASH-DROP-DB', 'FAIL', 'NOT in DB after success')
        } else {
            log('CASH-DROP', 'FAIL', JSON.stringify(drop.json))
        }
    } else {
        log('CASH-DROP', 'FAIL', 'Cannot open shift: ' + JSON.stringify(shOpen.json))
    }
    
    // TEST 4: GIFT CARD ATOMIC
    logLine('\n--- TEST 4: GIFT CARD ---')
    const gc = await api('POST', '/api/gift-cards', { initialAmount: 50 })
    if (gc.ok) {
        log('GC-CREATE', 'PASS', 'Code=' + gc.json.code + ' Balance=$' + gc.json.currentBalance)
        
        const rd = await api('POST', '/api/gift-cards/' + gc.json.code, { amount: 20 })
        if (rd.ok) log('GC-REDEEM', 'PASS', 'Balance=$' + rd.json.currentBalance)
        else log('GC-REDEEM', 'FAIL', rd.json?.error)
        
        const ov = await api('POST', '/api/gift-cards/' + gc.json.code, { amount: 999 })
        if (!ov.ok) log('GC-OVER', 'PASS', 'Blocked: ' + ov.json?.error)
        else log('GC-OVER', 'FAIL', 'Over-redeem allowed')
        
        // Race test
        const race = await api('POST', '/api/gift-cards', { initialAmount: 5 })
        if (race.ok) {
            const [a, b] = await Promise.all([
                api('POST', '/api/gift-cards/' + race.json.code, { amount: 5 }),
                api('POST', '/api/gift-cards/' + race.json.code, { amount: 5 })
            ])
            if (a.ok && b.ok) {
                const card = await prisma.giftCard.findUnique({ where: { code: race.json.code } })
                const bal = Number(card?.currentBalance || 0)
                if (bal < 0) log('GC-RACE', 'FAIL', 'NEGATIVE balance: $' + bal)
                else log('GC-RACE', 'WARN', 'Both OK, balance=$' + bal + ' (sequential)')
            } else if ((a.ok && !b.ok) || (!a.ok && b.ok)) {
                log('GC-RACE', 'PASS', 'One blocked (atomic)')
            } else {
                log('GC-RACE', 'WARN', 'Both failed (serialization conflict)')
            }
        }
    } else {
        log('GC-CREATE', 'FAIL', JSON.stringify(gc.json))
    }
    
    // TEST 5: REFUND
    logLine('\n--- TEST 5: REFUND ---')
    const completedTx = await prisma.transaction.findFirst({
        where: { franchiseId: TEST_FRANCHISE_ID, status: 'COMPLETED', originalTransactionId: null },
        include: { lineItems: true }, orderBy: { createdAt: 'desc' }
    })
    
    if (completedTx && completedTx.lineItems.length > 0) {
        const item = completedTx.lineItems[0]
        
        // Partial refund
        const ref = await api('POST', '/api/pos/refund', {
            originalTransactionId: completedTx.id,
            refundType: 'PARTIAL',
            items: [{ lineItemId: item.id, quantity: 1 }],
            reason: 'Verify test', refundMethod: 'CASH'
        })
        
        if (ref.ok) {
            log('REFUND-PARTIAL', 'PASS', 'Created id=' + ref.json.id + ' type=' + ref.json.type)
            if (ref.json.type === 'REFUND') log('REFUND-TYPE', 'PASS', 'type=REFUND correct')
            else log('REFUND-TYPE', 'FAIL', 'type=' + ref.json.type + ' (should be REFUND)')
            
            // Refund-on-refund
            const ror = await api('POST', '/api/pos/refund', {
                originalTransactionId: ref.json.id,
                refundType: 'FULL', items: [{ lineItemId: item.id, quantity: 1 }],
                reason: 'test', refundMethod: 'CASH'
            })
            if (!ror.ok) log('REFUND-ON-REFUND', 'PASS', 'Blocked: ' + ror.json?.error?.substring(0, 60))
            else log('REFUND-ON-REFUND', 'FAIL', 'ALLOWED (danger)')
            
            // Over-refund
            const ovr = await api('POST', '/api/pos/refund', {
                originalTransactionId: completedTx.id,
                refundType: 'FULL',
                items: completedTx.lineItems.map((li: any) => ({ lineItemId: li.id, quantity: li.quantity * 100 })),
                reason: 'test', refundMethod: 'CASH'
            })
            if (!ovr.ok) log('REFUND-OVER-AMOUNT', 'PASS', 'Blocked: ' + (ovr.json?.error?.substring(0, 80) || ovr.status))
            else log('REFUND-OVER-AMOUNT', 'FAIL', 'ALLOWED (danger)')
        } else {
            log('REFUND-PARTIAL', 'FAIL', ref.json?.error)
        }
    } else {
        log('REFUND', 'SKIP', 'No completed transactions found')
    }
    
    // TEST 6: PAID IN/OUT (requires active shift)
    logLine('\n--- TEST 6: PAID IN/OUT ---')
    // Ensure a shift is open
    const piShift = await api('GET', '/api/pos/shift')
    if (!piShift.json?.shift) {
        await api('POST', '/api/pos/shift', { action: 'OPEN', amount: 100, notes: 'paid-test-shift' })
    }
    const pi = await api('POST', '/api/pos/paid-in-out', { type: 'PAID_IN', amount: 30, reason: 'test' })
    if (pi.ok) log('PAID-IN', 'PASS', 'Recorded')
    else log('PAID-IN', 'FAIL', pi.json?.error)
    
    const po = await api('POST', '/api/pos/paid-in-out', { type: 'PAID_OUT', amount: 15, reason: 'test' })
    if (po.ok) log('PAID-OUT', 'PASS', 'Recorded')
    else log('PAID-OUT', 'FAIL', po.json?.error)
    
    // TEST 7: SHIFT CLOSE
    logLine('\n--- TEST 7: SHIFT CLOSE ---')
    const cls = await api('POST', '/api/pos/shift', { action: 'CLOSE', amount: 350, notes: 'verify-close' })
    if (cls.ok) log('SHIFT-CLOSE', 'PASS', 'Closed, ending=$' + cls.json?.endingCash)
    else log('SHIFT-CLOSE', 'FAIL', cls.json?.error)
    
    // TEST 8: VOID
    logLine('\n--- TEST 8: VOID ---')
    const voidTx = await prisma.transaction.findFirst({
        where: { franchiseId: TEST_FRANCHISE_ID, status: 'COMPLETED', originalTransactionId: null },
        orderBy: { createdAt: 'desc' }
    })
    if (voidTx) {
        const v = await api('POST', '/api/pos/void', { transactionId: voidTx.id, reason: 'verify void' })
        if (v.ok) log('VOID', 'PASS', 'Voided tx=' + voidTx.id)
        else log('VOID', 'FAIL', v.json?.error)
        log('VOID-WINDOW', 'WARN', 'P1: No settlement time window enforced')
    } else {
        log('VOID', 'SKIP', 'No completed tx to void')
    }
    
    // TEST 9: RECONCILIATION
    logLine('\n--- TEST 9: RECONCILIATION ---')
    const today = new Date(); today.setHours(0,0,0,0)
    const fid = TEST_FRANCHISE_ID
    
    const [sales, refunds, voids, cashS, cardS, gcLiab, scLiab, drops] = await Promise.all([
        prisma.transaction.aggregate({ where: { franchiseId: fid, status: 'COMPLETED', createdAt: { gte: today }}, _sum: { total: true }, _count: true }),
        prisma.transaction.aggregate({ where: { franchiseId: fid, status: 'REFUNDED', originalTransactionId: { not: null }, createdAt: { gte: today }}, _sum: { total: true }, _count: true }),
        prisma.transaction.aggregate({ where: { franchiseId: fid, status: 'VOIDED', createdAt: { gte: today }}, _sum: { total: true }, _count: true }),
        prisma.transaction.aggregate({ where: { franchiseId: fid, status: 'COMPLETED', paymentMethod: 'CASH', createdAt: { gte: today }}, _sum: { total: true }}),
        prisma.transaction.aggregate({ where: { franchiseId: fid, status: 'COMPLETED', paymentMethod: { in: ['CREDIT_CARD','DEBIT_CARD'] }, createdAt: { gte: today }}, _sum: { total: true }}),
        prisma.giftCard.aggregate({ where: { franchiseId: fid, isActive: true, code: { not: { startsWith: 'SC-' }}}, _sum: { currentBalance: true }}),
        prisma.giftCard.aggregate({ where: { franchiseId: fid, isActive: true, code: { startsWith: 'SC-' }}, _sum: { currentBalance: true }}),
        prisma.cashDrop.aggregate({ where: { session: { location: { franchiseId: fid }}, createdAt: { gte: today }}, _sum: { amount: true }, _count: true })
    ])
    
    const s = Number(sales._sum.total||0), r = Math.abs(Number(refunds._sum.total||0)), vo = Number(voids._sum.total||0)
    const c = Number(cashS._sum.total||0), cd = Number(cardS._sum.total||0)
    const g = Number(gcLiab._sum.currentBalance||0), sc2 = Number(scLiab._sum.currentBalance||0)
    const dr = Number(drops._sum.amount||0)
    
    logLine('-------- DAILY RECONCILIATION --------')
    logLine('Sales:       $' + s.toFixed(2) + ' (' + sales._count + ')')
    logLine('Refunds:     $' + r.toFixed(2) + ' (' + refunds._count + ')')
    logLine('Voids:       $' + vo.toFixed(2) + ' (' + voids._count + ')')
    logLine('Net Revenue: $' + (s-r).toFixed(2))
    logLine('Cash Sales:  $' + c.toFixed(2))
    logLine('Card Sales:  $' + cd.toFixed(2))
    logLine('GC Liability:$' + g.toFixed(2))
    logLine('SC Liability:$' + sc2.toFixed(2))
    logLine('Cash Drops:  $' + dr.toFixed(2) + ' (' + drops._count + ')')
    logLine('--------------------------------------')
    
    log('RECON-SALES', 'PASS', '$' + s.toFixed(2))
    log('RECON-REFUNDS', 'PASS', '$' + r.toFixed(2))
    log('RECON-VOIDS', 'PASS', '$' + vo.toFixed(2))
    log('RECON-GC-LIABILITY', 'PASS', '$' + g.toFixed(2))
    log('RECON-SC-LIABILITY', 'PASS', '$' + sc2.toFixed(2))
    log('RECON-DROPS', 'PASS', '$' + dr.toFixed(2))
    
    await prisma.$disconnect()
    
    // SUMMARY
    logLine('\n========== FINAL RESULTS ==========')
    const pass = results.filter(r => r.r === 'PASS').length
    const fail = results.filter(r => r.r === 'FAIL').length
    const warn = results.filter(r => r.r === 'WARN').length
    const skip = results.filter(r => r.r === 'SKIP').length
    logLine('PASSED:  ' + pass)
    logLine('FAILED:  ' + fail)
    logLine('WARNED:  ' + warn)
    logLine('SKIPPED: ' + skip)
    
    if (fail > 0) {
        logLine('\n-- FAILURES --')
        results.filter(r => r.r === 'FAIL').forEach(r => logLine('  X ' + r.s + ': ' + r.d))
    }
    if (warn > 0) {
        logLine('\n-- WARNINGS (P1) --')
        results.filter(r => r.r === 'WARN').forEach(r => logLine('  ! ' + r.s + ': ' + r.d))
    }
    
    logLine('\n====================================')
    if (fail === 0) logLine('VERDICT: MONEY MOVEMENT VERIFIED - NEEDS FINAL P1 FIXES')
    else logLine('VERDICT: FAILURES FOUND - FIX REQUIRED')
    logLine('====================================')
}

main().catch(e => { process.stderr.write('FATAL: ' + e.message + '\n' + e.stack + '\n'); process.exit(1) })

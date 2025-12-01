import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Validate License Key and optionally register terminal
export async function POST(req: NextRequest) {
    try {
        const { licenseKey, terminalSerialNumber, terminalModel, terminalIp } = await req.json()

        if (!licenseKey) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 })
        }

        // Find license
        const license = await prisma.license.findUnique({
            where: { licenseKey },
            include: {
                terminals: true,
                location: true
            }
        })

        if (!license) {
            return NextResponse.json({
                valid: false,
                error: 'Invalid license key'
            }, { status: 404 })
        }

        // Check license status
        if (license.status !== 'ACTIVE') {
            return NextResponse.json({
                valid: false,
                error: `License is ${license.status.toLowerCase()}`,
                status: license.status
            }, { status: 403 })
        }

        // Check if expired
        if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
            return NextResponse.json({
                valid: false,
                error: 'License has expired',
                expiresAt: license.expiresAt
            }, { status: 403 })
        }

        // If terminal serial number provided, validate/register it
        let terminalRegistration = null
        if (terminalSerialNumber) {
            // Check if terminal exists
            let terminal = await prisma.registeredTerminal.findUnique({
                where: { serialNumber: terminalSerialNumber }
            })

            if (terminal) {
                // Terminal exists - check if it belongs to this license
                if (terminal.licenseId !== license.id) {
                    return NextResponse.json({
                        valid: false,
                        error: 'Terminal is registered to a different license',
                        terminalSerialNumber
                    }, { status: 403 })
                }

                // Update last used info
                terminal = await prisma.registeredTerminal.update({
                    where: { id: terminal.id },
                    data: {
                        lastUsedAt: new Date(),
                        lastIpAddress: terminalIp || terminal.lastIpAddress,
                        status: 'ACTIVE'
                    }
                })

                terminalRegistration = terminal
            } else {
                // New terminal - check if license allows more terminals
                const currentTerminalCount = license.terminals.length
                if (license.maxTerminals && currentTerminalCount >= license.maxTerminals) {
                    return NextResponse.json({
                        valid: false,
                        error: `License maximum of ${license.maxTerminals} terminals reached`,
                        currentCount: currentTerminalCount,
                        maxAllowed: license.maxTerminals
                    }, { status: 403 })
                }

                // Register new terminal
                terminal = await prisma.registeredTerminal.create({
                    data: {
                        serialNumber: terminalSerialNumber,
                        model: terminalModel || 'Unknown',
                        licenseId: license.id,
                        lastUsedAt: new Date(),
                        lastIpAddress: terminalIp,
                        status: 'ACTIVE'
                    }
                })

                terminalRegistration = terminal
            }
        }

        return NextResponse.json({
            valid: true,
            license: {
                id: license.id,
                licenseKey: license.licenseKey,
                status: license.status,
                maxTerminals: license.maxTerminals,
                currentTerminals: license.terminals.length,
                expiresAt: license.expiresAt,
                customerName: license.customerName,
                location: license.location
            },
            terminal: terminalRegistration ? {
                id: terminalRegistration.id,
                serialNumber: terminalRegistration.serialNumber,
                model: terminalRegistration.model,
                status: terminalRegistration.status,
                lastUsedAt: terminalRegistration.lastUsedAt
            } : null
        })

    } catch (error) {
        console.error('License validation error:', error)
        return NextResponse.json({
            valid: false,
            error: 'Failed to validate license'
        }, { status: 500 })
    }
}

// Get license details
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const licenseKey = searchParams.get('licenseKey')

        if (!licenseKey) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 })
        }

        const license = await prisma.license.findUnique({
            where: { licenseKey },
            include: {
                terminals: {
                    orderBy: { registeredAt: 'desc' }
                },
                location: true
            }
        })

        if (!license) {
            return NextResponse.json({ error: 'License not found' }, { status: 404 })
        }

        return NextResponse.json({
            license: {
                id: license.id,
                licenseKey: license.licenseKey,
                status: license.status,
                maxTerminals: license.maxTerminals,
                issuedAt: license.issuedAt,
                expiresAt: license.expiresAt,
                customerName: license.customerName,
                customerEmail: license.customerEmail,
                customerPhone: license.customerPhone,
                location: license.location,
                terminals: license.terminals.map((t: any) => ({
                    id: t.id,
                    serialNumber: t.serialNumber,
                    model: t.model,
                    status: t.status,
                    lastUsedAt: t.lastUsedAt,
                    lastIpAddress: t.lastIpAddress,
                    registeredAt: t.registeredAt
                }))
            }
        })

    } catch (error) {
        console.error('Get license error:', error)
        return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/invoices/ftp-config
 * Get FTP config for the franchise
 */
export async function GET(req: NextRequest) {
  try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = (user as { franchiseId?: string }).franchiseId
    if (!franchiseId) {
      return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
    }

    const role = (user as { role?: string }).role
    if (!role || !['PROVIDER'].includes(role)) {
      return NextResponse.json({ error: 'Only PROVIDER can access FTP config' }, { status: 403 })
    }

    const config = await prisma.ftpConfig.findUnique({ where: { franchiseId } })

    if (!config) {
      return NextResponse.json({ configured: false })
    }

    return NextResponse.json({
      configured: true,
      config: {
        ...config,
        password: '••••••••' // Never expose password
      }
    })

  } catch (error) {
    console.error('FTP config GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch FTP config' }, { status: 500 })
  }
}

/**
 * POST /api/invoices/ftp-config
 * Create or update FTP config
 * Role: OWNER only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = (user as { franchiseId?: string }).franchiseId
    if (!franchiseId) {
      return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
    }

    const role = (user as { role?: string }).role
    if (!role || !['PROVIDER'].includes(role)) {
      return NextResponse.json({ error: 'Only PROVIDER can configure FTP' }, { status: 403 })
    }

    const body = await request.json()
    const { host, port, protocol, username, password, remotePath, filePattern, autoFetch, fetchSchedule, costAlertPct } = body

    if (!host || !username || !password) {
      return NextResponse.json({ error: 'Host, username, and password are required' }, { status: 400 })
    }

    const config = await prisma.ftpConfig.upsert({
      where: { franchiseId },
      create: {
        franchiseId,
        host,
        port: port || 21,
        protocol: protocol || 'SFTP',
        username,
        password, // TODO: encrypt at app layer
        remotePath: remotePath || '/',
        filePattern: filePattern || '*.csv',
        autoFetch: autoFetch || false,
        fetchSchedule: fetchSchedule || '0 6 * * *',
        costAlertPct: costAlertPct || 10
      },
      update: {
        host,
        port: port || undefined,
        protocol: protocol || undefined,
        username,
        password,
        remotePath: remotePath || undefined,
        filePattern: filePattern || undefined,
        autoFetch: autoFetch !== undefined ? autoFetch : undefined,
        fetchSchedule: fetchSchedule || undefined,
        costAlertPct: costAlertPct || undefined
      }
    })

    return NextResponse.json({
      success: true,
      config: { ...config, password: '••••••••' }
    })

  } catch (error) {
    console.error('FTP config POST error:', error)
    return NextResponse.json({ error: 'Failed to save FTP config' }, { status: 500 })
  }
}

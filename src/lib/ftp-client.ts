/**
 * FTP/SFTP Client for Vendor Invoice Auto-Fetch
 *
 * Supports FTP, FTPS, and SFTP protocols.
 * - Connects using stored credentials from FtpConfig
 * - Lists files matching pattern
 * - Downloads new files (skips already-imported via hash check)
 * - Checks file age (>5 min modified time) to avoid partial uploads
 */

import * as ftp from 'basic-ftp'
import SftpClient from 'ssh2-sftp-client'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

export interface FetchedFile {
  filename: string
  remotePath: string
  content: string
  size: number
  hash: string
  modifiedAt: Date | null
}

export interface FetchResult {
  success: boolean
  message: string
  filesFound: number
  filesDownloaded: number
  filesSkipped: number
  errors: string[]
  files: FetchedFile[]
}

interface FtpConfigData {
  host: string
  port: number
  protocol: string
  username: string
  password: string
  remotePath: string
  filePattern: string
}

/**
 * Fetch invoice files from vendor FTP/SFTP server.
 * Skips files that have already been imported (by hash).
 * Skips files modified less than 5 minutes ago (may still be uploading).
 */
export async function fetchInvoiceFiles(
  config: FtpConfigData,
  prisma: PrismaClient,
  franchiseId: string
): Promise<FetchResult> {
  const errors: string[] = []
  const fetchedFiles: FetchedFile[] = []
  const filesFound = 0
  const filesSkipped = 0

  try {
    if (config.protocol === 'SFTP') {
      return await fetchViaSftp(config, prisma, franchiseId)
    } else {
      return await fetchViaFtp(config, prisma, franchiseId)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return {
      success: false,
      message: `FTP connection failed: ${msg}`,
      filesFound,
      filesDownloaded: fetchedFiles.length,
      filesSkipped,
      errors: [msg],
      files: []
    }
  }
}

/**
 * Fetch via SFTP (SSH-based)
 */
async function fetchViaSftp(
  config: FtpConfigData,
  prisma: PrismaClient,
  franchiseId: string
): Promise<FetchResult> {
  const sftp = new SftpClient()
  const errors: string[] = []
  const fetchedFiles: FetchedFile[] = []
  let filesFound = 0
  let filesSkipped = 0

  try {
    await sftp.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      readyTimeout: 10000,
      retries: 2,
      retry_minTimeout: 2000
    })

    // List files in remote directory
    const listing = await sftp.list(config.remotePath || '/')
    const pattern = config.filePattern || '*.csv'
    const extension = pattern.replace('*', '')

    const csvFiles = listing.filter(f =>
      f.type === '-' && f.name.toLowerCase().endsWith(extension.toLowerCase())
    )

    filesFound = csvFiles.length

    for (const file of csvFiles) {
      try {
        // Skip files modified less than 5 minutes ago (may still be uploading)
        if (file.modifyTime) {
          const modTime = new Date(file.modifyTime)
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (modTime > fiveMinAgo) {
            filesSkipped++
            continue
          }
        }

        // Download file content
        const remotePath = `${config.remotePath || '/'}/${file.name}`.replace(/\/\//g, '/')
        const buffer = await sftp.get(remotePath) as Buffer
        const content = buffer.toString('utf-8')

        // Hash check — skip if already imported
        const hash = crypto.createHash('sha256').update(content).digest('hex')
        const existing = await prisma.inboundFile.findUnique({ where: { fileHash: hash } })
        if (existing) {
          filesSkipped++
          continue
        }

        fetchedFiles.push({
          filename: file.name,
          remotePath,
          content,
          size: file.size,
          hash,
          modifiedAt: file.modifyTime ? new Date(file.modifyTime) : null
        })
      } catch (fileErr) {
        const msg = `Failed to download ${file.name}: ${fileErr instanceof Error ? fileErr.message : 'Unknown'}`
        errors.push(msg)
      }
    }

    return {
      success: true,
      message: `Found ${filesFound} files, downloaded ${fetchedFiles.length}, skipped ${filesSkipped}`,
      filesFound,
      filesDownloaded: fetchedFiles.length,
      filesSkipped,
      errors,
      files: fetchedFiles
    }
  } finally {
    await sftp.end()
  }
}

/**
 * Fetch via FTP/FTPS
 */
async function fetchViaFtp(
  config: FtpConfigData,
  prisma: PrismaClient,
  franchiseId: string
): Promise<FetchResult> {
  const client = new ftp.Client()
  client.ftp.verbose = false
  const errors: string[] = []
  const fetchedFiles: FetchedFile[] = []
  let filesFound = 0
  let filesSkipped = 0

  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.username,
      password: config.password,
      secure: config.protocol === 'FTPS'
    })

    // Navigate to remote directory
    if (config.remotePath && config.remotePath !== '/') {
      await client.cd(config.remotePath)
    }

    // List files
    const listing = await client.list()
    const pattern = config.filePattern || '*.csv'
    const extension = pattern.replace('*', '')

    const csvFiles = listing.filter(f =>
      f.type === ftp.FileType.File && f.name.toLowerCase().endsWith(extension.toLowerCase())
    )

    filesFound = csvFiles.length

    for (const file of csvFiles) {
      try {
        // Skip files modified less than 5 minutes ago
        if (file.modifiedAt) {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (file.modifiedAt > fiveMinAgo) {
            filesSkipped++
            continue
          }
        }

        // Download to buffer
        const chunks: Buffer[] = []
        const writable = new (await import('stream')).Writable({
          write(chunk, _encoding, callback) {
            chunks.push(Buffer.from(chunk))
            callback()
          }
        })
        await client.downloadTo(writable, file.name)

        const content = Buffer.concat(chunks).toString('utf-8')
        const hash = crypto.createHash('sha256').update(content).digest('hex')

        // Skip if already imported
        const existing = await prisma.inboundFile.findUnique({ where: { fileHash: hash } })
        if (existing) {
          filesSkipped++
          continue
        }

        fetchedFiles.push({
          filename: file.name,
          remotePath: `${config.remotePath || '/'}/${file.name}`,
          content,
          size: file.size,
          hash,
          modifiedAt: file.modifiedAt || null
        })
      } catch (fileErr) {
        const msg = `Failed to download ${file.name}: ${fileErr instanceof Error ? fileErr.message : 'Unknown'}`
        errors.push(msg)
      }
    }

    return {
      success: true,
      message: `Found ${filesFound} files, downloaded ${fetchedFiles.length}, skipped ${filesSkipped}`,
      filesFound,
      filesDownloaded: fetchedFiles.length,
      filesSkipped,
      errors,
      files: fetchedFiles
    }
  } finally {
    client.close()
  }
}

/**
 * Test FTP/SFTP connection without downloading files.
 * Returns true if connection succeeds, or error message.
 */
export async function testFtpConnection(config: FtpConfigData): Promise<{ success: boolean; message: string; fileCount?: number }> {
  try {
    if (config.protocol === 'SFTP') {
      const sftp = new SftpClient()
      try {
        await sftp.connect({
          host: config.host,
          port: config.port || 22,
          username: config.username,
          password: config.password,
          readyTimeout: 10000
        })
        const listing = await sftp.list(config.remotePath || '/')
        const extension = (config.filePattern || '*.csv').replace('*', '')
        const csvCount = listing.filter(f => f.type === '-' && f.name.toLowerCase().endsWith(extension.toLowerCase())).length
        return { success: true, message: `Connected! Found ${csvCount} CSV files.`, fileCount: csvCount }
      } finally {
        await sftp.end()
      }
    } else {
      const client = new ftp.Client()
      try {
        await client.access({
          host: config.host,
          port: config.port || 21,
          user: config.username,
          password: config.password,
          secure: config.protocol === 'FTPS'
        })
        if (config.remotePath && config.remotePath !== '/') {
          await client.cd(config.remotePath)
        }
        const listing = await client.list()
        const extension = (config.filePattern || '*.csv').replace('*', '')
        const csvCount = listing.filter(f => f.type === ftp.FileType.File && f.name.toLowerCase().endsWith(extension.toLowerCase())).length
        return { success: true, message: `Connected! Found ${csvCount} CSV files.`, fileCount: csvCount }
      } finally {
        client.close()
      }
    }
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

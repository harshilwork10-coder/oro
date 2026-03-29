'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
  FileText, Upload, Download, CheckCircle, AlertTriangle,
  XCircle, Clock, DollarSign, Package, ArrowLeft, RefreshCw,
  ChevronDown, ChevronUp, Search, Filter, Truck, Eye,
  ArrowRight, Shield, AlertCircle, ChevronRight, Wifi, WifiOff, Server
} from "lucide-react"
import Link from 'next/link'

/* ───────── Types ───────── */

interface InvoiceSummary {
  id: string
  invoiceNumber: string
  vendorName: string
  invoiceDate: string
  dueDate: string | null
  totalAmount: string
  status: string
  matchRate: string | null
  totalItems: number
  matchedItems: number
  newItems: number
  costAlertItems: number
  errorItems: number
  discrepancyOk: boolean
  createdAt: string
  supplier?: { id: string; name: string }
  location?: { id: string; name: string }
}

interface InvoiceItem {
  id: string
  lineNumber: number
  vendorProductNum: string | null
  quantity: number
  unitCost: string
  unitOfMeasure: string | null
  productDesc: string
  cleanUpc: string | null
  caseUpc: string | null
  packUpc: string | null
  productClass: string | null
  glCode: string | null
  extendedPrice: string
  baseUnitsReceived: number | null
  perUnitCost: string | null
  matchStatus: string
  matchMethod: string | null
  costChanged: boolean
  costChangePct: string | null
  previousCost: string | null
  matchedProduct?: { id: string; name: string; stock: number; cost: string; isActive: boolean } | null
  autoCreatedProduct?: { id: string; name: string; isActive: boolean } | null
}

interface InvoiceDetail extends InvoiceSummary {
  invoiceType: string
  poNumber: string | null
  parsedTotal: string | null
  discrepancy: string | null
  postedAt: string | null
  postedBy: string | null
  voidedAt: string | null
  voidReason: string | null
  items: InvoiceItem[]
}

interface ReadinessSummary {
  matchedLines: number
  newProducts: number
  costAlerts: number
  errors: number
  discrepancyOk: boolean
  canPost: boolean
  blockedReasons: string[]
}

interface StatsMap { [status: string]: { count: number; total: string | null } }

/* ───────── Main Component ───────── */

export default function InvoiceDashboard() {
  const { data: session, status } = useSession()

  // List state
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [stats, setStats] = useState<StatsMap>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')

  // Detail state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null)
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Action state
  const [actionLoading, setActionLoading] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [showVoidModal, setShowVoidModal] = useState(false)

  // FTP state
  const [ftpFetching, setFtpFetching] = useState(false)
  const [ftpResult, setFtpResult] = useState<Record<string, unknown> | null>(null)
  const [ftpTesting, setFtpTesting] = useState(false)
  const [ftpTestResult, setFtpTestResult] = useState<{ success: boolean; message: string } | null>(null)

  if (status === 'unauthenticated') redirect('/login')

  /* ───────── Data Fetching ───────── */

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (vendorFilter) params.set('vendor', vendorFilter)
      const res = await fetch(`/api/invoices?${params}`)
      const data = await res.json()
      setInvoices(data.invoices || [])
      setStats(data.stats || {})
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, vendorFilter])

  useEffect(() => {
    if (session) fetchInvoices()
  }, [session, fetchInvoices])

  const fetchDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      const data = await res.json()
      setSelectedInvoice(data.invoice)
      setReadiness(data.readinessSummary)
    } catch (err) {
      console.error('Failed to fetch detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  /* ───────── File Upload ───────── */

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadResult({ error: 'Only CSV files are supported' })
      return
    }
    setUploading(true)
    setUploadResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/invoices/import', { method: 'POST', body: form })
      const data = await res.json()
      setUploadResult(data)
      if (data.success) fetchInvoices()
    } catch (err) {
      setUploadResult({ error: 'Upload failed' })
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0])
  }

  /* ───────── Invoice Actions ───────── */

  const handleAction = async (action: string) => {
    if (!selectedInvoice) return
    setActionLoading(true)
    try {
      const body: Record<string, string> = { action }
      if (action === 'void') body.reason = voidReason
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        setShowVoidModal(false)
        setVoidReason('')
        fetchDetail(selectedInvoice.id)
        fetchInvoices()
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (err) {
      console.error(err)
      alert('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  /* ───────── Status Badge ───────── */

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      IMPORTED: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Clock size={12} /> },
      REVIEW_REQUIRED: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: <AlertTriangle size={12} /> },
      READY_TO_POST: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: <CheckCircle size={12} /> },
      POSTED: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <Shield size={12} /> },
      VOIDED: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle size={12} /> }
    }
    const c = config[status] || config.IMPORTED
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon} {status.replace(/_/g, ' ')}
      </span>
    )
  }

  const MatchBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      MATCHED: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Matched' },
      NEW_PRODUCT: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '🆕 New' },
      SUGGESTED: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '💡 Suggested' },
      MANUAL: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '✋ Manual' },
      ERROR: { bg: 'bg-red-500/20', text: 'text-red-400', label: '❌ Error' },
      PENDING: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '⏳ Pending' }
    }
    const c = config[status] || config.PENDING
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
    )
  }

  /* ───────── DETAIL VIEW ───────── */

  if (selectedInvoice) {
    return (
      <div className="p-6 space-y-6" style={{ background: '#0a0a0f', minHeight: '100vh', color: '#e2e8f0' }}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-lg hover:bg-white/5">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Invoice #{selectedInvoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-400">{selectedInvoice.vendorName} — {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={selectedInvoice.status} />
        </div>

        {/* Posting Readiness */}
        {readiness && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Shield size={16} /> Posting Readiness
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Matched" value={readiness.matchedLines} color="text-green-400" />
              <Stat label="New Products" value={readiness.newProducts} color="text-blue-400" />
              <Stat label="Cost Alerts" value={readiness.costAlerts} color={readiness.costAlerts > 0 ? 'text-amber-400' : 'text-gray-400'} />
              <Stat label="Errors" value={readiness.errors} color={readiness.errors > 0 ? 'text-red-400' : 'text-gray-400'} />
              <Stat label="Reconciliation" value={readiness.discrepancyOk ? 'OK' : '⚠️'} color={readiness.discrepancyOk ? 'text-green-400' : 'text-amber-400'} />
            </div>
            {readiness.blockedReasons.length > 0 && (
              <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">Blocked: {readiness.blockedReasons.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {readiness?.canPost && selectedInvoice.status !== 'POSTED' && selectedInvoice.status !== 'VOIDED' && (
            <button
              onClick={() => handleAction('post')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle size={16} /> {actionLoading ? 'Posting...' : 'Approve & Post to Inventory'}
            </button>
          )}
          {selectedInvoice.status === 'POSTED' && (
            <button
              onClick={() => setShowVoidModal(true)}
              className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium hover:bg-red-600/30 flex items-center gap-2"
            >
              <XCircle size={16} /> Void Invoice
            </button>
          )}
          {selectedInvoice.status === 'REVIEW_REQUIRED' && (
            <button
              onClick={() => handleAction('mark_ready')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-sm font-medium hover:bg-blue-600/30 flex items-center gap-2"
            >
              <ArrowRight size={16} /> Mark Ready to Post
            </button>
          )}
        </div>

        {/* Void Modal */}
        {showVoidModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="rounded-xl p-6 w-96" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="font-bold text-lg mb-3 text-red-400">Void Invoice</h3>
              <p className="text-sm text-gray-400 mb-4">This will reverse all stock changes. This action cannot be undone.</p>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Reason for voiding (required)..."
                className="w-full p-3 rounded-lg text-sm mb-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowVoidModal(false); setVoidReason('') }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)' }}
                >Cancel</button>
                <button
                  onClick={() => handleAction('void')}
                  disabled={actionLoading || voidReason.length < 3}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                >{actionLoading ? 'Voiding...' : 'Confirm Void'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Total Amount" value={`$${Number(selectedInvoice.totalAmount).toFixed(2)}`} icon={<DollarSign size={16} />} />
          <InfoCard label="Items" value={`${selectedInvoice.matchedItems}/${selectedInvoice.totalItems} matched`} icon={<Package size={16} />} />
          <InfoCard label="Due Date" value={selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'N/A'} icon={<Clock size={16} />} />
          <InfoCard label="Match Rate" value={selectedInvoice.matchRate ? `${Number(selectedInvoice.matchRate).toFixed(0)}%` : 'N/A'} icon={<CheckCircle size={16} />} />
        </div>

        {/* Line Items Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h3 className="font-semibold flex items-center gap-2"><FileText size={16} /> Line Items ({selectedInvoice.items?.length || 0})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="p-3">#</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Matched To</th>
                  <th className="p-3">UPC</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">UOM</th>
                  <th className="p-3">Units</th>
                  <th className="p-3">Unit Cost</th>
                  <th className="p-3">Extended</th>
                  <th className="p-3">GL Code</th>
                  <th className="p-3">Cost Δ</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.items || []).map(item => (
                  <tr key={item.id} className="border-t hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-gray-500">{item.lineNumber}</td>
                    <td className="p-3"><MatchBadge status={item.matchStatus} /></td>
                    <td className="p-3 max-w-[200px] truncate" title={item.productDesc}>{item.productDesc}</td>
                    <td className="p-3 text-xs">
                      {item.matchedProduct ? (
                        <span className="text-green-400">{item.matchedProduct.name}</span>
                      ) : item.autoCreatedProduct ? (
                        <span className="text-blue-400">NEW: {item.autoCreatedProduct.name}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs font-mono text-gray-400">{item.cleanUpc || item.caseUpc || '—'}</td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3 text-xs text-gray-400">{item.unitOfMeasure || '—'}</td>
                    <td className="p-3 font-medium">{item.baseUnitsReceived || '—'}</td>
                    <td className="p-3">${Number(item.perUnitCost || item.unitCost).toFixed(2)}</td>
                    <td className="p-3">${Number(item.extendedPrice).toFixed(2)}</td>
                    <td className="p-3 text-xs font-mono text-gray-400">{item.glCode || '—'}</td>
                    <td className="p-3">
                      {item.costChanged ? (
                        <span className="text-amber-400 text-xs font-medium">
                          ⚠️ {Number(item.costChangePct).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  /* ───────── LIST VIEW ───────── */

  return (
    <div className="p-6 space-y-6" style={{ background: '#0a0a0f', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold">Vendor Invoice Manager</h1>
          </div>
          <p className="text-sm text-gray-400 ml-8">Import, match, and post vendor invoices to inventory</p>
        </div>
        <button onClick={fetchInvoices} className="p-2 rounded-lg hover:bg-white/5" title="Refresh">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Cross-link to PO-based matching */}
      <Link
        href="/dashboard/inventory/invoice-match"
        className="flex items-center justify-between p-3 rounded-lg transition-colors"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <div className="flex items-center gap-2 text-sm text-indigo-300">
          <FileText size={14} />
          <span>Need to match a PO against a vendor invoice?</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-indigo-400">
          Invoice Match (PO) <ArrowRight size={12} />
        </div>
      </Link>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Needs Review" value={stats.REVIEW_REQUIRED?.count || 0} color="text-amber-400" bgColor="bg-amber-500/10" />
        <StatCard label="Ready to Post" value={stats.READY_TO_POST?.count || 0} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <StatCard label="Posted" value={stats.POSTED?.count || 0} color="text-green-400" bgColor="bg-green-500/10" />
        <StatCard label="Imported" value={stats.IMPORTED?.count || 0} color="text-blue-400" bgColor="bg-blue-500/10" />
        <StatCard label="Voided" value={stats.VOIDED?.count || 0} color="text-red-400" bgColor="bg-red-500/10" />
      </div>

      {/* FTP Auto-Fetch */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Server size={20} className="text-blue-400" />
            <div>
              <h3 className="font-semibold text-sm">Auto-Fetch from Vendor FTP</h3>
              <p className="text-xs text-gray-500">Connect to vendor FTP server and download new invoices automatically</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setFtpTesting(true); setFtpTestResult(null)
                try {
                  const res = await fetch('/api/invoices/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'test' })
                  })
                  setFtpTestResult(await res.json())
                } catch { setFtpTestResult({ success: false, message: 'Request failed' }) }
                finally { setFtpTesting(false) }
              }}
              disabled={ftpTesting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {ftpTesting ? <RefreshCw size={12} className="animate-spin" /> : <Wifi size={12} />}
              Test Connection
            </button>
            <button
              onClick={async () => {
                setFtpFetching(true); setFtpResult(null)
                try {
                  const res = await fetch('/api/invoices/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fetch' })
                  })
                  const data = await res.json()
                  setFtpResult(data)
                  if (data.success && data.invoicesCreated > 0) fetchInvoices()
                } catch { setFtpResult({ success: false, error: 'Fetch failed' }) }
                finally { setFtpFetching(false) }
              }}
              disabled={ftpFetching}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1.5"
            >
              {ftpFetching ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
              {ftpFetching ? 'Fetching...' : 'Fetch Now'}
            </button>
          </div>
        </div>
        {/* FTP Test Result */}
        {ftpTestResult && (
          <div className={`mt-2 p-2 rounded text-xs ${ftpTestResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {ftpTestResult.success ? <Wifi size={12} className="inline mr-1" /> : <WifiOff size={12} className="inline mr-1" />}
            {ftpTestResult.message}
          </div>
        )}
        {/* FTP Fetch Result */}
        {ftpResult && (
          <div className={`mt-2 p-3 rounded text-sm ${(ftpResult as { success?: boolean }).success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            {(ftpResult as { success?: boolean }).success ? (
              <div>
                <p className="text-green-400 font-medium">✅ {String((ftpResult as { message?: string }).message)}</p>
                <div className="mt-1 text-xs text-gray-400 flex gap-4">
                  <span>Files found: {String((ftpResult as { filesFound?: number }).filesFound || 0)}</span>
                  <span>Downloaded: {String((ftpResult as { filesDownloaded?: number }).filesDownloaded || 0)}</span>
                  <span>Skipped: {String((ftpResult as { filesSkipped?: number }).filesSkipped || 0)}</span>
                  <span>Invoices: {String((ftpResult as { invoicesCreated?: number }).invoicesCreated || 0)}</span>
                </div>
              </div>
            ) : (
              <p className="text-red-400">❌ {String((ftpResult as { error?: string }).error || (ftpResult as { message?: string }).message || 'Fetch failed')}</p>
            )}
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div
        className={`rounded-xl p-8 text-center transition-all cursor-pointer ${dragOver ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          background: dragOver ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${dragOver ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={32} className="animate-spin text-blue-400" />
            <p className="text-blue-400 font-medium">Processing invoice file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-gray-400" />
            <p className="text-gray-300 font-medium">Drop invoice CSV here or click to upload</p>
            <p className="text-xs text-gray-500">Fintech StandardAnalyticsDetailedDelimited format (max 10MB)</p>
          </div>
        )}
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`rounded-xl p-4 ${(uploadResult as { success?: boolean }).success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          {(uploadResult as { success?: boolean }).success ? (
            <div>
              <p className="text-green-400 font-medium mb-2">✅ Import successful</p>
              <p className="text-sm text-gray-300">
                {(uploadResult as { parsedRows?: number }).parsedRows} rows parsed →{' '}
                {(uploadResult as { invoiceCount?: number }).invoiceCount} invoices created
              </p>
              {(uploadResult as { invoices?: Array<Record<string, unknown>> }).invoices?.map((inv: Record<string, unknown>, i: number) => (
                <div key={i} className="mt-2 text-xs text-gray-400">
                  {String(inv.vendor)} #{String(inv.invoiceNumber)} — {String(inv.matchedItems)}/{String(inv.totalItems)} matched, {String(inv.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-400">❌ {String((uploadResult as { error?: string }).error || 'Import failed')}</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Filter size={14} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm outline-none text-gray-300"
          >
            <option value="">All Status</option>
            <option value="IMPORTED">Imported</option>
            <option value="REVIEW_REQUIRED">Needs Review</option>
            <option value="READY_TO_POST">Ready to Post</option>
            <option value="POSTED">Posted</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search vendor..."
            value={vendorFilter}
            onChange={e => setVendorFilter(e.target.value)}
            className="bg-transparent text-sm outline-none text-gray-300 w-40"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText size={32} className="mx-auto mb-3 opacity-50" />
            <p>No invoices yet. Upload a CSV to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="p-3">Status</th>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">Date</th>
                <th className="p-3">Due</th>
                <th className="p-3">Total</th>
                <th className="p-3">Items</th>
                <th className="p-3">Match Rate</th>
                <th className="p-3">Alerts</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr
                  key={inv.id}
                  className="border-t hover:bg-white/[0.02] cursor-pointer"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  onClick={() => fetchDetail(inv.id)}
                >
                  <td className="p-3"><StatusBadge status={inv.status} /></td>
                  <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="p-3 font-medium">{inv.vendorName}</td>
                  <td className="p-3 text-gray-400">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-400">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="p-3 font-medium">${Number(inv.totalAmount).toFixed(2)}</td>
                  <td className="p-3">
                    <span className="text-green-400">{inv.matchedItems}</span>
                    <span className="text-gray-500">/{inv.totalItems}</span>
                  </td>
                  <td className="p-3">
                    {inv.matchRate ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Number(inv.matchRate)}%`,
                              background: Number(inv.matchRate) > 80 ? '#22c55e' : Number(inv.matchRate) > 50 ? '#eab308' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{Number(inv.matchRate).toFixed(0)}%</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {inv.costAlertItems > 0 && (
                      <span className="text-amber-400 text-xs">⚠️ {inv.costAlertItems}</span>
                    )}
                    {!inv.discrepancyOk && (
                      <span className="text-red-400 text-xs ml-1">💰</span>
                    )}
                  </td>
                  <td className="p-3">
                    <ChevronRight size={16} className="text-gray-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ───────── Sub-components ───────── */

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function StatCard({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <div className={`rounded-xl p-4 ${bgColor}`} style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{icon} {label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  )
}

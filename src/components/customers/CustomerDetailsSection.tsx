'use client'

import { useState } from 'react'
import { Pencil, X, Save, Trash2, Loader2, User, Phone, Mail, Cake, Heart, MessageSquare, Shield } from 'lucide-react'
import type { CustomerProfile } from '@/types/customer'

interface Props {
  profile: CustomerProfile
  onSave: (data: Partial<{ firstName: string; lastName: string; phone: string; email: string; birthday: string; notes: string; marketingConsent: boolean }>) => Promise<boolean>
  onDelete: () => void
  isEditMode: boolean
  setIsEditMode: (v: boolean) => void
}

export default function CustomerDetailsSection({ profile, onSave, onDelete, isEditMode, setIsEditMode }: Props) {
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    email: profile.email || '',
    birthday: profile.birthday || '',
    marketingConsent: profile.marketingConsent ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const success = await onSave(form)
    setSaving(false)
    if (success) setIsEditMode(false)
  }

  const handleCancel = () => {
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email || '',
      birthday: profile.birthday || '',
      marketingConsent: profile.marketingConsent ?? false,
    })
    setIsEditMode(false)
  }

  const inputClass = "w-full bg-[var(--surface2)] border border-[var(--border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--theme-accent)]/30 focus:border-[var(--theme-accent)]/40 outline-none transition-all"
  const labelClass = "text-xs font-medium text-[var(--text-muted)] mb-1 flex items-center gap-1.5"

  return (
    <div className="p-4 space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Personal Information
        </h3>
        {isEditMode ? (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--theme-accent)] text-black hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-4">
        {/* Name Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}><User className="w-3 h-3" /> First Name</label>
            {isEditMode ? (
              <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className={inputClass} placeholder="First name" />
            ) : (
              <p className="text-sm text-[var(--text-primary)] py-1">{profile.firstName || '—'}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            {isEditMode ? (
              <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={inputClass} placeholder="Last name" />
            ) : (
              <p className="text-sm text-[var(--text-primary)] py-1">{profile.lastName || '—'}</p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className={labelClass}><Phone className="w-3 h-3" /> Phone</label>
          {isEditMode ? (
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="(555) 123-4567" />
          ) : (
            <p className="text-sm text-[var(--text-primary)] py-1">{profile.phone || '—'}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className={labelClass}><Mail className="w-3 h-3" /> Email</label>
          {isEditMode ? (
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="email@example.com" />
          ) : (
            <p className="text-sm text-[var(--text-primary)] py-1">{profile.email || '—'}</p>
          )}
        </div>

        {/* Birthday */}
        <div>
          <label className={labelClass}><Cake className="w-3 h-3" /> Birthday</label>
          {isEditMode ? (
            <input type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} className={inputClass} />
          ) : (
            <p className="text-sm text-[var(--text-primary)] py-1">
              {profile.birthday ? new Date(profile.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
            </p>
          )}
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Preferences</h3>

        <div className="flex items-center justify-between py-1">
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Heart className="w-3.5 h-3.5 text-pink-400" /> Loyalty Enrolled
          </span>
          <span className={`text-xs font-semibold ${profile.loyaltyMember ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
            {profile.loyaltyMember ? '✅ Yes' : '❌ No'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Marketing Consent
          </span>
          {isEditMode ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={e => setForm({ ...form, marketingConsent: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[var(--surface2)] peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 transition-colors">
                <div className={`absolute top-0.5 ${form.marketingConsent ? 'translate-x-4' : 'translate-x-0.5'} h-4 w-4 rounded-full bg-white transition-transform`} />
              </div>
            </label>
          ) : (
            <span className={`text-xs font-semibold ${profile.marketingConsent ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {profile.marketingConsent ? '✅ SMS + Email' : '—'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Member Since
          </span>
          <span className="text-xs text-[var(--text-secondary)]">{profile.memberSince}</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Danger Zone</h3>
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              Are you sure you want to delete <span className="font-semibold">{profile.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface2)]">
                Cancel
              </button>
              <button onClick={onDelete} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Customer
          </button>
        )}
      </div>
    </div>
  )
}

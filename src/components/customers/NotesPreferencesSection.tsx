'use client'

import { useState } from 'react'
import { AlertTriangle, Scissors, StickyNote, Plus, Clock, Coffee, FlaskConical, User } from 'lucide-react'
import type { CustomerPreferences, CustomerNote } from '@/types/customer'

interface Props {
  preferences: CustomerPreferences
  onAddNote?: (text: string, type: 'note' | 'caution' | 'preference') => void
}

export default function NotesPreferencesSection({ preferences, onAddNote }: Props) {
  const [newNote, setNewNote] = useState('')
  const [newNoteType, setNewNoteType] = useState<'note' | 'caution' | 'preference'>('note')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleSubmit = () => {
    if (!newNote.trim() || !onAddNote) return
    onAddNote(newNote.trim(), newNoteType)
    setNewNote('')
    setShowAddForm(false)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Preferred Stylist */}
      {preferences.preferredStylist && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" />
            Preferred Stylist
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--theme-accent)]/10 flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--theme-accent)]" />
            </div>
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {preferences.preferredStylist.name}
              </span>
              {preferences.preferredStylist.title && (
                <span className="text-xs text-[var(--text-muted)] ml-1">· {preferences.preferredStylist.title}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Caution / Sensitivity Notes */}
      {preferences.cautionNotes.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Caution / Sensitivity
          </h4>
          <div className="space-y-1.5">
            {preferences.cautionNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-300">
                <span className="text-red-400 mt-0.5">⚠️</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Preferences */}
      {preferences.servicePreferences.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5" />
            Service Preferences
          </h4>
          <div className="space-y-1.5">
            {preferences.servicePreferences.map((pref, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)] mt-0.5">☕</span>
                <span>{pref}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula Vault */}
      {preferences.formulaVault && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-2 flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />
            Formula
          </h4>
          <p className="text-sm text-violet-200 font-mono">{preferences.formulaVault}</p>
        </div>
      )}

      {/* Preferred Time */}
      {preferences.preferredTimeSlots && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Preferred Time
          </h4>
          <span className="text-sm text-[var(--text-secondary)]">{preferences.preferredTimeSlots}</span>
        </div>
      )}

      {/* Staff Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5" />
            Staff Notes
          </h4>
          {onAddNote && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/10 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Note
            </button>
          )}
        </div>

        {/* Add Note Form */}
        {showAddForm && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mb-3 space-y-2">
            <div className="flex gap-1.5">
              {(['note', 'caution', 'preference'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setNewNoteType(type)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize transition-colors ${
                    newNoteType === type
                      ? type === 'caution'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30'
                      : 'bg-[var(--surface2)] text-[var(--text-muted)] border border-[var(--border)]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={newNoteType === 'caution' ? 'e.g. Scalp sensitivity — avoid ammonia' : 'Add a note...'}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 outline-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newNote.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--theme-accent)] text-black disabled:opacity-40"
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Existing Notes */}
        {preferences.staffNotes.length > 0 ? (
          <div className="space-y-2">
            {preferences.staffNotes.map((note) => (
              <div key={note.id} className={`
                px-3 py-2.5 rounded-xl border text-sm
                ${note.type === 'caution'
                  ? 'bg-red-500/5 border-red-500/20 text-red-300'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'
                }
              `}>
                <span>{note.type === 'caution' ? '⚠️ ' : '📝 '}</span>
                {note.text}
                <div className="text-[10px] text-[var(--text-muted)] mt-1">
                  {note.createdBy} · {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : !showAddForm && (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">No staff notes yet</p>
        )}
      </div>
    </div>
  )
}

'use client'

import { Star, Gift, Heart, Sparkles, Award, Loader2 } from 'lucide-react'
import type { LoyaltyData } from '@/types/customer'

interface Props {
  loyalty: LoyaltyData
  customerName: string
  onEnroll: () => void
  onRedeem?: () => void
}

export default function LoyaltySection({ loyalty, customerName, onEnroll, onRedeem }: Props) {
  const progressPercent = loyalty.threshold > 0 ? Math.min(100, (loyalty.progress / loyalty.threshold) * 100) : 0
  const nearThreshold = progressPercent > 80

  if (!loyalty.enrolled) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
          <Heart className="w-8 h-8 text-pink-400" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Not Enrolled</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {customerName} is not yet enrolled in the loyalty program
        </p>
        <button
          onClick={onEnroll}
          className="px-6 py-3 rounded-xl text-sm font-semibold bg-pink-600 text-white hover:bg-pink-500 transition-all shadow-lg shadow-pink-600/20"
        >
          <Heart className="w-4 h-4 inline mr-2" />
          Enroll in Loyalty Program
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Reward Progress Card */}
      <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface2)]/50 border border-[var(--border)] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--theme-accent)]" />
            Rewards Program
          </h3>
          <span className="text-xs font-bold text-[var(--theme-accent)]">
            {loyalty.points.toLocaleString()} pts
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className={`h-3 rounded-full bg-[var(--surface2)] overflow-hidden ${nearThreshold ? 'shadow-[0_0_12px_var(--theme-accent-muted)]' : ''}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent-dark)] to-[var(--theme-accent)] transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>{loyalty.progress} / {loyalty.threshold} pts</span>
            <span>{loyalty.threshold - loyalty.progress} pts to next reward</span>
          </div>
        </div>

        {/* Next reward info */}
        {loyalty.nextRewardName && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)]/50 rounded-lg border border-[var(--border)]">
            <Gift className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">
              Next Reward: <span className="font-semibold text-[var(--text-primary)]">{loyalty.nextRewardName}</span>
              {loyalty.nextRewardValue && ` ($${loyalty.nextRewardValue.toFixed(2)})`}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {loyalty.rewardAvailable && onRedeem && (
            <button
              onClick={onRedeem}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--theme-accent)] text-black hover:brightness-110 transition-all"
            >
              <Award className="w-3.5 h-3.5" />
              Redeem Points
            </button>
          )}
        </div>
      </div>

      {/* Active Programs */}
      {loyalty.programs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" />
            Active Programs
          </h3>
          <div className="space-y-2">
            {loyalty.programs.map(prog => (
              <div key={prog.programId} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{prog.programName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    {prog.progress} / {prog.threshold} {prog.customerLabel || 'visits'}
                  </span>
                  {prog.rewardAvailableNow && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide font-black bg-emerald-500 text-black">
                      Reward Ready
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewards History */}
      {loyalty.history.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Rewards History
          </h3>
          <div className="space-y-1">
            {loyalty.history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-[var(--surface)] rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">
                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {entry.type === 'earned' ? '📈' : '🎁'} {entry.description}
                  </span>
                </div>
                <span className={`font-semibold ${entry.type === 'earned' ? 'text-emerald-400' : 'text-[var(--theme-accent)]'}`}>
                  {entry.type === 'earned' ? '+' : '-'}{entry.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

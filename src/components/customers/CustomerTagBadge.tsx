'use client'

import { Crown, Sparkles, Zap, AlertTriangle, Pause, TrendingDown, Cake, Gift, UserPlus } from 'lucide-react'
import type { CustomerTag } from '@/types/customer'

const TAG_CONFIG: Record<CustomerTag, { bg: string; text: string; border: string; icon: any; label: string }> = {
  'VIP':           { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Crown, label: 'VIP' },
  'New':           { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: UserPlus, label: 'New' },
  'Walk-In':       { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/30', icon: Zap, label: 'Walk-In' },
  'High Spender':  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Sparkles, label: 'Top $' },
  'Inactive':      { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: Pause, label: 'Inactive' },
  'No-Show Risk':  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', icon: AlertTriangle, label: 'No-Show' },
  'At-Risk':       { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', icon: TrendingDown, label: 'At-Risk' },
  'Birthday':      { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30', icon: Cake, label: '🎂' },
  'Reward Ready':  { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', icon: Gift, label: 'Reward' },
}

export default function CustomerTagBadge({ tag }: { tag: CustomerTag }) {
  const config = TAG_CONFIG[tag]
  if (!config) return null
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  )
}

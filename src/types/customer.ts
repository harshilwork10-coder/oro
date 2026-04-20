// ============================================================
// Customer Command Center — TypeScript interfaces
// ============================================================

export type CustomerTag =
  | 'VIP'
  | 'New'
  | 'Walk-In'
  | 'High Spender'
  | 'Inactive'
  | 'No-Show Risk'
  | 'At-Risk'
  | 'Birthday'
  | 'Reward Ready'

export interface SmartCustomerRow {
  // Identity
  id: string
  name: string
  firstName: string
  lastName: string
  initials: string
  avatarUrl?: string

  // Contact
  phone: string
  email?: string

  // Engagement metrics
  loyaltyPoints: number
  totalVisits: number
  lastVisitDate: string | null
  lastVisitRelative: string
  lifetimeSpend: number
  averageTicket: number

  // Service intelligence
  lastServiceName: string
  favoriteServiceName?: string
  preferredStylist?: string

  // Tags
  tags: CustomerTag[]

  // Quick flags
  hasRewardReady: boolean
  isCheckedIn: boolean
  loyaltyMember: boolean
}

export interface VisitService {
  id: string
  name: string
  price: number
  duration?: number
  type: 'SERVICE' | 'PRODUCT'
}

export interface CustomerVisit {
  id: string
  date: string
  dateRelative: string
  stylist: string
  services: VisitService[]
  total: number
  paymentMethod: string
  notes?: string
}

export interface TopRepeatedService {
  serviceId: string
  serviceName: string
  repeatCount: number
  lastPrice: number
}

export interface QuickRepeatData {
  lastVisit: CustomerVisit | null
  topRepeatedServices: TopRepeatedService[]
  recommendation?: {
    serviceName: string
    averageIntervalDays: number
    expectedNextDate: string
  }
}

export interface LoyaltyData {
  enrolled: boolean
  points: number
  progress: number
  threshold: number
  nextRewardName?: string
  nextRewardValue?: number
  rewardAvailable: boolean
  programs: {
    programId: string
    programName: string
    progress: number
    threshold: number
    rewardAvailableNow: boolean
    customerLabel?: string
  }[]
  history: {
    date: string
    type: 'earned' | 'redeemed'
    description: string
    points: number
  }[]
}

export interface CustomerNote {
  id: string
  text: string
  createdBy: string
  createdAt: string
  type: 'note' | 'caution' | 'preference'
}

export interface CustomerPreferences {
  preferredStylist?: { id: string; name: string; title?: string }
  cautionNotes: string[]
  servicePreferences: string[]
  formulaVault?: string
  preferredTimeSlots?: string
  productPreferences?: string
  staffNotes: CustomerNote[]
}

export interface CustomerProfile {
  // Core identity
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  email?: string
  birthday?: string
  memberSince: string

  // Metrics
  loyaltyPoints: number
  totalVisits: number
  lifetimeSpend: number
  averageTicket: number
  lastVisitDate: string | null
  lastVisitRelative: string

  // Intelligence
  preferredStylist?: string
  tags: CustomerTag[]
  loyaltyMember: boolean
  hasRewardReady: boolean
  marketingConsent?: boolean

  // Nested data
  quickRepeat: QuickRepeatData
  loyalty: LoyaltyData
  preferences: CustomerPreferences
}

export type ProfileTab = 'quick-repeat' | 'history' | 'loyalty' | 'notes' | 'details'

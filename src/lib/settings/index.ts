/**
 * Settings Module — Barrel Export
 *
 * Central access point for all settings-related utilities:
 *   - Brand lock enforcement (write path)
 *   - Effective settings resolution (read path)
 */

export { enforceBrandLocks, stripLockedFields, getBrandLockState, FIELD_LOCK_MAP } from './brandLocks'
export type { BrandLockState, LockEnforcementResult, BrandLockName } from './brandLocks'

export { getEffectiveSettings } from './getEffectiveSettings'
export type { EffectiveSettings } from './getEffectiveSettings'

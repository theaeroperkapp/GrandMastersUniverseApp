// App Constants
export const APP_NAME = 'GrandMastersUniverse'
export const APP_DESCRIPTION = 'Martial Arts School Management Platform'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Subscription
export const MONTHLY_SUBSCRIPTION_PRICE = 9900 // $99.00 in cents
export const TRIAL_DAYS = 30
export const GRACE_PERIOD_DAYS = 3

// Limits
export const DEFAULT_MONTHLY_POST_LIMIT = 4
export const DEFAULT_ANNOUNCEMENT_LIMIT = 20
export const ANNOUNCEMENT_ARCHIVE_MONTHS = 6
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_ATTACHMENT_SIZE_MB = 10

// Staff Limits per School
export const STAFF_LIMITS = {
  community_manager: 3,
  billing_coordinator: 3,
}

// Minor Age Threshold
export const MINOR_AGE_THRESHOLD = 16

// Default Belt Ranks (Traditional Karate/TKD)
export const DEFAULT_BELT_RANKS = [
  { name: 'White Belt', color: '#FFFFFF', display_order: 1 },
  { name: 'Yellow Belt', color: '#FFD700', display_order: 2 },
  { name: 'Orange Belt', color: '#FFA500', display_order: 3 },
  { name: 'Green Belt', color: '#228B22', display_order: 4 },
  { name: 'Blue Belt', color: '#0000FF', display_order: 5 },
  { name: 'Purple Belt', color: '#800080', display_order: 6 },
  { name: 'Brown Belt', color: '#8B4513', display_order: 7 },
  { name: 'Red Belt', color: '#FF0000', display_order: 8 },
  { name: 'Black Belt 1st Dan', color: '#000000', display_order: 9 },
  { name: 'Black Belt 2nd Dan', color: '#000000', display_order: 10 },
  { name: 'Black Belt 3rd Dan', color: '#000000', display_order: 11 },
  { name: 'Black Belt 4th Dan', color: '#000000', display_order: 12 },
  { name: 'Black Belt 5th Dan', color: '#000000', display_order: 13 },
]

// Event Types
export const EVENT_TYPES = [
  { value: 'seminar', label: 'Seminar' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'belt_testing', label: 'Belt Testing' },
  { value: 'social', label: 'Social Event' },
  { value: 'other', label: 'Other' },
]

// Announcement Categories
export const ANNOUNCEMENT_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'schedule', label: 'Schedule Change' },
  { value: 'event', label: 'Event' },
  { value: 'safety', label: 'Safety' },
  { value: 'billing', label: 'Billing' },
]

// Announcement Priorities
export const ANNOUNCEMENT_PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
]

// Days of Week
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

// Billing Periods
export const BILLING_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

// Check-in Methods
export const CHECK_IN_METHODS = [
  { value: 'qr', label: 'QR Code' },
  { value: 'pin', label: 'PIN Code' },
  { value: 'manual', label: 'Manual' },
]

// Family Relationships
export const FAMILY_RELATIONSHIPS = [
  { value: 'primary', label: 'Primary Account Holder' },
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
]

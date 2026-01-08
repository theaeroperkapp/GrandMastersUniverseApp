// Input validation utilities

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/

interface ValidationError {
  field: string
  message: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Sanitize string input
export function sanitizeString(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim()
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid)
}

// Validate time format (HH:MM or HH:MM:SS)
export function isValidTime(time: string): boolean {
  return TIME_REGEX.test(time)
}

// Validate string length
export function isValidLength(value: string, min: number, max: number): boolean {
  const length = value.length
  return length >= min && length <= max
}

// Validate number range
export function isValidRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

// Validate day of week (0-6)
export function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6
}

// Class validation
export interface ClassInput {
  school_id: string
  name: string
  description?: string | null
  day_of_week: number
  start_time: string
  end_time: string
  instructor_id?: string | null
  max_capacity?: number | null
  location?: string | null
}

export function validateClassInput(input: ClassInput): ValidationResult {
  const errors: ValidationError[] = []

  // Required fields
  if (!input.school_id || !isValidUUID(input.school_id)) {
    errors.push({ field: 'school_id', message: 'Invalid school ID' })
  }

  if (!input.name || !isValidLength(input.name, 2, 100)) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' })
  }

  if (input.description && !isValidLength(input.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must be under 500 characters' })
  }

  if (!isValidDayOfWeek(input.day_of_week)) {
    errors.push({ field: 'day_of_week', message: 'Day of week must be 0-6' })
  }

  if (!input.start_time || !isValidTime(input.start_time)) {
    errors.push({ field: 'start_time', message: 'Invalid start time format' })
  }

  if (!input.end_time || !isValidTime(input.end_time)) {
    errors.push({ field: 'end_time', message: 'Invalid end time format' })
  }

  if (input.instructor_id && !isValidUUID(input.instructor_id)) {
    errors.push({ field: 'instructor_id', message: 'Invalid instructor ID' })
  }

  if (input.max_capacity !== null && input.max_capacity !== undefined) {
    if (!Number.isInteger(input.max_capacity) || input.max_capacity < 1 || input.max_capacity > 1000) {
      errors.push({ field: 'max_capacity', message: 'Max capacity must be between 1 and 1000' })
    }
  }

  if (input.location && !isValidLength(input.location, 0, 200)) {
    errors.push({ field: 'location', message: 'Location must be under 200 characters' })
  }

  return { isValid: errors.length === 0, errors }
}

// Event validation
export interface EventInput {
  school_id: string
  title: string
  description?: string | null
  event_type: string
  start_date: string
  end_date?: string | null
  location?: string | null
  fee?: number | null
  max_capacity?: number | null
  registration_deadline?: string | null
  is_published?: boolean
}

const VALID_EVENT_TYPES = ['seminar', 'tournament', 'belt_testing', 'social', 'other']

export function validateEventInput(input: EventInput): ValidationResult {
  const errors: ValidationError[] = []

  if (!input.school_id || !isValidUUID(input.school_id)) {
    errors.push({ field: 'school_id', message: 'Invalid school ID' })
  }

  if (!input.title || !isValidLength(input.title, 2, 200)) {
    errors.push({ field: 'title', message: 'Title must be between 2 and 200 characters' })
  }

  if (input.description && !isValidLength(input.description, 0, 2000)) {
    errors.push({ field: 'description', message: 'Description must be under 2000 characters' })
  }

  if (!input.event_type || !VALID_EVENT_TYPES.includes(input.event_type)) {
    errors.push({ field: 'event_type', message: `Event type must be one of: ${VALID_EVENT_TYPES.join(', ')}` })
  }

  if (!input.start_date) {
    errors.push({ field: 'start_date', message: 'Start date is required' })
  }

  if (input.location && !isValidLength(input.location, 0, 300)) {
    errors.push({ field: 'location', message: 'Location must be under 300 characters' })
  }

  if (input.fee !== null && input.fee !== undefined) {
    if (typeof input.fee !== 'number' || input.fee < 0 || input.fee > 1000000) {
      errors.push({ field: 'fee', message: 'Fee must be between 0 and 1000000 cents' })
    }
  }

  if (input.max_capacity !== null && input.max_capacity !== undefined) {
    if (!Number.isInteger(input.max_capacity) || input.max_capacity < 1 || input.max_capacity > 10000) {
      errors.push({ field: 'max_capacity', message: 'Max capacity must be between 1 and 10000' })
    }
  }

  return { isValid: errors.length === 0, errors }
}

// Post validation
export interface PostInput {
  content: string
  school_id: string
}

export function validatePostInput(input: PostInput): ValidationResult {
  const errors: ValidationError[] = []

  if (!input.school_id || !isValidUUID(input.school_id)) {
    errors.push({ field: 'school_id', message: 'Invalid school ID' })
  }

  if (!input.content || !isValidLength(input.content, 1, 5000)) {
    errors.push({ field: 'content', message: 'Content must be between 1 and 5000 characters' })
  }

  return { isValid: errors.length === 0, errors }
}

// Helper to format validation errors for API response
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => `${e.field}: ${e.message}`).join('; ')
}

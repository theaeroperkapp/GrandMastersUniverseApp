// Type helpers for Supabase responses
export interface ProfileWithRole {
  id: string
  role: string
  school_id: string | null
  sub_roles?: string[]
}

export interface SchoolData {
  id: string
  name: string
  subdomain: string
  subscription_status: string
  trial_ends_at: string | null
  owner?: { full_name: string; email: string }
}

export interface PaymentData {
  amount: number
  status: string
}

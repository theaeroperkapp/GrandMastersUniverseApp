export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'owner' | 'parent' | 'student'
export type SubRole = 'community_manager' | 'billing_coordinator'
export type AccountType = 'adult' | 'minor'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: UserRole
          sub_roles: SubRole[]
          account_type: AccountType
          school_id: string | null
          family_id: string | null
          is_approved: boolean
          is_student: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: UserRole
          sub_roles?: SubRole[]
          account_type?: AccountType
          school_id?: string | null
          family_id?: string | null
          is_approved?: boolean
          is_student?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: UserRole
          sub_roles?: SubRole[]
          account_type?: AccountType
          school_id?: string | null
          family_id?: string | null
          is_approved?: boolean
          is_student?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          subdomain: string
          logo_url: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          phone: string | null
          email: string | null
          website: string | null
          owner_id: string
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'grace_period'
          subscription_plan: string | null
          trial_ends_at: string | null
          subscription_ends_at: string | null
          current_period_end: string | null
          monthly_post_limit: number
          announcement_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          logo_url?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          owner_id: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled' | 'grace_period'
          subscription_plan?: string | null
          trial_ends_at?: string | null
          subscription_ends_at?: string | null
          current_period_end?: string | null
          monthly_post_limit?: number
          announcement_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          logo_url?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          owner_id?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled' | 'grace_period'
          subscription_plan?: string | null
          trial_ends_at?: string | null
          subscription_ends_at?: string | null
          current_period_end?: string | null
          monthly_post_limit?: number
          announcement_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      families: {
        Row: {
          id: string
          school_id: string
          primary_holder_id: string
          name: string
          billing_email: string | null
          billing_address: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          primary_holder_id: string
          name: string
          billing_email?: string | null
          billing_address?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          primary_holder_id?: string
          name?: string
          billing_email?: string | null
          billing_address?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          profile_id: string
          relationship: 'primary' | 'spouse' | 'child' | 'other'
          is_student: boolean
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          profile_id: string
          relationship: 'primary' | 'spouse' | 'child' | 'other'
          is_student?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          profile_id?: string
          relationship?: 'primary' | 'spouse' | 'child' | 'other'
          is_student?: boolean
          created_at?: string
        }
      }
      student_profiles: {
        Row: {
          id: string
          profile_id: string
          school_id: string
          belt_rank_id: string | null
          enrollment_date: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_notes: string | null
          pin_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          school_id: string
          belt_rank_id?: string | null
          enrollment_date?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_notes?: string | null
          pin_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          school_id?: string
          belt_rank_id?: string | null
          enrollment_date?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_notes?: string | null
          pin_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      belt_ranks: {
        Row: {
          id: string
          school_id: string | null
          name: string
          color: string
          display_order: number
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          school_id?: string | null
          name: string
          color: string
          display_order: number
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string | null
          name?: string
          color?: string
          display_order?: number
          is_default?: boolean
          created_at?: string
        }
      }
      rank_history: {
        Row: {
          id: string
          student_profile_id: string
          belt_rank_id: string
          promoted_at: string
          promoted_by: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          student_profile_id: string
          belt_rank_id: string
          promoted_at?: string
          promoted_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          student_profile_id?: string
          belt_rank_id?: string
          promoted_at?: string
          promoted_by?: string | null
          notes?: string | null
        }
      }
      class_schedules: {
        Row: {
          id: string
          school_id: string
          name: string
          description: string | null
          day_of_week: number
          start_time: string
          end_time: string
          instructor_id: string | null
          max_capacity: number | null
          location: string | null
          belt_requirement_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          description?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          instructor_id?: string | null
          max_capacity?: number | null
          location?: string | null
          belt_requirement_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          description?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          instructor_id?: string | null
          max_capacity?: number | null
          location?: string | null
          belt_requirement_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      class_sessions: {
        Row: {
          id: string
          class_schedule_id: string
          date: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_schedule_id: string
          date: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          class_schedule_id?: string
          date?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
      }
      class_enrollments: {
        Row: {
          id: string
          class_schedule_id: string
          student_profile_id: string
          enrolled_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          class_schedule_id: string
          student_profile_id: string
          enrolled_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          class_schedule_id?: string
          student_profile_id?: string
          enrolled_at?: string
          is_active?: boolean
        }
      }
      attendance_records: {
        Row: {
          id: string
          class_session_id: string
          student_profile_id: string
          check_in_time: string
          check_in_method: 'qr' | 'pin' | 'manual'
          checked_in_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_session_id: string
          student_profile_id: string
          check_in_time?: string
          check_in_method: 'qr' | 'pin' | 'manual'
          checked_in_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          class_session_id?: string
          student_profile_id?: string
          check_in_time?: string
          check_in_method?: 'qr' | 'pin' | 'manual'
          checked_in_by?: string | null
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          school_id: string
          title: string
          description: string | null
          event_type: 'seminar' | 'tournament' | 'belt_testing' | 'social' | 'other'
          start_date: string
          end_date: string | null
          location: string | null
          max_capacity: number | null
          fee: number | null
          registration_deadline: string | null
          is_published: boolean
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          title: string
          description?: string | null
          event_type: 'seminar' | 'tournament' | 'belt_testing' | 'social' | 'other'
          start_date: string
          end_date?: string | null
          location?: string | null
          max_capacity?: number | null
          fee?: number | null
          registration_deadline?: string | null
          is_published?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          title?: string
          description?: string | null
          event_type?: 'seminar' | 'tournament' | 'belt_testing' | 'social' | 'other'
          start_date?: string
          end_date?: string | null
          location?: string | null
          max_capacity?: number | null
          fee?: number | null
          registration_deadline?: string | null
          is_published?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          student_profile_id: string
          family_id: string | null
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_intent_id: string | null
          registered_at: string
        }
        Insert: {
          id?: string
          event_id: string
          student_profile_id: string
          family_id?: string | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_intent_id?: string | null
          registered_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          student_profile_id?: string
          family_id?: string | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_intent_id?: string | null
          registered_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          school_id: string
          name: string
          content: string
          is_required: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          content: string
          is_required?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          content?: string
          is_required?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      signed_contracts: {
        Row: {
          id: string
          contract_id: string
          family_id: string
          signed_by: string
          signature_data: string
          signed_at: string
          ip_address: string | null
        }
        Insert: {
          id?: string
          contract_id: string
          family_id: string
          signed_by: string
          signature_data: string
          signed_at?: string
          ip_address?: string | null
        }
        Update: {
          id?: string
          contract_id?: string
          family_id?: string
          signed_by?: string
          signature_data?: string
          signed_at?: string
          ip_address?: string | null
        }
      }
      memberships: {
        Row: {
          id: string
          school_id: string
          name: string
          description: string | null
          price: number
          billing_period: 'monthly' | 'quarterly' | 'annually'
          family_discount_percent: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          description?: string | null
          price: number
          billing_period: 'monthly' | 'quarterly' | 'annually'
          family_discount_percent?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          description?: string | null
          price?: number
          billing_period?: 'monthly' | 'quarterly' | 'annually'
          family_discount_percent?: number
          is_active?: boolean
          created_at?: string
        }
      }
      family_memberships: {
        Row: {
          id: string
          family_id: string
          membership_id: string
          status: 'active' | 'paused' | 'cancelled'
          current_period_start: string | null
          current_period_end: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          membership_id: string
          status?: 'active' | 'paused' | 'cancelled'
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          membership_id?: string
          status?: 'active' | 'paused' | 'cancelled'
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      custom_charges: {
        Row: {
          id: string
          school_id: string
          family_id: string
          description: string
          amount: number
          due_date: string | null
          status: 'pending' | 'paid' | 'cancelled'
          payment_intent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          family_id: string
          description: string
          amount: number
          due_date?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          payment_intent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          family_id?: string
          description?: string
          amount?: number
          due_date?: string | null
          status?: 'pending' | 'paid' | 'cancelled'
          payment_intent_id?: string | null
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          school_id: string
          author_id: string
          content: string
          image_url: string | null
          is_announcement: boolean
          share_to_facebook: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          author_id: string
          content: string
          image_url?: string | null
          is_announcement?: boolean
          share_to_facebook?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          author_id?: string
          content?: string
          image_url?: string | null
          is_announcement?: boolean
          share_to_facebook?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      post_counts: {
        Row: {
          id: string
          profile_id: string
          school_id: string
          year_month: string
          count: number
        }
        Insert: {
          id?: string
          profile_id: string
          school_id: string
          year_month: string
          count?: number
        }
        Update: {
          id?: string
          profile_id?: string
          school_id?: string
          year_month?: string
          count?: number
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          post_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          profile_id?: string
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          school_id: string
          author_id: string
          title: string
          content: string
          category: 'general' | 'schedule' | 'event' | 'safety' | 'billing'
          priority: 'normal' | 'important' | 'urgent'
          is_published: boolean
          scheduled_for: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          author_id: string
          title: string
          content: string
          category?: 'general' | 'schedule' | 'event' | 'safety' | 'billing'
          priority?: 'normal' | 'important' | 'urgent'
          is_published?: boolean
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          author_id?: string
          title?: string
          content?: string
          category?: 'general' | 'schedule' | 'event' | 'safety' | 'billing'
          priority?: 'normal' | 'important' | 'urgent'
          is_published?: boolean
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      announcement_reads: {
        Row: {
          id: string
          announcement_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          id?: string
          announcement_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          id?: string
          announcement_id?: string
          profile_id?: string
          read_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          participant_one: string
          participant_two: string
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_one: string
          participant_two: string
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_one?: string
          participant_two?: string
          last_message_at?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          type: 'comment' | 'like' | 'mention' | 'message' | 'announcement' | 'approval' | 'promotion' | 'event'
          title: string
          content: string
          related_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type?: 'comment' | 'like' | 'mention' | 'message' | 'announcement' | 'approval' | 'promotion' | 'event'
          title: string
          content: string
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          type?: 'comment' | 'like' | 'mention' | 'message' | 'announcement' | 'approval' | 'promotion' | 'event'
          title?: string
          content?: string
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          message: string
          submission_type: 'general' | 'demo' | 'support'
          status: 'new' | 'contacted' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          message: string
          submission_type?: 'general' | 'demo' | 'support'
          status?: 'new' | 'contacted' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          message?: string
          submission_type?: 'general' | 'demo' | 'support'
          status?: 'new' | 'contacted' | 'resolved'
          created_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          name: string
          email: string
          school_name: string
          phone: string | null
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          school_name: string
          phone?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          school_name?: string
          phone?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
      }
      platform_payments: {
        Row: {
          id: string
          school_id: string
          amount: number
          status: 'pending' | 'succeeded' | 'failed' | 'refunded'
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          amount: number
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          amount?: number
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          description?: string | null
          created_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          profile_id: string
          login_at: string
          logout_at: string | null
          ip_address: string | null
          user_agent: string | null
          device_type: string | null
          city: string | null
          country: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          login_at?: string
          logout_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          city?: string | null
          country?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          login_at?: string
          logout_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          city?: string | null
          country?: string | null
        }
      }
      visitor_sessions: {
        Row: {
          id: string
          visitor_id: string
          landing_page: string
          exit_page: string | null
          referrer: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          device_type: string | null
          browser: string | null
          country: string | null
          city: string | null
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          visitor_id: string
          landing_page: string
          exit_page?: string | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          device_type?: string | null
          browser?: string | null
          country?: string | null
          city?: string | null
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          visitor_id?: string
          landing_page?: string
          exit_page?: string | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          device_type?: string | null
          browser?: string | null
          country?: string | null
          city?: string | null
          started_at?: string
          ended_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

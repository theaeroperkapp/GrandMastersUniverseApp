# Claude Context - GrandMasters Universe App

This file provides context for Claude to quickly understand the project. Read this at the start of any new session.

## Project Overview

**GrandMasters Universe (GMU)** is a SaaS platform for martial arts schools to manage their operations. It's a multi-tenant application where each school has their own subdomain and data.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **UI Components:** Custom components in `/src/components/ui/`
- **Payments:** Stripe
- **Email:** Resend

## Key Directories

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, signup, etc.)
│   ├── (dashboard)/      # Protected pages for logged-in users
│   │   ├── admin/        # Platform admin pages
│   │   ├── owner/        # School owner management pages
│   │   └── [other]/      # Student/parent pages
│   └── api/              # API routes
├── components/
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components (navbar, etc.)
│   └── owner/            # Owner-specific components
├── lib/
│   ├── supabase/         # Supabase clients (server, client, admin)
│   └── utils.ts          # Utility functions
└── types/
    └── database.ts       # TypeScript types for database
```

## Database Schema (Key Tables)

### profiles
- `id` (uuid) - Links to auth.users
- `full_name`, `email`, `avatar_url`
- `role` ('admin' | 'owner' | 'parent' | 'student')
- `school_id` (uuid) - FK to schools
- `family_id` (uuid) - FK to families
- `is_approved` (boolean)

### schools
- `id`, `name`, `subdomain`
- `owner_id` (uuid)
- Stripe fields, subscription info

### families
- `id`, `name`, `billing_email`
- `school_id`, `primary_holder_id`

### student_profiles
- `id`, `profile_id` (FK to profiles)
- `school_id`, `current_belt_id`
- `enrollment_date`

### belt_ranks
- `id`, `name`, `color`, `display_order`
- `school_id` (null for defaults)
- `is_default` (boolean)

### class_schedules
- `id`, `name`, `description`
- `school_id`, `instructor_id`
- `day_of_week`, `start_time`, `end_time`
- `belt_requirement_id` - Classes are belt-based
- `max_capacity`, `is_active`

### class_sessions
- Individual class instances with date and status

### attendance_records
- `student_profile_id`, `class_session_id`
- `status` ('present' | 'absent' | 'late' | 'excused')

## User Roles

1. **admin** - Platform admin (manages all schools)
2. **owner** - School owner (manages their school)
3. **parent** - Parent/guardian of students
4. **student** - Individual student (16+)

## Key Patterns

### Supabase Clients
```typescript
// Regular client (respects RLS)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Admin client (bypasses RLS) - use for cross-user queries
import { createAdminClient } from '@/lib/supabase/admin'
const adminClient = createAdminClient()
```

### TypeScript with Supabase
Supabase queries often return `never` types. Use type casting:
```typescript
const { data } = await supabase.from('profiles').select('*').single()
const profile = data as ProfileType | null

// For insert/update/delete, use `as any`:
await (supabase.from('profiles') as any).update({ ... })
```

### API Route Pattern
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... rest of logic
}
```

## Belt-Based Class System

- Classes have a `belt_requirement_id`
- Students see classes matching their `current_belt_id`
- When creating classes, owners select which belt level
- Default belts are `is_default = true`, custom belts have `school_id`

## Family System

- Families group parents and students together
- `primary_holder_id` is the main account holder
- Members have `family_id` in their profile
- RLS on families table requires admin client for cross-user reads

## Common Issues & Solutions

1. **"column X does not exist"** - Check actual database schema, remove non-existent columns from queries

2. **RLS blocking queries** - Use admin client for queries that need cross-user access

3. **TypeScript `never` type** - Add explicit type casts for Supabase query results

4. **useSearchParams requires Suspense** - Wrap components using useSearchParams in Suspense boundary

## Completed Features

- [x] Authentication (login, signup, password reset)
- [x] School owner signup and school creation
- [x] User approval workflow
- [x] Feed with posts and likes
- [x] Direct messaging system
- [x] Announcements (CRUD)
- [x] Events calendar
- [x] Class schedules (belt-based)
- [x] Belt ranks management
- [x] Staff management with invites
- [x] Family management
- [x] Student profiles with belt tracking
- [x] Attendance tracking
- [x] Contracts system
- [x] Stripe subscription integration
- [x] User settings page
- [x] My Classes page (belt-based)
- [x] My Family page
- [x] Schedule page

## Remaining Features (see MISSING_PAGES.md)

- My Progress page
- Payments history page
- Owner: Add Student, Student Detail, Family Detail
- Owner: Reports, Settings
- Admin: Email Templates, System Logs
- Help/FAQ page

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

---

*Last updated: January 8, 2026*

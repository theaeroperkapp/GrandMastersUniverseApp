# Missing Pages & Features

This document tracks pages and features that should exist but are not yet implemented.

## Student/Parent Pages

| Page | Route | Priority | Description |
|------|-------|----------|-------------|
| ~~Schedule~~ | ~~`/schedule`~~ | ~~HIGH~~ | ~~View weekly class schedule for the school~~ DONE |
| ~~My Classes~~ | ~~`/my-classes`~~ | ~~HIGH~~ | ~~View enrolled classes and upcoming sessions~~ DONE |
| My Progress | `/my-progress` | MEDIUM | Belt progression history, attendance record |
| ~~My Family~~ | ~~`/my-family`~~ | ~~MEDIUM~~ | ~~Manage family members (for parents)~~ DONE |
| Payments | `/payments` | LOW | View payment history and invoices |
| ~~Messages~~ | ~~`/messages`~~ | ~~LOW~~ | ~~Direct messaging with instructors~~ DONE |

## Owner Pages (Improvements Needed)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Students | `/owner/students` | FIXED | Now shows approved members from profiles |
| Add Student | `/owner/students/add` | MISSING | Form to manually add a student |
| Student Detail | `/owner/students/[id]` | MISSING | View/edit individual student details |
| Family Detail | `/owner/families/[id]` | MISSING | View/edit family details |
| Reports | `/owner/reports` | MISSING | Attendance reports, revenue reports |
| Settings | `/owner/settings` | MISSING | School settings, business hours, etc. |
| ~~Announcements~~ | `/owner/announcements` | DONE | Full CRUD for announcements |
| ~~Billing~~ | `/owner/billing` | DONE | Create membership, add custom charges |
| ~~Staff~~ | `/owner/staff` | DONE | Staff management with invite functionality |
| ~~Subscription~~ | `/owner/subscription` | DONE | Subscription management with Stripe |
| ~~Contracts~~ | `/owner/contracts` | DONE | Contract templates and signing |

## Admin Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Email Templates | `/admin/email-templates` | MISSING | Manage email templates |
| System Logs | `/admin/logs` | MISSING | View system activity logs |

## Common Pages

| Page | Route | Priority | Description |
|------|-------|----------|-------------|
| ~~User Settings~~ | ~~`/settings`~~ | ~~MEDIUM~~ | ~~User preferences, notification settings~~ DONE |
| Help/FAQ | `/help` | LOW | Help documentation and FAQ |

## API Routes Needed

| Route | Method | Description |
|-------|--------|-------------|
| `/api/schedule` | GET | Get class schedule for a school |
| `/api/my-classes` | GET | Get user's enrolled classes |
| ~~`/api/messages`~~ | ~~GET/POST~~ | ~~Messaging system~~ DONE |
| `/api/family-members` | GET/POST/DELETE | Manage family members |

## Database Considerations

- When approving a student, should we auto-create a `student_profiles` record?
- Family membership flow needs clarification
- Class enrollment process needs to be defined

---

## Completed Items

- [x] Invite Members card on owner dashboard (school code + QR)
- [x] Signup with school code URL parameter
- [x] User approval flow
- [x] Members page showing approved students/parents
- [x] **Messages/Chat System** (`/messages`) - Real-time direct messaging with conversation list, message history, read receipts
- [x] **Announcements CRUD** (`/owner/announcements`) - Create, edit, delete, publish/unpublish announcements
- [x] **Billing Management** (`/owner/billing`) - Create memberships, add custom charges
- [x] **Staff Management** (`/owner/staff`) - View staff, invite new staff via email
- [x] **Subscription Page** (`/owner/subscription`) - View/manage subscription with Stripe integration
- [x] **Contracts System** (`/owner/contracts`) - Contract templates and management
- [x] **Events Calendar** (`/events`) - Student view of school events
- [x] **Staff Invite API** (`/api/staff/invite`) - Send staff invitation emails
- [x] **Messaging RLS Policies** - Row-level security for conversations and messages
- [x] **My Family Page** (`/my-family`) - View family members, parents, and students with belt info
- [x] **User Settings Page** (`/settings`) - Profile editing, notification preferences, password change

---

*Last updated: January 8, 2026*

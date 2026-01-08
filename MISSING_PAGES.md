# Missing Pages & Features

This document tracks pages and features that should exist but are not yet implemented.

## Student/Parent Pages

| Page | Route | Priority | Description |
|------|-------|----------|-------------|
| Schedule | `/schedule` | HIGH | View weekly class schedule for the school |
| My Classes | `/my-classes` | HIGH | View enrolled classes and upcoming sessions |
| My Progress | `/my-progress` | MEDIUM | Belt progression history, attendance record |
| My Family | `/my-family` | MEDIUM | Manage family members (for parents) |
| Payments | `/payments` | LOW | View payment history and invoices |
| Messages | `/messages` | LOW | Direct messaging with instructors |

## Owner Pages (Improvements Needed)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Students | `/owner/students` | FIXED | Now shows approved members from profiles |
| Add Student | `/owner/students/add` | MISSING | Form to manually add a student |
| Student Detail | `/owner/students/[id]` | MISSING | View/edit individual student details |
| Family Detail | `/owner/families/[id]` | MISSING | View/edit family details |
| Reports | `/owner/reports` | MISSING | Attendance reports, revenue reports |
| Settings | `/owner/settings` | MISSING | School settings, business hours, etc. |

## Admin Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Email Templates | `/admin/email-templates` | MISSING | Manage email templates |
| System Logs | `/admin/logs` | MISSING | View system activity logs |

## Common Pages

| Page | Route | Priority | Description |
|------|-------|----------|-------------|
| User Settings | `/settings` | MEDIUM | User preferences, notification settings |
| Help/FAQ | `/help` | LOW | Help documentation and FAQ |

## API Routes Needed

| Route | Method | Description |
|-------|--------|-------------|
| `/api/schedule` | GET | Get class schedule for a school |
| `/api/my-classes` | GET | Get user's enrolled classes |
| `/api/messages` | GET/POST | Messaging system |
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

---

*Last updated: January 2026*

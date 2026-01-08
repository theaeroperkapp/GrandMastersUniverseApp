# GrandMastersUniverse - Issues & Improvements

> Analysis Date: January 7, 2026
> Last Updated: January 7, 2026

---

## Table of Contents

1. [Fixed Issues](#fixed-issues)
2. [UX Improvements](#ux-improvements)
3. [Missing Features](#missing-features)
4. [Database & API Issues](#database--api-issues)

---

## Fixed Issues

The following critical and high-priority bugs have been resolved:

### 1. ✅ FIXED: Security - Owner Signup Bypass (Critical)

**Resolution:** Server-side validation now checks if email exists in waitlist with `status='approved'` via `/api/auth/verify-approval` endpoint before allowing signup. Double-check also occurs during form submission.

### 2. ✅ FIXED: Subdomain Generation from URL Encoded Parameter

**Resolution:** School name is now properly decoded before generating the subdomain.

### 3. ✅ FIXED: Missing Error Handling in Profile Update

**Resolution:** Toast error is now shown when profile update fails during owner signup.

### 4. ✅ FIXED: Pending Approval Screen Missing Logout API

**Resolution:** Created `/api/auth/signout` route that handles POST requests and redirects to login.

### 5. ✅ FIXED: Waitlist Status Not Distinguished on Admin Dashboard

**Resolution:** Admin dashboard now shows pending waitlist count separately with alert banner.

### 6. ✅ FIXED: Reject Button Pre-mutates Entry Status

**Resolution:** Waitlist page now uses separate `actionType` state for approve/reject actions.

### 7. ✅ FIXED: Rate Limiting and Input Validation on Waitlist API

**Resolution:** Added rate limiting (5 requests per 15 minutes per IP), email format validation, and input sanitization to `/api/waitlist` endpoint.

---

## Previously Documented Issues (Now Fixed)

<details>
<summary>Click to expand archived issues</summary>

### Security: Owner Signup Bypass (FIXED)

**File:** `src/app/(auth)/signup/owner/page.tsx:31-33`

**Severity:** Critical

**Description:**
The "approved" check is only client-side via URL parameter `?approved=true`. Anyone can bypass this by manually adding the parameter to the URL, allowing unapproved users to create schools.

```typescript
// This is easily bypassed
if (approved === 'true') {
  setIsApproved(true)
}
```

**Impact:**
- Unauthorized users can create schools without admin approval
- Bypasses entire waitlist workflow
- Could lead to spam schools and abuse

**Recommended Fix:**
Server-side validation - check if email exists in waitlist with `status='approved'` before allowing signup:

```typescript
// In the handleSubmit function, before creating user:
const { data: waitlistEntry } = await supabase
  .from('waitlist')
  .select('status')
  .eq('email', email)
  .eq('status', 'approved')
  .single()

if (!waitlistEntry) {
  toast.error('Your application has not been approved yet.')
  return
}
```

---

## Bugs

### 2. Subdomain Generation from URL Encoded Parameter

**File:** `src/app/(auth)/signup/owner/page.tsx:36-38`

**Description:**
The subdomain is generated from the URL-encoded `schoolNameParam` before decoding it.

```typescript
if (schoolNameParam) {
  setSchoolName(decodeURIComponent(schoolNameParam))
  // Bug: Using schoolNameParam instead of decoded value
  setSubdomain(schoolNameParam.toLowerCase().replace(/[^a-z0-9]/g, ''))
}
```

**Impact:**
If school name is "Karate's Dojo", the URL has `Karate%27s%20Dojo`, and subdomain becomes `karate27s20dojo` instead of `karatesdojo`.

**Recommended Fix:**
```typescript
if (schoolNameParam) {
  const decodedSchoolName = decodeURIComponent(schoolNameParam)
  setSchoolName(decodedSchoolName)
  setSubdomain(decodedSchoolName.toLowerCase().replace(/[^a-z0-9]/g, ''))
}
```

---

### 3. Missing Error Handling in Profile Update

**File:** `src/app/(auth)/signup/owner/page.tsx:140-142`

**Description:**
Profile update errors are only logged to console, not displayed to user.

```typescript
if (profileError) {
  console.error('Profile update error:', profileError)
  // User never sees this error!
}
```

**Impact:**
User thinks signup succeeded but their profile may be incomplete, causing issues later.

**Recommended Fix:**
```typescript
if (profileError) {
  console.error('Profile update error:', profileError)
  toast.error('Account created but profile setup failed. Please contact support.')
  // Or retry the profile update
}
```

---

### 4. Pending Approval Screen Missing Logout API

**File:** `src/app/(dashboard)/layout.tsx:51-53`

**Description:**
The signout form points to `/api/auth/signout` which doesn't exist in the API routes.

```html
<form action="/api/auth/signout" method="post">
  <button type="submit" className="text-red-600 hover:underline">
    Sign out
  </button>
</form>
```

**Impact:**
Users stuck on pending approval screen cannot log out, requiring them to clear cookies manually.

**Recommended Fix:**
Create the missing API route or use client-side logout:

```typescript
// Option 1: Create /api/auth/signout route
// Option 2: Use client component with supabase.auth.signOut()
```

---

### 5. Waitlist Status Not Distinguished on Admin Dashboard

**File:** `src/app/(dashboard)/admin/page.tsx:62`

**Description:**
The admin dashboard shows total waitlist count but doesn't distinguish between pending entries.

**Impact:**
Admins don't immediately see how many entries need their attention.

**Recommended Fix:**
```typescript
const { count: pendingWaitlist } = await supabase
  .from('waitlist')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending')
```

---

### 6. Reject Button Pre-mutates Entry Status

**File:** `src/app/(dashboard)/admin/waitlist/page.tsx:276-279`

**Description:**
Clicking "Reject" button changes entry status before modal opens:

```typescript
onClick={() => {
  setSelectedEntry({ ...entry, status: 'rejected' } as WaitlistEntry)
}}
```

**Impact:**
Confusing UX - the button says "Reject" but the modal title is driven by mutated state.

**Recommended Fix:**
Use a separate state for the intended action:

```typescript
const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)

onClick={() => {
  setSelectedEntry(entry)
  setActionType('reject')
}}
```

</details>

---

## UX Improvements

### 1. No Email Confirmation Indicator

**Current State:**
Users create accounts but aren't clearly informed they need to verify email. The toast says "check your email to confirm" but there's no:
- Resend verification email option
- Clear pending verification state screen
- Visual indicator of verification status

**Recommendation:**
- Add a dedicated "Check your email" page after signup
- Include a "Resend verification email" button
- Show verification status in profile

---

### 2. ✅ PARTIALLY FIXED: Missing Loading States

**Status:** Waitlist page now has skeleton loaders.

**Remaining:**
- Notifications page could use skeleton loaders
- Profile dropdown: No loading state during logout

---

### 3. ✅ FIXED: No Password Strength Indicator

**Status:** Password strength indicator component added to owner signup page (`src/components/ui/password-strength.tsx`). Shows visual strength meter and requirements checklist.

---

### 4. Mobile Navigation Issues

**File:** `src/components/layout/navbar.tsx`

**Issues:**
- Mobile menu doesn't close when navigating (only on link click, but can bug out)
- Profile dropdown and mobile menu can both be open simultaneously
- No click-outside-to-close for mobile menu

**Recommendation:**
```typescript
// Close both menus when navigating
useEffect(() => {
  setIsMenuOpen(false)
  setIsProfileOpen(false)
}, [pathname])

// Close other menu when one opens
const handleMenuOpen = () => {
  setIsProfileOpen(false)
  setIsMenuOpen(!isMenuOpen)
}
```

---

### 5. No Confirmation for Destructive Actions

**Affected Features:**
- Deleting notifications has no confirmation
- Marking all notifications as read has no undo option
- Could add more

**Recommendation:**
- Add confirmation dialog for delete actions
- Add toast with "Undo" option for bulk actions

---

### 6. Missing Empty States

**Current State:**
Admin dashboard "Recent Schools" shows generic "No schools yet" text.

**Recommendation:**
- Provide actionable next steps
- Add illustration or icon
- Include CTA button (e.g., "Add your first school")

---

### 7. School Code UX Confusion

**File:** `src/app/(auth)/signup/page.tsx:94-105`

**Issue:**
"School Code" is confusing terminology. Users need to "ask their school".

**Recommendations:**
- Rename to "School ID" or "School URL"
- Add a "Find my school" lookup feature with autocomplete
- Show school name after entering valid code for confirmation
- Add helper text explaining where to find the code

---

### 8. Form Validation Feedback

**Current State:**
- No inline validation errors
- Errors only shown via toast after submit
- No real-time feedback

**Recommendation:**
- Add inline error messages below each field
- Validate on blur for immediate feedback
- Show success checkmarks for valid fields

---

## Missing Features

### 1. No "Back" Navigation

**Issue:**
Forms don't have back buttons to return to previous step/page.

**Recommendation:**
Add back buttons or breadcrumb navigation for multi-step flows.

---

### 2. No Real-time Notifications

**Issue:**
Notification count only updates on page refresh.

**Recommendation:**
Implement Supabase realtime subscriptions:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Update notification count
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [userId])
```

---

### 3. No Pagination

**Affected Pages:**
- Waitlist page loads all entries
- Notifications page loads all notifications
- Admin users list

**Impact:**
Will cause performance issues at scale.

**Recommendation:**
- Implement cursor-based pagination
- Add "Load more" or infinite scroll
- Consider virtual lists for very long lists

---

### 4. ✅ PARTIALLY FIXED: No Keyboard Navigation

**Status:** Waitlist page modals now close on Escape key.

**Remaining:**
- No focus trapping in modals
- Dropdowns don't support arrow key navigation
- Other modals should also close on Escape

**Recommendation:**
- Implement focus trap in modals (use library like `focus-trap-react`)
- Add ARIA attributes for accessibility

---

### 5. No Date/Time Formatting Preferences

**Issue:**
`toLocaleString()` used everywhere without timezone consideration.

**Recommendation:**
- Store user timezone preference in profile
- Use consistent date formatting library (date-fns, dayjs)
- Format dates relative to user's timezone

---

### 6. Missing Search Functionality

**Affected Areas:**
- Admin users list
- Admin schools list
- Member management

**Recommendation:**
Add search/filter functionality to all list views.

---

## Database & API Issues

### 1. Type Safety Workarounds

**Issue:**
Multiple `as never` and `as any` casts throughout codebase:

```typescript
.insert({...} as never)
.update({...} as never)
```

**Impact:**
- TypeScript types are out of sync with database schema
- Can hide real bugs at compile time
- Makes refactoring risky

**Recommendation:**
- Regenerate Supabase types: `supabase gen types typescript`
- Update `src/types/database.ts` to match actual schema
- Remove all `as never` and `as any` casts

---

### 2. ✅ PARTIALLY FIXED: No Rate Limiting

**Status:** Rate limiting added to `/api/waitlist` endpoint (5 requests per 15 minutes per IP).

**Remaining:**
- Contact form submission could use rate limiting
- Consider Upstash Redis for distributed rate limiting in production

---

### 3. ✅ PARTIALLY FIXED: No Input Sanitization

**Status:** Waitlist API now sanitizes inputs (trims whitespace, lowercases email).

**Remaining:**
- Other API routes should follow the same pattern
- Consider adding more aggressive sanitization for special characters

---

### 4. ✅ PARTIALLY FIXED: Missing API Input Validation

**Status:** Waitlist API now validates:
- Email format (regex validation)
- Name length (2-100 characters)
- School name length (2-200 characters)

**Remaining:**
- Other API routes should be audited for validation
- Consider using Zod for schema-based validation across all routes

---

## Priority Matrix (Updated)

| Issue | Severity | Effort | Priority | Status |
|-------|----------|--------|----------|--------|
| Owner Signup Bypass | Critical | Low | P0 | ✅ FIXED |
| Missing Logout API | High | Low | P1 | ✅ FIXED |
| Subdomain Generation Bug | Medium | Low | P1 | ✅ FIXED |
| Type Safety Issues | Medium | Medium | P2 | Open |
| No Rate Limiting | Medium | Medium | P2 | ✅ Partially Fixed |
| Missing Loading States | Low | Low | P2 | ✅ Partially Fixed |
| No Pagination | Medium | Medium | P3 | Open |
| No Real-time Notifications | Low | Medium | P3 | Open |
| Password Strength Indicator | Low | Low | P3 | ✅ FIXED |
| Keyboard Navigation | Low | Medium | P4 | ✅ Partially Fixed |

---

## Next Steps

All critical (P0) and high-priority (P1) bugs have been fixed. Remaining tasks:

1. **High Priority:**
   - Regenerate Supabase types to fix type safety issues
   - Complete rate limiting coverage for remaining public APIs

2. **Medium Priority:**
   - Implement pagination for list pages
   - Add real-time notification updates via Supabase subscriptions

3. **Lower Priority:**
   - Implement focus trapping in modals
   - Add email confirmation indicator and resend functionality
   - Add search functionality to admin list views

---

*Generated by code analysis on January 7, 2026*
*Last updated: January 7, 2026*

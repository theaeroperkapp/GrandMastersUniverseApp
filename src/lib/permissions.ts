import type { UserRole, SubRole } from '@/types/database'

export type Permission =
  | 'view_feed'
  | 'create_post'
  | 'delete_any_post'
  | 'view_announcements'
  | 'create_announcement'
  | 'view_classes'
  | 'manage_classes'
  | 'view_attendance'
  | 'manage_attendance'
  | 'view_events'
  | 'manage_events'
  | 'view_students'
  | 'manage_students'
  | 'view_families'
  | 'manage_families'
  | 'view_billing'
  | 'manage_billing'
  | 'view_contracts'
  | 'manage_contracts'
  | 'view_belts'
  | 'manage_belts'
  | 'promote_students'
  | 'approve_users'
  | 'manage_staff'
  | 'manage_school_settings'
  | 'view_school_analytics'
  | 'admin_access'
  | 'manage_schools'
  | 'manage_subdomains'
  | 'view_platform_analytics'
  | 'manage_platform_settings'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_feed',
    'create_post',
    'delete_any_post',
    'view_announcements',
    'create_announcement',
    'view_classes',
    'manage_classes',
    'view_attendance',
    'manage_attendance',
    'view_events',
    'manage_events',
    'view_students',
    'manage_students',
    'view_families',
    'manage_families',
    'view_billing',
    'manage_billing',
    'view_contracts',
    'manage_contracts',
    'view_belts',
    'manage_belts',
    'promote_students',
    'approve_users',
    'manage_staff',
    'manage_school_settings',
    'view_school_analytics',
    'admin_access',
    'manage_schools',
    'manage_subdomains',
    'view_platform_analytics',
    'manage_platform_settings',
  ],
  owner: [
    'view_feed',
    'create_post',
    'delete_any_post',
    'view_announcements',
    'create_announcement',
    'view_classes',
    'manage_classes',
    'view_attendance',
    'manage_attendance',
    'view_events',
    'manage_events',
    'view_students',
    'manage_students',
    'view_families',
    'manage_families',
    'view_billing',
    'manage_billing',
    'view_contracts',
    'manage_contracts',
    'view_belts',
    'manage_belts',
    'promote_students',
    'approve_users',
    'manage_staff',
    'manage_school_settings',
    'view_school_analytics',
  ],
  parent: [
    'view_feed',
    'create_post',
    'view_announcements',
    'view_classes',
    'view_attendance',
    'view_events',
    'view_billing',
    'view_contracts',
  ],
  student: [
    'view_feed',
    'create_post',
    'view_announcements',
    'view_classes',
    'view_attendance',
    'view_events',
  ],
}

const SUB_ROLE_PERMISSIONS: Record<SubRole, Permission[]> = {
  community_manager: [
    'create_announcement',
    'delete_any_post',
  ],
  billing_coordinator: [
    'view_billing',
    'manage_billing',
    'view_families',
  ],
}

export function getPermissions(role: UserRole, subRoles: SubRole[] = []): Permission[] {
  const basePermissions = ROLE_PERMISSIONS[role] || []
  const additionalPermissions = subRoles.flatMap(sr => SUB_ROLE_PERMISSIONS[sr] || [])
  return [...new Set([...basePermissions, ...additionalPermissions])]
}

export function hasPermission(
  role: UserRole,
  subRoles: SubRole[],
  permission: Permission
): boolean {
  const permissions = getPermissions(role, subRoles)
  return permissions.includes(permission)
}

export function hasAnyPermission(
  role: UserRole,
  subRoles: SubRole[],
  permissions: Permission[]
): boolean {
  const userPermissions = getPermissions(role, subRoles)
  return permissions.some(p => userPermissions.includes(p))
}

export function hasAllPermissions(
  role: UserRole,
  subRoles: SubRole[],
  permissions: Permission[]
): boolean {
  const userPermissions = getPermissions(role, subRoles)
  return permissions.every(p => userPermissions.includes(p))
}

export function canAccessArea(
  role: UserRole,
  subRoles: SubRole[],
  area: 'admin' | 'owner' | 'billing' | 'classes' | 'events' | 'students'
): boolean {
  switch (area) {
    case 'admin':
      return hasPermission(role, subRoles, 'admin_access')
    case 'owner':
      return role === 'admin' || role === 'owner'
    case 'billing':
      return hasAnyPermission(role, subRoles, ['view_billing', 'manage_billing'])
    case 'classes':
      return hasAnyPermission(role, subRoles, ['view_classes', 'manage_classes'])
    case 'events':
      return hasAnyPermission(role, subRoles, ['view_events', 'manage_events'])
    case 'students':
      return hasAnyPermission(role, subRoles, ['view_students', 'manage_students'])
    default:
      return false
  }
}

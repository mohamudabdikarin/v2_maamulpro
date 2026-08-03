import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const ANY_PERMISSIONS_KEY = 'permissions.anyOf';

// Requires ALL listed permissions (AND semantics).
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Requires AT LEAST ONE of the listed permissions (OR semantics).
// Use this for endpoints whose gate is "user belongs to any reports/analytics
// scope" but the specific scope is enforced downstream in the handler.
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);

// ============================================================
// MaamulPro — Permissions Module (Barrel Export)
// Backward-compatible re-exports for the centralized registry.
// ============================================================

export {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_HOME_ROUTES,
  ROLE_WORKSPACE_MAP,
  ROUTE_PERMISSION_MAP,
  EXECUTIVE_ROLES,
  ACTIVITY_LOG_ROLES,
  LEGACY_PERMISSION_ALIASES,
  type Permission,
  type WorkspaceKey,
  type ModuleKey,
} from "./registry";

// ─── Backward-compatible exports (for rbac-sync, permission-matrix) ──

import { PERMISSIONS as _PERMISSIONS, ROLE_PERMISSIONS as _ROLE_PERM, LEGACY_PERMISSION_ALIASES } from "./registry";
import type { Permission as RegistryPermission } from "./registry";

export const expandPermission = (permission: string): string[] =>
  (LEGACY_PERMISSION_ALIASES as Record<string, readonly string[]>)[permission]
    ? [...(LEGACY_PERMISSION_ALIASES as Record<string, readonly string[]>)[permission]]
    : [permission];

export const PERMISSION_ACTIONS = ["create", "read", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// PermissionKey = the old dot-notation keys that are still used by the permission matrix
export type PermissionKey = RegistryPermission;

export type PermissionModuleDefinition = {
  key: string;
  label: string;
  workspace: string;
  permissions: RegistryPermission[];
  checkboxActions?: readonly PermissionAction[];
};

const crud = (module: string): RegistryPermission[] =>
  PERMISSION_ACTIONS.map((action) => `${module}.${action}` as RegistryPermission);

export const PERMISSION_MODULES: PermissionModuleDefinition[] = [
  {
    key: "workspace.core",
    label: "Core Workspace",
    workspace: "core",
    permissions: [_PERMISSIONS.ACCESS_CORE],
  },
  {
    key: "workspace.construction",
    label: "Construction Workspace",
    workspace: "construction",
    permissions: [_PERMISSIONS.ACCESS_CONSTRUCTION],
  },
  {
    key: "workspace.real_estate",
    label: "Real Estate Workspace",
    workspace: "real_estate",
    permissions: [_PERMISSIONS.ACCESS_REAL_ESTATE],
  },
  {
    key: "workspace.material_management",
    label: "Material Management Workspace",
    workspace: "material_management",
    permissions: [_PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT],
  },
  { key: "projects", label: "Projects", workspace: "construction", permissions: crud("projects"), checkboxActions: PERMISSION_ACTIONS },
  { key: "project_progress", label: "Project Progress", workspace: "construction", permissions: [_PERMISSIONS.PROJECT_PROGRESS_READ] },
  { key: "construction_tasks", label: "Tasks", workspace: "construction", permissions: crud("construction_tasks"), checkboxActions: PERMISSION_ACTIONS },
  { key: "construction_budgets", label: "Project Budgets", workspace: "construction", permissions: [_PERMISSIONS.BUDGETS_READ, _PERMISSIONS.BUDGETS_UPDATE] },
  { key: "construction_expenses", label: "Project Costs", workspace: "construction", permissions: crud("construction_expenses"), checkboxActions: PERMISSION_ACTIONS },
  { key: "construction_inventory", label: "Construction Inventory", workspace: "construction", permissions: crud("construction_inventory"), checkboxActions: PERMISSION_ACTIONS },
  { key: "manpower", label: "Manpower", workspace: "construction", permissions: crud("manpower"), checkboxActions: PERMISSION_ACTIONS },
  { key: "properties", label: "Properties", workspace: "real_estate", permissions: crud("properties"), checkboxActions: PERMISSION_ACTIONS },
  { key: "clients", label: "Clients", workspace: "real_estate", permissions: crud("clients"), checkboxActions: PERMISSION_ACTIONS },
  { key: "deals", label: "Deals", workspace: "real_estate", permissions: crud("deals"), checkboxActions: PERMISSION_ACTIONS },
  { key: "rentals", label: "Rentals", workspace: "real_estate", permissions: crud("rentals"), checkboxActions: PERMISSION_ACTIONS },
  { key: "materials_products", label: "Material Products", workspace: "material_management", permissions: crud("materials_products"), checkboxActions: PERMISSION_ACTIONS },
  { key: "materials_inventory", label: "Materials Inventory", workspace: "material_management", permissions: crud("materials_inventory"), checkboxActions: PERMISSION_ACTIONS },
  { key: "suppliers", label: "Suppliers", workspace: "material_management", permissions: crud("suppliers"), checkboxActions: PERMISSION_ACTIONS },
  { key: "purchases", label: "Purchases", workspace: "material_management", permissions: crud("purchases"), checkboxActions: PERMISSION_ACTIONS },
  { key: "material_sales", label: "Material Sales", workspace: "material_management", permissions: crud("material_sales"), checkboxActions: PERMISSION_ACTIONS },
  { key: "material_customers", label: "Material Customers", workspace: "material_management", permissions: [_PERMISSIONS.MATERIAL_CUSTOMERS_READ, _PERMISSIONS.MATERIAL_CUSTOMERS_UPDATE] },
  { key: "transportation", label: "Transportation", workspace: "material_management", permissions: crud("transportation"), checkboxActions: PERMISSION_ACTIONS },
  { key: "reports", label: "Core Reports", workspace: "core", permissions: [_PERMISSIONS.REPORTS_READ, _PERMISSIONS.REPORTS_ADMIN] },
  { key: "reports_construction", label: "Construction Reports", workspace: "construction", permissions: [_PERMISSIONS.REPORTS_CONSTRUCTION_READ] },
  { key: "reports_real_estate", label: "Real Estate Reports", workspace: "real_estate", permissions: [_PERMISSIONS.REPORTS_REAL_ESTATE_READ] },
  { key: "reports_material", label: "Material Reports", workspace: "material_management", permissions: [_PERMISSIONS.REPORTS_MATERIAL_READ] },
  { key: "analytics", label: "Core Analytics", workspace: "core", permissions: [_PERMISSIONS.ANALYTICS_READ] },
  { key: "analytics_construction", label: "Construction Analytics", workspace: "construction", permissions: [_PERMISSIONS.ANALYTICS_CONSTRUCTION_READ] },
  { key: "analytics_real_estate", label: "Real Estate Analytics", workspace: "real_estate", permissions: [_PERMISSIONS.ANALYTICS_REAL_ESTATE_READ] },
  { key: "analytics_material", label: "Material Analytics", workspace: "material_management", permissions: [_PERMISSIONS.ANALYTICS_MATERIAL_READ] },
  { key: "settings", label: "Settings", workspace: "core", permissions: [_PERMISSIONS.SETTINGS_READ, _PERMISSIONS.SETTINGS_UPDATE] },
  { key: "users", label: "Users", workspace: "core", permissions: crud("users"), checkboxActions: PERMISSION_ACTIONS },
  { key: "roles", label: "Roles", workspace: "core", permissions: crud("roles"), checkboxActions: PERMISSION_ACTIONS },
  { key: "activity_logs", label: "Activity Logs", workspace: "core", permissions: [_PERMISSIONS.ACTIVITY_LOGS_READ] },
  { key: "transactions", label: "Transactions", workspace: "core", permissions: crud("transactions"), checkboxActions: PERMISSION_ACTIONS },
  { key: "financials", label: "Financials", workspace: "core", permissions: [_PERMISSIONS.FINANCIALS_READ] },
];

export const ALL_PERMISSION_KEYS = PERMISSION_MODULES.flatMap((m) => m.permissions);

// Role permission templates (backward compat)
export const ROLE_PERMISSION_TEMPLATES = _ROLE_PERM;

export function hasExpandedPermission(
  grantedPermissions: Iterable<string>,
  requestedPermission: string
): boolean {
  const granted = new Set<string>();
  for (const permission of grantedPermissions) {
    expandPermission(permission).forEach((expanded) => granted.add(expanded));
  }

  const requested = expandPermission(requestedPermission);

  return requested.length > 0 && requested.some((permission) => granted.has(permission));
}

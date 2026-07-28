export type AppRole =
  | "SUPER_ADMIN"
  | "COMPANY_OWNER"
  | "GENERAL_MANAGER"
  | "ADMIN"
  | "MANAGER"
  | "STAFF"
  | "CONSTRUCTION_MANAGER"
  | "SITE_ENGINEER"
  | "PROJECT_SUPERVISOR"
  | "PROCUREMENT_OFFICER"
  | "STOREKEEPER"
  | "MANPOWER_SUPERVISOR"
  | "REAL_ESTATE_MANAGER"
  | "SALES_AGENT"
  | "RENTAL_OFFICER"
  | "PROPERTY_SUPERVISOR"
  | "MATERIAL_MANAGER"
  | "SALES_STAFF"
  | "INVENTORY_OFFICER"
  | "SUPPLIER_OFFICER"
  | "DELIVERY_OFFICER";

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  SUPER_ADMIN: 100,
  COMPANY_OWNER: 90,
  GENERAL_MANAGER: 85,
  ADMIN: 75,
  MANAGER: 50,
  CONSTRUCTION_MANAGER: 50,
  REAL_ESTATE_MANAGER: 50,
  MATERIAL_MANAGER: 50,
  PROJECT_SUPERVISOR: 40,
  PROCUREMENT_OFFICER: 40,
  STOREKEEPER: 40,
  MANPOWER_SUPERVISOR: 40,
  PROPERTY_SUPERVISOR: 40,
  INVENTORY_OFFICER: 35,
  SUPPLIER_OFFICER: 35,
  SALES_AGENT: 30,
  RENTAL_OFFICER: 30,
  SALES_STAFF: 30,
  DELIVERY_OFFICER: 30,
  SITE_ENGINEER: 30,
  STAFF: 25,
};

export function isAppRole(role: string | null | undefined): role is AppRole {
  return Boolean(role && role in ROLE_HIERARCHY);
}

export function hasRequiredRole(
  role: string | null | undefined,
  requiredRole: AppRole
): boolean {
  if (!isAppRole(role)) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
}

export function hasAnyRole(
  role: string | null | undefined,
  allowedRoles: readonly AppRole[]
): boolean {
  if (!isAppRole(role)) return false;
  return (allowedRoles as readonly string[]).includes(role);
}


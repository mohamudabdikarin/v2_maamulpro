// ============================================================
// MaamulPro — Centralized Permission Registry
// Single source of truth for all roles, permissions, and routes.
// Used by middleware, API guards, sidebar, and auth landing.
// ============================================================

import type { AppRole } from "./roles";

// ─── Role Definitions ───────────────────────────────────

export type { AppRole };

export const WORKSPACE_KEYS = ["core", "construction", "real_estate", "material_management"] as const;
export type WorkspaceKey = (typeof WORKSPACE_KEYS)[number];

export const MODULE_KEYS = ["construction", "real_estate", "material_management"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

// ─── Permission Constants ───────────────────────────────

export const PERMISSIONS = {
  // Workspace access
  ACCESS_CORE: "workspace.core.read",
  ACCESS_CONSTRUCTION: "workspace.construction.read",
  ACCESS_REAL_ESTATE: "workspace.real_estate.read",
  ACCESS_MATERIAL_MANAGEMENT: "workspace.material_management.read",

  // Construction — Projects
  PROJECTS_CREATE: "projects.create",
  PROJECTS_READ: "projects.read",
  PROJECTS_UPDATE: "projects.update",
  PROJECTS_DELETE: "projects.delete",
  PROJECT_PROGRESS_READ: "project_progress.read",

  // Construction — Tasks
  TASKS_CREATE: "construction_tasks.create",
  TASKS_READ: "construction_tasks.read",
  TASKS_UPDATE: "construction_tasks.update",
  TASKS_DELETE: "construction_tasks.delete",

  // Construction — Budgets & Expenses
  BUDGETS_READ: "construction_budgets.read",
  BUDGETS_UPDATE: "construction_budgets.update",
  EXPENSES_CREATE: "construction_expenses.create",
  EXPENSES_READ: "construction_expenses.read",
  EXPENSES_UPDATE: "construction_expenses.update",
  EXPENSES_DELETE: "construction_expenses.delete",

  // Construction — Inventory & Manpower
  CONSTRUCTION_INVENTORY_CREATE: "construction_inventory.create",
  CONSTRUCTION_INVENTORY_READ: "construction_inventory.read",
  CONSTRUCTION_INVENTORY_UPDATE: "construction_inventory.update",
  CONSTRUCTION_INVENTORY_DELETE: "construction_inventory.delete",
  MANPOWER_CREATE: "manpower.create",
  MANPOWER_READ: "manpower.read",
  MANPOWER_UPDATE: "manpower.update",
  MANPOWER_DELETE: "manpower.delete",
  WORKFORCE_CONTRACTS_CREATE: "workforce_contracts.create",
  WORKFORCE_CONTRACTS_READ: "workforce_contracts.read",
  WORKFORCE_CONTRACTS_UPDATE: "workforce_contracts.update",
  WORKFORCE_CONTRACTS_DELETE: "workforce_contracts.delete",

  // Real Estate
  PROPERTIES_CREATE: "properties.create",
  PROPERTIES_READ: "properties.read",
  PROPERTIES_UPDATE: "properties.update",
  PROPERTIES_DELETE: "properties.delete",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_READ: "clients.read",
  CLIENTS_UPDATE: "clients.update",
  CLIENTS_DELETE: "clients.delete",
  DEALS_CREATE: "deals.create",
  DEALS_READ: "deals.read",
  DEALS_UPDATE: "deals.update",
  DEALS_DELETE: "deals.delete",
  RENTALS_CREATE: "rentals.create",
  RENTALS_READ: "rentals.read",
  RENTALS_UPDATE: "rentals.update",
  RENTALS_DELETE: "rentals.delete",

  // Material Management
  MATERIALS_PRODUCTS_CREATE: "materials_products.create",
  MATERIALS_PRODUCTS_READ: "materials_products.read",
  MATERIALS_PRODUCTS_UPDATE: "materials_products.update",
  MATERIALS_PRODUCTS_DELETE: "materials_products.delete",
  MATERIALS_INVENTORY_CREATE: "materials_inventory.create",
  MATERIALS_INVENTORY_READ: "materials_inventory.read",
  MATERIALS_INVENTORY_UPDATE: "materials_inventory.update",
  MATERIALS_INVENTORY_DELETE: "materials_inventory.delete",
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_READ: "suppliers.read",
  SUPPLIERS_UPDATE: "suppliers.update",
  SUPPLIERS_DELETE: "suppliers.delete",
  PURCHASES_CREATE: "purchases.create",
  PURCHASES_READ: "purchases.read",
  PURCHASES_UPDATE: "purchases.update",
  PURCHASES_DELETE: "purchases.delete",
  MATERIAL_SALES_CREATE: "material_sales.create",
  MATERIAL_SALES_READ: "material_sales.read",
  MATERIAL_SALES_UPDATE: "material_sales.update",
  MATERIAL_SALES_DELETE: "material_sales.delete",
  MATERIAL_CUSTOMERS_READ: "material_customers.read",
  MATERIAL_CUSTOMERS_UPDATE: "material_customers.update",
  TRANSPORTATION_CREATE: "transportation.create",
  TRANSPORTATION_READ: "transportation.read",
  TRANSPORTATION_UPDATE: "transportation.update",
  TRANSPORTATION_DELETE: "transportation.delete",

  // Reports & Analytics
  REPORTS_READ: "reports.read",
  REPORTS_ADMIN: "reports.admin",
  REPORTS_CONSTRUCTION_READ: "reports.construction.read",
  REPORTS_REAL_ESTATE_READ: "reports.real_estate.read",
  REPORTS_MATERIAL_READ: "reports.material.read",
  ANALYTICS_READ: "analytics.read",
  ANALYTICS_CONSTRUCTION_READ: "analytics.construction.read",
  ANALYTICS_REAL_ESTATE_READ: "analytics.real_estate.read",
  ANALYTICS_MATERIAL_READ: "analytics.material.read",

  // Settings & Administration
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",
  USERS_CREATE: "users.create",
  USERS_READ: "users.read",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  ROLES_CREATE: "roles.create",
  ROLES_READ: "roles.read",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  ACTIVITY_LOGS_READ: "activity_logs.read",
  TRANSACTIONS_CREATE: "transactions.create",
  TRANSACTIONS_READ: "transactions.read",
  TRANSACTIONS_UPDATE: "transactions.update",
  TRANSACTIONS_DELETE: "transactions.delete",
  FINANCIALS_READ: "financials.read",

  // Payroll Management
  PAYROLL_READ: "payroll.read",
  PAYROLL_MANAGE: "payroll.manage",
  PAYROLL_APPROVE: "payroll.approve",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── All Permission Values (array for iteration) ─────────

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// ─── Role → Permissions Mapping ────────────────────────

const CONSTRUCTION_ALL: Permission[] = [
  PERMISSIONS.ACCESS_CONSTRUCTION,
  PERMISSIONS.PROJECTS_CREATE,
  PERMISSIONS.PROJECTS_READ,
  PERMISSIONS.PROJECTS_UPDATE,
  PERMISSIONS.PROJECTS_DELETE,
  PERMISSIONS.PROJECT_PROGRESS_READ,
  PERMISSIONS.TASKS_CREATE,
  PERMISSIONS.TASKS_READ,
  PERMISSIONS.TASKS_UPDATE,
  PERMISSIONS.TASKS_DELETE,
  PERMISSIONS.BUDGETS_READ,
  PERMISSIONS.BUDGETS_UPDATE,
  PERMISSIONS.EXPENSES_CREATE,
  PERMISSIONS.EXPENSES_READ,
  PERMISSIONS.EXPENSES_UPDATE,
  PERMISSIONS.EXPENSES_DELETE,
  PERMISSIONS.CONSTRUCTION_INVENTORY_CREATE,
  PERMISSIONS.CONSTRUCTION_INVENTORY_READ,
  PERMISSIONS.CONSTRUCTION_INVENTORY_UPDATE,
  PERMISSIONS.CONSTRUCTION_INVENTORY_DELETE,
  PERMISSIONS.MANPOWER_CREATE,
  PERMISSIONS.MANPOWER_READ,
  PERMISSIONS.MANPOWER_UPDATE,
  PERMISSIONS.MANPOWER_DELETE,
  PERMISSIONS.WORKFORCE_CONTRACTS_CREATE,
  PERMISSIONS.WORKFORCE_CONTRACTS_READ,
  PERMISSIONS.WORKFORCE_CONTRACTS_UPDATE,
  PERMISSIONS.WORKFORCE_CONTRACTS_DELETE,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.REPORTS_CONSTRUCTION_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.ANALYTICS_CONSTRUCTION_READ,
  PERMISSIONS.SETTINGS_READ,
];

const REAL_ESTATE_ALL: Permission[] = [
  PERMISSIONS.ACCESS_REAL_ESTATE,
  PERMISSIONS.PROPERTIES_CREATE,
  PERMISSIONS.PROPERTIES_READ,
  PERMISSIONS.PROPERTIES_UPDATE,
  PERMISSIONS.PROPERTIES_DELETE,
  PERMISSIONS.CLIENTS_CREATE,
  PERMISSIONS.CLIENTS_READ,
  PERMISSIONS.CLIENTS_UPDATE,
  PERMISSIONS.CLIENTS_DELETE,
  PERMISSIONS.DEALS_CREATE,
  PERMISSIONS.DEALS_READ,
  PERMISSIONS.DEALS_UPDATE,
  PERMISSIONS.DEALS_DELETE,
  PERMISSIONS.RENTALS_CREATE,
  PERMISSIONS.RENTALS_READ,
  PERMISSIONS.RENTALS_UPDATE,
  PERMISSIONS.RENTALS_DELETE,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.REPORTS_REAL_ESTATE_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.ANALYTICS_REAL_ESTATE_READ,
  PERMISSIONS.FINANCIALS_READ,
  PERMISSIONS.SETTINGS_READ,
];

const MATERIAL_ALL: Permission[] = [
  PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
  PERMISSIONS.MATERIALS_PRODUCTS_CREATE,
  PERMISSIONS.MATERIALS_PRODUCTS_READ,
  PERMISSIONS.MATERIALS_PRODUCTS_UPDATE,
  PERMISSIONS.MATERIALS_PRODUCTS_DELETE,
  PERMISSIONS.MATERIALS_INVENTORY_CREATE,
  PERMISSIONS.MATERIALS_INVENTORY_READ,
  PERMISSIONS.MATERIALS_INVENTORY_UPDATE,
  PERMISSIONS.MATERIALS_INVENTORY_DELETE,
  PERMISSIONS.SUPPLIERS_CREATE,
  PERMISSIONS.SUPPLIERS_READ,
  PERMISSIONS.SUPPLIERS_UPDATE,
  PERMISSIONS.SUPPLIERS_DELETE,
  PERMISSIONS.PURCHASES_CREATE,
  PERMISSIONS.PURCHASES_READ,
  PERMISSIONS.PURCHASES_UPDATE,
  PERMISSIONS.PURCHASES_DELETE,
  PERMISSIONS.MATERIAL_SALES_CREATE,
  PERMISSIONS.MATERIAL_SALES_READ,
  PERMISSIONS.MATERIAL_SALES_UPDATE,
  PERMISSIONS.MATERIAL_SALES_DELETE,
  PERMISSIONS.MATERIAL_CUSTOMERS_READ,
  PERMISSIONS.MATERIAL_CUSTOMERS_UPDATE,
  PERMISSIONS.TRANSPORTATION_CREATE,
  PERMISSIONS.TRANSPORTATION_READ,
  PERMISSIONS.TRANSPORTATION_UPDATE,
  PERMISSIONS.TRANSPORTATION_DELETE,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.REPORTS_MATERIAL_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.ANALYTICS_MATERIAL_READ,
  PERMISSIONS.FINANCIALS_READ,
  PERMISSIONS.SETTINGS_READ,
];

const ADMIN_ALL: Permission[] = ALL_PERMISSIONS.filter(
  (p) => p !== PERMISSIONS.ACCESS_CORE
);

// For backward compatibility, also define the workspace alias keys
export const LEGACY_PERMISSION_ALIASES: Record<string, Permission[]> = {
  "workspace:core:view": [PERMISSIONS.ACCESS_CORE],
  "workspace:construction:view": [PERMISSIONS.ACCESS_CONSTRUCTION],
  "workspace:real_estate:view": [PERMISSIONS.ACCESS_REAL_ESTATE],
  "workspace:material_management:view": [PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT],
  "module:construction:projects": [PERMISSIONS.PROJECTS_READ, PERMISSIONS.PROJECTS_CREATE, PERMISSIONS.PROJECTS_UPDATE],
  "module:construction:progress": [PERMISSIONS.PROJECT_PROGRESS_READ],
  "module:construction:tasks": [PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_UPDATE],
  "module:construction:budgets": [PERMISSIONS.BUDGETS_READ, PERMISSIONS.BUDGETS_UPDATE],
  "module:construction:expenses": [PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_UPDATE],
  "module:construction:material_usage": [PERMISSIONS.CONSTRUCTION_INVENTORY_READ, PERMISSIONS.CONSTRUCTION_INVENTORY_CREATE, PERMISSIONS.CONSTRUCTION_INVENTORY_UPDATE],
  "module:construction:manpower": [PERMISSIONS.MANPOWER_READ, PERMISSIONS.MANPOWER_CREATE, PERMISSIONS.MANPOWER_UPDATE],
  "module:construction:workforce_contracts": [PERMISSIONS.WORKFORCE_CONTRACTS_READ, PERMISSIONS.WORKFORCE_CONTRACTS_CREATE, PERMISSIONS.WORKFORCE_CONTRACTS_UPDATE],
  "module:real_estate:properties": [PERMISSIONS.PROPERTIES_READ, PERMISSIONS.PROPERTIES_CREATE, PERMISSIONS.PROPERTIES_UPDATE],
  "module:real_estate:rentals": [PERMISSIONS.RENTALS_READ, PERMISSIONS.RENTALS_CREATE, PERMISSIONS.RENTALS_UPDATE],
  "module:real_estate:sales": [PERMISSIONS.DEALS_READ, PERMISSIONS.DEALS_CREATE, PERMISSIONS.DEALS_UPDATE],
  "module:real_estate:clients": [PERMISSIONS.CLIENTS_READ, PERMISSIONS.CLIENTS_CREATE, PERMISSIONS.CLIENTS_UPDATE],
  "module:material:products": [PERMISSIONS.MATERIALS_PRODUCTS_READ, PERMISSIONS.MATERIALS_PRODUCTS_CREATE, PERMISSIONS.MATERIALS_PRODUCTS_UPDATE],
  "module:material:inventory": [PERMISSIONS.MATERIALS_INVENTORY_READ, PERMISSIONS.MATERIALS_INVENTORY_CREATE, PERMISSIONS.MATERIALS_INVENTORY_UPDATE],
  "module:material:suppliers": [PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.SUPPLIERS_CREATE, PERMISSIONS.SUPPLIERS_UPDATE],
  "module:material:purchases": [PERMISSIONS.PURCHASES_READ, PERMISSIONS.PURCHASES_CREATE, PERMISSIONS.PURCHASES_UPDATE],
  "module:material:sales": [PERMISSIONS.MATERIAL_SALES_READ, PERMISSIONS.MATERIAL_SALES_CREATE, PERMISSIONS.MATERIAL_SALES_UPDATE],
  "module:material:transportation": [PERMISSIONS.TRANSPORTATION_READ, PERMISSIONS.TRANSPORTATION_CREATE, PERMISSIONS.TRANSPORTATION_UPDATE],
  "module:material:customers": [PERMISSIONS.MATERIAL_CUSTOMERS_READ, PERMISSIONS.MATERIAL_CUSTOMERS_UPDATE],
  "reports:core:view": [PERMISSIONS.REPORTS_READ],
  "reports:construction:view": [PERMISSIONS.REPORTS_CONSTRUCTION_READ],
  "reports:real_estate:view": [PERMISSIONS.REPORTS_REAL_ESTATE_READ],
  "reports:material:view": [PERMISSIONS.REPORTS_MATERIAL_READ],
  "reports:admin": [PERMISSIONS.REPORTS_ADMIN],
  "analytics:core:view": [PERMISSIONS.ANALYTICS_READ],
  "analytics:construction:view": [PERMISSIONS.ANALYTICS_CONSTRUCTION_READ],
  "analytics:real_estate:view": [PERMISSIONS.ANALYTICS_REAL_ESTATE_READ],
  "analytics:material:view": [PERMISSIONS.ANALYTICS_MATERIAL_READ],
  "settings:company": [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE],
  "settings:branding": [PERMISSIONS.SETTINGS_UPDATE],
  "settings:modules": [PERMISSIONS.SETTINGS_UPDATE],
  "users:manage": [PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_READ, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE],
  "roles:manage": [PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_UPDATE, PERMISSIONS.ROLES_DELETE],
  "activity_logs:view": [PERMISSIONS.ACTIVITY_LOGS_READ],
  "transactions:manage": [PERMISSIONS.TRANSACTIONS_CREATE, PERMISSIONS.TRANSACTIONS_READ, PERMISSIONS.TRANSACTIONS_UPDATE, PERMISSIONS.TRANSACTIONS_DELETE],
  "financials:view": [PERMISSIONS.FINANCIALS_READ],
};

// ─── Role Permission Templates ──────────────────────────

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  COMPANY_OWNER: ADMIN_ALL,
  GENERAL_MANAGER: ADMIN_ALL,
  ADMIN: ADMIN_ALL.filter((p) => p !== PERMISSIONS.ACTIVITY_LOGS_READ),
  MANAGER: [
    PERMISSIONS.ACCESS_CONSTRUCTION,
    PERMISSIONS.ACCESS_REAL_ESTATE,
    PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_CONSTRUCTION_READ,
    PERMISSIONS.REPORTS_REAL_ESTATE_READ,
    PERMISSIONS.REPORTS_MATERIAL_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_CONSTRUCTION_READ,
    PERMISSIONS.ANALYTICS_REAL_ESTATE_READ,
    PERMISSIONS.ANALYTICS_MATERIAL_READ,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.TRANSACTIONS_CREATE,
    PERMISSIONS.TRANSACTIONS_UPDATE,
    PERMISSIONS.FINANCIALS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  STAFF: [],
  CONSTRUCTION_MANAGER: CONSTRUCTION_ALL,
  SITE_ENGINEER: [
    PERMISSIONS.ACCESS_CONSTRUCTION,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECT_PROGRESS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.CONSTRUCTION_INVENTORY_READ,
    PERMISSIONS.CONSTRUCTION_INVENTORY_CREATE,
    PERMISSIONS.CONSTRUCTION_INVENTORY_UPDATE,
    PERMISSIONS.MANPOWER_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  PROJECT_SUPERVISOR: [
    PERMISSIONS.ACCESS_CONSTRUCTION,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECT_PROGRESS_READ,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.MANPOWER_READ,
    PERMISSIONS.MANPOWER_CREATE,
    PERMISSIONS.MANPOWER_UPDATE,
    PERMISSIONS.WORKFORCE_CONTRACTS_READ,
    PERMISSIONS.WORKFORCE_CONTRACTS_CREATE,
    PERMISSIONS.WORKFORCE_CONTRACTS_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  PROCUREMENT_OFFICER: [
    PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
    PERMISSIONS.CONSTRUCTION_INVENTORY_READ,
    PERMISSIONS.CONSTRUCTION_INVENTORY_CREATE,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_UPDATE,
    PERMISSIONS.PURCHASES_READ,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.PURCHASES_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  STOREKEEPER: [
    PERMISSIONS.ACCESS_CONSTRUCTION,
    PERMISSIONS.CONSTRUCTION_INVENTORY_READ,
    PERMISSIONS.CONSTRUCTION_INVENTORY_CREATE,
    PERMISSIONS.CONSTRUCTION_INVENTORY_UPDATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  MANPOWER_SUPERVISOR: [
    PERMISSIONS.ACCESS_CONSTRUCTION,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.EXPENSES_READ,
    PERMISSIONS.MANPOWER_READ,
    PERMISSIONS.MANPOWER_CREATE,
    PERMISSIONS.MANPOWER_UPDATE,
    PERMISSIONS.MANPOWER_DELETE,
    PERMISSIONS.WORKFORCE_CONTRACTS_READ,
    PERMISSIONS.WORKFORCE_CONTRACTS_CREATE,
    PERMISSIONS.WORKFORCE_CONTRACTS_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  REAL_ESTATE_MANAGER: REAL_ESTATE_ALL,
  SALES_AGENT: [
    PERMISSIONS.ACCESS_REAL_ESTATE,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_UPDATE,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_CREATE,
    PERMISSIONS.DEALS_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  RENTAL_OFFICER: [
    PERMISSIONS.ACCESS_REAL_ESTATE,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.RENTALS_READ,
    PERMISSIONS.RENTALS_CREATE,
    PERMISSIONS.RENTALS_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  PROPERTY_SUPERVISOR: [
    PERMISSIONS.ACCESS_REAL_ESTATE,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_UPDATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  MATERIAL_MANAGER: MATERIAL_ALL,
  SALES_STAFF: [
    PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
    PERMISSIONS.MATERIALS_PRODUCTS_READ,
    PERMISSIONS.MATERIAL_SALES_READ,
    PERMISSIONS.MATERIAL_SALES_CREATE,
    PERMISSIONS.MATERIAL_SALES_UPDATE,
    PERMISSIONS.MATERIAL_CUSTOMERS_READ,
    PERMISSIONS.MATERIAL_CUSTOMERS_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
  INVENTORY_OFFICER: [
    PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
    PERMISSIONS.MATERIALS_PRODUCTS_READ,
    PERMISSIONS.MATERIALS_INVENTORY_READ,
    PERMISSIONS.MATERIALS_INVENTORY_CREATE,
    PERMISSIONS.MATERIALS_INVENTORY_UPDATE,
    PERMISSIONS.MATERIALS_INVENTORY_DELETE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  SUPPLIER_OFFICER: [
    PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_UPDATE,
    PERMISSIONS.SUPPLIERS_DELETE,
    PERMISSIONS.PURCHASES_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  DELIVERY_OFFICER: [
    PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT,
    PERMISSIONS.TRANSPORTATION_READ,
    PERMISSIONS.TRANSPORTATION_CREATE,
    PERMISSIONS.TRANSPORTATION_UPDATE,
    PERMISSIONS.SETTINGS_READ,
  ],
};

// ─── Role → Workspace Isolation ─────────────────────────

export const ROLE_WORKSPACE_MAP: Record<AppRole, WorkspaceKey[]> = {
  SUPER_ADMIN: ["core", "construction", "real_estate", "material_management"],
  COMPANY_OWNER: ["core", "construction", "real_estate", "material_management"],
  GENERAL_MANAGER: ["core", "construction", "real_estate", "material_management"],
  ADMIN: ["core", "construction", "real_estate", "material_management"],
  MANAGER: ["core", "construction", "real_estate", "material_management"],
  CONSTRUCTION_MANAGER: ["construction"],
  SITE_ENGINEER: ["construction"],
  PROJECT_SUPERVISOR: ["construction"],
  PROCUREMENT_OFFICER: ["construction", "material_management"],
  STOREKEEPER: ["construction"],
  MANPOWER_SUPERVISOR: ["construction"],
  REAL_ESTATE_MANAGER: ["real_estate"],
  SALES_AGENT: ["real_estate"],
  RENTAL_OFFICER: ["real_estate"],
  PROPERTY_SUPERVISOR: ["real_estate"],
  MATERIAL_MANAGER: ["material_management"],
  SALES_STAFF: ["material_management"],
  INVENTORY_OFFICER: ["material_management"],
  SUPPLIER_OFFICER: ["material_management"],
  DELIVERY_OFFICER: ["material_management"],
  STAFF: [],
};

// ─── Role → Home Routes (landing after login) ──────────

export const ROLE_HOME_ROUTES: Record<AppRole, string> = {
  SUPER_ADMIN: "/dashboard",
  COMPANY_OWNER: "/dashboard",
  GENERAL_MANAGER: "/dashboard",
  ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  STAFF: "/dashboard/no-access",
  CONSTRUCTION_MANAGER: "/dashboard/construction",
  SITE_ENGINEER: "/dashboard/construction/tasks",
  PROJECT_SUPERVISOR: "/dashboard/construction",
  PROCUREMENT_OFFICER: "/dashboard/materials/purchases",
  STOREKEEPER: "/dashboard/materials/inventory",
  MANPOWER_SUPERVISOR: "/dashboard/construction/manpower",
  REAL_ESTATE_MANAGER: "/dashboard/real-estate",
  SALES_AGENT: "/dashboard/real-estate/deals",
  RENTAL_OFFICER: "/dashboard/real-estate/rentals",
  PROPERTY_SUPERVISOR: "/dashboard/real-estate/properties",
  MATERIAL_MANAGER: "/dashboard/materials",
  SALES_STAFF: "/dashboard/materials/sales",
  INVENTORY_OFFICER: "/dashboard/materials/inventory",
  SUPPLIER_OFFICER: "/dashboard/materials/suppliers",
  DELIVERY_OFFICER: "/dashboard/materials/transportation",
};

// ─── Route → Permission Mapping ────────────────────────
// Used by middleware for route-level protection.
// Most-specific prefixes first.

export const ROUTE_PERMISSION_MAP: Array<{ prefix: string; permission: Permission }> = [
  // Core
  { prefix: "/dashboard/reports", permission: PERMISSIONS.REPORTS_READ },
  { prefix: "/dashboard/analytics", permission: PERMISSIONS.ANALYTICS_READ },
  { prefix: "/dashboard/audits", permission: PERMISSIONS.ACTIVITY_LOGS_READ },
  { prefix: "/dashboard/settings", permission: PERMISSIONS.SETTINGS_READ },
  { prefix: "/dashboard/staff", permission: PERMISSIONS.USERS_READ },
  { prefix: "/dashboard/financials", permission: PERMISSIONS.FINANCIALS_READ },

  // Construction (most-specific first)
  { prefix: "/dashboard/construction/workforce-contracts", permission: PERMISSIONS.WORKFORCE_CONTRACTS_READ },
  { prefix: "/dashboard/construction/manpower", permission: PERMISSIONS.MANPOWER_READ },
  { prefix: "/dashboard/construction/expenses", permission: PERMISSIONS.EXPENSES_READ },
  { prefix: "/dashboard/construction/inventory", permission: PERMISSIONS.CONSTRUCTION_INVENTORY_READ },
  { prefix: "/dashboard/construction/tasks", permission: PERMISSIONS.TASKS_READ },
  { prefix: "/dashboard/construction/progress", permission: PERMISSIONS.PROJECT_PROGRESS_READ },
  { prefix: "/dashboard/construction/projects/new", permission: PERMISSIONS.PROJECTS_CREATE },
  { prefix: "/dashboard/construction/projects/*/edit", permission: PERMISSIONS.PROJECTS_UPDATE },
  { prefix: "/dashboard/construction/projects", permission: PERMISSIONS.PROJECTS_READ },
  { prefix: "/dashboard/construction/reports", permission: PERMISSIONS.REPORTS_READ },
  { prefix: "/dashboard/construction", permission: PERMISSIONS.ACCESS_CONSTRUCTION },

  // Real Estate (most-specific first)
  { prefix: "/dashboard/real-estate/rentals", permission: PERMISSIONS.RENTALS_READ },
  { prefix: "/dashboard/real-estate/sales", permission: PERMISSIONS.DEALS_READ },
  { prefix: "/dashboard/real-estate/deals/new", permission: PERMISSIONS.DEALS_CREATE },
  { prefix: "/dashboard/real-estate/deals/*/edit", permission: PERMISSIONS.DEALS_UPDATE },
  { prefix: "/dashboard/real-estate/deals", permission: PERMISSIONS.DEALS_READ },
  { prefix: "/dashboard/real-estate/clients/new", permission: PERMISSIONS.CLIENTS_CREATE },
  { prefix: "/dashboard/real-estate/clients/*/edit", permission: PERMISSIONS.CLIENTS_UPDATE },
  { prefix: "/dashboard/real-estate/clients", permission: PERMISSIONS.CLIENTS_READ },
  { prefix: "/dashboard/real-estate/properties/new", permission: PERMISSIONS.PROPERTIES_CREATE },
  { prefix: "/dashboard/real-estate/properties/*/edit", permission: PERMISSIONS.PROPERTIES_UPDATE },
  { prefix: "/dashboard/real-estate/properties", permission: PERMISSIONS.PROPERTIES_READ },
  { prefix: "/dashboard/real-estate/reports", permission: PERMISSIONS.REPORTS_READ },
  { prefix: "/dashboard/real-estate", permission: PERMISSIONS.ACCESS_REAL_ESTATE },

  // Material Management (most-specific first)
  { prefix: "/dashboard/materials/inventory", permission: PERMISSIONS.MATERIALS_INVENTORY_READ },
  { prefix: "/dashboard/materials/products", permission: PERMISSIONS.MATERIALS_PRODUCTS_READ },
  { prefix: "/dashboard/materials/suppliers", permission: PERMISSIONS.SUPPLIERS_READ },
  { prefix: "/dashboard/materials/purchases", permission: PERMISSIONS.PURCHASES_READ },
  { prefix: "/dashboard/materials/sales", permission: PERMISSIONS.MATERIAL_SALES_READ },
  { prefix: "/dashboard/materials/transportation", permission: PERMISSIONS.TRANSPORTATION_READ },
  { prefix: "/dashboard/materials", permission: PERMISSIONS.ACCESS_MATERIAL_MANAGEMENT },
];

// ─── Activity Log Access ────────────────────────────────

export const ACTIVITY_LOG_ROLES: AppRole[] = ["SUPER_ADMIN", "COMPANY_OWNER", "GENERAL_MANAGER"];

// ─── Executive Roles (unified dashboard) ────────────────

export const EXECUTIVE_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "COMPANY_OWNER",
  "GENERAL_MANAGER",
  "ADMIN",
  "MANAGER",
];

# MaamulPro — Role & Permission Reference

Single-page reference of the 21 built-in roles and what each is allowed to do.
The runtime source of truth is [`registry.ts`](./registry.ts) and
[`permissions.ts`](./permissions.ts); this file summarises that in prose so
non-developers can review it.

Superuser bypass rules (encoded in `PermissionsGuard`):

- `SUPER_ADMIN` — bypasses every check platform-wide.
- `COMPANY_OWNER` — bypasses every RBAC check inside their company.

Everyone else is granted access **only** through the permissions listed in
their role template. Adding/removing role permissions is done in `registry.ts`
and takes effect on the next tenant RBAC sync (runs at app bootstrap and daily
at 01:15 UTC; can be triggered manually via
`POST /api/superadmin/companies/:id/rbac/sync`).

---

## Executive-tier roles (see everything by default)

| Role | Home | Scope | Notes |
| --- | --- | --- | --- |
| SUPER_ADMIN | `/superadmin/dashboard` | Platform | Only role that can access `/api/superadmin/*` |
| COMPANY_OWNER | `/app/dashboard` | Whole company | Full bypass; used for the primary account per tenant |
| GENERAL_MANAGER | `/app/dashboard` | Whole company | Same permission set as `ADMIN` |
| ADMIN | `/app/dashboard` | Whole company | Same as GM but without `activity_logs.read` |

## Cross-workspace manager

| Role | Landing | Reports | Analytics | Notes |
| --- | --- | --- | --- | --- |
| MANAGER | `/app/dashboard` | all workspaces | all workspaces | Full read across modules + core transactions, financials, payroll (read-only for payroll) |

## STAFF

`STAFF` has **no** permissions in the default template. Assign either direct
permissions or another role via the RBAC UI before the account is useful.

---

## Construction module roles

| Role | Home | Access | Reports scope |
| --- | --- | --- | --- |
| CONSTRUCTION_MANAGER | `/app/construction/overview` | Full CRUD on projects, tasks, budgets, expenses, inventory, manpower, contracts | **Construction only** (`reports.construction.read`) |
| SITE_ENGINEER | `/app/construction/tasks` | Read/update projects, tasks, inventory, manpower | none |
| PROJECT_SUPERVISOR | `/app/construction/overview` | Read/update projects, tasks, manpower, contracts | none |
| STOREKEEPER | `/app/materials/inventory` (construction inventory in practice) | Manage construction inventory | Construction |
| MANPOWER_SUPERVISOR | `/app/construction/manpower` | Full CRUD on manpower + contracts; read expenses | none |
| PROCUREMENT_OFFICER | `/app/materials/purchases` | Suppliers, purchases, construction inventory (create/read/update) | none |

## Real Estate module roles

| Role | Home | Access | Reports scope |
| --- | --- | --- | --- |
| REAL_ESTATE_MANAGER | `/app/real-estate/overview` | Full CRUD on properties, clients, deals, rentals | **Real Estate only** (`reports.real_estate.read`) |
| SALES_AGENT | `/app/real-estate/deals` | Read/update properties, clients, deals | none |
| RENTAL_OFFICER | `/app/real-estate/rentals` | Read/update rentals, tenants, contracts | none |
| PROPERTY_SUPERVISOR | `/app/real-estate/properties` | Read/update properties | Real Estate |

## Material Management module roles

| Role | Home | Access | Reports scope |
| --- | --- | --- | --- |
| MATERIAL_MANAGER | `/app/materials/overview` | Full CRUD on products, inventory, suppliers, purchases, sales, transportation | **Materials only** (`reports.material.read`) |
| SALES_STAFF | `/app/materials/sales` | Read products + create/read/update sales & customers | none |
| INVENTORY_OFFICER | `/app/materials/inventory` | Full CRUD on materials inventory | Materials |
| SUPPLIER_OFFICER | `/app/materials/suppliers` | Full CRUD on suppliers + read purchases | none |
| DELIVERY_OFFICER | `/app/materials/transportation` | Read/update transportation | none |

---

## Fixed gaps (2026-08-02)

The previous defaults were leaking cross-module data. What changed:

1. `CONSTRUCTION_ALL`, `REAL_ESTATE_ALL`, `MATERIAL_ALL` no longer include the
   catch-all `reports.read` / `analytics.read`. Only the workspace-scoped keys
   remain. This is what fixes `CONSTRUCTION_MANAGER` seeing every module's
   reports.
2. `STOREKEEPER`, `PROPERTY_SUPERVISOR`, `INVENTORY_OFFICER` had `reports.read`
   (all reports); they now get only their workspace's scoped reports.
3. The reports controller no longer uses a single `reports.read` gate for
   `GET /api/reports/run/:reportId` and `GET /api/reports/registry`. It now
   requires **any** reports permission at the endpoint and enforces the
   report's own workspace permission per invocation. The registry returned to
   the client is filtered to what the user can see.
4. Report scheduling endpoints (`POST/PATCH/DELETE /api/reports/schedules`)
   used non-existent `reports.create/update/delete` keys. Now gated by
   `reports.admin`.
5. `dashboard.executive.read` is now a distinct permission for
   `GET /api/dashboard/summary`. Only `SUPER_ADMIN`, `COMPANY_OWNER`,
   `GENERAL_MANAGER`, `ADMIN`, `MANAGER` (via `ALL_PERMISSIONS` /
   `ADMIN_ALL` / explicit list) can hit the executive dashboard.
6. `payroll.read` / `payroll.manage` / `payroll.approve` are now registered
   in `PERMISSION_MODULES` so they seed to tenant databases. Previously
   `payroll.*` permissions existed only in code, so only the company owner
   (via bypass) could actually reach payroll endpoints.
7. Sidebar now shows per-workspace **Reports** entries under Construction /
   Real Estate / Materials so module managers can reach `/app/{module}/reports`.
8. Login and the "no access" page now compute a role-based landing route
   (executive dashboard → workspace overview → settings) so a Construction
   Manager no longer lands on `/app/dashboard` (which they cannot see).

## Adding or changing a role

1. Add the role key to `AppRole` in `roles.ts` and give it a hierarchy weight.
2. Add its permission list to `ROLE_PERMISSIONS` in `registry.ts`.
3. Add its home route to `ROLE_HOME_ROUTES` and workspace scope to
   `ROLE_WORKSPACE_MAP`.
4. If it needs to appear on the executive dashboard, add it to
   `EXECUTIVE_ROLES`.
5. Deploy — the next tenant RBAC sync (`syncPermissionsToDb`) will
   create/update it in every tenant database.

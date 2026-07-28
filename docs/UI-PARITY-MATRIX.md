# MaamulPro Vristo UI parity matrix

This matrix is the completion checklist for the React migration. A route is only marked
verified after its visible states, forms, actions, permissions and API effects have been
checked. Next.js detail/new/edit URLs may become React routes or modal states, but their
user-facing behavior must remain available.

| Source UI | Vristo target | Required behavior | Status |
| --- | --- | --- | --- |
| `/login` | `/sign-in` | Tenant login, validation, recovery link | Implemented |
| `/forgot-password`, `/reset-password` | `/forgot-password` | Request, code verification and password reset | Implemented |
| `/locked` | `/locked` | Suspended/expired/no-access explanation | Implemented |
| `/dashboard` | `/app/dashboard` | Executive KPIs, module summaries, recent ledger activity | Implemented |
| `/dashboard/analytics` | `/app/analytics` | Workspace/date filters and analytics cards | Implemented |
| `/dashboard/audits` | `/app/audits` | Search, filters, pagination and clear action | Implemented |
| `/dashboard/staff` | `/app/staff` | Staff CRUD, account, status, email, password, activity and RBAC | Implemented |
| `/dashboard/financials` | `/app/financials` | KPIs, filters, transaction CRUD, categories and accounts | Implemented |
| `/dashboard/financials/profit-loss` | `/app/financials/profit-loss` | Period comparison, totals, CSV and print | Implemented |
| `/dashboard/financials/transaction-detail` | `/app/financials/transaction-detail` | Account/date detail, source links, CSV and print | Implemented |
| `/dashboard/financials/reports` | `/app/financials/reports` | Financial report catalog, filters, preview/export/print | Implemented |
| `/dashboard/payroll` | `/app/payroll` | Payroll list, filters, totals and lifecycle actions | Implemented |
| `/dashboard/payroll/new` | `/app/payroll/new` | Staff-driven payroll wizard and calculations | Implemented |
| `/dashboard/payroll/[id]/edit` | `/app/payroll/:id/edit` | Load and update an editable payroll | Implemented |
| `/dashboard/payroll/payslips` | `/app/payroll/payslips` | Search/filter, detail and printable payslip | Implemented |
| `/dashboard/payroll/reports` | `/app/payroll/reports` | Payroll/staff report catalog and export | Implemented |
| `/dashboard/construction` | `/app/construction` | Construction overview and recent projects | Implemented |
| `/dashboard/construction/projects/new` | `/app/construction/projects/new` | Project form with image upload | Implemented |
| `/dashboard/construction/projects/[id]` | `/app/construction/projects/:id` | Project KPIs, progress, tasks and ledger tabs | Implemented |
| `/dashboard/construction/projects/[id]/edit` | `/app/construction/projects/:id/edit` | Project edit form and image replacement | Implemented |
| `/dashboard/construction/tasks` | `/app/construction/tasks` | Filters, status/priority display, edit and delete | Implemented |
| `/dashboard/construction/tasks/new` | `/app/construction/tasks/new` | Project/staff selectors and task validation | Implemented |
| `/dashboard/construction/progress` | `/app/construction/progress` | Portfolio progress cards and status summaries | Implemented |
| `/dashboard/construction/expenses` | `/app/construction/expenses` | Expense KPIs, filters, edit and delete | Implemented |
| `/dashboard/construction/expenses/new` | `/app/construction/expenses/new` | Project/staff/category selectors | Implemented |
| `/dashboard/construction/manpower` | `/app/construction/manpower` | Workforce KPIs, types, assignments and ledger | Implemented |
| `/dashboard/construction/workforce-contracts` | `/app/construction/contracts` | Contract CRUD, workers, payments, adjustments and status | Implemented |
| `/dashboard/construction/inventory` | `/app/construction/inventory` | Stock KPIs, filters and movements | Implemented |
| `/dashboard/construction/inventory/reports` | `/app/construction/inventory/reports` | Stock valuation and movement report | Implemented |
| `/dashboard/construction/reports` | `/app/construction/reports` | Construction report catalog and export | Implemented |
| `/dashboard/real-estate` | `/app/real-estate` | Property KPIs, cards, filters and actions | Implemented |
| `/dashboard/real-estate/properties/new` | `/app/real-estate/properties/new` | Property form and image upload | Implemented |
| `/dashboard/real-estate/properties/[id]` | `/app/real-estate/properties/:id` | Property details, deals, tenant and ledger tabs | Implemented |
| `/dashboard/real-estate/properties/[id]/edit` | `/app/real-estate/properties/:id/edit` | Property edit and image replacement | Implemented |
| `/dashboard/real-estate/clients` | `/app/real-estate/clients` | Client cards/table and CRUD | Implemented |
| `/dashboard/real-estate/clients/new` | `/app/real-estate/clients/new` | Client form | Implemented |
| `/dashboard/real-estate/clients/[id]` | `/app/real-estate/clients/:id` | Client profile and deal history | Implemented |
| `/dashboard/real-estate/clients/[id]/edit` | `/app/real-estate/clients/:id/edit` | Client edit form | Implemented |
| `/dashboard/real-estate/deals` | `/app/real-estate/deals` | Deal list, filters and payment progress | Implemented |
| `/dashboard/real-estate/deals/new` | `/app/real-estate/deals/new` | Property/client selectors and payment validation | Implemented |
| `/dashboard/real-estate/deals/[id]` | `/app/real-estate/deals/:id` | Deal detail and ledger state | Implemented |
| `/dashboard/real-estate/deals/[id]/edit` | `/app/real-estate/deals/:id/edit` | Deal edit and state synchronization | Implemented |
| `/dashboard/real-estate/rentals` | `/app/real-estate/rentals` | Tenants, contracts, rent payments and receipts | Implemented |
| `/dashboard/real-estate/sales` | `/app/real-estate/sales` | Sales KPIs, payment progress and filters | Implemented |
| `/dashboard/real-estate/reports` | `/app/real-estate/reports` | Real-estate report catalog and export | Implemented |
| `/dashboard/materials` | `/app/materials` | Materials KPIs, alerts, latest purchasing and sales | Implemented |
| `/dashboard/materials/inventory` | `/app/materials/inventory` | Product CRUD, images, stock and warehouse state | Implemented |
| `/dashboard/materials/suppliers` | `/app/materials/suppliers` | Supplier cards/table, balances and CRUD | Implemented |
| `/dashboard/materials/purchases` | `/app/materials/purchases` | Item builder, receive/cancel workflow and totals | Implemented |
| `/dashboard/materials/sales` | `/app/materials/sales` | Customers, invoice item builder, payments and print | Implemented |
| `/dashboard/materials/transportation` | `/app/materials/transportation` | Delivery item builder and lifecycle actions | Implemented |
| `/dashboard/materials/reports` | `/app/materials/reports` | Materials report catalog and export | Implemented |
| `/dashboard/reports` | `/app/reports` | Cross-module report directory and schedules | Implemented |
| `/dashboard/settings` | `/app/settings` | Branding, profile, modules, preferences and security | Implemented |
| `/internal/login` | `/superadmin/login` | Platform login and recovery link | Implemented |
| `/internal/forgot-password`, `/internal/reset-password` | `/superadmin/forgot-password` | Platform password recovery | Implemented |
| `/internal` | `/superadmin/dashboard` | Platform KPIs and company charts | Implemented |
| `/internal/companies` | `/superadmin/companies` | Search/filter and company status list | Implemented |
| `/internal/companies/new` | `/superadmin/companies/new` | Guided company/database/module onboarding | Implemented |
| `/internal/companies/[id]` | `/superadmin/companies/:id` | Company, modules, admin, RBAC, subscription and invoices | Implemented |
| `/internal/subscriptions` | `/superadmin/subscriptions` | Plans, subscriptions, renewals and invoices | Implemented |
| `/internal/account` | `/superadmin/account` | Platform administrator email/password/security | Implemented |

## Shared completion gates

- No raw foreign-key entry where the source provides a selector.
- No raw JSON textarea where the source provides an item builder or wizard.
- Every mutation has loading, validation, success and error feedback.
- Every list has an empty state, search/filter controls and responsive overflow/card behavior.
- Permission-hidden actions are also protected by the NestJS endpoint.
- Print and CSV actions operate on the current filtered report.
- Desktop, tablet and mobile layouts pass browser verification.

## Verification record

- All 62 audited source-page mappings are implemented in React/Vristo.
- Old `/login`, `/dashboard/*`, `/internal/*`, and reset-password bookmarks redirect to
  the corresponding React routes, including nested paths and query strings.
- Unknown URLs use a branded responsive 404 instead of the router's default error UI.
- TypeScript, Vite production build, NestJS production build, four migration contracts,
  and two disposable PostgreSQL provisioning/isolation tests pass.
- Public authentication/recovery/locked pages, protected-route redirects, 390 px mobile,
  and 768 px tablet layouts pass browser smoke checks with no console errors.
- Authenticated role-by-role staging acceptance remains a deployment sign-off gate
  because the configured local central database was unavailable during the live probe.

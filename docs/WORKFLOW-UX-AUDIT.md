# Workflow and UX Audit

Audited: 2026-08-22

## System workflow map

| Module | Required dependency | Result | Natural next action |
| --- | --- | --- | --- |
| Platform administration | Company profile, subscription plan | Provisioned tenant and access | Manage company, billing, or support access |
| People and payroll | Staff member | Payroll period and payslip | Approval, payment, accounting review |
| Finance and accounting | Categories and accounts | Transactions and journal entries | Reports, audit, or reconciliation |
| Construction | Project | Tasks, site expenses, manpower, contracts, inventory movements | Track delivery and project reports |
| Real estate | Property and client/tenant | Deal or rental contract | Generate rent obligations and collect payment |
| Materials | Material, optionally supplier/customer | Purchase, stock receipt, sale, or transportation record | Inventory and financial review |

## Findings and remediation

### Shared record management

**Current workflow:** open a records page → search/filter or create a record.

**Problem:** an empty result used the same generic message whether the system had no records or the active search/filter hid them. Users had no direct recovery action. Dependent selectors could expose an “add” path even when the user could not create that related record.

**Improved workflow:** open a records page → either create the first record, or clear the active filters directly from the empty state. Inline prerequisite creation appears only when its specific permission is available.

**Why:** the page now explains the actual state and does not present actions that end in a permission error.

### Construction

**Current workflow:** project → separately navigate to tasks or expenses → select the project again. A task/expense user could also be unable to load project choices without full project-management permission.

**Improved workflow:** project detail → **New task** or **Record expense** → project is prefilled. Project choices come from a minimal ID/name endpoint available to the relevant construction workflow permissions. A permitted user can also create a missing project from the selector and continue.

**Why:** project context is preserved; the system does not expose project budgets, task lists, or other management data merely to populate a selector.

### Real estate

**Current workflow:** property and client/tenant → deal or lease → monthly invoice generation → payment. The lease hub already correctly communicated the property/tenant prerequisites, but deal and lease forms could fail to load required choices for roles limited to their own workflow.

**Improved workflow:** property detail → **Create deal** or **New lease** with the property already selected. Deal and lease selectors use minimal property/client option endpoints. Inline property/client creation is available only to users who hold the corresponding creation permission.

**Why:** the user continues from the property they are already viewing; RBAC stays least-privilege while the create workflow remains usable.

### Materials

**Current workflow:** material/supplier/customer → purchase, sale, or transportation record. A user authorized for one transaction type could be unable to load its required supplier, customer, or material selector.

**Improved workflow:** transactional forms consume ID/label option endpoints aligned to purchase, sale, and transportation permissions. Supplier, customer, and material fields support inline creation when the user is authorized.

**Why:** operational users can complete their assigned transaction without being granted access to unrelated management screens or duplicate data-entry navigation.

### Session behavior

**Current workflow:** every signed-in company workspace forced a session request every two seconds.

**Improved workflow:** session data is refreshed on a 30-second cadence and immediately when the tab becomes visible again.

**Why:** this avoids continuous redundant requests while preserving timely entitlement and permission refresh.

## Remaining design guardrails

- Keep complex line-item creation in its dedicated transaction form; do not add a second inventory workflow solely for a one-off selector.
- Retain backend validation for every state change and relationship. UI guidance improves the journey but does not replace conflict, stock, date-range, or accounting controls.
- Add a new status only when it changes allowed actions or reporting meaning. Existing lifecycle states should remain transition-driven rather than manually editable when a system event determines them.

## Second-pass implementation notes

### Shared forms and navigation

**Finding:** routes such as `/new` and `/:id/edit` still rendered a modal over a loaded records page. This made a dedicated URL behave like a modal, created unnecessary list requests, and made the browser back action feel unreliable.

**Fix:** `CrudRoutePage` now uses the shared form in standalone page mode. Lists can link to their existing dedicated create/edit routes, and lookup requests are deferred until a form actually opens.

### Payroll

**Finding:** a payroll could be created directly in a review state, while the list showed both **Submit** and **Approve** on a draft. Approve/pay controls were also visible to some manage-level users who would be rejected by the API.

**Fix:** payroll creation always starts in Draft; the lifecycle is Draft → Pending approval → Approved → Paid. The shared transition UI now supports action-level permissions, so approval and payment controls appear only to users with their matching permissions.

### Construction and workforce contracts

**Finding:** a contract/task/expense user could lack full project or staff-management permission and therefore see an empty required selector.

**Fix:** construction flows use scoped project and staff option endpoints, returning only the fields required to make an assignment. Workforce contract creation and worker assignment no longer depend on unrelated full-directory permissions.

### Real estate

**Finding:** property, deal, rent-payment, and lease status fields could contradict the related business records. A Rentals-only user could also fail loading its prerequisite property list.

**Fix:** property and deal/payment states are derived from their business events; lease statuses move through explicit transitions; rent payment status derives from paid amount and due date. The rental hub uses safe property options when full property access is unavailable.

### Materials

**Finding:** purchase and transportation forms allowed a user to select a lifecycle state before the real-world event occurred. Purchase/sale line item selectors still required full inventory access even though transaction permission should be sufficient.

**Fix:** new purchases always begin Draft and deliveries begin Pending; their state changes only through transition actions. Line-item selectors use the constrained material options endpoint. Draft and ordered purchase orders are now reachable through the intended edit route.

### Finance

**Finding:** changing a finance filter repeatedly reloaded categories and every related source list, even though only transactions and summary data changed.

**Fix:** transaction data refreshes with the filter; form options load independently when the available workspace context changes.

### Final operator recovery paths

**Finding:** staff managers could not assign a construction project unless they also had access to the full project register. Empty sales, purchase, and delivery queues required users to infer their next action from a separate page.

**Fix:** the staff form uses the scoped project-options endpoint for users who can manage staff, while the full project register remains protected. Empty queues now offer the relevant create action only when the user has that permission.

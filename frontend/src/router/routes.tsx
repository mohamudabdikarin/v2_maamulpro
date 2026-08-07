import { lazy } from 'react';
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const PasswordRecoveryPage = lazy(() => import('../pages/auth/PasswordRecoveryPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const RbacPage = lazy(() => import('../pages/RbacPage'));
const CrudPage = lazy(() => import('../pages/CrudPage'));
const ConstructionInventoryPage = lazy(() => import('../pages/ConstructionInventoryPage'));
const WorkforceContractsPage = lazy(() => import('../pages/WorkforceContractsPage'));
const ProjectReportsPage = lazy(() => import('../pages/ProjectReportsPage'));
const SuperAdminBillingPage = lazy(() => import('../pages/SuperAdminBillingPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const NoAccessPage = lazy(() => import('../pages/NoAccessPage'));
const LockedPage = lazy(() => import('../pages/LockedPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const StaffPage = lazy(() => import('../pages/StaffPage'));
const FinancialsPage = lazy(() => import('../pages/FinancialsPage'));
const PayrollEditorPage = lazy(() => import('../pages/PayrollEditorPage'));
const PayslipsPage = lazy(() => import('../pages/PayslipsPage'));
const AccountsPage = lazy(() => import('../pages/AccountsPage'));
const JournalEntriesPage = lazy(() => import('../pages/JournalEntriesPage'));
const FinancialReportsPage = lazy(() => import('../pages/FinancialReportsPage'));
const AuditsPage = lazy(() => import('../pages/AuditsPage'));
const CrudRoutePage = lazy(() => import('../pages/CrudRoutePage'));
const EntityDetailPage = lazy(() => import('../pages/EntityDetailPage'));
const ConstructionOverviewPage = lazy(() => import('../pages/ConstructionOverviewPage'));
const ConstructionProjectsPage = lazy(() => import('../pages/ConstructionProjectsPage'));
const ConstructionProgressPage = lazy(() => import('../pages/ConstructionProgressPage'));
const ManpowerPage = lazy(() => import('../pages/ManpowerPage'));
import { expenseFields, projectFields, taskFields } from '../pages/constructionConfig';
const RealEstateOverviewPage = lazy(() => import('../pages/RealEstateOverviewPage'));
const PropertiesPage = lazy(() => import('../pages/PropertiesPage'));
const RentalHubPage = lazy(() => import('../pages/RentalHubPage'));
const PropertySalesPage = lazy(() => import('../pages/PropertySalesPage'));
import { clientFields, dealFields, propertyFields, rentalContractFields, rentPaymentFields } from '../pages/realEstateConfig';

const MaterialsOverviewPage = lazy(() => import('../pages/MaterialsOverviewPage'));
const MaterialsInventoryPage = lazy(() => import('../pages/MaterialsInventoryPage'));
import { customerFields, materialFields, purchaseFields, saleFields, supplierFields, transportationFields } from '../pages/materialsConfig';

const SuperAdminCompaniesPage = lazy(() => import('../pages/SuperAdminCompaniesPage'));
const CompanyOnboardingPage = lazy(() => import('../pages/CompanyOnboardingPage'));
const SuperAdminCompanyPage = lazy(() => import('../pages/SuperAdminCompanyPage'));
const SuperAdminAccountPage = lazy(() => import('../pages/SuperAdminAccountPage'));
const ReportSchedulesPage = lazy(() => import('../pages/ReportSchedulesPage'));
const LegacyRedirectPage = lazy(() => import('../pages/LegacyRedirectPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

/** Nested report drill-down routes — each workspace loads different entities/data. */
const reportRoutes = (basePath: string, permission: string, workspace: 'construction' | 'real_estate' | 'material_management' | 'payroll' | 'core') => [
    { path: basePath, element: <ProjectReportsPage key={workspace} basePath={basePath} workspace={workspace} />, layout: 'blank' as const, permission },
    { path: `${basePath}/:projectId`, element: <ProjectReportsPage key={workspace} basePath={basePath} workspace={workspace} />, layout: 'blank' as const, permission },
    { path: `${basePath}/:projectId/:category`, element: <ProjectReportsPage key={workspace} basePath={basePath} workspace={workspace} />, layout: 'blank' as const, permission },
    { path: `${basePath}/:projectId/:category/:txnId`, element: <ProjectReportsPage key={workspace} basePath={basePath} workspace={workspace} />, layout: 'blank' as const, permission },
];

const routes = [
    { path: '/', element: <LoginPage />, layout: 'blank' },
    { path: '/login', element: <LegacyRedirectPage />, layout: 'blank' },
    { path: '/sign-in', element: <LoginPage />, layout: 'blank' },
    { path: '/forgot-password', element: <PasswordRecoveryPage />, layout: 'blank' },
    { path: '/reset-password', element: <LegacyRedirectPage />, layout: 'blank' },
    { path: '/locked', element: <LockedPage />, layout: 'blank' },
    { path: '/internal', element: <LegacyRedirectPage />, layout: 'blank' },
    { path: '/internal/*', element: <LegacyRedirectPage />, layout: 'blank' },
    { path: '/dashboard', element: <LegacyRedirectPage />, layout: 'blank' },
    { path: '/dashboard/*', element: <LegacyRedirectPage />, layout: 'blank' },
    { path: '/superadmin/login', element: <LoginPage />, layout: 'blank' },
    { path: '/superadmin/forgot-password', element: <PasswordRecoveryPage />, layout: 'blank' },
    { path: '/app/dashboard', element: <DashboardPage />, layout: 'blank', permission: 'dashboard.executive.read' },
    { path: '/app/analytics', element: <AnalyticsPage />, layout: 'blank', permission: 'analytics.read' },
    { path: '/app/no-access', element: <NoAccessPage />, layout: 'blank' },
    { path: '/app/staff', element: <StaffPage />, layout: 'blank', permission: 'users.read' },
    { path: '/app/financials', element: <FinancialsPage />, layout: 'blank', permission: 'financials.read' },
    { path: '/app/financials/categories', element: <CrudPage title="Financial Categories" description="Reusable income and expense classifications." endpoint="/api/financials/categories" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code' }, { name: 'color', label: 'Color' }, { name: 'description', label: 'Description', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'financials.read' },
    { path: '/app/financials/accounts', element: <AccountsPage />, layout: 'blank', permission: 'accounting.read' },
    { path: '/app/financials/journals', element: <JournalEntriesPage />, layout: 'blank', permission: 'accounting.read' },
    { path: '/app/financials/financial-reports', element: <FinancialReportsPage />, layout: 'blank', permission: 'accounting.read' },
    ...reportRoutes('/app/financials/reports', 'reports.read', 'core'),
    { path: '/app/financials/profit-loss', element: <ProjectReportsPage key="core" basePath="/app/financials/reports" workspace="core" />, layout: 'blank', permission: 'financials.read' },
    { path: '/app/financials/transaction-detail', element: <ProjectReportsPage key="core" basePath="/app/financials/reports" workspace="core" />, layout: 'blank', permission: 'financials.read' },
    { path: '/app/payroll', element: <CrudPage title="Payroll" description="Payroll periods, employee calculations, approvals, rejection and payment state." endpoint="/api/payroll" canEdit={(row) => ['DRAFT', 'REJECTED'].includes(row.status)} canDelete={(row) => row.status === 'DRAFT'} transitions={[
        { action: 'submit', label: 'Submit', tone: 'primary', when: ['DRAFT', 'REJECTED'] }, { action: 'approve', label: 'Approve', tone: 'success', when: ['DRAFT', 'PENDING_APPROVAL'] },
        { action: 'reject', label: 'Reject', tone: 'danger', when: ['PENDING_APPROVAL'] }, { action: 'pay', label: 'Pay', tone: 'success', when: ['APPROVED'] }, { action: 'reopen', label: 'Reopen', tone: 'warning', when: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] },
    ]} fields={[
        { name: 'name', label: 'Payroll name', required: true }, { name: 'year', label: 'Year', type: 'number', required: true },
        { name: 'month', label: 'Month', type: 'number', required: true }, { name: 'payPeriod', label: 'Pay period' },
        { name: 'paymentDate', label: 'Payment date', type: 'date' }, { name: 'expenseAccountCode', label: 'Expense account', lookup: { endpoint: '/api/payroll/options/accounts', valueKey: 'code', labelKeys: ['code', 'name'] } },
        { name: 'status', label: 'Initial status', type: 'select', options: ['DRAFT', 'PENDING_APPROVAL'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
        { name: 'items', label: 'Employees and payroll amounts', type: 'lineItems', required: true, lineItems: {
            endpoint: '/api/payroll/options/staff', idField: 'staffId', labelKeys: ['firstName', 'lastName'], selectorLabel: 'Employee',
            populate: { 'firstName+lastName': 'employeeName', position: 'employeePosition', department: 'employeeDepartment', salary: 'baseSalary' },
            fields: [
                { name: 'employeeName', label: 'Name', required: true }, { name: 'baseSalary', label: 'Base salary', type: 'number', min: 0, required: true },
                { name: 'bonuses', label: 'Bonuses', type: 'number', min: 0, required: true }, { name: 'deductions', label: 'Deductions', type: 'number', min: 0, required: true },
                { name: 'tax', label: 'Tax', type: 'number', min: 0, required: true },
            ],
        } },
    ]} />, layout: 'blank', permission: 'payroll.read' },
    { path: '/app/payroll/new', element: <PayrollEditorPage mode="create" />, layout: 'blank', permission: 'payroll.manage' },
    { path: '/app/payroll/:id/edit', element: <PayrollEditorPage mode="edit" />, layout: 'blank', permission: 'payroll.manage' },
    { path: '/app/payroll/payslips', element: <PayslipsPage />, layout: 'blank', permission: 'payroll.read' },
    ...reportRoutes('/app/payroll/reports', 'reports.read', 'payroll'),
    { path: '/app/construction', element: <ConstructionOverviewPage />, layout: 'blank', permission: 'workspace.construction.read' },
    { path: '/app/construction/overview', element: <ConstructionOverviewPage />, layout: 'blank', permission: 'workspace.construction.read' },
    { path: '/app/construction/projects', element: <ConstructionProjectsPage />, layout: 'blank', permission: 'projects.read' },
    { path: '/app/construction/projects/new', element: <CrudRoutePage title="New construction project" description="Set the project identity, budget, schedule, image and initial delivery state." endpoint="/api/construction/projects" fields={projectFields} initialMode="create" returnTo="/app/construction/projects" />, layout: 'blank', permission: 'projects.create' },
    { path: '/app/construction/projects/:id/edit', element: <CrudRoutePage title="Edit construction project" description="Update the budget, schedule, delivery state and project presentation." endpoint="/api/construction/projects" fields={projectFields} initialMode="edit" returnTo="/app/construction/projects" />, layout: 'blank', permission: 'projects.update' },
    { path: '/app/construction/projects/:id', element: <EntityDetailPage titleKey="name" endpoint="/api/construction/projects" backTo="/app/construction/projects" editTo={(id) => `/app/construction/projects/${id}/edit`} imageKey="imageUrl" statusKey="status" primaryFields={['description', 'location', 'budget', 'progress', 'startDate', 'endDate']} moneyKeys={['budget', 'amount', 'originalBudget']} dateKeys={['startDate', 'endDate', 'dueDate', 'date']} sections={[{ key: 'tasks', title: 'Project tasks' }, { key: 'assignedStaff', title: 'Assigned staff' }, { key: 'dailyExpenses', title: 'Operational expenses' }, { key: 'workforceContracts', title: 'Workforce contracts' }]} />, layout: 'blank', permission: 'projects.read' },
    { path: '/app/construction/tasks', element: <CrudPage title="Project Tasks" description="Task ownership, priority, deadlines and progress." endpoint="/api/construction/tasks" fields={taskFields} />, layout: 'blank', permission: 'construction_tasks.read' },
    { path: '/app/construction/tasks/new', element: <CrudRoutePage title="New project task" description="Assign work, priority, schedule and completion targets." endpoint="/api/construction/tasks" fields={taskFields} initialMode="create" returnTo="/app/construction/tasks" />, layout: 'blank', permission: 'construction_tasks.create' },
    { path: '/app/construction/tasks/:id/edit', element: <CrudRoutePage title="Edit project task" description="Update assignment, progress, status and deadline." endpoint="/api/construction/tasks" fields={taskFields} initialMode="edit" returnTo="/app/construction/tasks" />, layout: 'blank', permission: 'construction_tasks.update' },
    { path: '/app/construction/progress', element: <ConstructionProgressPage />, layout: 'blank', permission: 'project_progress.read' },
    { path: '/app/construction/expenses', element: <CrudPage title="Operational Expenses" description="Daily construction costs synchronized with the unified financial ledger." endpoint="/api/construction/expenses" fields={expenseFields} />, layout: 'blank', permission: 'construction_expenses.read' },
    { path: '/app/construction/expenses/new', element: <CrudRoutePage title="Record site expense" description="Record a project or worker-linked construction cost." endpoint="/api/construction/expenses" fields={expenseFields} initialMode="create" returnTo="/app/construction/expenses" />, layout: 'blank', permission: 'construction_expenses.create' },
    { path: '/app/construction/expenses/:id/edit', element: <CrudRoutePage title="Edit site expense" description="Correct the amount, category, assignment or expense date." endpoint="/api/construction/expenses" fields={expenseFields} initialMode="edit" returnTo="/app/construction/expenses" />, layout: 'blank', permission: 'construction_expenses.update' },
    { path: '/app/construction/manpower', element: <ManpowerPage />, layout: 'blank', permission: 'manpower.read' },
    { path: '/app/construction/worker-types', element: <CrudPage title="Worker Types" description="Reusable workforce classifications and display colors." endpoint="/api/construction/worker-types" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'color', label: 'Color' }, { name: 'description', label: 'Description', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'manpower.read' },
    { path: '/app/construction/worker-ledger', element: <CrudPage title="Worker Ledger" description="Labor income and expenses synchronized with the unified ledger." endpoint="/api/construction/worker-ledger" canEdit={false} fields={[
        { name: 'type', label: 'Type', type: 'select', required: true, options: ['INCOME', 'EXPENSE'].map((value) => ({ value, label: value })) },
        { name: 'amount', label: 'Amount', type: 'number', required: true }, { name: 'description', label: 'Description', required: true },
        { name: 'date', label: 'Date', type: 'date' }, { name: 'projectId', label: 'Project', lookup: { endpoint: '/api/construction/projects', labelKeys: ['name'] } }, { name: 'staffId', label: 'Staff member', lookup: { endpoint: '/api/staff', labelKeys: ['firstName', 'lastName'] } },
    ]} />, layout: 'blank', permission: 'manpower.read' },
    { path: '/app/construction/inventory', element: <ConstructionInventoryPage />, layout: 'blank', permission: 'construction_inventory.read' },
    { path: '/app/construction/contracts', element: <WorkforceContractsPage />, layout: 'blank', permission: 'workforce_contracts.read' },
    ...reportRoutes('/app/construction/inventory/reports', 'reports.construction.read', 'construction'),
    ...reportRoutes('/app/construction/reports', 'reports.construction.read', 'construction'),
    { path: '/app/real-estate', element: <RealEstateOverviewPage />, layout: 'blank', permission: 'workspace.real_estate.read' },
    { path: '/app/real-estate/overview', element: <RealEstateOverviewPage />, layout: 'blank', permission: 'workspace.real_estate.read' },
    { path: '/app/real-estate/properties', element: <PropertiesPage />, layout: 'blank', permission: 'properties.read' },
    { path: '/app/real-estate/properties/new', element: <CrudRoutePage title="Add property" description="Create a complete property listing with valuation, specifications and imagery." endpoint="/api/real-estate/properties" fields={propertyFields} initialMode="create" returnTo="/app/real-estate/properties" />, layout: 'blank', permission: 'properties.create' },
    { path: '/app/real-estate/properties/:id/edit', element: <CrudRoutePage title="Edit property" description="Update the listing, valuation, availability and property imagery." endpoint="/api/real-estate/properties" fields={propertyFields} initialMode="edit" returnTo="/app/real-estate/properties" />, layout: 'blank', permission: 'properties.update' },
    { path: '/app/real-estate/properties/:id', element: <EntityDetailPage titleKey="title" endpoint="/api/real-estate/properties" backTo="/app/real-estate/properties" editTo={(id) => `/app/real-estate/properties/${id}/edit`} imageKey="imageUrl" statusKey="status" primaryFields={['type', 'description', 'address', 'price', 'area', 'bedrooms', 'bathrooms']} moneyKeys={['price', 'totalAmount', 'paidAmount', 'monthlyRent', 'amount']} dateKeys={['closedAt', 'startDate', 'endDate', 'date']} sections={[{ key: 'deals', title: 'Property deals' }, { key: 'rentalContracts', title: 'Rental contracts' }, { key: 'tenants', title: 'Tenants' }, { key: 'transactions', title: 'Financial transactions' }]} />, layout: 'blank', permission: 'properties.read' },
    { path: '/app/real-estate/clients', element: <CrudPage title="Real Estate Clients" description="Buyer, seller and investor contact directory." endpoint="/api/real-estate/clients" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'clients.read' },
    { path: '/app/real-estate/clients/new', element: <CrudRoutePage title="New real estate client" description="Add a buyer, seller, landlord or investor contact." endpoint="/api/real-estate/clients" fields={clientFields} initialMode="create" returnTo="/app/real-estate/clients" />, layout: 'blank', permission: 'clients.create' },
    { path: '/app/real-estate/clients/:id/edit', element: <CrudRoutePage title="Edit client" description="Update client contact details and notes." endpoint="/api/real-estate/clients" fields={clientFields} initialMode="edit" returnTo="/app/real-estate/clients" />, layout: 'blank', permission: 'clients.update' },
    { path: '/app/real-estate/clients/:id', element: <EntityDetailPage titleKey="name" endpoint="/api/real-estate/clients" backTo="/app/real-estate/clients" editTo={(id) => `/app/real-estate/clients/${id}/edit`} primaryFields={['email', 'phone', 'notes']} moneyKeys={['totalAmount', 'paidAmount']} dateKeys={['closedAt']} sections={[{ key: 'deals', title: 'Client deals' }]} />, layout: 'blank', permission: 'clients.read' },
    { path: '/app/real-estate/deals', element: <CrudPage title="Property Deals" description="Sales and rentals with synchronized payment and financial-ledger state." endpoint="/api/real-estate/deals" fields={[
        { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } }, { name: 'clientId', label: 'Client', required: true, lookup: { endpoint: '/api/real-estate/clients', labelKeys: ['name'] } },
        { name: 'type', label: 'Type', type: 'select', required: true, options: ['SALE', 'RENTAL'].map((value) => ({ value, label: value })) },
        { name: 'paymentStatus', label: 'Payment status', type: 'select', options: ['PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'REFUNDED'].map((value) => ({ value, label: value })) },
        { name: 'totalAmount', label: 'Total amount', type: 'number', required: true }, { name: 'paidAmount', label: 'Paid amount', type: 'number' },
        { name: 'closedAt', label: 'Closed date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'deals.read' },
    { path: '/app/real-estate/deals/new', element: <CrudRoutePage title="New property deal" description="Create a sale or rental deal and initialize settlement tracking." endpoint="/api/real-estate/deals" fields={dealFields} initialMode="create" returnTo="/app/real-estate/deals" />, layout: 'blank', permission: 'deals.create' },
    { path: '/app/real-estate/deals/:id/edit', element: <CrudRoutePage title="Edit property deal" description="Update value, settlement, payment state and closing notes." endpoint="/api/real-estate/deals" fields={dealFields} initialMode="edit" returnTo="/app/real-estate/deals" />, layout: 'blank', permission: 'deals.update' },
    { path: '/app/real-estate/deals/:id', element: <EntityDetailPage titleKey="type" endpoint="/api/real-estate/deals" backTo="/app/real-estate/deals" editTo={(id) => `/app/real-estate/deals/${id}/edit`} statusKey="paymentStatus" primaryFields={['totalAmount', 'paidAmount', 'closedAt', 'notes']} moneyKeys={['totalAmount', 'paidAmount', 'amount']} dateKeys={['closedAt', 'date']} sections={[{ key: 'transactions', title: 'Financial transactions' }]} />, layout: 'blank', permission: 'deals.read' },
    { path: '/app/real-estate/sales', element: <PropertySalesPage />, layout: 'blank', permission: 'deals.read' },
    { path: '/app/real-estate/rentals', element: <RentalHubPage />, layout: 'blank', permission: 'rentals.read' },
    { path: '/app/real-estate/tenants', element: <CrudPage title="Tenants" description="Tenant identity, contact and assigned property records." endpoint="/api/real-estate/tenants" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Phone' },
        { name: 'nationalIdPassport', label: 'National ID / Passport' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'rentals.read' },
    { path: '/app/real-estate/rental-contracts', element: <CrudPage title="Rental Contracts" description="Lease periods, rent values, renewals and contract status." endpoint="/api/real-estate/rental-contracts" fields={[
        { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } }, { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } },
        { name: 'monthlyRent', label: 'Monthly rent', type: 'number', required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true },
        { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'renewalDate', label: 'Renewal date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'TERMINATED'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
        { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'rentals.read' },
    { path: '/app/real-estate/rental-contracts/new', element: <CrudRoutePage title="New rental contract" description="Create a lease agreement linking a tenant to a property with rent terms." endpoint="/api/real-estate/rental-contracts" fields={rentalContractFields} initialMode="create" returnTo="/app/real-estate/rentals" />, layout: 'blank', permission: 'rentals.create' },
    { path: '/app/real-estate/rental-contracts/:id/edit', element: <CrudRoutePage title="Edit rental contract" description="Update lease terms, status and renewal dates." endpoint="/api/real-estate/rental-contracts" fields={rentalContractFields} initialMode="edit" returnTo="/app/real-estate/rental-contracts" />, layout: 'blank', permission: 'rentals.update' },
    { path: '/app/real-estate/rent-payments', element: <CrudPage title="Rent Payments" description="Rent due, collections, receipts and overdue status synchronized to financials." endpoint="/api/real-estate/rent-payments" transitions={[
        { action: 'paid', label: 'Mark paid', tone: 'success', path: 'status', body: { status: 'PAID' }, when: ['UNPAID', 'LATE', 'PARTIAL'] },
        { action: 'partial', label: 'Mark partial', tone: 'warning', path: 'status', body: { status: 'PARTIAL' }, when: ['UNPAID', 'LATE'] },
        { action: 'late', label: 'Mark late', tone: 'danger', path: 'status', body: { status: 'LATE' }, when: ['UNPAID', 'PARTIAL'] },
    ]} fields={[
        { name: 'contractId', label: 'Rental contract', lookup: { endpoint: '/api/real-estate/rental-contracts', labelKeys: ['tenant.name', 'property.title', 'startDate'], populate: { tenantId: 'tenantId', monthlyRent: 'amountDue' } } },
        { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } },
        { name: 'dueDate', label: 'Due date', type: 'date', required: true }, { name: 'paidDate', label: 'Paid date', type: 'date' },
        { name: 'amountDue', label: 'Amount due', type: 'number', required: true }, { name: 'amountPaid', label: 'Amount paid', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: ['PAID', 'UNPAID', 'LATE', 'PARTIAL'].map((value) => ({ value, label: value })) },
        { name: 'receiptNo', label: 'Receipt number' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank', permission: 'rentals.read' },
    { path: '/app/real-estate/rent-payments/new', element: <CrudRoutePage title="Record rent payment" description="Log a tenant payment against a lease contract." endpoint="/api/real-estate/rent-payments" fields={rentPaymentFields} initialMode="create" returnTo="/app/real-estate/rentals" />, layout: 'blank', permission: 'rentals.create' },
    { path: '/app/real-estate/rent-payments/:id/edit', element: <CrudRoutePage title="Edit rent payment" description="Correct amounts, dates or receipt details." endpoint="/api/real-estate/rent-payments" fields={rentPaymentFields} initialMode="edit" returnTo="/app/real-estate/rent-payments" />, layout: 'blank', permission: 'rentals.update' },

    ...reportRoutes('/app/real-estate/reports', 'reports.real_estate.read', 'real_estate'),
    { path: '/app/materials', element: <MaterialsOverviewPage />, layout: 'blank', permission: 'workspace.material_management.read' },
    { path: '/app/materials/overview', element: <MaterialsOverviewPage />, layout: 'blank', permission: 'workspace.material_management.read' },
    { path: '/app/materials/inventory', element: <MaterialsInventoryPage />, layout: 'blank', permission: 'materials_inventory.read' },
    { path: '/app/materials/inventory/manage', element: <CrudPage title="Manage material products" description="Add, edit or retire product records, images, costs, pricing and stock thresholds." endpoint="/api/materials/products" fields={materialFields} />, layout: 'blank', permission: 'materials_products.read' },
    { path: '/app/materials/inventory/manage/new', element: <CrudRoutePage title="Add material product" description="Create a new material product listing with pricing and stock parameters." endpoint="/api/materials/products" fields={materialFields} initialMode="create" returnTo="/app/materials/inventory" />, layout: 'blank', permission: 'materials_products.create' },
    { path: '/app/materials/inventory/manage/:id/edit', element: <CrudRoutePage title="Edit material product" description="Update pricing, costs, warehouse or threshold settings." endpoint="/api/materials/products" fields={materialFields} initialMode="edit" returnTo="/app/materials/inventory" />, layout: 'blank', permission: 'materials_products.update' },
    { path: '/app/materials/suppliers', element: <CrudPage title="Suppliers" description="Procurement suppliers, balances and contact details." endpoint="/api/materials/suppliers" fields={supplierFields} />, layout: 'blank', permission: 'suppliers.read' },
    { path: '/app/materials/suppliers/new', element: <CrudRoutePage title="Add supplier" description="Create a new procurement supplier record." endpoint="/api/materials/suppliers" fields={supplierFields} initialMode="create" returnTo="/app/materials/suppliers" />, layout: 'blank', permission: 'suppliers.create' },
    { path: '/app/materials/suppliers/:id/edit', element: <CrudRoutePage title="Edit supplier" description="Update supplier contact details and opening balance." endpoint="/api/materials/suppliers" fields={supplierFields} initialMode="edit" returnTo="/app/materials/suppliers" />, layout: 'blank', permission: 'suppliers.update' },
    { path: '/app/materials/purchases', element: <CrudPage title="Purchase Orders" description="Orders with received-stock, weighted-cost and supplier-ledger synchronization." endpoint="/api/materials/purchases" canEdit={false} transitions={[
        { action: 'ordered', label: 'Mark ordered', tone: 'primary', path: 'status', body: { status: 'ORDERED' }, when: ['DRAFT'] },
        { action: 'received', label: 'Receive stock', tone: 'success', path: 'status', body: { status: 'RECEIVED' }, when: ['DRAFT', 'ORDERED'] },
        { action: 'cancelled', label: 'Cancel', tone: 'danger', path: 'status', body: { status: 'CANCELLED' }, when: ['DRAFT', 'ORDERED'] },
        { action: 'reopen', label: 'Reopen draft', tone: 'warning', path: 'status', body: { status: 'DRAFT' }, when: ['CANCELLED'] },
    ]} fields={purchaseFields} />, layout: 'blank', permission: 'purchases.read' },
    { path: '/app/materials/purchases/new', element: <CrudRoutePage title="Create purchase order" description="Draft a material order with supplier and line items." endpoint="/api/materials/purchases" fields={purchaseFields} initialMode="create" returnTo="/app/materials/purchases" />, layout: 'blank', permission: 'purchases.create' },
    { path: '/app/materials/purchases/:id/edit', element: <CrudRoutePage title="Edit purchase order" description="Modify purchase order line items and dates." endpoint="/api/materials/purchases" fields={purchaseFields} initialMode="edit" returnTo="/app/materials/purchases" />, layout: 'blank', permission: 'purchases.update' },
    { path: '/app/materials/customers', element: <CrudPage title="Material Customers" description="Customer accounts for material sales and invoices." endpoint="/api/materials/customers" fields={customerFields} />, layout: 'blank', permission: 'material_customers.read' },
    { path: '/app/materials/customers/new', element: <CrudRoutePage title="Add customer" description="Register a customer account for material sales." endpoint="/api/materials/customers" fields={customerFields} initialMode="create" returnTo="/app/materials/customers" />, layout: 'blank', permission: 'material_customers.read' },
    { path: '/app/materials/customers/:id/edit', element: <CrudRoutePage title="Edit customer" description="Update customer contact details." endpoint="/api/materials/customers" fields={customerFields} initialMode="edit" returnTo="/app/materials/customers" />, layout: 'blank', permission: 'material_customers.update' },
    { path: '/app/materials/sales', element: <CrudPage title="Material Sales" description="Invoices with stock reversal, discounts, revenue and receivable synchronization." endpoint="/api/materials/sales" printable fields={saleFields} />, layout: 'blank', permission: 'material_sales.read' },
    { path: '/app/materials/sales/new', element: <CrudRoutePage title="Create sales invoice" description="Issue a material sales invoice to a customer." endpoint="/api/materials/sales" fields={saleFields} initialMode="create" returnTo="/app/materials/sales" />, layout: 'blank', permission: 'material_sales.create' },
    { path: '/app/materials/sales/:id/edit', element: <CrudRoutePage title="Edit sales invoice" description="Update invoice discount or notes." endpoint="/api/materials/sales" fields={saleFields} initialMode="edit" returnTo="/app/materials/sales" />, layout: 'blank', permission: 'material_sales.update' },
    { path: '/app/materials/transportation', element: <CrudPage title="Transportation" description="Delivery tracking with expense posting when delivered." endpoint="/api/materials/transportation" transitions={[
        { action: 'in_transit', label: 'Start transit', tone: 'primary', path: 'status', body: { status: 'IN_TRANSIT' }, when: ['PENDING'] },
        { action: 'delivered', label: 'Mark delivered', tone: 'success', path: 'status', body: { status: 'DELIVERED' }, when: ['PENDING', 'IN_TRANSIT'] },
        { action: 'cancelled', label: 'Cancel', tone: 'danger', path: 'status', body: { status: 'CANCELLED' }, when: ['PENDING', 'IN_TRANSIT'] },
    ]} fields={transportationFields} />, layout: 'blank', permission: 'transportation.read' },
    { path: '/app/materials/transportation/new', element: <CrudRoutePage title="New delivery record" description="Log a material transportation and delivery dispatch." endpoint="/api/materials/transportation" fields={transportationFields} initialMode="create" returnTo="/app/materials/transportation" />, layout: 'blank', permission: 'transportation.create' },
    { path: '/app/materials/transportation/:id/edit', element: <CrudRoutePage title="Edit delivery record" description="Update delivery status, cost or notes." endpoint="/api/materials/transportation" fields={transportationFields} initialMode="edit" returnTo="/app/materials/transportation" />, layout: 'blank', permission: 'transportation.update' },
    ...reportRoutes('/app/materials/reports', 'reports.material.read', 'material_management'),

    ...reportRoutes('/app/reports', 'reports.read', 'core'),
    { path: '/app/report-schedules', element: <ReportSchedulesPage />, layout: 'blank', permission: 'reports.admin' },
    { path: '/app/audits', element: <AuditsPage />, layout: 'blank', permission: 'activity_logs.read' },
    { path: '/app/notifications', element: <NotificationsPage />, layout: 'blank' },
    { path: '/app/roles', element: <RbacPage />, layout: 'blank', permission: 'roles.read' },
    { path: '/app/settings', element: <SettingsPage />, layout: 'blank', permission: 'settings.read' },
    { path: '/superadmin/dashboard', element: <DashboardPage superAdmin />, layout: 'blank' },
    { path: '/superadmin/companies', element: <SuperAdminCompaniesPage />, layout: 'blank' },
    { path: '/superadmin/companies/new', element: <CompanyOnboardingPage />, layout: 'blank' },
    { path: '/superadmin/companies/:id', element: <SuperAdminCompanyPage />, layout: 'blank' },
    { path: '/superadmin/account', element: <SuperAdminAccountPage />, layout: 'blank' },
    { path: '/superadmin/billing', element: <SuperAdminBillingPage />, layout: 'blank' },
    { path: '*', element: <NotFoundPage />, layout: 'blank' },
];

export { routes };

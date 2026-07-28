import { lazy } from 'react';
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const PasswordRecoveryPage = lazy(() => import('../pages/auth/PasswordRecoveryPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const RbacPage = lazy(() => import('../pages/RbacPage'));
const CrudPage = lazy(() => import('../pages/CrudPage'));
const ConstructionInventoryPage = lazy(() => import('../pages/ConstructionInventoryPage'));
const WorkforceContractsPage = lazy(() => import('../pages/WorkforceContractsPage'));
const ReportsCenterPage = lazy(() => import('../pages/ReportsCenterPage'));
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
import { clientFields, dealFields, propertyFields } from '../pages/realEstateConfig';
const MaterialsOverviewPage = lazy(() => import('../pages/MaterialsOverviewPage'));
const MaterialsInventoryPage = lazy(() => import('../pages/MaterialsInventoryPage'));
import { materialFields } from '../pages/materialsConfig';
const SuperAdminCompaniesPage = lazy(() => import('../pages/SuperAdminCompaniesPage'));
const CompanyOnboardingPage = lazy(() => import('../pages/CompanyOnboardingPage'));
const SuperAdminCompanyPage = lazy(() => import('../pages/SuperAdminCompanyPage'));
const SuperAdminAccountPage = lazy(() => import('../pages/SuperAdminAccountPage'));
const ReportSchedulesPage = lazy(() => import('../pages/ReportSchedulesPage'));
const SubscriptionPlansPage = lazy(() => import('../pages/SubscriptionPlansPage'));
const LegacyRedirectPage = lazy(() => import('../pages/LegacyRedirectPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

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
    { path: '/app/dashboard', element: <DashboardPage />, layout: 'blank' },
    { path: '/app/analytics', element: <AnalyticsPage />, layout: 'blank' },
    { path: '/app/no-access', element: <NoAccessPage />, layout: 'blank' },
    { path: '/app/staff', element: <StaffPage />, layout: 'blank' },
    { path: '/app/financials', element: <FinancialsPage />, layout: 'blank' },
    { path: '/app/financials/categories', element: <CrudPage title="Financial Categories" description="Reusable income and expense classifications." endpoint="/api/financials/categories" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code' }, { name: 'color', label: 'Color' }, { name: 'description', label: 'Description', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/financials/accounts', element: <AccountsPage />, layout: 'blank' },
    { path: '/app/financials/profit-loss', element: <ReportsCenterPage workspace="core" title="Profit & Loss" defaultReportId="core-profit-summary" />, layout: 'blank' },
    { path: '/app/financials/transaction-detail', element: <ReportsCenterPage workspace="core" title="Transaction Detail By Account" defaultReportId="core-transaction-detail" />, layout: 'blank' },
    { path: '/app/financials/reports', element: <ReportsCenterPage workspace="core" title="Financial Reports" />, layout: 'blank' },
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
    ]} />, layout: 'blank' },
    { path: '/app/payroll/new', element: <PayrollEditorPage mode="create" />, layout: 'blank' },
    { path: '/app/payroll/:id/edit', element: <PayrollEditorPage mode="edit" />, layout: 'blank' },
    { path: '/app/payroll/payslips', element: <PayslipsPage />, layout: 'blank' },
    { path: '/app/payroll/reports', element: <ReportsCenterPage workspace="payroll" title="Payroll & Staff Reports" />, layout: 'blank' },
    { path: '/app/construction', element: <ConstructionOverviewPage />, layout: 'blank' },
    { path: '/app/construction/overview', element: <ConstructionOverviewPage />, layout: 'blank' },
    { path: '/app/construction/projects', element: <ConstructionProjectsPage />, layout: 'blank' },
    { path: '/app/construction/projects/new', element: <CrudRoutePage title="New construction project" description="Set the project identity, budget, schedule, image and initial delivery state." endpoint="/api/construction/projects" fields={projectFields} initialMode="create" returnTo="/app/construction/projects" />, layout: 'blank' },
    { path: '/app/construction/projects/:id/edit', element: <CrudRoutePage title="Edit construction project" description="Update the budget, schedule, delivery state and project presentation." endpoint="/api/construction/projects" fields={projectFields} initialMode="edit" returnTo="/app/construction/projects" />, layout: 'blank' },
    { path: '/app/construction/projects/:id', element: <EntityDetailPage titleKey="name" endpoint="/api/construction/projects" backTo="/app/construction/projects" editTo={(id) => `/app/construction/projects/${id}/edit`} imageKey="imageUrl" statusKey="status" primaryFields={['description', 'location', 'budget', 'progress', 'startDate', 'endDate']} moneyKeys={['budget', 'amount', 'originalBudget']} dateKeys={['startDate', 'endDate', 'dueDate', 'date']} sections={[{ key: 'tasks', title: 'Project tasks' }, { key: 'assignedStaff', title: 'Assigned staff' }, { key: 'dailyExpenses', title: 'Operational expenses' }, { key: 'workforceContracts', title: 'Workforce contracts' }]} />, layout: 'blank' },
    { path: '/app/construction/tasks', element: <CrudPage title="Project Tasks" description="Task ownership, priority, deadlines and progress." endpoint="/api/construction/tasks" fields={taskFields} />, layout: 'blank' },
    { path: '/app/construction/tasks/new', element: <CrudRoutePage title="New project task" description="Assign work, priority, schedule and completion targets." endpoint="/api/construction/tasks" fields={taskFields} initialMode="create" returnTo="/app/construction/tasks" />, layout: 'blank' },
    { path: '/app/construction/tasks/:id/edit', element: <CrudRoutePage title="Edit project task" description="Update assignment, progress, status and deadline." endpoint="/api/construction/tasks" fields={taskFields} initialMode="edit" returnTo="/app/construction/tasks" />, layout: 'blank' },
    { path: '/app/construction/progress', element: <ConstructionProgressPage />, layout: 'blank' },
    { path: '/app/construction/expenses', element: <CrudPage title="Operational Expenses" description="Daily construction costs synchronized with the unified financial ledger." endpoint="/api/construction/expenses" fields={expenseFields} />, layout: 'blank' },
    { path: '/app/construction/expenses/new', element: <CrudRoutePage title="Record site expense" description="Record a project or worker-linked construction cost." endpoint="/api/construction/expenses" fields={expenseFields} initialMode="create" returnTo="/app/construction/expenses" />, layout: 'blank' },
    { path: '/app/construction/expenses/:id/edit', element: <CrudRoutePage title="Edit site expense" description="Correct the amount, category, assignment or expense date." endpoint="/api/construction/expenses" fields={expenseFields} initialMode="edit" returnTo="/app/construction/expenses" />, layout: 'blank' },
    { path: '/app/construction/manpower', element: <ManpowerPage />, layout: 'blank' },
    { path: '/app/construction/worker-types', element: <CrudPage title="Worker Types" description="Reusable workforce classifications and display colors." endpoint="/api/construction/worker-types" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'color', label: 'Color' }, { name: 'description', label: 'Description', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/construction/worker-ledger', element: <CrudPage title="Worker Ledger" description="Labor income and expenses synchronized with the unified ledger." endpoint="/api/construction/worker-ledger" canEdit={false} fields={[
        { name: 'type', label: 'Type', type: 'select', required: true, options: ['INCOME', 'EXPENSE'].map((value) => ({ value, label: value })) },
        { name: 'amount', label: 'Amount', type: 'number', required: true }, { name: 'description', label: 'Description', required: true },
        { name: 'date', label: 'Date', type: 'date' }, { name: 'projectId', label: 'Project', lookup: { endpoint: '/api/construction/projects', labelKeys: ['name'] } }, { name: 'staffId', label: 'Staff member', lookup: { endpoint: '/api/staff', labelKeys: ['firstName', 'lastName'] } },
    ]} />, layout: 'blank' },
    { path: '/app/construction/inventory', element: <ConstructionInventoryPage />, layout: 'blank' },
    { path: '/app/construction/contracts', element: <WorkforceContractsPage />, layout: 'blank' },
    { path: '/app/construction/inventory/reports', element: <ReportsCenterPage workspace="construction" title="Inventory Reports" defaultReportId="construction-material-usage" />, layout: 'blank' },
    { path: '/app/construction/reports', element: <ReportsCenterPage workspace="construction" title="Construction Reports" />, layout: 'blank' },
    { path: '/app/real-estate', element: <RealEstateOverviewPage />, layout: 'blank' },
    { path: '/app/real-estate/overview', element: <RealEstateOverviewPage />, layout: 'blank' },
    { path: '/app/real-estate/properties', element: <PropertiesPage />, layout: 'blank' },
    { path: '/app/real-estate/properties/new', element: <CrudRoutePage title="Add property" description="Create a complete property listing with valuation, specifications and imagery." endpoint="/api/real-estate/properties" fields={propertyFields} initialMode="create" returnTo="/app/real-estate/properties" />, layout: 'blank' },
    { path: '/app/real-estate/properties/:id/edit', element: <CrudRoutePage title="Edit property" description="Update the listing, valuation, availability and property imagery." endpoint="/api/real-estate/properties" fields={propertyFields} initialMode="edit" returnTo="/app/real-estate/properties" />, layout: 'blank' },
    { path: '/app/real-estate/properties/:id', element: <EntityDetailPage titleKey="title" endpoint="/api/real-estate/properties" backTo="/app/real-estate/properties" editTo={(id) => `/app/real-estate/properties/${id}/edit`} imageKey="imageUrl" statusKey="status" primaryFields={['type', 'description', 'address', 'price', 'area', 'bedrooms', 'bathrooms']} moneyKeys={['price', 'totalAmount', 'paidAmount', 'monthlyRent', 'amount']} dateKeys={['closedAt', 'startDate', 'endDate', 'date']} sections={[{ key: 'deals', title: 'Property deals' }, { key: 'rentalContracts', title: 'Rental contracts' }, { key: 'tenants', title: 'Tenants' }, { key: 'transactions', title: 'Financial transactions' }]} />, layout: 'blank' },
    { path: '/app/real-estate/clients', element: <CrudPage title="Real Estate Clients" description="Buyer, seller and investor contact directory." endpoint="/api/real-estate/clients" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/real-estate/clients/new', element: <CrudRoutePage title="New real estate client" description="Add a buyer, seller, landlord or investor contact." endpoint="/api/real-estate/clients" fields={clientFields} initialMode="create" returnTo="/app/real-estate/clients" />, layout: 'blank' },
    { path: '/app/real-estate/clients/:id/edit', element: <CrudRoutePage title="Edit client" description="Update client contact details and notes." endpoint="/api/real-estate/clients" fields={clientFields} initialMode="edit" returnTo="/app/real-estate/clients" />, layout: 'blank' },
    { path: '/app/real-estate/clients/:id', element: <EntityDetailPage titleKey="name" endpoint="/api/real-estate/clients" backTo="/app/real-estate/clients" editTo={(id) => `/app/real-estate/clients/${id}/edit`} primaryFields={['email', 'phone', 'notes']} moneyKeys={['totalAmount', 'paidAmount']} dateKeys={['closedAt']} sections={[{ key: 'deals', title: 'Client deals' }]} />, layout: 'blank' },
    { path: '/app/real-estate/deals', element: <CrudPage title="Property Deals" description="Sales and rentals with synchronized payment and financial-ledger state." endpoint="/api/real-estate/deals" fields={[
        { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } }, { name: 'clientId', label: 'Client', required: true, lookup: { endpoint: '/api/real-estate/clients', labelKeys: ['name'] } },
        { name: 'type', label: 'Type', type: 'select', required: true, options: ['SALE', 'RENTAL'].map((value) => ({ value, label: value })) },
        { name: 'paymentStatus', label: 'Payment status', type: 'select', options: ['PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'REFUNDED'].map((value) => ({ value, label: value })) },
        { name: 'totalAmount', label: 'Total amount', type: 'number', required: true }, { name: 'paidAmount', label: 'Paid amount', type: 'number' },
        { name: 'closedAt', label: 'Closed date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/real-estate/deals/new', element: <CrudRoutePage title="New property deal" description="Create a sale or rental deal and initialize settlement tracking." endpoint="/api/real-estate/deals" fields={dealFields} initialMode="create" returnTo="/app/real-estate/deals" />, layout: 'blank' },
    { path: '/app/real-estate/deals/:id/edit', element: <CrudRoutePage title="Edit property deal" description="Update value, settlement, payment state and closing notes." endpoint="/api/real-estate/deals" fields={dealFields} initialMode="edit" returnTo="/app/real-estate/deals" />, layout: 'blank' },
    { path: '/app/real-estate/deals/:id', element: <EntityDetailPage titleKey="type" endpoint="/api/real-estate/deals" backTo="/app/real-estate/deals" editTo={(id) => `/app/real-estate/deals/${id}/edit`} statusKey="paymentStatus" primaryFields={['totalAmount', 'paidAmount', 'closedAt', 'notes']} moneyKeys={['totalAmount', 'paidAmount', 'amount']} dateKeys={['closedAt', 'date']} sections={[{ key: 'transactions', title: 'Financial transactions' }]} />, layout: 'blank' },
    { path: '/app/real-estate/sales', element: <PropertySalesPage />, layout: 'blank' },
    { path: '/app/real-estate/rentals', element: <RentalHubPage />, layout: 'blank' },
    { path: '/app/real-estate/tenants', element: <CrudPage title="Tenants" description="Tenant identity, contact and assigned property records." endpoint="/api/real-estate/tenants" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Phone' },
        { name: 'nationalIdPassport', label: 'National ID / Passport' }, { name: 'propertyId', label: 'Property', lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/real-estate/rental-contracts', element: <CrudPage title="Rental Contracts" description="Lease periods, rent values, renewals and contract status." endpoint="/api/real-estate/rental-contracts" fields={[
        { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } }, { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } },
        { name: 'monthlyRent', label: 'Monthly rent', type: 'number', required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true },
        { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'renewalDate', label: 'Renewal date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'TERMINATED'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
        { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/real-estate/rent-payments', element: <CrudPage title="Rent Payments" description="Rent due, collections, receipts and overdue status synchronized to financials." endpoint="/api/real-estate/rent-payments" transitions={[
        { action: 'paid', label: 'Mark paid', tone: 'success', path: 'status', body: { status: 'PAID' }, when: ['UNPAID', 'LATE', 'PARTIAL'] },
        { action: 'partial', label: 'Mark partial', tone: 'warning', path: 'status', body: { status: 'PARTIAL' }, when: ['UNPAID', 'LATE'] },
        { action: 'late', label: 'Mark late', tone: 'danger', path: 'status', body: { status: 'LATE' }, when: ['UNPAID', 'PARTIAL'] },
    ]} fields={[
        { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } }, { name: 'contractId', label: 'Rental contract', lookup: { endpoint: '/api/real-estate/rental-contracts', labelKeys: ['tenant.name', 'property.title', 'startDate'] } },
        { name: 'dueDate', label: 'Due date', type: 'date', required: true }, { name: 'paidDate', label: 'Paid date', type: 'date' },
        { name: 'amountDue', label: 'Amount due', type: 'number', required: true }, { name: 'amountPaid', label: 'Amount paid', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: ['PAID', 'UNPAID', 'LATE', 'PARTIAL'].map((value) => ({ value, label: value })) },
        { name: 'receiptNo', label: 'Receipt number' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/real-estate/reports', element: <ReportsCenterPage workspace="real_estate" title="Real Estate Reports" />, layout: 'blank' },
    { path: '/app/materials', element: <MaterialsOverviewPage />, layout: 'blank' },
    { path: '/app/materials/overview', element: <MaterialsOverviewPage />, layout: 'blank' },
    { path: '/app/materials/inventory', element: <MaterialsInventoryPage />, layout: 'blank' },
    { path: '/app/materials/inventory/manage', element: <CrudPage title="Manage material products" description="Add, edit or retire product records, images, costs, pricing and stock thresholds." endpoint="/api/materials/products" fields={materialFields} />, layout: 'blank' },
    { path: '/app/materials/suppliers', element: <CrudPage title="Suppliers" description="Procurement suppliers, balances and contact details." endpoint="/api/materials/suppliers" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Phone' },
        { name: 'address', label: 'Address' }, { name: 'balance', label: 'Opening balance', type: 'number' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/materials/purchases', element: <CrudPage title="Purchase Orders" description="Orders with received-stock, weighted-cost and supplier-ledger synchronization." endpoint="/api/materials/purchases" canEdit={false} transitions={[
        { action: 'ordered', label: 'Mark ordered', tone: 'primary', path: 'status', body: { status: 'ORDERED' }, when: ['DRAFT'] },
        { action: 'received', label: 'Receive stock', tone: 'success', path: 'status', body: { status: 'RECEIVED' }, when: ['DRAFT', 'ORDERED'] },
        { action: 'cancelled', label: 'Cancel', tone: 'danger', path: 'status', body: { status: 'CANCELLED' }, when: ['DRAFT', 'ORDERED'] },
        { action: 'reopen', label: 'Reopen draft', tone: 'warning', path: 'status', body: { status: 'DRAFT' }, when: ['CANCELLED'] },
    ]} fields={[
        { name: 'orderNo', label: 'Order number', required: true }, { name: 'supplierId', label: 'Supplier', lookup: { endpoint: '/api/materials/suppliers', labelKeys: ['name'] } },
        { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].map((value) => ({ value, label: value })) },
        { name: 'orderedAt', label: 'Ordered date', type: 'date' }, { name: 'receivedAt', label: 'Received date', type: 'date' },
        { name: 'items', label: 'Purchase items', type: 'lineItems', required: true, lineItems: {
            endpoint: '/api/materials/products', idField: 'materialId', labelKeys: ['name'], selectorLabel: 'Material',
            populate: { unitCost: 'unitCost' },
            fields: [{ name: 'quantity', label: 'Quantity', type: 'number', min: 0.01, required: true }, { name: 'unitCost', label: 'Unit cost', type: 'number', min: 0, required: true }],
        } },
        { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/materials/customers', element: <CrudPage title="Material Customers" description="Customer accounts for material sales and invoices." endpoint="/api/materials/customers" fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Phone' },
        { name: 'address', label: 'Address' }, { name: 'balance', label: 'Balance', type: 'number' },
    ]} />, layout: 'blank' },
    { path: '/app/materials/sales', element: <CrudPage title="Material Sales" description="Invoices with stock reversal, discounts, revenue and receivable synchronization." endpoint="/api/materials/sales" printable fields={[
        { name: 'invoiceNo', label: 'Invoice number', required: true }, { name: 'customerId', label: 'Customer', lookup: { endpoint: '/api/materials/customers', labelKeys: ['name'] } },
        { name: 'paidAmount', label: 'Paid amount', type: 'number' }, { name: 'discountPercent', label: 'Discount %', type: 'number' },
        { name: 'date', label: 'Invoice date', type: 'date' },
        { name: 'items', label: 'Invoice items', type: 'lineItems', required: true, lineItems: {
            endpoint: '/api/materials/products', idField: 'materialId', labelKeys: ['name'], selectorLabel: 'Material',
            populate: { salePrice: 'unitPrice' },
            fields: [{ name: 'quantity', label: 'Quantity', type: 'number', min: 0.01, required: true }, { name: 'unitPrice', label: 'Unit price', type: 'number', min: 0, required: true }],
        } },
        { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/materials/transportation', element: <CrudPage title="Transportation" description="Delivery tracking with expense posting when delivered." endpoint="/api/materials/transportation" transitions={[
        { action: 'in_transit', label: 'Start transit', tone: 'primary', path: 'status', body: { status: 'IN_TRANSIT' }, when: ['PENDING'] },
        { action: 'delivered', label: 'Mark delivered', tone: 'success', path: 'status', body: { status: 'DELIVERED' }, when: ['PENDING', 'IN_TRANSIT'] },
        { action: 'cancelled', label: 'Cancel', tone: 'danger', path: 'status', body: { status: 'CANCELLED' }, when: ['PENDING', 'IN_TRANSIT'] },
    ]} fields={[
        { name: 'deliveryNo', label: 'Delivery number', required: true }, { name: 'responsiblePerson', label: 'Responsible person', required: true },
        { name: 'materialId', label: 'Material', required: true, lookup: { endpoint: '/api/materials/products', labelKeys: ['name'] } }, { name: 'quantity', label: 'Quantity', type: 'number', required: true },
        { name: 'cost', label: 'Cost', type: 'number', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
        { name: 'deliveryDate', label: 'Delivery date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea' },
    ]} />, layout: 'blank' },
    { path: '/app/materials/reports', element: <ReportsCenterPage workspace="material_management" title="Materials Reports" />, layout: 'blank' },
    { path: '/app/reports', element: <ReportsCenterPage />, layout: 'blank' },
    { path: '/app/report-schedules', element: <ReportSchedulesPage />, layout: 'blank' },
    { path: '/app/audits', element: <AuditsPage />, layout: 'blank' },
    { path: '/app/notifications', element: <NotificationsPage />, layout: 'blank' },
    { path: '/app/roles', element: <RbacPage />, layout: 'blank' },
    { path: '/app/settings', element: <SettingsPage />, layout: 'blank' },
    { path: '/superadmin/dashboard', element: <DashboardPage superAdmin />, layout: 'blank' },
    { path: '/superadmin/companies', element: <SuperAdminCompaniesPage />, layout: 'blank' },
    { path: '/superadmin/companies/new', element: <CompanyOnboardingPage />, layout: 'blank' },
    { path: '/superadmin/companies/:id', element: <SuperAdminCompanyPage />, layout: 'blank' },
    { path: '/superadmin/account', element: <SuperAdminAccountPage />, layout: 'blank' },
    { path: '/superadmin/plans', element: <SubscriptionPlansPage />, layout: 'blank' },
    { path: '/superadmin/billing', element: <SuperAdminBillingPage />, layout: 'blank' },
    { path: '*', element: <NotFoundPage />, layout: 'blank' },
];

export { routes };

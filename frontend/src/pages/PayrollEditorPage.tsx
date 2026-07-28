import CrudRoutePage from './CrudRoutePage';
import { CrudField } from './CrudPage';

export const payrollFields: CrudField[] = [
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
];

const PayrollEditorPage = ({ mode }: { mode: 'create' | 'edit' }) => <CrudRoutePage title="Payroll" description="Build payroll from eligible staff with automatic gross and net calculations." endpoint="/api/payroll" fields={payrollFields} initialMode={mode} returnTo="/app/payroll" />;
export default PayrollEditorPage;

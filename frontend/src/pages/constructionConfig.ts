import { CrudField } from './CrudPage';

const options = (values: string[]) => values.map((value) => ({ value, label: value.replace(/_/g, ' ') }));

export const projectFields: CrudField[] = [
    { name: 'name', label: 'Project name', required: true },
    { name: 'location', label: 'Location' },
    { name: 'budget', label: 'Budget', type: 'number', required: true },
    { name: 'progress', label: 'Progress %', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: options(['PLANNING', 'ONGOING', 'ON_HOLD', 'COMPLETED', 'CANCELLED']) },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'endDate', label: 'End date', type: 'date' },
    { name: 'imageUrl', label: 'Project image', type: 'image', uploadFolder: 'projects' },
    { name: 'description', label: 'Description', type: 'textarea' },
];

export const taskFields: CrudField[] = [
    { name: 'projectId', label: 'Project', required: true, lookup: { endpoint: '/api/construction/projects', labelKeys: ['name'] } },
    { name: 'title', label: 'Task title', required: true },
    { name: 'status', label: 'Status', type: 'select', options: options(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']) },
    { name: 'priority', label: 'Priority', type: 'select', options: options(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) },
    { name: 'progress', label: 'Progress %', type: 'number' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'assigneeId', label: 'Account assignee', lookup: { endpoint: '/api/staff/accounts', labelKeys: ['name', 'email'] } },
    { name: 'staffId', label: 'Staff assignee', lookup: { endpoint: '/api/staff', labelKeys: ['firstName', 'lastName'] } },
    { name: 'description', label: 'Description', type: 'textarea' },
];

export const expenseFields: CrudField[] = [
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'description', label: 'Description', required: true },
    { name: 'category', label: 'Category', type: 'select', options: options(['LABOR', 'MATERIALS', 'EQUIPMENT', 'TRANSPORT', 'UTILITIES', 'FOOD', 'OTHER']) },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'projectId', label: 'Project', lookup: { endpoint: '/api/construction/projects', labelKeys: ['name'] } },
    { name: 'staffId', label: 'Staff member', lookup: { endpoint: '/api/staff', labelKeys: ['firstName', 'lastName'] } },
];

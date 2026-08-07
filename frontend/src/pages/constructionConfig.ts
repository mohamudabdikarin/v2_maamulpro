import { CrudField } from './CrudPage';

const options = (values: string[]) => values.map((value) => ({ value, label: value.replace(/_/g, ' ') }));

export const projectFields: CrudField[] = [
    { name: 'name', label: 'Project name', required: true, placeholder: 'Dhismaha Xarunta Hodan' },
    { name: 'location', label: 'Location', placeholder: 'Hodan, Muqdisho' },
    { name: 'budget', label: 'Budget', type: 'number', required: true, placeholder: '250000' },
    { name: 'progress', label: 'Progress %', type: 'number', placeholder: '35', hint: 'Geli boqolkiiba u dhexeeya 0 iyo 100.' },
    { name: 'status', label: 'Status', type: 'select', options: options(['PLANNING', 'ONGOING', 'ON_HOLD', 'COMPLETED', 'CANCELLED']) },
    { name: 'startDate', label: 'Start date', type: 'date' },
    { name: 'endDate', label: 'End date', type: 'date' },
    { name: 'imageUrl', label: 'Project image', type: 'image', uploadFolder: 'projects' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Sharax ujeedada mashruuca iyo baaxaddiisa.' },
];

export const taskFields: CrudField[] = [
    { name: 'projectId', label: 'Project', required: true, lookup: { endpoint: '/api/construction/projects', labelKeys: ['name'] } },
    { name: 'title', label: 'Task title', required: true, placeholder: 'Dhammaystir darbiga koowaad' },
    { name: 'status', label: 'Status', type: 'select', options: options(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']) },
    { name: 'priority', label: 'Priority', type: 'select', options: options(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) },
    { name: 'progress', label: 'Progress %', type: 'number', placeholder: '50', hint: 'Geli boqolkiiba u dhexeeya 0 iyo 100.' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'staffId', label: 'Assigned staff member', lookup: { endpoint: '/api/staff', labelKeys: ['firstName', 'lastName'] } },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Sharax shaqada, natiijada la filayo, iyo wixii caqabad ah.' },
];

export const expenseFields: CrudField[] = [
    { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '1500' },
    { name: 'description', label: 'Description', required: true, placeholder: 'Iibsiga sibidhka goobta' },
    { name: 'category', label: 'Category', type: 'select', options: options(['LABOR', 'MATERIALS', 'EQUIPMENT', 'TRANSPORT', 'UTILITIES', 'FOOD', 'OTHER']) },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'projectId', label: 'Project', lookup: { endpoint: '/api/construction/projects', labelKeys: ['name'] } },
    { name: 'staffId', label: 'Staff member', lookup: { endpoint: '/api/staff', labelKeys: ['firstName', 'lastName'] } },
];

import { CrudField } from './CrudPage';

const options = (values: string[]) => values.map((value) => ({ value, label: value.replace(/_/g, ' ') }));

export const propertyFields: CrudField[] = [
    { name: 'title', label: 'Title', required: true },
    { name: 'type', label: 'Type', type: 'select', required: true, options: options(['HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL']) },
    { name: 'status', label: 'Status', type: 'select', options: options(['AVAILABLE', 'SOLD', 'RENTED', 'UNDER_CONTRACT']) },
    { name: 'price', label: 'Price', type: 'number', required: true },
    { name: 'area', label: 'Area', type: 'number' },
    { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { name: 'bathrooms', label: 'Bathrooms', type: 'number' },
    { name: 'address', label: 'Address' },
    { name: 'imageUrl', label: 'Property image', type: 'image', uploadFolder: 'properties' },
    { name: 'description', label: 'Description', type: 'textarea' },
];

export const clientFields: CrudField[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const dealFields: CrudField[] = [
    { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } },
    { name: 'clientId', label: 'Client', required: true, lookup: { endpoint: '/api/real-estate/clients', labelKeys: ['name'] } },
    { name: 'type', label: 'Type', type: 'select', required: true, options: options(['SALE', 'RENTAL']) },
    { name: 'paymentStatus', label: 'Payment status', type: 'select', options: options(['PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'REFUNDED']) },
    { name: 'totalAmount', label: 'Total amount', type: 'number', required: true },
    { name: 'paidAmount', label: 'Paid amount', type: 'number' },
    { name: 'closedAt', label: 'Closed date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const tenantFields: CrudField[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' },
    { name: 'nationalIdPassport', label: 'National ID / Passport' },
    { name: 'propertyId', label: 'Property', lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const rentalContractFields: CrudField[] = [
    { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } },
    { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'] } },
    { name: 'monthlyRent', label: 'Monthly rent', type: 'number', required: true },
    { name: 'startDate', label: 'Start date', type: 'date', required: true },
    { name: 'endDate', label: 'End date', type: 'date', required: true },
    { name: 'renewalDate', label: 'Renewal date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: options(['ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'TERMINATED']) },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const rentPaymentFields: CrudField[] = [
    { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } },
    { name: 'contractId', label: 'Rental contract', lookup: { endpoint: '/api/real-estate/rental-contracts', labelKeys: ['tenant.name', 'property.title', 'startDate'] } },
    { name: 'dueDate', label: 'Due date', type: 'date', required: true },
    { name: 'paidDate', label: 'Paid date', type: 'date' },
    { name: 'amountDue', label: 'Amount due', type: 'number', required: true },
    { name: 'amountPaid', label: 'Amount paid', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: options(['PAID', 'UNPAID', 'LATE', 'PARTIAL']) },
    { name: 'receiptNo', label: 'Receipt number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

import { CrudField } from './CrudPage';

const options = (values: string[]) => values.map((value) => ({ value, label: value.replace(/_/g, ' ') }));

export const propertyFields: CrudField[] = [
    { name: 'title', label: 'Title', required: true, placeholder: 'Guri 4-qol ah oo Hodan ku yaal' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: options(['HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL']) },
    { name: 'status', label: 'Status', type: 'select', options: options(['AVAILABLE', 'SOLD', 'RENTED', 'UNDER_CONTRACT']) },
    { name: 'price', label: 'Price', type: 'number', required: true, placeholder: '85000' },
    { name: 'area', label: 'Area', type: 'number', placeholder: '180' },
    { name: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: '4' },
    { name: 'bathrooms', label: 'Bathrooms', type: 'number', placeholder: '3' },
    { name: 'address', label: 'Address', placeholder: 'Waddada Maka Al-Mukarama, Muqdisho' },
    { name: 'imageUrl', label: 'Property image', type: 'image', uploadFolder: 'properties' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Ku sharax xaaladda, adeegyada, iyo muuqaalada hantida.' },
];

// Compact essentials for inline creation (no image, no long description); the property record can be enriched later on its detail page.
const propertyQuickFields: CrudField[] = [
    { name: 'title', label: 'Title', required: true, placeholder: 'Guri 4-qol ah oo Hodan ku yaal' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: options(['HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL']) },
    { name: 'price', label: 'Price', type: 'number', required: true, placeholder: '85000' },
    { name: 'address', label: 'Address', placeholder: 'Waddada Maka Al-Mukarama, Muqdisho' },
];

export const clientFields: CrudField[] = [
    { name: 'name', label: 'Name', required: true, placeholder: 'Aamina Maxamed' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'aamina@tusaale.so' },
    { name: 'phone', label: 'Phone', placeholder: '+252 61 234 5678' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Faahfaahin dheeraad ah oo ku saabsan macmiilka.' },
];

export const dealFields: CrudField[] = [
    { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'], create: { fields: propertyQuickFields } } },
    { name: 'clientId', label: 'Client', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'], create: { fields: clientFields } } },
    { name: 'type', label: 'Type', type: 'select', required: true, options: options(['SALE', 'RENTAL']) },
    { name: 'paymentStatus', label: 'Payment status', type: 'select', options: options(['PAID', 'PARTIAL', 'PENDING', 'OVERDUE', 'REFUNDED']) },
    { name: 'totalAmount', label: 'Total amount', type: 'number', required: true, placeholder: '85000' },
    { name: 'paidAmount', label: 'Paid amount', type: 'number', placeholder: '25000' },
    { name: 'closedAt', label: 'Closed date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const tenantFields: CrudField[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' },
    { name: 'nationalIdPassport', label: 'National ID / Passport' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const rentalContractFields: CrudField[] = [
    { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'], create: { fields: tenantFields } } },
    { name: 'propertyId', label: 'Property', required: true, lookup: { endpoint: '/api/real-estate/properties', labelKeys: ['title'], create: { fields: propertyQuickFields } } },
    { name: 'monthlyRent', label: 'Monthly rent', type: 'number', required: true },
    { name: 'startDate', label: 'Start date', type: 'date', required: true },
    { name: 'endDate', label: 'End date', type: 'date', required: true },
    { name: 'renewalDate', label: 'Renewal date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: options(['ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'TERMINATED']) },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const rentPaymentFields: CrudField[] = [
    { name: 'contractId', label: 'Rental contract', lookup: { endpoint: '/api/real-estate/rental-contracts', labelKeys: ['tenant.name', 'property.title', 'startDate'], populate: { tenantId: 'tenantId', monthlyRent: 'amountDue' } } },
    { name: 'tenantId', label: 'Tenant', required: true, lookup: { endpoint: '/api/real-estate/tenants', labelKeys: ['name'] } },
    { name: 'dueDate', label: 'Due date', type: 'date', required: true },
    { name: 'paidDate', label: 'Paid date', type: 'date' },
    { name: 'amountDue', label: 'Amount due', type: 'number', required: true },
    { name: 'amountPaid', label: 'Amount paid', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: options(['PAID', 'UNPAID', 'LATE', 'PARTIAL']) },
    { name: 'receiptNo', label: 'Receipt number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];

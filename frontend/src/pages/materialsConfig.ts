import { CrudField } from './CrudPage';

export const materialFields: CrudField[] = [
    { name: 'name', label: 'Name', required: true, placeholder: 'Sibidhka Dangote 50kg' }, { name: 'category', label: 'Category', placeholder: 'Sibidh' }, { name: 'materialType', label: 'Material type', placeholder: 'Dhismo' },
    { name: 'unit', label: 'Unit', type: 'select', required: true, options: ['KG', 'BAG', 'PIECE', 'METER', 'LITER', 'TON'].map((value) => ({ value, label: value })) },
    { name: 'unitCost', label: 'Unit cost', type: 'number', required: true, placeholder: '8.50' }, { name: 'salePrice', label: 'Sale price', type: 'number', required: true, placeholder: '10.00' },
    { name: 'quantity', label: 'Opening quantity', type: 'number', placeholder: '100' }, { name: 'warehouse', label: 'Warehouse', placeholder: 'Bakhaarka Weyn' },
    { name: 'lowStockThreshold', label: 'Low stock threshold', type: 'number', placeholder: '15' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'].map((value) => ({ value, label: value })) },
    { name: 'photoUrl', label: 'Product image', type: 'image', uploadFolder: 'materials' },
];

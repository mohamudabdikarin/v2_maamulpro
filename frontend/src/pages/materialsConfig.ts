import { CrudField } from './CrudPage';

export const materialFields: CrudField[] = [
    { name: 'name', label: 'Name', required: true }, { name: 'category', label: 'Category' }, { name: 'materialType', label: 'Material type' },
    { name: 'unit', label: 'Unit', type: 'select', required: true, options: ['KG', 'BAG', 'PIECE', 'METER', 'LITER', 'TON'].map((value) => ({ value, label: value })) },
    { name: 'unitCost', label: 'Unit cost', type: 'number', required: true }, { name: 'salePrice', label: 'Sale price', type: 'number', required: true },
    { name: 'quantity', label: 'Opening quantity', type: 'number' }, { name: 'warehouse', label: 'Warehouse' },
    { name: 'lowStockThreshold', label: 'Low stock threshold', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'].map((value) => ({ value, label: value })) },
    { name: 'photoUrl', label: 'Product image', type: 'image', uploadFolder: 'materials' },
];

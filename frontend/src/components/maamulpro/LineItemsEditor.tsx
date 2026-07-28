import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { unwrapRows } from '../../hooks/useApiData';
import { Field } from './PageKit';

export type LineItemConfig = {
    endpoint: string;
    idField: string;
    labelKeys: string[];
    selectorLabel: string;
    populate?: Record<string, string>;
    fields: { name: string; label: string; type?: 'text' | 'number'; min?: number; required?: boolean }[];
};

const LineItemsEditor = ({ value, onChange, config }: { value: Record<string, any>[]; onChange: (items: Record<string, any>[]) => void; config: LineItemConfig }) => {
    const [options, setOptions] = useState<Record<string, any>[]>([]);
    const [error, setError] = useState('');
    useEffect(() => {
        api<unknown>(config.endpoint).then((result) => setOptions(unwrapRows(result))).catch((reason) => setError(reason.message));
    }, [config.endpoint]);
    const rows = useMemo(() => Array.isArray(value) ? value : [], [value]);
    const add = () => onChange([...rows, Object.fromEntries([config.idField, ...config.fields.map((field) => field.name)].map((name) => [name, '']))]);
    const update = (index: number, name: string, next: any) => {
        const copy = rows.map((row) => ({ ...row }));
        copy[index][name] = next;
        if (name === config.idField && config.populate) {
            const selected = options.find((option) => String(option.id) === String(next));
            if (selected) Object.entries(config.populate).forEach(([source, target]) => {
                copy[index][target] = source.split('+').map((key) => selected[key]).filter(Boolean).join(' ');
            });
        }
        onChange(copy);
    };
    return <div className="rounded-lg border border-white-light p-3 dark:border-[#191e3a]">
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <div className="space-y-3">{rows.map((row, index) => <div className="grid items-end gap-3 rounded-md bg-gray-50 p-3 dark:bg-[#0e1726] md:grid-cols-12" key={index}>
            <div className="md:col-span-4"><Field label={config.selectorLabel} required><select className="form-select mt-1" required value={row[config.idField] || ''} onChange={(event) => update(index, config.idField, event.target.value)}><option value="">Select…</option>{options.map((option) => <option value={option.id} key={option.id}>{config.labelKeys.map((key) => option[key]).filter(Boolean).join(' ')}</option>)}</select></Field></div>
            {config.fields.map((field) => <div className="md:col-span-2" key={field.name}><Field label={field.label} required={field.required}><input className="form-input mt-1" type={field.type || 'text'} min={field.min} step={field.type === 'number' ? '0.01' : undefined} required={field.required} value={row[field.name] ?? ''} onChange={(event) => update(index, field.name, field.type === 'number' ? Number(event.target.value) : event.target.value)} /></Field></div>)}
            <div className="md:col-span-1"><button type="button" className="btn btn-outline-danger w-full" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>×</button></div>
        </div>)}</div>
        <button type="button" className="btn btn-outline-primary mt-3" onClick={add}>Add line item</button>
    </div>;
};

export default LineItemsEditor;

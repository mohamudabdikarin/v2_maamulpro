import { X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../lib/api';
import LineItemsEditor, { LineItemConfig } from '../components/maamulpro/LineItemsEditor';
import { EmptyState, ErrorAlert, FormActions, LoadingState, Modal, PageHeader, PasswordInput, StatGrid, StatusPill, SuccessAlert, fieldHint, formatTableValue, humanize as titleize, isSystemIdKey, money, shortDate, somaliExample, visibleTableColumns } from '../components/maamulpro/PageKit';

export type CrudField = {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'json' | 'lineItems' | 'image' | 'checkbox' | 'password';
    required?: boolean;
    placeholder?: string;
    hint?: string;
    options?: { value: string; label: string }[];
    uploadFolder?: 'avatars' | 'staff' | 'projects' | 'properties' | 'materials' | 'branding';
    lookup?: { endpoint: string; valueKey?: string; labelKeys: string[]; populate?: Record<string, string> };
    lineItems?: LineItemConfig;
};

export type CrudPageProps = {
    title: string;
    description: string;
    endpoint: string;
    fields: CrudField[];
    canCreate?: boolean;
    canEdit?: boolean | ((row: Record<string, any>) => boolean);
    canDelete?: boolean | ((row: Record<string, any>) => boolean);
    createPermission?: string;
    updatePermission?: string;
    deletePermission?: string;
    transitions?: { action: string; label: string; tone?: 'primary' | 'success' | 'danger' | 'warning'; when?: string[]; path?: string; method?: 'POST' | 'PATCH'; body?: Record<string, unknown> }[];
    initialMode?: 'create' | 'edit';
    recordId?: string;
    returnTo?: string;
    printable?: boolean;
};

const emptyForm = (fields: CrudField[]) => Object.fromEntries(fields.map((field) => [field.name, field.type === 'checkbox' ? false : field.type === 'lineItems' ? [] : '']));
const humanize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
const unwrap = (result: unknown): Record<string, any>[] => {
    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && Array.isArray((result as any).data)) return (result as any).data;
    return [];
};
const hiddenKeys = new Set(['passwordHash', 'deletedAt', 'updatedAt', 'version', 'resetTokenHash', 'resetTokenExpiresAt', 'resetRequestedAt', 'passwordResetAt']);
const labelOf = (value: Record<string, any>) => value.name || value.title || value.invoiceNo || value.orderNo || value.deliveryNo || value.email || [value.firstName, value.lastName].filter(Boolean).join(' ') || 'Details';
const nestedValue = (row: Record<string, any>, path: string) => path.split('.').reduce<any>((value, key) => value?.[key], row);
const lookupLabel = (row: Record<string, any>, keys: string[]) => keys.map((key) => {
    const value = nestedValue(row, key);
    return /date|At$/i.test(key) && value && !Number.isNaN(Date.parse(String(value))) ? shortDate(value) : value;
}).filter(Boolean).join(' · ') || labelOf(row);
const printableValue = (value: any): string => {
    if (value == null || value === '') return '—';
    if (Array.isArray(value)) return value.map((item) => typeof item === 'object'
        ? Object.entries(item).filter(([key, nested]) => !isSystemIdKey(key) && !hiddenKeys.has(key) && typeof nested !== 'object').map(([key, nested]) => `${titleize(key)}: ${formatTableValue(key, nested)}`).join(' · ')
        : String(item)).join('\n');
    if (typeof value === 'object') return labelOf(value);
    return String(value);
};

const CrudPage = ({ title, description, endpoint, fields, canCreate = true, canEdit = true, canDelete = true, createPermission, updatePermission, deletePermission, transitions = [], initialMode, recordId, returnTo, printable = false }: CrudPageProps) => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const noun = title.replace(/^(Add|Edit|New|Record|Create)\s+/i, '');
    const openedInitial = useRef(false);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [form, setForm] = useState<Record<string, any>>(() => emptyForm(fields));
    const [editing, setEditing] = useState<Record<string, any> | null>(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState('');
    const [viewing, setViewing] = useState<Record<string, any> | null>(null);
    const [filterValue, setFilterValue] = useState('');
    const [lookups, setLookups] = useState<Record<string, { value: string; label: string }[]>>({});
    const [rawLookups, setRawLookups] = useState<Record<string, Record<string, any>[]>>({});
    const [confirmation, setConfirmation] = useState<{ row: Record<string, any>; transition?: NonNullable<CrudPageProps['transitions']>[number] } | null>(null);
    const [confirmationReason, setConfirmationReason] = useState('');
    const [confirming, setConfirming] = useState(false);
    const load = () => {
        setLoading(true);
        return api<unknown>(endpoint).then((result) => setRows(unwrap(result))).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, [endpoint]);
    useEffect(() => {
        const lookupFields = fields.filter((field) => field.lookup);
        if (!lookupFields.length) return;
        Promise.allSettled(lookupFields.map(async (field) => {
            const rows = unwrap(await api<unknown>(field.lookup!.endpoint));
            const options = rows.map((row) => ({
                value: String(row[field.lookup!.valueKey || 'id']),
                label: lookupLabel(row, field.lookup!.labelKeys),
            }));
            return [field.name, options, rows] as const;
        })).then((results) => {
            const fulfilled = results
                .filter((r): r is PromiseFulfilledResult<readonly [string, { value: string; label: string }[], Record<string, any>[]]> => r.status === 'fulfilled')
                .map((r) => r.value);
            if (fulfilled.length) {
                setLookups(Object.fromEntries(fulfilled.map(([name, opts]) => [name, opts])));
                setRawLookups(Object.fromEntries(fulfilled.map(([name, _, rawRows]) => [name, rawRows])));
            }
        });
    }, [fields]);
    const filterKey = useMemo(() => ['status', 'type', 'priority', 'category'].find((key) => new Set(rows.map((row) => row[key]).filter(Boolean)).size > 1), [rows]);
    const filterOptions = useMemo(() => filterKey ? Array.from(new Set(rows.map((row) => String(row[filterKey])).filter(Boolean))) : [], [rows, filterKey]);
    const filtered = useMemo(() => rows.filter((row) => (!filterKey || !filterValue || String(row[filterKey]) === filterValue) && JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [rows, search, filterKey, filterValue]);
    const columns = useMemo(() => {
        const preferred = fields.map((field) => field.name).filter((key) => {
            if (!(key in (rows[0] || {}))) return false;
            if (isSystemIdKey(key) && !lookups[key]?.length) {
                // Prefer relation object (project) over projectId when both exist
                const relation = key.replace(/Id$/, '');
                if (relation && rows[0]?.[relation] && typeof rows[0][relation] === 'object') return false;
                if (!lookups[key]?.length && /Id$/.test(key)) return false;
            }
            return !hiddenKeys.has(key);
        });
        return visibleTableColumns(rows[0], preferred, 7);
    }, [rows, fields, lookups]);
    const amountKey = useMemo(() => fields.find((field) => field.type === 'number' && /(total|amount|price|cost|balance|budget|rent)/i.test(field.name))?.name, [fields]);
    const amountTotal = amountKey ? filtered.reduce((sum, row) => sum + Number(row[amountKey] || 0), 0) : 0;
    const displayCell = (key: string, value: any) => {
        if (value == null || value === '') return '—';
        if (typeof value === 'object') return Array.isArray(value) ? `${value.length} items` : labelOf(value);
        if (lookups[key]?.length) {
            const match = lookups[key].find((opt) => opt.value === String(value));
            if (match) return match.label;
        }
        if (key === 'status' || key === 'paymentStatus') return <StatusPill value={String(value)} />;
        return formatTableValue(key, value);
    };

    const showCreate = () => { setEditing(null); setForm(emptyForm(fields)); setFieldErrors({}); setError(''); setOpen(true); };
    const showEdit = (row: Record<string, any>) => {
        setEditing(row);
        setFieldErrors({}); setError('');
        setForm(Object.fromEntries(fields.map((field) => {
            const value = row[field.name]
                ?? (field.name === 'materialId' ? row.items?.[0]?.materialId : undefined)
                ?? (field.name === 'quantity' ? row.items?.[0]?.quantity : undefined);
            if (field.type === 'date' && value) return [field.name, String(value).slice(0, 10)];
            if (field.type === 'json' && value) {
                const cleaned = Array.isArray(value)
                    ? value.map((item) => Object.fromEntries(Object.entries(item).filter(([key, nested]) => !['id', 'saleId', 'purchaseOrderId', 'material'].includes(key) && typeof nested !== 'object')))
                    : value;
                return [field.name, JSON.stringify(cleaned, null, 2)];
            }
            if (field.type === 'lineItems') {
                const cleaned = Array.isArray(value)
                    ? value.map((item) => Object.fromEntries(Object.entries(item).filter(([key, nested]) => !['id', 'saleId', 'purchaseOrderId', 'payrollId', 'material', 'staff'].includes(key) && typeof nested !== 'object')))
                    : [];
                return [field.name, cleaned];
            }
            return [field.name, value ?? (field.type === 'checkbox' ? false : '')];
        })));
        setOpen(true);
    };
    useEffect(() => {
        if (openedInitial.current || !initialMode) return;
        openedInitial.current = true;
        if (initialMode === 'create') showCreate();
        else if (recordId) api<Record<string, any>>(`${endpoint}/${recordId}`).then(showEdit).catch((reason) => setError(reason.message));
    }, [endpoint, initialMode, recordId]);
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setError(''); setSuccess('');
        const errors = Object.fromEntries(fields.flatMap((field) => {
            const value = form[field.name];
            const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
            return field.required && empty ? [[field.name, `${field.label} is required.`]] : [];
        }));
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }
        setFieldErrors({}); setSaving(true);
        try {
            const payload = Object.fromEntries(fields.map((field) => {
                const value = form[field.name];
                if (field.type === 'number') return [field.name, value === '' ? undefined : Number(value)];
                if (field.type === 'json') return [field.name, value === '' ? undefined : JSON.parse(value)];
                if (field.type === 'lineItems') return [field.name, value];
                if (field.type === 'image') return [field.name, value === '' ? null : value];
                return [field.name, value === '' ? undefined : value];
            }));
            if (editing?.version !== undefined) payload.version = editing.version;
            await api(editing ? `${endpoint}/${editing.id}` : endpoint, {
                method: editing ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });
            if (editing) {
                await Promise.all(fields.filter((field) => field.type === 'image' && editing[field.name] && editing[field.name] !== payload[field.name])
                    .map((field) => api('/api/uploads/images', { method: 'DELETE', body: JSON.stringify({ url: editing[field.name] }) }).catch(() => undefined)));
            }
            setOpen(false); await load();
            setSuccess(editing ? `${noun} updated successfully.` : `${noun} created successfully.`);
            if (returnTo) navigate(returnTo);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save record'); }
        finally { setSaving(false); }
    };
    const remove = (row: Record<string, any>) => { setConfirmationReason(''); setConfirmation({ row }); };
    const transition = (row: Record<string, any>, item: NonNullable<CrudPageProps['transitions']>[number]) => { setConfirmationReason(''); setConfirmation({ row, transition: item }); };
    const confirmAction = async () => {
        if (!confirmation) return;
        const { row, transition: item } = confirmation;
        if (item?.action === 'reject' && !confirmationReason.trim()) { setError('A rejection reason is required.'); return; }
        setConfirming(true); setError('');
        try {
            if (!item) await api(`${endpoint}/${row.id}`, { method: 'DELETE' });
            else {
                const suffix = item.path === '' ? '' : `/${item.path || 'transition'}`;
                await api(`${endpoint}/${row.id}${suffix}`, { method: item.method || 'POST', body: JSON.stringify(item.body || { action: item.action, reason: confirmationReason.trim() || undefined }) });
            }
            await load();
            setSuccess(item ? 'Record updated successfully.' : `${noun} deleted successfully.`);
            setConfirmation(null);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : item ? 'Unable to change record status' : 'Unable to delete record');
        } finally {
            setConfirming(false);
        }
    };
    const uploadImage = async (field: CrudField, file?: File) => {
        if (!file) return;
        setUploading(field.name);
        setError('');
        try {
            const data = new FormData();
            data.append('file', file);
            const result = await api<{ url: string }>(`/api/uploads/images?folder=${field.uploadFolder || 'uploads'}`, { method: 'POST', body: data });
            setForm((current) => ({ ...current, [field.name]: result.url }));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to upload image');
        } finally {
            setUploading('');
        }
    };
    const printRecord = (row: Record<string, any>) => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) { setError('Allow pop-ups to print this record.'); return; }
        const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
        const rowsHtml = Object.entries(row).filter(([key]) => !isSystemIdKey(key) && !hiddenKeys.has(key)).map(([key, value]) =>
            `<tr><th>${escape(titleize(key))}</th><td>${escape(printableValue(value))}</td></tr>`).join('');
        printWindow.document.write(`<html><head><title>${escape(title)}</title><style>body{font:14px Arial;padding:32px;color:#172033}h1{margin:0 0 4px}p{color:#64748b}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #dbe2ea;padding:10px;text-align:left;vertical-align:top}th{width:28%;background:#f6f8fb}@media print{button{display:none}}</style></head><body><h1>${escape(title)}</h1><p>MaamulPro · ${escape(new Date().toLocaleString())}</p><table>${rowsHtml}</table><button onclick="window.print()" style="margin-top:20px;padding:10px 18px">Print</button></body></html>`);
        printWindow.document.close();
    };

    return <AppShell>
        <PageHeader title={title} description={description} eyebrow="Workspace records" actions={canCreate && (!createPermission || hasPermission(createPermission)) ? <button className="btn btn-primary shrink-0" onClick={showCreate}>Add new</button> : undefined} />
        <StatGrid items={[
            { label: 'Total records', value: rows.length },
            { label: 'Matching records', value: filtered.length, tone: 'info' },
            ...(filterKey ? [{ label: titleize(filterKey), value: filterOptions.length, hint: 'Distinct states', tone: 'warning' }] : []),
            ...(amountKey ? [{ label: `Filtered ${titleize(amountKey)}`, value: money(amountTotal), tone: 'success' }] : []),
        ]} />
        <div className="panel mb-5 flex flex-col gap-3 sm:flex-row"><input className="form-input flex-1" placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)} />{filterKey && <select className="form-select sm:w-56" value={filterValue} onChange={(e) => setFilterValue(e.target.value)}><option value="">All {titleize(filterKey)}</option>{filterOptions.map((value) => <option value={value} key={value}>{titleize(value)}</option>)}</select>}</div>
        {success && <SuccessAlert message={success} onDismiss={() => setSuccess('')} />}
        {error && <ErrorAlert message={error} onRetry={load} />}
        <div className="panel overflow-x-auto p-0">
            {loading ? <LoadingState /> : !filtered.length ? <EmptyState title="No records found" description="Adjust the filters or add the first record." /> :
                <table className="table-hover w-full"><thead><tr>{columns.map((column) => <th key={column}>{humanize(column)}</th>)}<th>Actions</th></tr></thead>
                    <tbody>{filtered.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column}>{displayCell(column, row[column])}</td>)}<td><div className="flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-info" onClick={() => setViewing(row)}>View</button>{printable && <button className="btn btn-sm btn-outline-dark" onClick={() => printRecord(row)}>Print</button>}{(typeof canEdit === 'function' ? canEdit(row) : canEdit) && (!updatePermission || hasPermission(updatePermission)) && <button className="btn btn-sm btn-outline-primary" onClick={() => showEdit(row)}>Edit</button>}{(!updatePermission || hasPermission(updatePermission)) && transitions.filter((item) => !item.when || item.when.includes(row.status)).map((item) => <button key={item.action} className={`btn btn-sm btn-outline-${item.tone || 'primary'}`} onClick={() => transition(row, item)}>{item.label}</button>)}{(typeof canDelete === 'function' ? canDelete(row) : canDelete) && (!deletePermission || hasPermission(deletePermission)) && <button className="btn btn-sm btn-outline-danger" onClick={() => remove(row)}>Delete</button>}</div></td></tr>)}</tbody>
                </table>}
        </div>
        <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={`${title} details`} wide>
            {viewing && <div className="space-y-6">{Object.entries(viewing).filter(([key]) => !isSystemIdKey(key) && !hiddenKeys.has(key)).map(([key, value]) => <div key={key}>
                <p className="text-xs font-bold uppercase tracking-wide text-white-dark">{titleize(key)}</p>
                {Array.isArray(value) ? (!value.length ? <p className="mt-1">No items</p> : <div className="mt-2 overflow-x-auto rounded-md border border-white-light dark:border-dark"><table className="table-hover"><thead><tr>{visibleTableColumns(value[0], [], 6).map((child) => <th key={child}>{titleize(child)}</th>)}</tr></thead><tbody>{value.map((item, index) => <tr key={item.id || index}>{visibleTableColumns(value[0], [], 6).map((child) => <td key={child}>{displayCell(child, item[child])}</td>)}</tr>)}</tbody></table></div>)
                    : typeof value === 'object' && value ? <p className="mt-1 font-semibold">{labelOf(value)}</p> : <p className="mt-1 whitespace-pre-wrap font-semibold">{displayCell(key, value)}</p>}
            </div>)}{printable && <button className="btn btn-primary" onClick={() => printRecord(viewing)}>Print record</button>}</div>}
        </Modal>
        {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onMouseDown={(e) => { if (e.currentTarget === e.target) returnTo ? navigate(returnTo) : setOpen(false); }}>
            <form className="panel max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto" noValidate onSubmit={submit}>
                <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? `Edit ${noun}` : `Add ${noun}`}</h2><button aria-label="Close" className="btn btn-outline-dark btn-sm p-1.5" onClick={() => returnTo ? navigate(returnTo) : setOpen(false)} type="button"><X size={16} /></button></div>
                {error && <ErrorAlert message={error} />}
                <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <div className={field.type === 'textarea' || field.type === 'json' || field.type === 'lineItems' || field.type === 'image' ? 'sm:col-span-2' : ''} key={field.name}>
                    <label className="font-semibold" htmlFor={field.name}>{field.label}{field.required && <span className="text-danger"> *</span>}</label>
                    {field.type === 'select' || field.lookup ? <select id={field.name} className="form-select mt-1" required={field.required} value={form[field.name]} onChange={(e) => {
                        const val = e.target.value;
                        const updates: Record<string, any> = { [field.name]: val };
                        if (field.lookup?.populate && val) {
                            const rawRow = rawLookups[field.name]?.find((r) => String(r[field.lookup?.valueKey || 'id']) === val);
                            if (rawRow) {
                                Object.entries(field.lookup.populate).forEach(([srcPath, targetField]) => {
                                    const srcVal = nestedValue(rawRow, srcPath);
                                    if (srcVal !== undefined && srcVal !== null) updates[targetField] = srcVal;
                                });
                            }
                        }
                        setForm((current) => ({ ...current, ...updates }));
                        setFieldErrors((current) => ({ ...current, [field.name]: '' }));
                    }}><option value="">Select…</option>{(field.options || lookups[field.name] || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                        : field.type === 'textarea' || field.type === 'json' ? <textarea id={field.name} className={`form-textarea mt-1 ${field.type === 'json' ? 'min-h-40 font-mono text-xs' : ''} ${fieldErrors[field.name] ? 'border-danger' : ''}`} aria-invalid={Boolean(fieldErrors[field.name])} placeholder={field.placeholder || somaliExample(field.name, field.type, field.label)} value={form[field.name]} onChange={(e) => { setForm({ ...form, [field.name]: e.target.value }); setFieldErrors((current) => ({ ...current, [field.name]: '' })); }} />
                        : field.type === 'lineItems' && field.lineItems ? <div className="mt-1"><LineItemsEditor value={form[field.name]} onChange={(items) => setForm({ ...form, [field.name]: items })} config={field.lineItems} /></div>
                        : field.type === 'image' ? <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">{form[field.name] && <img className="h-20 w-20 rounded-lg border border-white-light object-cover dark:border-[#191e3a]" src={form[field.name]} alt="" />}<div className="flex-1"><input id={field.name} className="form-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading === field.name} onChange={(e) => uploadImage(field, e.target.files?.[0])} />{uploading === field.name && <p className="mt-1 text-xs text-primary">Uploading…</p>}{form[field.name] && <button type="button" className="mt-2 text-xs text-danger hover:underline" onClick={() => setForm({ ...form, [field.name]: '' })}>Remove from record</button>}</div></div>
                        : field.type === 'checkbox' ? <input id={field.name} className="form-checkbox mt-2 block" type="checkbox" checked={Boolean(form[field.name])} onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })} />
                        : field.type === 'password' ? <PasswordInput id={field.name} className={`form-input mt-1 ${fieldErrors[field.name] ? 'border-danger' : ''}`} aria-invalid={Boolean(fieldErrors[field.name])} placeholder={field.placeholder || somaliExample(field.name, field.type, field.label)} value={form[field.name]} onChange={(e) => { setForm({ ...form, [field.name]: e.target.value }); setFieldErrors((current) => ({ ...current, [field.name]: '' })); }} />
                        : <input id={field.name} className={`form-input mt-1 ${fieldErrors[field.name] ? 'border-danger' : ''}`} aria-invalid={Boolean(fieldErrors[field.name])} type={field.type || 'text'} placeholder={field.placeholder || somaliExample(field.name, field.type, field.label)} value={form[field.name]} onChange={(e) => { setForm({ ...form, [field.name]: e.target.value }); setFieldErrors((current) => ({ ...current, [field.name]: '' })); }} />}
                    {fieldErrors[field.name] ? <p className="mt-1 text-xs text-danger" role="alert">{fieldErrors[field.name]}</p> : fieldHint(field.name, field.type, field.hint) && <p className="mt-1 text-xs text-white-dark">{fieldHint(field.name, field.type, field.hint)}</p>}
                </div>)}</div>
                <FormActions onCancel={() => returnTo ? navigate(returnTo) : setOpen(false)} loading={saving} saveLabel="Save record" savingLabel="Saving…" />
            </form>
        </div>}
        <Modal open={Boolean(confirmation)} onClose={() => !confirming && setConfirmation(null)} title={confirmation?.transition ? `${humanize(confirmation.transition.action)} record` : `Delete ${noun}`}>
            {confirmation && <div className="space-y-4"><p className="text-white-dark">{confirmation.transition ? `Are you sure you want to ${confirmation.transition.label.toLowerCase()}?` : 'This action permanently removes the record and cannot be undone.'}</p>{confirmation.transition?.action === 'reject' && <div><label className="font-semibold" htmlFor="rejection-reason">Rejection reason <span className="text-danger">*</span></label><textarea id="rejection-reason" className="form-textarea mt-1" placeholder="Sharax sababta diidmada" value={confirmationReason} onChange={(event) => setConfirmationReason(event.target.value)} /></div>}<div className="flex justify-end gap-2"><button className="btn btn-outline-dark" disabled={confirming} onClick={() => setConfirmation(null)}>Cancel</button><button className={`btn ${confirmation.transition?.tone === 'danger' || !confirmation.transition ? 'btn-danger' : 'btn-primary'}`} disabled={confirming} onClick={confirmAction}>{confirming ? 'Please wait…' : confirmation.transition ? confirmation.transition.label : 'Delete record'}</button></div></div>}
        </Modal>
    </AppShell>;
};

export default CrudPage;

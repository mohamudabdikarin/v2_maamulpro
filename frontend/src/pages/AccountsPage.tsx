import { FormEvent, useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import {
    EmptyState,
    ErrorAlert,
    Field,
    FormActions,
    LoadingState,
    Modal,
    PageHeader,
    StatGrid,
    money,
} from '../components/maamulpro/PageKit';
import { api } from '../lib/api';
import { useApiRows } from '../hooks/useApiData';

type Account = {
    code: string;
    name: string;
    parentCode?: string | null;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    normalBalance: 'DEBIT' | 'CREDIT';
    description?: string | null;
    isActive: boolean;
    allowNegative: boolean;
    isSystem: boolean;
    currentBalance: number;
};

const blankForm = {
    code: '',
    name: '',
    type: 'EXPENSE' as Account['type'],
    parentCode: '',
    description: '',
    isActive: true,
    allowNegative: true,
};

const typeTone: Record<Account['type'], string> = {
    ASSET: 'bg-primary-light text-primary',
    LIABILITY: 'bg-warning-light text-warning',
    EQUITY: 'bg-secondary-light text-secondary',
    INCOME: 'bg-success-light text-success',
    EXPENSE: 'bg-danger-light text-danger',
};

const AccountsPage = () => {
    const state = useApiRows<Account>('/api/accounting/accounts');
    const [form, setForm] = useState(blankForm);
    const [editing, setEditing] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [deleteCode, setDeleteCode] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const rows = useMemo(
        () => (showInactive ? state.rows : state.rows.filter((r) => r.isActive)),
        [state.rows, showInactive],
    );

    // Group children under parents in a stable, code-sorted tree.
    const tree = useMemo(() => {
        const byParent = new Map<string | null, Account[]>();
        for (const acc of rows) {
            const key = acc.parentCode ?? null;
            if (!byParent.has(key)) byParent.set(key, []);
            byParent.get(key)!.push(acc);
        }
        for (const list of byParent.values()) list.sort((a, b) => a.code.localeCompare(b.code));
        const flatten = (parent: string | null, depth: number, out: Array<Account & { depth: number }>) => {
            for (const acc of byParent.get(parent) ?? []) {
                out.push({ ...acc, depth });
                flatten(acc.code, depth + 1, out);
            }
        };
        const out: Array<Account & { depth: number }> = [];
        flatten(null, 0, out);
        return out;
    }, [rows]);

    const totals = useMemo(() => {
        const t = { ASSET: 0, LIABILITY: 0, EQUITY: 0, INCOME: 0, EXPENSE: 0 } as Record<Account['type'], number>;
        for (const a of state.rows) if (!a.parentCode) t[a.type] += a.currentBalance;
        return t;
    }, [state.rows]);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await api(
                editing ? `/api/accounting/accounts/${editing}` : '/api/accounting/accounts',
                {
                    method: editing ? 'PATCH' : 'POST',
                    body: JSON.stringify({
                        ...form,
                        parentCode: form.parentCode || undefined,
                        description: form.description || undefined,
                    }),
                },
            );
            setOpen(false);
            await state.reload();
        } catch (reason) {
            state.setError(reason instanceof Error ? reason.message : 'Unable to save account');
        }
    };

    const toggleActive = async (row: Account) => {
        try {
            await api(`/api/accounting/accounts/${row.code}/active`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !row.isActive }),
            });
            await state.reload();
        } catch (reason) {
            state.setError(reason instanceof Error ? reason.message : 'Unable to update account');
        }
    };

    const confirmDelete = async () => {
        if (!deleteCode) return;
        setDeleting(true);
        try {
            await api(`/api/accounting/accounts/${deleteCode}`, { method: 'DELETE' });
            setDeleteCode(null);
            await state.reload();
        } catch (reason) {
            state.setError(reason instanceof Error ? reason.message : 'Unable to delete account');
        } finally {
            setDeleting(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm(blankForm);
        setOpen(true);
    };

    const openEdit = (row: Account) => {
        setEditing(row.code);
        setForm({
            code: row.code,
            name: row.name,
            type: row.type,
            parentCode: row.parentCode || '',
            description: row.description || '',
            isActive: row.isActive,
            allowNegative: row.allowNegative,
        });
        setOpen(true);
    };

    const parentOptions = state.rows
        .filter((row) => row.code !== editing && row.type === form.type)
        .sort((a, b) => a.code.localeCompare(b.code));

    return (
        <AppShell>
            <PageHeader
                eyebrow="Accounting"
                title="Chart of Accounts"
                description="Hierarchical accounts used by double-entry postings and financial reports. Balances update as journal entries are posted."
                actions={
                    <>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-white-dark">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                            Show inactive
                        </label>
                        <button className="btn btn-primary" onClick={openCreate}>
                            Add account
                        </button>
                    </>
                }
            />
            {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
            <StatGrid
                items={[
                    { label: 'Assets', value: money(totals.ASSET), tone: 'primary' },
                    { label: 'Liabilities', value: money(totals.LIABILITY), tone: 'warning' },
                    { label: 'Equity', value: money(totals.EQUITY), tone: 'secondary' },
                    { label: 'Income', value: money(totals.INCOME), tone: 'success' },
                    { label: 'Expenses', value: money(totals.EXPENSE), tone: 'danger' },
                ]}
            />
            <div className="panel overflow-hidden p-0">
                {state.loading ? (
                    <LoadingState />
                ) : !tree.length ? (
                    <EmptyState
                        title="No accounts configured"
                        description="Add your first account to start recording balanced journal entries."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-hover w-full">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Account</th>
                                    <th>Type</th>
                                    <th className="text-right">Balance</th>
                                    <th>Status</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {tree.map((row) => (
                                    <tr key={row.code} className={row.isActive ? '' : 'opacity-60'}>
                                        <td className="font-mono font-bold">{row.code}</td>
                                        <td>
                                            <span style={{ paddingLeft: row.depth * 20 }}>
                                                {row.depth > 0 && <span className="text-white-dark">↳ </span>}
                                                {row.name}
                                                {row.isSystem && (
                                                    <span className="ml-2 rounded bg-secondary-light px-1 py-0.5 text-[10px] uppercase text-secondary">
                                                        system
                                                    </span>
                                                )}
                                            </span>
                                            {row.description && (
                                                <div
                                                    className="text-xs text-white-dark"
                                                    style={{ paddingLeft: row.depth * 20 }}
                                                >
                                                    {row.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${typeTone[row.type]}`}>{row.type}</span>
                                        </td>
                                        <td className="text-right font-mono">{money(row.currentBalance)}</td>
                                        <td>
                                            {row.isActive ? (
                                                <span className="badge bg-success-light text-success">Active</span>
                                            ) : (
                                                <span className="badge bg-danger-light text-danger">Inactive</span>
                                            )}
                                            {!row.allowNegative && (
                                                <span className="ml-1 badge bg-warning-light text-warning">
                                                    No-negative
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => openEdit(row)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => toggleActive(row)}
                                                >
                                                    {row.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                                {!row.isSystem && (
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => setDeleteCode(row.code)}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <Modal title={editing ? 'Edit account' : 'Add account'} open={open} onClose={() => setOpen(false)}>
                <form className="space-y-4" onSubmit={save}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Account code" required>
                            <input
                                className="form-input mt-1"
                                required
                                disabled={Boolean(editing)}
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                            />
                        </Field>
                        <Field label="Type" required>
                            <select
                                className="form-select mt-1"
                                value={form.type}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        type: e.target.value as Account['type'],
                                        parentCode: '',
                                    })
                                }
                            >
                                {(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const).map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <Field label="Account name" required>
                        <input
                            className="form-input mt-1"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </Field>
                    <Field label="Parent account (same type)">
                        <select
                            className="form-select mt-1"
                            value={form.parentCode}
                            onChange={(e) => setForm({ ...form, parentCode: e.target.value })}
                        >
                            <option value="">Root account</option>
                            {parentOptions.map((row) => (
                                <option key={row.code} value={row.code}>
                                    {row.code} · {row.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Description">
                        <textarea
                            className="form-textarea mt-1"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </Field>
                    <div className="grid gap-2 md:grid-cols-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            />
                            <span className="text-sm">Active</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={form.allowNegative}
                                onChange={(e) => setForm({ ...form, allowNegative: e.target.checked })}
                            />
                            <span className="text-sm">Allow negative balance</span>
                        </label>
                    </div>
                    <FormActions onCancel={() => setOpen(false)} saveLabel="Save account" />
                </form>
            </Modal>
            <Modal open={Boolean(deleteCode)} onClose={() => setDeleteCode(null)} title="Delete account">
                <div className="space-y-4">
                    <p className="text-white-dark">
                        This permanently removes account <strong>{deleteCode}</strong>. Only accounts with no
                        journal entries or children can be deleted; otherwise, deactivate it instead.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            className="btn btn-outline-dark"
                            disabled={deleting}
                            onClick={() => setDeleteCode(null)}
                        >
                            Cancel
                        </button>
                        <button className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
                            {deleting ? 'Please wait…' : 'Delete account'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AppShell>
    );
};

export default AccountsPage;

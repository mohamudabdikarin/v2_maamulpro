import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { ErrorAlert, LoadingState, SuccessAlert } from '../maamulpro/PageKit';

type MappingRow = {
    key: string;
    label: string;
    category: string;
    description: string;
    defaultCode: string;
    accountCode: string;
    isDefault: boolean;
    suggestedTypes?: Array<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>;
    updatedAt?: string | null;
};

type Account = {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    isActive: boolean;
};

const AccountMappingsSection = () => {
    const [mappings, setMappings] = useState<MappingRow[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [maps, accs] = await Promise.all([
                api<MappingRow[]>('/api/accounting/mappings'),
                api<Account[]>('/api/accounting/accounts'),
            ]);
            setMappings(maps);
            setAccounts(accs.filter((a) => a.isActive));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to load account mappings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setMapping = async (key: string, accountCode: string) => {
        setSaving(key);
        setMessage('');
        try {
            await api(`/api/accounting/mappings/${key}`, {
                method: 'PATCH',
                body: JSON.stringify({ accountCode }),
            });
            setMappings((rows) =>
                rows.map((r) =>
                    r.key === key
                        ? { ...r, accountCode, isDefault: accountCode === r.defaultCode }
                        : r,
                ),
            );
            setMessage('Mapping updated.');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to update mapping');
        } finally {
            setSaving(null);
        }
    };

    const resetMapping = async (key: string) => {
        setSaving(key);
        setMessage('');
        try {
            const result = await api<MappingRow>(`/api/accounting/mappings/${key}`, {
                method: 'DELETE',
            });
            setMappings((rows) => rows.map((r) => (r.key === key ? result : r)));
            setMessage('Mapping reset to default.');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to reset mapping');
        } finally {
            setSaving(null);
        }
    };

    const groupedByCategory = useMemo(() => {
        const filtered = search
            ? mappings.filter(
                  (m) =>
                      m.label.toLowerCase().includes(search.toLowerCase()) ||
                      m.key.toLowerCase().includes(search.toLowerCase()) ||
                      m.description.toLowerCase().includes(search.toLowerCase()),
              )
            : mappings;
        const groups = new Map<string, MappingRow[]>();
        for (const m of filtered) {
            if (!groups.has(m.category)) groups.set(m.category, []);
            groups.get(m.category)!.push(m);
        }
        return Array.from(groups.entries());
    }, [mappings, search]);

    const optionsFor = (row: MappingRow) => {
        // Prefer suggested-type accounts at the top; keep all others available
        // in case a tenant wants an unconventional mapping.
        const suggested = row.suggestedTypes ?? [];
        return [
            ...accounts.filter((a) => suggested.includes(a.type)).sort((a, b) => a.code.localeCompare(b.code)),
            ...accounts.filter((a) => !suggested.includes(a.type)).sort((a, b) => a.code.localeCompare(b.code)),
        ];
    };

    if (loading) return <LoadingState />;

    return (
        <div className="max-w-4xl space-y-5">
            <div>
                <h2 className="text-2xl font-extrabold">Account mappings</h2>
                <p className="mt-1 text-sm text-white-dark">
                    Point each transaction type at a specific ledger account. Changes take effect for the next
                    posting; existing journal entries are not affected.
                </p>
            </div>
            {error && <ErrorAlert message={error} onRetry={load} />}
            {message && <SuccessAlert message={message} onDismiss={() => setMessage('')} />}
            <input
                className="form-input max-w-sm"
                placeholder="Search mappings…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-6">
                {groupedByCategory.map(([category, rows]) => (
                    <section key={category} className="space-y-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white-dark">
                            {category}
                        </h3>
                        <div className="panel overflow-hidden p-0">
                            <table className="table-hover w-full">
                                <thead>
                                    <tr>
                                        <th>Mapping</th>
                                        <th>Account</th>
                                        <th className="w-32" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.key}>
                                            <td>
                                                <div className="font-semibold">{row.label}</div>
                                                <div className="text-xs text-white-dark">{row.description}</div>
                                                <div className="mt-1 font-mono text-[10px] uppercase text-white-dark">
                                                    {row.key}
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select"
                                                    value={row.accountCode}
                                                    disabled={saving === row.key}
                                                    onChange={(e) => setMapping(row.key, e.target.value)}
                                                >
                                                    {optionsFor(row).map((a) => (
                                                        <option key={a.code} value={a.code}>
                                                            {a.code} · {a.name} ({a.type})
                                                        </option>
                                                    ))}
                                                </select>
                                                {!row.isDefault && (
                                                    <div className="mt-1 text-xs text-warning">
                                                        Overridden from default {row.defaultCode}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {!row.isDefault && (
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        disabled={saving === row.key}
                                                        onClick={() => resetMapping(row.key)}
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
                {!groupedByCategory.length && (
                    <p className="text-sm text-white-dark">No mappings match your search.</p>
                )}
            </div>
        </div>
    );
};

export default AccountMappingsSection;

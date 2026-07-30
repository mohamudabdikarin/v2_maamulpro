import { useEffect, useState } from 'react';
import { ChevronDown, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { ErrorAlert, LoadingState } from './PageKit';

type Configuration = {
    workspaceControls: Record<string, boolean>;
    sidebarVisibility: Record<string, boolean>;
    reportVisibility: Record<string, boolean>;
    analyticsVisibility: Record<string, boolean>;
};

type Section = keyof Configuration;

const sectionLabels: Record<Section, string> = {
    workspaceControls: 'Workspace controls',
    sidebarVisibility: 'Sidebar visibility',
    reportVisibility: 'Report visibility',
    analyticsVisibility: 'Analytics visibility',
};

const reports = [
    ['core-income', 'Income report', 'core'],
    ['core-expense', 'Expense report', 'core'],
    ['core-profit-summary', 'Profit summary', 'core'],
    ['core-transaction-detail', 'Transaction detail by account', 'core'],
    ['construction-project-profit', 'Project profit report', 'construction'],
    ['construction-material-usage', 'Material usage report', 'construction'],
    ['construction-manpower-cost', 'Manpower cost report', 'construction'],
    ['construction-expenses', 'Construction expense report', 'construction'],
    ['construction-progress', 'Project progress analytics', 'construction'],
    ['construction-manpower-expenses', 'Manpower expense detail', 'construction'],
    ['construction-workforce-budget', 'Workforce budget report', 'construction'],
    ['real-estate-rental-income', 'Rental income report', 'real_estate'],
    ['real-estate-occupancy', 'Occupancy report', 'real_estate'],
    ['real-estate-property-sales', 'Property sales report', 'real_estate'],
    ['real-estate-due-payments', 'Due payment report', 'real_estate'],
    ['real-estate-sales-performance', 'Sales performance report', 'real_estate'],
    ['material-stock-movement', 'Stock movement report', 'material_management'],
    ['material-purchases', 'Purchase report', 'material_management'],
    ['material-supplier-balances', 'Supplier balance report', 'material_management'],
    ['material-sales', 'Sales report', 'material_management'],
    ['material-estimated-profit', 'Estimated profit report', 'material_management'],
] as const;

const EnterpriseConfigurationPanel = ({
    companyId,
    modules,
}: {
    companyId: string;
    modules: Record<'construction' | 'real_estate' | 'material_management', boolean>;
}) => {
    const [configuration, setConfiguration] = useState<Configuration | null>(null);
    const [collapsed, setCollapsed] = useState<Record<Section, boolean>>({
        workspaceControls: false,
        sidebarVisibility: false,
        reportVisibility: true,
        analyticsVisibility: true,
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api<Configuration>(`/api/superadmin/companies/${companyId}/enterprise-configuration`)
            .then(setConfiguration)
            .catch((reason) => setError(reason.message));
    }, [companyId]);

    const update = (section: Section, key: string, checked: boolean) => {
        setConfiguration((current) => current ? {
            ...current,
            [section]: { ...current[section], [key]: checked },
        } : current);
    };

    const save = async () => {
        if (!configuration) return;
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const result = await api<{ configuration: Configuration }>(
                `/api/superadmin/companies/${companyId}/enterprise-configuration`,
                { method: 'PATCH', body: JSON.stringify(configuration) },
            );
            setConfiguration(result.configuration);
            setMessage('Enterprise configuration saved and tenant RBAC synchronized.');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save enterprise configuration.');
        } finally {
            setSaving(false);
        }
    };

    if (!configuration && !error) return <LoadingState label="Loading enterprise configuration…" />;

    const rows: Record<Section, Array<{ key: string; label: string; disabled?: boolean; hint?: string }>> = {
        workspaceControls: [
            { key: 'construction', label: 'Construction workspace', disabled: !modules.construction },
            { key: 'real_estate', label: 'Real estate workspace', disabled: !modules.real_estate },
            { key: 'material_management', label: 'Material management workspace', disabled: !modules.material_management },
        ],
        sidebarVisibility: [
            ...['dashboard', 'staff', 'financials', 'reports', 'analytics', 'audits', 'workspaces'].map((key) => ({ key, label: key })),
            { key: 'construction', label: 'Construction sidebar', disabled: !modules.construction },
            { key: 'real_estate', label: 'Real estate sidebar', disabled: !modules.real_estate },
            { key: 'material_management', label: 'Material management sidebar', disabled: !modules.material_management },
        ],
        reportVisibility: reports.map(([key, label, workspace]) => ({
            key,
            label,
            hint: workspace.replace(/_/g, ' '),
            disabled: workspace !== 'core' && !modules[workspace],
        })),
        analyticsVisibility: [
            { key: 'core', label: 'Core analytics' },
            { key: 'construction', label: 'Construction analytics', disabled: !modules.construction },
            { key: 'real_estate', label: 'Real estate analytics', disabled: !modules.real_estate },
            { key: 'material_management', label: 'Material management analytics', disabled: !modules.material_management },
        ],
    };

    return <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        {message && <div className="rounded-md bg-success-light p-4 text-success">{message}</div>}
        {configuration && (Object.keys(rows) as Section[]).map((section) => <div className="rounded-md border border-white-light dark:border-dark" key={section}>
            <button className="flex w-full items-center justify-between px-4 py-3 text-left" type="button" onClick={() => setCollapsed((current) => ({ ...current, [section]: !current[section] }))}>
                <strong>{sectionLabels[section]}</strong>
                <ChevronDown className={`transition ${collapsed[section] ? '' : 'rotate-180'}`} size={17} />
            </button>
            {!collapsed[section] && <div className="grid gap-2 border-t border-white-light p-4 sm:grid-cols-2 xl:grid-cols-3 dark:border-dark">
                {rows[section].map((row) => <label className={`flex items-center justify-between gap-3 rounded-md border border-white-light p-3 dark:border-dark ${row.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} key={row.key}>
                    <span><strong className="block text-sm capitalize">{row.label}</strong>{row.hint && <small className="text-white-dark capitalize">{row.hint}</small>}</span>
                    <input className="form-checkbox" type="checkbox" disabled={row.disabled} checked={configuration[section][row.key] !== false && !row.disabled} onChange={(event) => update(section, row.key, event.target.checked)} />
                </label>)}
            </div>}
        </div>)}
        <div className="flex justify-end"><button className="btn btn-primary" type="button" disabled={saving || !configuration} onClick={save}><Save className="mr-2" size={16} /> {saving ? 'Saving…' : 'Save enterprise configuration'}</button></div>
    </div>;
};

export default EnterpriseConfigurationPanel;

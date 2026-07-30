import { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../components/maamulpro/AppShell';
import { AuthenticatedImage } from '../components/maamulpro/AuthenticatedImage';
import { ErrorAlert, LoadingState, PageHeader, StatusPill, humanize, money, shortDate } from '../components/maamulpro/PageKit';
import { useApiData } from '../hooks/useApiData';

type Props = {
    titleKey: string;
    endpoint: string;
    backTo: string;
    editTo?: (id: string) => string;
    imageKey?: string;
    statusKey?: string;
    moneyKeys?: string[];
    dateKeys?: string[];
    primaryFields: string[];
    sections?: { key: string; title: string; empty?: string }[];
    actions?: (row: Record<string, any>, reload: () => void) => ReactNode;
};

const display = (key: string, value: any, props: Props) => {
    if (value == null || value === '') return '—';
    if (props.moneyKeys?.includes(key)) return money(value);
    if (props.dateKeys?.includes(key)) return shortDate(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
};

const EntityDetailPage = (props: Props) => {
    const { id = '' } = useParams();
    const state = useApiData<Record<string, any>>(`${props.endpoint}/${id}`, {});
    const row = state.data;
    return <AppShell>
        <PageHeader eyebrow="Record details" title={row[props.titleKey] || 'Loading…'} description={`Reference ${id}`} actions={<>
            <Link className="btn btn-outline-primary" to={props.backTo}>Back to list</Link>
            {props.editTo && <Link className="btn btn-primary" to={props.editTo(id)}>Edit</Link>}
            {props.actions?.(row, state.reload)}
        </>} />
        {state.loading && <div className="panel"><LoadingState /></div>}
        {state.error && <ErrorAlert message={state.error} onRetry={state.reload} />}
        {!state.loading && !state.error && <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
                {props.imageKey && row[props.imageKey] && <div className="panel"><AuthenticatedImage className="h-56 w-full rounded-lg object-cover" src={row[props.imageKey]} alt="" /></div>}
                <div className={`panel grid gap-4 sm:grid-cols-2 ${props.imageKey && row[props.imageKey] ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    {props.statusKey && <div><p className="text-xs uppercase text-white-dark">{humanize(props.statusKey)}</p><div className="mt-2"><StatusPill value={row[props.statusKey]} /></div></div>}
                    {props.primaryFields.map((key) => <div key={key}><p className="text-xs font-bold uppercase tracking-wide text-white-dark">{humanize(key)}</p><p className="mt-1 whitespace-pre-wrap text-base font-semibold">{display(key, row[key], props)}</p></div>)}
                </div>
            </div>
            {props.sections?.map((section) => {
                const items = Array.isArray(row[section.key]) ? row[section.key] : [];
                const columns = Object.keys(items[0] || {}).filter((key) => !['passwordHash', 'deletedAt'].includes(key) && typeof items[0]?.[key] !== 'object').slice(0, 7);
                return <div className="panel overflow-hidden p-0" key={section.key}>
                    <div className="border-b border-white-light p-5 dark:border-[#191e3a]"><h2 className="text-lg font-bold">{section.title}</h2><p className="text-sm text-white-dark">{items.length} records</p></div>
                    {!items.length ? <div className="p-8 text-center text-white-dark">{section.empty || `No ${section.title.toLowerCase()} found.`}</div> :
                        <div className="overflow-x-auto"><table className="table-hover w-full"><thead><tr>{columns.map((column) => <th key={column}>{humanize(column)}</th>)}</tr></thead><tbody>{items.map((item: any, index: number) => <tr key={item.id || index}>{columns.map((column) => <td key={column}>{display(column, item[column], props)}</td>)}</tr>)}</tbody></table></div>}
                </div>;
            })}
        </div>}
    </AppShell>;
};

export default EntityDetailPage;

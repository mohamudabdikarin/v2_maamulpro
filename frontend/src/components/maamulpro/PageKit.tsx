import { AlertTriangle, BarChart3, Building2, CheckCircle2, Clock, CreditCard, Package, TrendingUp, Users, X } from 'lucide-react';
import { Children, cloneElement, isValidElement, ReactElement, ReactNode } from 'react';
import DotLoader from './DotLoader';

export const humanize = (value: string) => value.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (letter) => letter.toUpperCase());
export const money = (value: unknown, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
export const shortDate = (value: unknown) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(String(value))) : '—';

export const StatusPill = ({ value }: { value?: string | null }) => {
    const normalized = String(value || 'UNKNOWN').toUpperCase();
    const positive = ['ACTIVE', 'PAID', 'CLEARED', 'COMPLETED', 'APPROVED', 'DELIVERED', 'RECEIVED', 'AVAILABLE'];
    const negative = ['INACTIVE', 'CANCELLED', 'REJECTED', 'TERMINATED', 'EXPIRED', 'OVERDUE', 'SUSPENDED'];
    const tone = positive.includes(normalized) ? 'success' : negative.includes(normalized) ? 'danger' : 'warning';
    return <span className={`badge bg-${tone}-light text-${tone}`}>{humanize(normalized)}</span>;
};

export const PageHeader = ({ title, actions }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) => <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center"><h1 className="text-2xl font-extrabold text-secondary dark:text-white sm:text-3xl">{title}</h1>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>;


const getStatIcon = (label: string, icon?: ReactNode) => {
    if (icon) return icon;
    const l = label.toLowerCase();
    if (l.includes('company') || l.includes('companies') || l.includes('property') || l.includes('properties')) return <Building2 size={18} />;
    if (l.includes('staff') || l.includes('user') || l.includes('tenant') || l.includes('client')) return <Users size={18} />;
    if (l.includes('revenue') || l.includes('income') || l.includes('sale') || l.includes('value')) return <TrendingUp size={18} />;
    if (l.includes('expense') || l.includes('cost') || l.includes('invoice') || l.includes('bill')) return <CreditCard size={18} />;
    if (l.includes('active') || l.includes('paid') || l.includes('cleared')) return <CheckCircle2 size={18} />;
    if (l.includes('pending') || l.includes('due') || l.includes('soon')) return <Clock size={18} />;
    if (l.includes('low stock') || l.includes('expired') || l.includes('suspended') || l.includes('late')) return <AlertTriangle size={18} />;
    if (l.includes('product') || l.includes('sku') || l.includes('inventory') || l.includes('material')) return <Package size={18} />;
    return <BarChart3 size={18} />;
};

export const StatGrid = ({ items }: { items: { label: string; value: ReactNode; hint?: string; tone?: string; icon?: ReactNode; gradient?: string }[]; variant?: 'plain' | 'gradient' }) => (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
            <div className="panel flex flex-col justify-between p-5 transition-all hover:shadow-md dark:border-dark dark:bg-black" key={item.label}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-white-dark">{item.label}</p>
                        <p className="mt-2 text-3xl font-extrabold tracking-tight text-secondary dark:text-white">{item.value}</p>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
                        {getStatIcon(item.label, item.icon)}
                    </div>
                </div>
                {item.hint && <p className="mt-2 text-xs text-white-dark">{item.hint}</p>}
            </div>
        ))}
    </div>
);


export const EmptyState = ({ title = 'No records found', description, action }: { title?: string; description?: string; action?: ReactNode }) => <div className="p-10 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-xl text-primary" aria-hidden="true">○</div><h3 className="font-bold">{title}</h3>{description && <p className="mx-auto mt-1 max-w-md text-sm text-white-dark">{description}</p>}{action && <div className="mt-4 flex justify-center">{action}</div>}</div>;
export const LoadingState = ({ label = 'Loading live data…' }: { label?: string }) => <div className="flex min-h-44 flex-col items-center justify-center gap-4 p-10 text-center text-white-dark"><DotLoader label={label} /><span className="text-sm">{label}</span></div>;
export const ErrorAlert = ({ message, onRetry }: { message: string; onRetry?: () => void }) => <div className="mb-5 flex items-center justify-between gap-4 rounded-md bg-danger-light p-4 text-danger" role="alert"><span>{message}</span>{onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button>}</div>;
export const SuccessAlert = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => <div className="mb-5 flex items-center justify-between gap-4 rounded-md bg-success-light p-4 text-success" role="status"><span>{message}</span>{onDismiss && <button className="btn btn-sm btn-outline-success" onClick={onDismiss}>Close</button>}</div>;

export const Modal = ({ title, open, onClose, children, wide = false }: { title: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) => !open ? null : (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
        <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-md bg-white shadow-xl dark:bg-black ${wide ? 'max-w-4xl' : 'max-w-xl'}`} role="dialog" aria-modal="true" aria-label={title}>
            <div className="flex shrink-0 items-center justify-between border-b border-white-light px-5 py-4 dark:border-[#191e3a]">
                <h2 className="text-lg font-bold">{title}</h2>
                <button aria-label="Close" className="btn btn-sm btn-outline-dark p-1.5" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </div>
    </div>
);

const defaultPlaceholder = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('email')) return 'tusaale@shirkad.so';
    if (normalized.includes('phone')) return '+252 61 234 5678';
    if (normalized.includes('password')) return 'Geli erayga sirta ah';
    if (normalized.includes('amount')) return '1,500';
    if (normalized.includes('address')) return 'Muqdisho, Soomaaliya';
    if (normalized.includes('first') || normalized.includes('last') || normalized.includes('person')) return 'Maxamed Cali';
    if (normalized.includes('name')) return 'Maxamed Cali';
    return `Geli ${normalized}`;
};

export const somaliExample = (name: string, type?: string): string | undefined => {
    const key = name.replace(/[^a-z]/gi, '').toLowerCase();
    if (type === 'date') return undefined;
    if (key.includes('email')) return 'tusaale@shirkad.so';
    if (key.includes('phone')) return '+252 61 234 5678';
    if (key.includes('address') || key.includes('location')) return 'Waddada Maka Al-Mukarama, Muqdisho';
    if (key.includes('nationalid') || key.includes('passport')) return 'SOM-12345678';
    if (key.includes('description')) return 'Sharaxaad kooban oo cad';
    if (key.includes('note')) return 'Faahfaahin dheeraad ah (ikhtiyaari)';
    if (key.includes('name') || key.includes('title')) return 'Maxamed Cali';
    if (key.includes('code')) return 'XIS-001';
    if (key.includes('receipt')) return 'RCP-0001';
    if (key.includes('invoice')) return 'INV-0001';
    if (key.includes('order')) return 'PO-0001';
    if (key.includes('delivery')) return 'DEL-0001';
    if (key.includes('warehouse')) return 'Bakhaarka Weyn';
    if (key.includes('role')) return 'Kormeere';
    if (key.includes('amount') || key.includes('price') || key.includes('cost') || key.includes('budget') || key.includes('salary') || key.includes('rent') || key.includes('balance')) return '1,500';
    if (key.includes('quantity') || key.includes('progress') || key.includes('area') || key.includes('bedroom') || key.includes('bathroom')) return '10';
    return type === 'textarea' ? 'Ku qor faahfaahin kooban' : undefined;
};

export const fieldHint = (name: string, type?: string, fallback?: string) => {
    if (fallback) return fallback;
    return undefined;
};

const addPlaceholder = (node: ReactNode, placeholder: string): ReactNode => {
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<any>;
    const props = element.props as any;
    if (typeof element.type === 'string' && (element.type === 'input' || element.type === 'textarea')) {
        const type = props.type || 'text';
        if (props.placeholder || ['checkbox', 'radio', 'file', 'hidden', 'date', 'datetime-local', 'time', 'month', 'week', 'color'].includes(type)) return element;
        return cloneElement(element, { placeholder });
    }
    if (props.children !== undefined) return cloneElement(element, undefined, Children.map(props.children, (child) => addPlaceholder(child, placeholder)));
    return element;
};

export const Field = ({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) => <label className="block"><span className="font-semibold">{label}{required && <span className="text-danger"> *</span>}</span>{addPlaceholder(children, defaultPlaceholder(label))}{hint && <span className="mt-1 block text-xs text-white-dark">{hint}</span>}</label>;

export const FormActions = ({ onCancel, loading = false, saveLabel = 'Save', savingLabel = 'Saving…' }: { onCancel?: () => void; loading?: boolean; saveLabel?: string; savingLabel?: string }) => (
    <div className="col-span-full mt-8 flex items-center justify-end gap-3 border-t border-white-light pt-5 dark:border-[#191e3a]">
        <button className="btn btn-outline-dark" disabled={loading} onClick={onCancel} type="button">Cancel</button>
        <button className="btn btn-primary" disabled={loading} type="submit">{loading ? savingLabel : saveLabel}</button>
    </div>
);


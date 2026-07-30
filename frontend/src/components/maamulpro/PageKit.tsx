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

export const PageHeader = ({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) => <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}<h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-3xl text-white-dark">{description}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>;

export const StatGrid = ({ items, variant = 'plain' }: { items: { label: string; value: ReactNode; hint?: string; tone?: string; gradient?: string }[]; variant?: 'plain' | 'gradient' }) => <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => variant === 'gradient'
    ? <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br p-5 text-white shadow-sm ${item.gradient || 'from-primary to-[#805dca]'}`} key={item.label}><span className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/10" /><span className="absolute -bottom-10 right-8 h-20 w-20 rounded-full bg-black/5" /><div className="relative"><p className="text-xs font-bold uppercase tracking-wider text-white/75">{item.label}</p><p className="mt-2 text-3xl font-black tracking-tight text-white">{item.value}</p>{item.hint && <p className="mt-1 text-xs text-white/80">{item.hint}</p>}</div></div>
    : <div className="panel" key={item.label}><p className="text-xs font-bold uppercase tracking-wider text-white-dark">{item.label}</p><p className={`mt-2 text-2xl font-black text-${item.tone || 'primary'}`}>{item.value}</p>{item.hint && <p className="mt-1 text-xs text-white-dark">{item.hint}</p>}</div>)}</div>;

export const EmptyState = ({ title = 'No records found', description, action }: { title?: string; description?: string; action?: ReactNode }) => <div className="p-10 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-xl text-primary" aria-hidden="true">○</div><h3 className="font-bold">{title}</h3>{description && <p className="mx-auto mt-1 max-w-md text-sm text-white-dark">{description}</p>}{action && <div className="mt-4 flex justify-center">{action}</div>}</div>;
export const LoadingState = ({ label = 'Loading live data…' }: { label?: string }) => <div className="flex min-h-44 flex-col items-center justify-center gap-4 p-10 text-center text-white-dark"><DotLoader label={label} /><span className="text-sm">{label}</span></div>;
export const ErrorAlert = ({ message, onRetry }: { message: string; onRetry?: () => void }) => <div className="mb-5 flex items-center justify-between gap-4 rounded-md bg-danger-light p-4 text-danger" role="alert"><span>{message}</span>{onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button>}</div>;
export const SuccessAlert = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => <div className="mb-5 flex items-center justify-between gap-4 rounded-md bg-success-light p-4 text-success" role="status"><span>{message}</span>{onDismiss && <button className="btn btn-sm btn-outline-success" onClick={onDismiss}>Close</button>}</div>;

export const Modal = ({ title, open, onClose, children, wide = false }: { title: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) => !open ? null : <div className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => event.currentTarget === event.target && onClose()}><div className={`panel max-h-[92vh] w-full overflow-y-auto ${wide ? 'max-w-5xl' : 'max-w-2xl'}`} role="dialog" aria-modal="true" aria-label={title}><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button className="btn btn-sm btn-outline-dark" onClick={onClose}>Close</button></div>{children}</div></div>;

const defaultPlaceholder = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('email')) return 'Tusaale: tusaale@shirkad.so';
    if (normalized.includes('phone')) return 'Tusaale: +252 61 234 5678';
    if (normalized.includes('password')) return 'Geli erayga sirta ah';
    if (normalized.includes('amount')) return 'Tusaale: 1,500';
    if (normalized.includes('address')) return 'Tusaale: Muqdisho, Soomaaliya';
    if (normalized.includes('name')) return 'Tusaale: Warbixinta bisha';
    return `Geli ${normalized}`;
};

export const somaliExample = (name: string, type?: string): string | undefined => {
    const key = name.replace(/[^a-z]/gi, '').toLowerCase();
    if (type === 'date') return undefined;
    if (key.includes('email')) return 'tusaale@shirkad.so';
    if (key.includes('phone')) return '+252 61 234 5678';
    if (key.includes('address') || key.includes('location')) return 'Tusaale: Waddada Maka Al-Mukarama, Muqdisho';
    if (key.includes('nationalid') || key.includes('passport')) return 'Tusaale: SOM-12345678';
    if (key.includes('description')) return 'Sharaxaad kooban oo cad';
    if (key.includes('note')) return 'Faahfaahin dheeraad ah (ikhtiyaari)';
    if (key.includes('name') || key.includes('title')) return 'Tusaale: Maxamed Cali';
    if (key.includes('code')) return 'Tusaale: XIS-001';
    if (key.includes('receipt')) return 'Tusaale: RCP-0001';
    if (key.includes('invoice')) return 'Tusaale: INV-0001';
    if (key.includes('order')) return 'Tusaale: PO-0001';
    if (key.includes('delivery')) return 'Tusaale: DEL-0001';
    if (key.includes('warehouse')) return 'Tusaale: Bakhaarka Weyn';
    if (key.includes('role')) return 'Tusaale: Kormeere';
    if (key.includes('amount') || key.includes('price') || key.includes('cost') || key.includes('budget') || key.includes('salary') || key.includes('rent') || key.includes('balance')) return 'Tusaale: 1,500';
    if (key.includes('quantity') || key.includes('progress') || key.includes('area') || key.includes('bedroom') || key.includes('bathroom')) return 'Tusaale: 10';
    return type === 'textarea' ? 'Ku qor faahfaahin kooban' : undefined;
};

export const fieldHint = (name: string, type?: string, fallback?: string) => {
    if (fallback) return fallback;
    if (type === 'date') return 'Qaabka taariikhda: 2026-07-29';
    if (type === 'number') return 'Geli qiime tiro ah; tusaale 1,500.';
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

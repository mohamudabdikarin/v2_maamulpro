import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { TOAST_EVENT, ToastPayload } from '../../lib/toast';

const styles: Record<ToastPayload['kind'], { bg: string; text: string; Icon: typeof CheckCircle2 }> = {
    success: { bg: 'bg-success-light border-success/30', text: 'text-success', Icon: CheckCircle2 },
    error: { bg: 'bg-danger-light border-danger/30', text: 'text-danger', Icon: XCircle },
    warning: { bg: 'bg-warning-light border-warning/30', text: 'text-warning', Icon: AlertTriangle },
    info: { bg: 'bg-info-light border-info/30', text: 'text-info', Icon: Info },
};

export const ToastViewport = () => {
    const [items, setItems] = useState<ToastPayload[]>([]);

    useEffect(() => {
        const handler = (event: Event) => {
            const payload = (event as CustomEvent<ToastPayload>).detail;
            setItems((current) => [...current, payload]);
            if (payload.duration > 0) {
                window.setTimeout(() => {
                    setItems((current) => current.filter((item) => item.id !== payload.id));
                }, payload.duration);
            }
        };
        window.addEventListener(TOAST_EVENT, handler);
        return () => window.removeEventListener(TOAST_EVENT, handler);
    }, []);

    const dismiss = (id: number) => setItems((current) => current.filter((item) => item.id !== id));

    if (!items.length) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6">
            {items.map((item) => {
                const { bg, text, Icon } = styles[item.kind];
                return (
                    <div
                        key={item.id}
                        role="status"
                        aria-live="polite"
                        className={`pointer-events-auto flex items-start gap-3 rounded-lg border ${bg} p-3 pr-2 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2`}
                    >
                        <Icon size={20} className={`mt-0.5 shrink-0 ${text}`} />
                        <p className={`flex-1 text-sm font-medium leading-snug ${text}`}>{item.message}</p>
                        <button
                            type="button"
                            className={`shrink-0 rounded p-1 opacity-60 transition hover:opacity-100 ${text}`}
                            onClick={() => dismiss(item.id)}
                            aria-label="Dismiss"
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastViewport;

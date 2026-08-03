export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastPayload = {
    id: number;
    kind: ToastKind;
    message: string;
    duration: number;
};

const EVENT = 'maamulpro:toast';
let counter = 0;

function emit(kind: ToastKind, message: string, duration = 4000) {
    if (typeof window === 'undefined') return;
    const payload: ToastPayload = { id: ++counter, kind, message, duration };
    window.dispatchEvent(new CustomEvent<ToastPayload>(EVENT, { detail: payload }));
}

export const TOAST_EVENT = EVENT;

export const toast = {
    success: (message: string, duration?: number) => emit('success', message, duration),
    error: (message: string, duration?: number) => emit('error', message, duration ?? 5000),
    info: (message: string, duration?: number) => emit('info', message, duration),
    warning: (message: string, duration?: number) => emit('warning', message, duration),
};

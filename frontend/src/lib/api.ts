export type ApiEnvelope<T> = {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
};

export type SessionUser = {
    id: string;
    email: string;
    name?: string;
    role: string;
    companyId?: string;
    companyName?: string;
    permissions?: string[];
    isSuperAdmin?: boolean;
    constructionEnabled?: boolean;
    realEstateEnabled?: boolean;
    materialManagementEnabled?: boolean;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: string;
    companyStatus?: string;
    accessGranted?: boolean;
    planKey?: string;
    entitlements?: {
        planId?: string;
        planKey?: string;
        planName?: string;
        features: {
            construction: boolean;
            realEstate: boolean;
            materials: boolean;
            payroll: boolean;
            advancedReports: boolean;
            prioritySupport: boolean;
        };
        limits: {
            users: number;
            constructionProjects: number;
            properties: number;
        };
    };
};

export type Session = {
    accessToken: string;
    user: SessionUser;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const STORAGE_KEY = 'maamulpro.session';

export const sessionStore = {
    get(): Session | null {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch {
            return null;
        }
    },
    set(session: Session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        window.dispatchEvent(new CustomEvent('maamulpro:session', { detail: session }));
    },
    updateUser(user: SessionUser) {
        const session = this.get();
        if (!session) return null;
        const updated = { ...session, user: { ...session.user, ...user } };
        this.set(updated);
        return updated;
    },
    clear() {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('maamulpro:session', { detail: null }));
    },
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const session = sessionStore.get();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);
    if (session?.user.companyId) headers.set('X-Company-Id', session.user.companyId);

    const response = await fetch(`${API_URL}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        if (response.status === 401) sessionStore.clear();
        const message = payload?.message || payload?.error?.message || `Request failed (${response.status})`;
        const readable = Array.isArray(message) ? message.join(', ') : message;
        if (response.status === 403 && /subscription|company setup|company account.*suspend/i.test(readable)) {
            lastSessionRefreshAt = 0;
            if (!window.location.pathname.startsWith('/locked')) {
                window.location.assign(`/locked?reason=${encodeURIComponent(readable)}`);
            }
        }
        throw new Error(readable);
    }
    return (payload as ApiEnvelope<T>).data;
}

let sessionRefreshPromise: Promise<Session | null> | null = null;
let lastSessionRefreshAt = 0;

export function refreshSession(force = false): Promise<Session | null> {
    const stored = sessionStore.get();
    if (!stored) return Promise.resolve(null);
    if (!force && Date.now() - lastSessionRefreshAt < 30_000) return Promise.resolve(stored);
    if (sessionRefreshPromise) return sessionRefreshPromise;
    sessionRefreshPromise = api<SessionUser>('/api/auth/session')
        .then((user) => {
            lastSessionRefreshAt = Date.now();
            return sessionStore.updateUser(user);
        })
        .finally(() => { sessionRefreshPromise = null; });
    return sessionRefreshPromise;
}

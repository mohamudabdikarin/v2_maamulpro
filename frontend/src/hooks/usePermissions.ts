import { useEffect, useState } from 'react';
import { Session, sessionStore } from '../lib/api';

const OWNER_ROLES = ['SUPER_ADMIN', 'COMPANY_OWNER'];

export function usePermissions() {
    const [session, setSession] = useState<Session | null>(() => sessionStore.get());

    useEffect(() => {
        const handler = (e: Event) => setSession((e as CustomEvent<Session | null>).detail);
        window.addEventListener('maamulpro:session', handler);
        return () => window.removeEventListener('maamulpro:session', handler);
    }, []);

    const user = session?.user;
    const isOwner = Boolean(user?.isSuperAdmin || user?.isImpersonating) || OWNER_ROLES.includes(user?.role || '');
    const granted = new Set(user?.permissions || []);

    const hasPermission = (perm: string): boolean => isOwner || granted.has(perm);

    const hasAnyPermission = (perms: string[]): boolean => {
        if (isOwner) return true;
        return perms.some((p) => granted.has(p));
    };

    const hasAllPermissions = (perms: string[]): boolean => {
        if (isOwner) return true;
        return perms.every((p) => granted.has(p));
    };

    return { session, user, isOwner, permissions: user?.permissions || [], hasPermission, hasAnyPermission, hasAllPermissions };
}

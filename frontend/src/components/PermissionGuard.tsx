import { PropsWithChildren, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Session, sessionStore } from '../lib/api';

const OWNER_ROLES = ['SUPER_ADMIN', 'COMPANY_OWNER'];

type Props = PropsWithChildren<{ permission?: string }>;

const PermissionGuard = ({ permission, children }: Props) => {
    const [session, setSession] = useState<Session | null>(() => sessionStore.get());

    useEffect(() => {
        const handler = (e: Event) => setSession((e as CustomEvent<Session | null>).detail);
        window.addEventListener('maamulpro:session', handler);
        return () => window.removeEventListener('maamulpro:session', handler);
    }, []);

    if (!permission) return <>{children}</>;

    const user = session?.user;
    if (!user) return <Navigate to="/" replace />;

    if (user.isSuperAdmin || user.isImpersonating || OWNER_ROLES.includes(user.role)) return <>{children}</>;

    const granted = new Set(user.permissions || []);
    if (granted.has(permission)) return <>{children}</>;

    return <Navigate to="/app/no-access" replace />;
};

export default PermissionGuard;

import { PropsWithChildren, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { refreshSession, Session, sessionStore } from '../../lib/api';
import { LoadingState } from './PageKit';

const AppShell = ({ children }: PropsWithChildren) => {
    const location = useLocation();
    const [session, setSession] = useState<Session | null>(() => sessionStore.get());
    const [refreshing, setRefreshing] = useState(Boolean(session));

    useEffect(() => {
        let active = true;
        refreshSession()
            .then((value) => { if (active) setSession(value); })
            .catch(() => { if (active) setSession(sessionStore.get()); })
            .finally(() => { if (active) setRefreshing(false); });
        return () => { active = false; };
    }, [location.pathname]);

    useEffect(() => {
        const handleSessionChange = (event: Event) => {
            setSession((event as CustomEvent<Session | null>).detail ?? null);
        };
        window.addEventListener('maamulpro:session', handleSessionChange);
        return () => window.removeEventListener('maamulpro:session', handleSessionChange);
    }, []);

    useEffect(() => {
        if (!session || session.user.isSuperAdmin || !location.pathname.startsWith('/app')) return;

        let active = true;
        const synchronize = (force = false) => {
            if (document.visibilityState !== 'visible') return;
            void refreshSession(force)
                .then((value) => { if (active) setSession(value); })
                .catch(() => { if (active) setSession(sessionStore.get()); });
        };
        const onVisibilityChange = () => synchronize(true);
        const interval = window.setInterval(synchronize, 30_000);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            active = false;
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [location.pathname, session?.user.isSuperAdmin]);

    if (!session) {
        return <Navigate replace state={{ from: location.pathname }} to={location.pathname.startsWith('/superadmin') ? '/superadmin/login' : '/sign-in'} />;
    }
    if (location.pathname.startsWith('/superadmin') && !session.user.isSuperAdmin) {
        return <Navigate replace to="/app/no-access" />;
    }
    if (location.pathname.startsWith('/app') && session.user.isSuperAdmin) {
        return <Navigate replace to="/superadmin/dashboard" />;
    }
    if (refreshing && !session.user.isSuperAdmin) {
        return <div className="panel"><LoadingState /></div>;
    }
    if (!session.user.isSuperAdmin && location.pathname.startsWith('/app')) {
        if (session.user.companyStatus !== 'ACTIVE' || !session.user.accessGranted) {
            const reason = session.user.companyStatus === 'SUSPENDED'
                ? 'Your company account is suspended.'
                : session.user.subscriptionStatus === 'EXPIRED'
                    ? 'Your subscription has expired. A paid renewal is required.'
                    : session.user.subscriptionStatus === 'CANCELLED'
                        ? 'Your subscription has been cancelled.'
                        : 'Your subscription is awaiting activation or payment.';
            return <Navigate replace to={`/locked?reason=${encodeURIComponent(reason)}`} />;
        }
        const features = session.user.entitlements?.features;
        const enterprise = session.user.enterpriseConfiguration;
        const restricted = (
            (location.pathname.startsWith('/app/construction') && !features?.construction)
            || (location.pathname.startsWith('/app/real-estate') && !features?.realEstate)
            || (location.pathname.startsWith('/app/materials') && !features?.materials)
            || (location.pathname.startsWith('/app/payroll') && !features?.payroll)
            || ((location.pathname.startsWith('/app/reports') || location.pathname.startsWith('/app/report-schedules')) && !features?.advancedReports)
            || (location.pathname.startsWith('/app/construction') && enterprise?.workspaceControls?.construction === false)
            || (location.pathname.startsWith('/app/real-estate') && enterprise?.workspaceControls?.real_estate === false)
            || (location.pathname.startsWith('/app/materials') && enterprise?.workspaceControls?.material_management === false)
            || (location.pathname.startsWith('/app/analytics') && enterprise?.analyticsVisibility?.core === false)
            || ((location.pathname.startsWith('/app/reports') || location.pathname.startsWith('/app/report-schedules')) && enterprise?.sidebarVisibility?.reports === false)
        );
        if (restricted && location.pathname !== '/app/no-access') {
            return <Navigate replace state={{ from: location.pathname }} to="/app/no-access" />;
        }
    }
    return <>{children}</>;
};

export default AppShell;

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
        const restricted = (
            (location.pathname.startsWith('/app/construction') && !features?.construction)
            || (location.pathname.startsWith('/app/real-estate') && !features?.realEstate)
            || (location.pathname.startsWith('/app/materials') && !features?.materials)
            || (location.pathname.startsWith('/app/payroll') && !features?.payroll)
            || ((location.pathname.startsWith('/app/reports') || location.pathname.startsWith('/app/report-schedules')) && !features?.advancedReports)
        );
        if (restricted && location.pathname !== '/app/no-access') {
            return <Navigate replace state={{ from: location.pathname }} to="/app/no-access" />;
        }
    }
    return <>{children}</>;
};

export default AppShell;

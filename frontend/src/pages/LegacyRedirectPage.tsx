import { Navigate, useLocation } from 'react-router-dom';

const exactRoutes: Record<string, string> = {
    '/login': '/sign-in',
    '/reset-password': '/forgot-password',
    '/internal': '/superadmin/dashboard',
    '/internal/login': '/superadmin/login',
    '/internal/forgot-password': '/superadmin/forgot-password',
    '/internal/reset-password': '/superadmin/forgot-password',
    '/dashboard/construction/workforce-contracts': '/app/construction/contracts',
};

const LegacyRedirectPage = () => {
    const location = useLocation();
    let target = exactRoutes[location.pathname];
    if (!target && location.pathname.startsWith('/dashboard')) {
        target = `/app${location.pathname.slice('/dashboard'.length) || '/dashboard'}`;
    }
    if (!target && location.pathname.startsWith('/internal')) {
        target = `/superadmin${location.pathname.slice('/internal'.length)}`;
    }
    return <Navigate replace to={`${target || '/sign-in'}${location.search}${location.hash}`} />;
};

export default LegacyRedirectPage;

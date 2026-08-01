import { createBrowserRouter } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import PermissionGuard from '../components/PermissionGuard';
import { routes } from './routes';

const finalRoutes = routes.map((route) => {
    const authenticatedRoute = route.path.startsWith('/app/')
        || (route.path.startsWith('/superadmin/') && !route.path.endsWith('/login') && !route.path.endsWith('/forgot-password'));
    const guarded = 'permission' in route
        ? <PermissionGuard permission={(route as any).permission}>{route.element}</PermissionGuard>
        : route.element;
    return {
        ...route,
        element: authenticatedRoute ? <DefaultLayout>{guarded}</DefaultLayout> : <BlankLayout>{guarded}</BlankLayout>,
    };
});

const router = createBrowserRouter(finalRoutes, {
    future: { v7_relativeSplatPath: true },
});

export default router;

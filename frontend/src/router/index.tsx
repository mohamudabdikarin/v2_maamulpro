import { createBrowserRouter } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import { routes } from './routes';

const finalRoutes = routes.map((route) => {
    const authenticatedRoute = route.path.startsWith('/app/')
        || (route.path.startsWith('/superadmin/') && !route.path.endsWith('/login') && !route.path.endsWith('/forgot-password'));
    return {
        ...route,
        element: authenticatedRoute ? <DefaultLayout>{route.element}</DefaultLayout> : <BlankLayout>{route.element}</BlankLayout>,
    };
});

const router = createBrowserRouter(finalRoutes, {
    future: { v7_relativeSplatPath: true },
});

export default router;

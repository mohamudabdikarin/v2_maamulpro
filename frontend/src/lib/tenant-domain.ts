export const tenantBaseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'maamulpro.site')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

export const tenantHostname = (subdomain: string) => `${subdomain}.${tenantBaseDomain}`;

export const tenantUrl = (subdomain: string, path = '') => `https://${tenantHostname(subdomain)}${path}`;

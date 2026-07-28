import { FormEvent, useEffect, useMemo, useState } from 'react';
import AppShell from '../components/maamulpro/AppShell';
import { api } from '../lib/api';

type Permission = { id: string; key: string; label: string; module: string; workspace?: string };
type Role = { id: string; key: string; name: string; description?: string; isSystem: boolean; isActive: boolean; rolePermissions: { permission: Permission }[]; _count?: { userRoles: number } };
type StaffUser = { id: string; firstName: string; lastName: string; user?: { id: string; email: string } };
type UserAccess = { id: string; name: string; email: string; rbacUserRoles: { role: Role }[]; rbacUserPermissions: { effect: string; reason?: string; permission: Permission }[] };

const RbacPage = () => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [form, setForm] = useState({ key: '', name: '', description: '' });
    const [error, setError] = useState('');
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [userId, setUserId] = useState('');
    const [access, setAccess] = useState<UserAccess | null>(null);
    const [direct, setDirect] = useState({ permissionId: '', effect: 'ALLOW', reason: '' });
    const load = () => Promise.all([api<Permission[]>('/api/rbac/permissions'), api<Role[]>('/api/rbac/roles'), api<any>('/api/staff?limit=100')]).then(([p, r, s]) => { setPermissions(p); setRoles(r); setStaff((Array.isArray(s) ? s : s.data || []).filter((row: StaffUser) => row.user)); });
    useEffect(() => { load().catch((reason) => setError(reason.message)); }, []);
    const groups = useMemo(
        () => permissions.reduce<Record<string, Permission[]>>((result, permission) => {
            const group = permission.workspace || permission.module;
            (result[group] ||= []).push(permission);
            return result;
        }, {}),
        [permissions],
    );

    const create = async (event: FormEvent) => {
        event.preventDefault(); setError('');
        try {
            await api(editingRole ? `/api/rbac/roles/${editingRole.id}` : '/api/rbac/roles', { method: editingRole ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, ...(editingRole ? {} : { key: form.key.toUpperCase().replace(/\s+/g, '_') }), permissionIds: selected }) });
            setForm({ key: '', name: '', description: '' }); setSelected([]); setEditingRole(null); await load();
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create role'); }
    };
    const remove = async (role: Role) => {
        if (!window.confirm(`Delete role "${role.name}"?`)) return;
        try { await api(`/api/rbac/roles/${role.id}`, { method: 'DELETE' }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete role'); }
    };
    const editRole = (role: Role) => { setEditingRole(role); setForm({ key: role.key, name: role.name, description: role.description || '' }); setSelected(role.rolePermissions.map((item) => item.permission.id)); };
    const selectUser = async (id: string) => { setUserId(id); if (!id) return setAccess(null); try { setAccess(await api<UserAccess>(`/api/rbac/users/${id}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load user access'); } };
    const toggleUserRole = async (roleId: string) => {
        if (!access) return; const current = access.rbacUserRoles.map((item) => item.role.id); const roleIds = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId];
        try { setAccess(await api<UserAccess>(`/api/rbac/users/${access.id}/roles`, { method: 'PATCH', body: JSON.stringify({ roleIds }) })); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to assign role'); }
    };
    const addDirect = async () => { if (!access || !direct.permissionId) return; try { setAccess(await api<UserAccess>(`/api/rbac/users/${access.id}/permissions`, { method: 'POST', body: JSON.stringify(direct) })); setDirect({ permissionId: '', effect: 'ALLOW', reason: '' }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to set direct permission'); } };
    const removeDirect = async (permissionId: string) => { if (!access) return; try { setAccess(await api<UserAccess>(`/api/rbac/users/${access.id}/permissions/${permissionId}`, { method: 'DELETE' })); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to remove direct permission'); } };

    return (
        <AppShell>
            <h1 className="text-2xl font-extrabold">Roles & Permissions</h1>
            <p className="mt-1 text-white-dark">Database-backed permission templates and direct access control.</p>
            {error && <div className="mt-5 rounded-md bg-danger-light p-4 text-danger">{error}</div>}
            <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
                <div className="panel overflow-x-auto p-0">
                    <table className="table-hover w-full"><thead><tr><th>Role</th><th>Permissions</th><th>Users</th><th>Status</th><th /></tr></thead>
                        <tbody>{roles.map((role) => <tr key={role.id}><td><strong>{role.name}</strong><div className="text-xs text-white-dark">{role.key}</div></td><td>{role.rolePermissions.length}</td><td>{role._count?.userRoles || 0}</td><td><span className={`badge ${role.isActive ? 'bg-success' : 'bg-dark'} text-white`}>{role.isActive ? 'Active' : 'Inactive'}</span></td><td><div className="flex gap-2"><button className="btn btn-sm btn-outline-primary" onClick={() => editRole(role)}>Edit</button>{!role.isSystem && <button className="btn btn-sm btn-outline-danger" onClick={() => remove(role)}>Delete</button>}</div></td></tr>)}</tbody>
                    </table>
                </div>
                <form className="panel space-y-4" onSubmit={create}>
                    <h2 className="text-lg font-bold">{editingRole ? 'Edit role' : 'Create role'}</h2>
                    <input className="form-input" placeholder="Role key" disabled={Boolean(editingRole)} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
                    <input className="form-input" placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <textarea className="form-textarea" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <div className="max-h-80 space-y-4 overflow-y-auto rounded border border-white-light p-3 dark:border-[#191e3a]">
                        {Object.entries(groups).map(([group, items]) => <div key={group}><p className="mb-2 font-bold capitalize">{group.replace(/_/g, ' ')}</p>{items.map((permission) => <label className="mb-2 flex items-center gap-2" key={permission.id}><input className="form-checkbox" type="checkbox" checked={selected.includes(permission.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, permission.id] : selected.filter((id) => id !== permission.id))} /><span>{permission.label || permission.key}</span></label>)}</div>)}
                    </div>
                    <button className="btn btn-primary w-full">{editingRole ? 'Save role' : 'Create role'}</button>{editingRole && <button type="button" className="btn btn-outline-dark w-full" onClick={() => { setEditingRole(null); setForm({ key: '', name: '', description: '' }); setSelected([]); }}>Cancel editing</button>}
                </form>
            </div>
            <div className="panel mt-6">
                <h2 className="text-lg font-bold">User access assignments</h2><p className="mb-4 text-sm text-white-dark">Assign role templates and explicit allow/deny overrides to staff login accounts.</p>
                <select className="form-select max-w-xl" value={userId} onChange={(event) => selectUser(event.target.value)}><option value="">Select a staff account…</option>{staff.map((person) => <option value={person.user!.id}>{person.firstName} {person.lastName} · {person.user!.email}</option>)}</select>
                {access && <div className="mt-6 grid gap-6 xl:grid-cols-2">
                    <div><h3 className="mb-3 font-bold">Assigned roles</h3><div className="grid gap-2 sm:grid-cols-2">{roles.filter((role) => role.isActive).map((role) => <label className="flex items-center gap-2 rounded-md border border-white-light p-3 dark:border-[#191e3a]"><input className="form-checkbox" type="checkbox" checked={access.rbacUserRoles.some((item) => item.role.id === role.id)} onChange={() => toggleUserRole(role.id)} /><span><strong>{role.name}</strong><small className="block text-white-dark">{role.rolePermissions.length} permissions</small></span></label>)}</div></div>
                    <div><h3 className="mb-3 font-bold">Direct permission override</h3><div className="grid gap-3 sm:grid-cols-2"><select className="form-select sm:col-span-2" value={direct.permissionId} onChange={(event) => setDirect({ ...direct, permissionId: event.target.value })}><option value="">Select permission…</option>{permissions.map((permission) => <option value={permission.id}>{permission.label || permission.key}</option>)}</select><select className="form-select" value={direct.effect} onChange={(event) => setDirect({ ...direct, effect: event.target.value })}><option value="ALLOW">Allow</option><option value="DENY">Deny</option></select><input className="form-input" placeholder="Reason (optional)" value={direct.reason} onChange={(event) => setDirect({ ...direct, reason: event.target.value })} /><button className="btn btn-primary sm:col-span-2" onClick={addDirect}>Apply override</button></div><div className="mt-4 space-y-2">{access.rbacUserPermissions.map((item) => <div className="flex items-center justify-between rounded-md bg-gray-50 p-3 dark:bg-dark"><span><span className={`badge mr-2 ${item.effect === 'ALLOW' ? 'bg-success' : 'bg-danger'} text-white`}>{item.effect}</span>{item.permission.label || item.permission.key}<small className="block text-white-dark">{item.reason}</small></span><button className="btn btn-sm btn-outline-danger" onClick={() => removeDirect(item.permission.id)}>Remove</button></div>)}</div></div>
                </div>}
            </div>
        </AppShell>
    );
};

export default RbacPage;

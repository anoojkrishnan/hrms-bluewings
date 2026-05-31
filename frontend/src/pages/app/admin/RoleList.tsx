import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, type Role, type Permission, type CreateRoleDto } from '@/lib/api/rbac.api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const DATA_SCOPES = [
  'self', 'direct_reports', 'direct_and_indirect_reports',
  'department', 'location', 'company', 'organization', 'platform',
];

type Modal = 'create' | 'edit' | 'permissions' | null;

const INITIAL_FORM: CreateRoleDto = { name: '', code: '', dataScope: 'department', description: '' };

export default function RoleList() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<Role | null>(null);
  const [form, setForm] = useState<CreateRoleDto>(INITIAL_FORM);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  const { data: rolesRes, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacApi.listRoles({ limit: 100 }),
  });

  const { data: allPermsRes } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: rbacApi.listAllPermissions,
    enabled: modal === 'permissions',
  });

  const { data: rolePermsRes, isLoading: rolePermsLoading } = useQuery({
    queryKey: ['role-permissions', selected?.publicId],
    queryFn: () => rbacApi.getRolePermissions(selected!.publicId),
    enabled: modal === 'permissions' && !!selected,
    // Always refetch — prevents stale cache when reopening same role after edits
    staleTime: 0,
  });

  useEffect(() => {
    // rolePermsRes is string[] of permission codes
    if (Array.isArray(rolePermsRes)) {
      setSelectedPerms(new Set(rolePermsRes));
    }
  }, [rolePermsRes]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateRoleDto) => rbacApi.createRole(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setModal(null); setForm(INITIAL_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: Partial<CreateRoleDto> }) =>
      rbacApi.updateRole(publicId, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setModal(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => rbacApi.deleteRole(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const permsMutation = useMutation({
    mutationFn: ({ publicId, codes }: { publicId: string; codes: string[] }) =>
      rbacApi.setRolePermissions(publicId, codes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions', selected?.publicId] });
      setModal(null);
    },
  });

  const roles: Role[] = rolesRes?.data ?? [];
  const allPerms: Permission[] = allPermsRes ?? [];
  const filteredPerms = permSearch
    ? allPerms.filter((p: Permission) => p.code.includes(permSearch) || p.description.toLowerCase().includes(permSearch.toLowerCase()))
    : allPerms;

  const groupedPerms = filteredPerms.reduce<Record<string, Permission[]>>((acc: Record<string, Permission[]>, p: Permission) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const openEdit = (role: Role) => {
    setSelected(role);
    setForm({ name: role.name, code: role.code, dataScope: role.dataScope, description: role.description ?? '' });
    setModal('edit');
  };

  const openPerms = (role: Role) => {
    setSelected(role);
    setSelectedPerms(new Set());
    setModal('permissions');
  };

  const togglePerm = (code: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const set = (field: keyof CreateRoleDto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1 className="page-title">Roles</h1></div>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton height={48} /></div>)}
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles &amp; Permissions</h1>
          <p className="page-subtitle">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => { setForm(INITIAL_FORM); setModal('create'); }}>+ New Role</Button>
        </div>
      </div>

      {roles.length === 0 ? (
        <EmptyState title="No roles" description="Create your first custom role." cta={<Button onClick={() => { setForm(INITIAL_FORM); setModal('create'); }}>New Role</Button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Scope</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.publicId}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{role.name}</span>
                    {role.description && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{role.description}</div>}
                  </td>
                  <td><code style={{ fontSize: 12, background: 'var(--color-background)', padding: '2px 6px', borderRadius: 4 }}>{role.code}</code></td>
                  <td>
                    <Badge variant={role.isSystemRole ? 'info' : 'default'}>
                      {role.isSystemRole ? 'System' : 'Custom'}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{role.dataScope.replace(/_/g, ' ')}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openPerms(role)}>Permissions</button>
                      {!role.isSystemRole && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(role)}>Edit</button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteMutation.mutate(role.publicId); }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        title="Create Role"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>Create</Button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. HR Executive" />
        </div>
        <div className="form-group">
          <label className="form-label">Code *</label>
          <input className="input" value={form.code} onChange={set('code')} placeholder="e.g. hr_executive" />
        </div>
        <div className="form-group">
          <label className="form-label">Data Scope</label>
          <select className="select" value={form.dataScope} onChange={set('dataScope')}>
            {DATA_SCOPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="input" value={form.description ?? ''} onChange={set('description')} placeholder="Optional" />
        </div>
        {createMutation.isError && <div className="alert alert-danger">Failed to create role.</div>}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        title={`Edit: ${selected?.name}`}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              onClick={() => selected && updateMutation.mutate({ publicId: selected.publicId, dto: form })}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input" value={form.name} onChange={set('name')} />
        </div>
        <div className="form-group">
          <label className="form-label">Data Scope</label>
          <select className="select" value={form.dataScope} onChange={set('dataScope')}>
            {DATA_SCOPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="input" value={form.description ?? ''} onChange={set('description')} />
        </div>
        {updateMutation.isError && <div className="alert alert-danger">Failed to update role.</div>}
      </Modal>

      {/* Permissions modal */}
      <Modal
        open={modal === 'permissions'}
        onClose={() => setModal(null)}
        title={`Permissions: ${selected?.name}`}
        size="xl"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: 'auto' }}>
              {selectedPerms.size} selected
            </span>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              onClick={() => selected && permsMutation.mutate({ publicId: selected.publicId, codes: [...selectedPerms] })}
              loading={permsMutation.isPending}
            >
              Save Permissions
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Search permissions..."
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
          />
        </div>
        {rolePermsLoading && <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>Loading permissions…</div>}
        {(Object.entries(groupedPerms) as [string, Permission[]][]).map(([module, perms]) => (
          <div key={module} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {module}
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setSelectedPerms((prev) => {
                  const next = new Set(prev);
                  perms.forEach((p) => next.add(p.code));
                  return next;
                })}
              >
                all
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setSelectedPerms((prev) => {
                  const next = new Set(prev);
                  perms.forEach((p) => next.delete(p.code));
                  return next;
                })}
              >
                none
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
              {perms.map((p) => (
                <label
                  key={p.code}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: selectedPerms.has(p.code) ? 'var(--color-background)' : 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPerms.has(p.code)}
                    onChange={() => togglePerm(p.code)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 13 }}>{p.description}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
}

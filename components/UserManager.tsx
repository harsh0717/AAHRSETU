'use client';
import { useState, useEffect } from 'react';
import { getUsers, createUser, upsertUser, deleteUser, getDepartments, UserProfile } from '@/lib/auth';
import { getVendors, Vendor } from '@/lib/vendors';
import { ROLE_LABELS, ROLE_ICONS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

const EMPTY_FORM = { 
  name: '', 
  email: '', 
  password: '', 
  role: 'coordinator', 
  department_id: '', 
  principal_depts: [] as string[], 
  vendor_id: '', 
  preferred_language: 'en', 
  active: true 
};

interface UserManagerProps {
  accentColor?: string;
}

export default function UserManager({ accentColor = '#DC2626' }: UserManagerProps) {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [uList, dList, vList] = await Promise.all([
      getUsers(),
      getDepartments(),
      getVendors()
    ]);
    setUsers(uList);
    setDepartments(dList);
    setVendors(vList);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditUser(null);
    setShowModal(true);
  }

  function openEdit(user: UserProfile) {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department_id: user.department_id || '',
      principal_depts: user.principal_depts || [],
      vendor_id: user.vendor_id || '',
      preferred_language: user.preferred_language || 'en',
      active: user.active
    });
    setEditUser(user);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    
    setSaving(true);
    try {
      if (editUser) {
        // Prepare PUT payload
        const payload: any = {
          id: editUser.id,
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          department_id: form.department_id || null,
          vendor_id: form.vendor_id || null,
          preferred_language: form.preferred_language,
          active: form.active,
          principal_depts: form.principal_depts
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        await upsertUser(payload);
      } else {
        if (!form.password.trim()) {
          alert('Password is required for new user');
          setSaving(false);
          return;
        }
        // Prepare POST payload
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          role: form.role,
          department_id: form.department_id || null,
          vendor_id: form.vendor_id || null,
          preferred_language: form.preferred_language,
          principal_depts: form.principal_depts
        });
      }
      setShowModal(false);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error saving user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserProfile) {
    if (user.role === 'admin') {
      alert('Cannot delete admin user.');
      return;
    }
    if (confirm(`Delete user "${user.name}"? This cannot be undone.`)) {
      setLoading(true);
      await deleteUser(user.id);
      await loadData();
    }
  }

  function toggleDept(deptId: string) {
    const arr = form.principal_depts || [];
    const next = arr.includes(deptId) ? arr.filter(d => d !== deptId) : [...arr, deptId];
    setForm(f => ({ ...f, principal_depts: next }));
  }

  const filtered = users
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .filter(u => roleFilter === 'all' || u.role === roleFilter);

  const ROLE_COLORS_MAP: Record<string, string> = { 
    admin: '#8B5CF6', 
    dcr: '#0EA5E9', 
    principal: '#6366F1', 
    coordinator: '#3B82F6', 
    vendor: '#10B981' 
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
        <div>Loading users list from database...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          className="form-input" 
          style={{ maxWidth: '240px', '--role-accent': accentColor } as React.CSSProperties} 
          placeholder="Search users..."
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <select 
          className="form-input" 
          style={{ maxWidth: '160px', '--role-accent': accentColor } as React.CSSProperties}
          value={roleFilter} 
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ '--role-accent': accentColor } as React.CSSProperties}>
          ➕ {t('admin.add_user')}
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper" style={{ boxShadow: 'var(--shadow)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department Info</th>
              <th>Language</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 700 }}>
                  <span style={{ marginRight: '6px' }}>{ROLE_ICONS[user.role]}</span>
                  {user.name}
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', fontFamily: 'var(--font-mono)' }}>{user.email}</td>
                <td>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: ROLE_COLORS_MAP[user.role] + '12', color: ROLE_COLORS_MAP[user.role] }}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                  {user.role === 'coordinator' && departments.find(d => d.id === user.department_id)?.name}
                  {user.role === 'principal' && (user.principal_depts || []).map(d => departments.find(x => x.id === d)?.name).join(', ')}
                  {user.role === 'vendor' && vendors.find(v => v.id === user.vendor_id)?.name}
                  {['admin','dcr'].includes(user.role) && '—'}
                </td>
                <td style={{ fontSize: '0.8125rem', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gray-500)' }}>
                  {user.preferred_language || 'en'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: user.active ? '#D1FAE5' : '#FEE2E2', color: user.active ? '#065F46' : '#991B1B' }}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(user)}>{t('common.edit')}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(user)} style={{ color: '#EF4444' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                {editUser ? 'Edit User Profile' : 'Add Institutional User'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                <input type="text" className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ '--role-accent': accentColor } as React.CSSProperties} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ '--role-accent': accentColor } as React.CSSProperties} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
                  Password {editUser ? '(leave blank to keep)' : '*'}
                </label>
                <input type="password" className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ '--role-accent': accentColor } as React.CSSProperties} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>User Role *</label>
                <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, department_id: '', principal_depts: [], vendor_id: '' }))} style={{ '--role-accent': accentColor } as React.CSSProperties}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{ROLE_ICONS[k]} {v}</option>)}
                </select>
              </div>

              {form.role === 'coordinator' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Linked Department *</label>
                  <select className="form-input" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={{ '--role-accent': accentColor } as React.CSSProperties}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {form.role === 'principal' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Departments Managed *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {departments.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid var(--gray-200)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', background: (form.principal_depts || []).includes(d.id) ? '#EEF2FF' : 'white' }}>
                        <input type="checkbox" checked={(form.principal_depts || []).includes(d.id)} onChange={() => toggleDept(d.id)} />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.role === 'vendor' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Linked Vendor Profile *</label>
                  <select className="form-input" value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))} style={{ '--role-accent': accentColor } as React.CSSProperties}>
                    <option value="">Select vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>Language</label>
                <select className="form-input" value={form.preferred_language} onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))} style={{ '--role-accent': accentColor } as React.CSSProperties}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="gu">ગુજરાતી</option>
                </select>
              </div>

              {editUser && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  Active user account
                </label>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, '--role-accent': accentColor } as React.CSSProperties}>
                  {saving ? 'Saving...' : (editUser ? 'Update User' : 'Add User')}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: '0 0 auto' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

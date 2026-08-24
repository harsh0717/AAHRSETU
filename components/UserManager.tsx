'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getUsers, createUser, upsertUser, deleteUser, getDepartments, UserProfile } from '@/lib/auth';
import { getVendors, Vendor } from '@/lib/vendors';
import { ROLE_LABELS, ROLE_ICONS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

import UiverseButton from '@/components/ui/UiverseButton';
import UiverseBadge from '@/components/ui/UiverseBadge';

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

export default function UserManager({ accentColor = '#2563EB' }: UserManagerProps) {
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

  const loadDataRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [uList, dList, vList] = await Promise.all([
        getUsers().catch(() => []),
        getDepartments().catch(() => []),
        getVendors().catch(() => [])
      ]);
      setUsers(uList);
      setDepartments(dList);
      setVendors(vList);
    } catch (err) {
      console.error('Error in UserManager loadData:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Cross-device sync: poll every 10 seconds silently
    const syncInterval = setInterval(() => {
      loadDataRef.current?.(true);
    }, 10000);

    const handleUserChanged = () => {
      loadDataRef.current?.(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'aharsetu_users_timestamp' ||
        e.key === 'aharsetu_custom_users' ||
        e.key === 'aharsetu_deleted_user_ids' ||
        e.key === 'aharsetu_departments_v3' ||
        e.key === 'aharsetu_vendors_v3'
      ) {
        loadDataRef.current?.(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aharsetu_user_changed', handleUserChanged);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      clearInterval(syncInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('aharsetu_user_changed', handleUserChanged);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  function openAdd() {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(user: UserProfile) {
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department_id: user.department_id || '',
      principal_depts: user.principal_depts || [],
      vendor_id: user.vendor_id || '',
      preferred_language: user.preferred_language || 'en',
      active: user.active !== undefined ? user.active : true,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      alert('Name and Email are required');
      return;
    }
    if (!editUser && !form.password.trim()) {
      alert('Password is required for new user');
      return;
    }

    setSaving(true);
    try {
      if (editUser) {
        await upsertUser({
          ...editUser,
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          department_id: form.department_id || null,
          principal_depts: form.principal_depts,
          vendor_id: form.vendor_id || null,
          preferred_language: form.preferred_language,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          department_id: form.department_id || null,
          principal_depts: form.principal_depts,
          vendor_id: form.vendor_id || null,
          preferred_language: form.preferred_language,
          active: form.active,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserProfile) {
    if (!confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) return;
    try {
      await deleteUser(user.id);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete user');
    }
  }

  function toggleDept(deptId: string) {
    setForm(f => {
      const current = f.principal_depts || [];
      const updated = current.includes(deptId)
        ? current.filter(d => d !== deptId)
        : [...current, deptId];
      return { ...f, principal_depts: updated };
    });
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const ROLE_COLORS_MAP: Record<string, string> = { 
    admin: '#2563EB', 
    dcr: '#2563EB', 
    principal: '#2563EB', 
    coordinator: '#2563EB', 
    vendor: '#2563EB' 
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'spin 1s infinite linear' }}>🔄</div>
        <div style={{ fontWeight: 600 }}>Loading users list from database...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: '12px',
          padding: '8px 14px',
          minWidth: '240px',
          flex: '1'
        }}>
          <span style={{ color: '#94A3B8' }}>🔍</span>
          <input 
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.86rem', color: '#0F172A' }}
            placeholder="Search users by name or email..."
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select 
          style={{
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '9px 14px',
            fontSize: '0.84rem',
            fontWeight: 600,
            color: '#334155',
            outline: 'none',
            cursor: 'pointer'
          }}
          value={roleFilter} 
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        
        <UiverseButton 
          variant="primary" 
          size="sm" 
          onClick={openAdd}
        >
          + Add New User
        </UiverseButton>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '14px', border: '1px solid #E2E8F0', background: '#FFFFFF', overflowX: 'auto', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Department Info</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Language</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>
                  <span style={{ marginRight: '8px' }}>{ROLE_ICONS[user.role]}</span>
                  {user.name}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748B', fontFamily: 'monospace' }}>{user.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <UiverseBadge variant="info" size="sm">
                    {ROLE_LABELS[user.role]}
                  </UiverseBadge>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748B' }}>
                  {user.role === 'coordinator' && (departments.find(d => d.id === user.department_id)?.name || 'General')}
                  {user.role === 'principal' && (user.principal_depts && user.principal_depts.length > 0 ? user.principal_depts.map(d => departments.find(x => x.id === d)?.name || d).join(', ') : 'All Departments')}
                  {user.role === 'vendor' && (vendors.find(v => v.id === user.vendor_id)?.name || 'All Canteens')}
                  {['admin','dcr'].includes(user.role) && '— Institutional —'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.78rem', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                  {user.preferred_language || 'en'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <UiverseBadge variant={user.active ? 'success' : 'danger'} size="sm">
                    {user.active ? 'Active' : 'Inactive'}
                  </UiverseBadge>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <UiverseButton 
                      variant="outline"
                      size="sm"
                      style={{ height: '28px', padding: '2px 10px', fontSize: '0.75rem' }}
                      onClick={() => openEdit(user)}
                    >
                      ✏️ {t('common.edit', 'Edit')}
                    </UiverseButton>
                    <UiverseButton 
                      variant="danger"
                      size="sm"
                      style={{ height: '28px', padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => handleDelete(user)}
                      title="Delete User"
                    >
                      🗑️
                    </UiverseButton>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8', fontWeight: 600 }}>
                  No users found matching query
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.55)', 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
          }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ 
            background: '#FFFFFF', 
            borderRadius: '20px', 
            width: '100%', 
            maxWidth: '520px', 
            padding: '28px', 
            maxHeight: '85vh', 
            overflowY: 'auto', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
            border: '1px solid #E2E8F0' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '22px', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                  {editUser ? 'Edit Institutional User' : 'Register New User'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Configure role, departmental permissions, and credentials
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ 
                  background: '#F1F5F9', 
                  border: 'none', 
                  fontSize: '1rem', 
                  cursor: 'pointer', 
                  color: '#64748B',
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                <input 
                  type="text" 
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                <input 
                  type="email" 
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="name@campus.edu.in"
                  value={form.email} 
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Password {editUser ? '(leave blank to retain current)' : '*'}
                </label>
                <input 
                  type="password" 
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder={editUser ? '••••••••' : 'Enter secure password'}
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>User Role *</label>
                <select 
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                  value={form.role} 
                  onChange={e => setForm(f => ({ ...f, role: e.target.value, department_id: '', principal_depts: [], vendor_id: '' }))}
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{ROLE_ICONS[k]} {v}</option>)}
                </select>
              </div>

              {form.role === 'coordinator' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Linked Department *</label>
                  <select 
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                    value={form.department_id} 
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  >
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {form.role === 'principal' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Departments Managed *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {departments.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: (form.principal_depts || []).includes(d.id) ? '#EFF6FF' : 'white', borderColor: (form.principal_depts || []).includes(d.id) ? '#3B82F6' : '#E2E8F0' }}>
                        <input type="checkbox" checked={(form.principal_depts || []).includes(d.id)} onChange={() => toggleDept(d.id)} />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.role === 'vendor' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Linked Canteen Profile *</label>
                  <select 
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                    value={form.vendor_id} 
                    onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>Preferred Language</label>
                <select 
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                  value={form.preferred_language} 
                  onChange={e => setForm(f => ({ ...f, preferred_language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                </select>
              </div>

              {editUser && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  Active User Account (can sign in)
                </label>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <UiverseButton 
                  variant="primary" 
                  style={{ flex: 1 }}
                  onClick={handleSave} 
                  isLoading={saving}
                >
                  {editUser ? 'Update User' : 'Add User'}
                </UiverseButton>
                <UiverseButton 
                  variant="secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </UiverseButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

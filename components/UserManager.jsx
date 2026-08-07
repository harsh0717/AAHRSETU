'use client';
import { useState } from 'react';
import { getUsers, createUser, upsertUser, deleteUser } from '@/lib/auth';
import { getVendors } from '@/lib/vendors';
import { DEPARTMENTS, ROLES, ROLE_LABELS, ROLE_ICONS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'coordinator', department: '', principalDepts: [], vendorId: '', preferredLanguage: 'en', active: true };

export default function UserManager({ accentColor = '#DC2626' }) {
  const { t } = useI18n();
  const [users, setUsers] = useState(getUsers);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const vendors = getVendors();

  function refresh() { setUsers(getUsers()); }

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditUser(null);
    setShowModal(true);
  }

  function openEdit(user) {
    setForm({ ...EMPTY_FORM, ...user, password: '' });
    setEditUser(user);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editUser) {
      const updatedUser = { ...editUser, name: form.name.trim(), email: form.email.trim(), role: form.role, department: form.department || null, principalDepts: form.principalDepts || [], vendorId: form.vendorId || null, preferredLanguage: form.preferredLanguage, active: form.active };
      if (form.password.trim()) updatedUser.password = form.password.trim();
      upsertUser(updatedUser);
    } else {
      if (!form.password.trim()) { alert('Password is required for new user'); return; }
      createUser({ name: form.name.trim(), email: form.email.trim(), password: form.password.trim(), role: form.role, department: form.department || null, principalDepts: form.principalDepts || [], vendorId: form.vendorId || null, preferredLanguage: form.preferredLanguage });
    }
    setShowModal(false);
    refresh();
  }

  function handleDelete(user) {
    if (user.role === 'admin') { alert('Cannot delete admin user.'); return; }
    if (confirm(`Delete user "${user.name}"? This cannot be undone.`)) {
      deleteUser(user.id);
      refresh();
    }
  }

  function toggleDept(deptId) {
    const arr = form.principalDepts || [];
    const next = arr.includes(deptId) ? arr.filter(d => d !== deptId) : [...arr, deptId];
    setForm(f => ({ ...f, principalDepts: next }));
  }

  const filtered = users
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .filter(u => roleFilter === 'all' || u.role === roleFilter);

  const ROLE_COLORS_MAP = { admin: '#DC2626', dcr: '#D97706', principal: '#7C3AED', coordinator: '#2563EB', vendor: '#059669' };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" style={{ maxWidth: '240px', '--role-accent': accentColor }} placeholder="Search users..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ maxWidth: '160px', '--role-accent': accentColor }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ '--role-accent': accentColor }}>
          ➕ {t('admin.add_user')}
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Language</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 700 }}>{ROLE_ICONS[user.role]} {user.name}</td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', fontFamily: 'var(--font-mono)' }}>{user.email}</td>
                <td>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: ROLE_COLORS_MAP[user.role] + '18', color: ROLE_COLORS_MAP[user.role] }}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                  {user.role === 'coordinator' && DEPARTMENTS.find(d => d.id === user.department)?.name}
                  {user.role === 'principal' && (user.principalDepts || []).map(d => DEPARTMENTS.find(x => x.id === d)?.name).join(', ')}
                  {user.role === 'vendor' && user.vendorId}
                  {['admin','dcr'].includes(user.role) && '—'}
                </td>
                <td style={{ fontSize: '0.8125rem', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gray-500)' }}>{user.preferredLanguage || 'en'}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: user.active !== false ? '#DCFCE7' : '#FEF2F2', color: user.active !== false ? '#166534' : '#DC2626' }}>
                    {user.active !== false ? 'Active' : 'Inactive'}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{editUser ? t('admin.edit_user') : t('admin.add_user')}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[['name','Name *','text'],['email','Email *','email']].map(([key, label, type]) => (
                <div key={key}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>{label}</label>
                  <input type={type} className="form-input" value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ '--role-accent': accentColor }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Password {editUser ? '(leave blank to keep)' : '*'}</label>
                <input type="password" className="form-input" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} style={{ '--role-accent': accentColor }} />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Role *</label>
                <select className="form-input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value, department: '', principalDepts: [], vendorId: ''}))} style={{ '--role-accent': accentColor }}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{ROLE_ICONS[k]} {v}</option>)}
                </select>
              </div>
              {form.role === 'coordinator' && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Department *</label>
                  <select className="form-input" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} style={{ '--role-accent': accentColor }}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {form.role === 'principal' && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Departments Managed *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {DEPARTMENTS.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', border: '1px solid var(--gray-300)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8125rem', background: (form.principalDepts||[]).includes(d.id) ? '#EDE9FE' : 'white' }}>
                        <input type="checkbox" checked={(form.principalDepts||[]).includes(d.id)} onChange={() => toggleDept(d.id)} />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {form.role === 'vendor' && (
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Linked Vendor *</label>
                  <select className="form-input" value={form.vendorId} onChange={e => setForm(f => ({...f, vendorId: e.target.value}))} style={{ '--role-accent': accentColor }}>
                    <option value="">Select vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Language</label>
                <select className="form-input" value={form.preferredLanguage} onChange={e => setForm(f => ({...f, preferredLanguage: e.target.value}))} style={{ '--role-accent': accentColor }}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="gu">ગુજરાતી</option>
                </select>
              </div>
              {editUser && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.active !== false} onChange={e => setForm(f => ({...f, active: e.target.checked}))} />
                  Active user account
                </label>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1, '--role-accent': accentColor }}>
                  {editUser ? t('common.update') : t('common.add')} User
                </button>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: '0 0 auto' }}>{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { getVendorMenu, upsertVendorMenuItem, deleteVendorMenuItem } from '@/lib/vendors';
import { useI18n } from '@/lib/i18n';

export default function MenuManager({ vendorId, vendorName }) {
  const { t } = useI18n();
  const [menu, setMenu] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', unit: 'per plate', available: true });
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);

  function load() { setMenu(getVendorMenu(vendorId)); }
  useEffect(() => { load(); }, [vendorId]);

  function handleSave() {
    if (!form.name.trim() || !form.price) return;
    const item = {
      id: editId || 'mi-' + Date.now().toString(36),
      vendorId,
      vendorName,
      name: form.name.trim(),
      price: parseFloat(form.price),
      unit: form.unit || 'per plate',
      available: form.available,
    };
    upsertVendorMenuItem(vendorId, item);
    setForm({ name: '', price: '', unit: 'per plate', available: true });
    setEditId(null);
    setAdding(false);
    load();
  }

  function handleEdit(item) {
    setForm({ name: item.name, price: String(item.price), unit: item.unit || '', available: item.available });
    setEditId(item.id);
    setAdding(true);
  }

  function handleDelete(id) {
    if (confirm('Remove this item from the menu?')) {
      deleteVendorMenuItem(vendorId, id);
      load();
    }
  }

  function toggleAvailable(item) {
    upsertVendorMenuItem(vendorId, { ...item, available: !item.available });
    load();
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div className="section-title">{t('nav.manage_menu')}</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(!adding); setEditId(null); setForm({ name: '', price: '', unit: 'per plate', available: true }); }}
          style={{ '--role-accent': '#059669' }}>
          {adding ? `✕ ${t('common.cancel')}` : `➕ ${t('vendor.add_item')}`}
        </button>
      </div>

      {adding && (
        <div style={{ padding: '16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('vendor.item_name')} *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Tea" style={{ '--role-accent': '#059669' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('vendor.item_price')} *</label>
              <input className="form-input" type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="10" style={{ '--role-accent': '#059669' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{t('vendor.item_unit')}</label>
              <input className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="per cup" style={{ '--role-accent': '#059669' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} />
              <span>{t('vendor.available')}</span>
            </label>
            <button onClick={handleSave} disabled={!form.name.trim() || !form.price}
              className="btn btn-primary btn-sm" style={{ '--role-accent': '#059669' }}>
              {editId ? t('common.update') : t('common.add')} Item
            </button>
          </div>
        </div>
      )}

      {menu.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h3>{t('vendor.no_menu')}</h3>
          <p>Click "Add Item" to add your first menu item.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{t('vendor.item_name')}</th>
                <th style={{ textAlign: 'right' }}>{t('vendor.item_price')}</th>
                <th>{t('vendor.item_unit')}</th>
                <th style={{ textAlign: 'center' }}>{t('vendor.available')}</th>
                <th style={{ textAlign: 'center' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {menu.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}>₹{item.price}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{item.unit}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => toggleAvailable(item)} style={{
                      padding: '2px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                      background: item.available ? '#DCFCE7' : '#FEF2F2',
                      color: item.available ? '#166534' : '#DC2626',
                    }}>
                      {item.available ? t('vendor.available') : t('vendor.out_of_stock')}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(item)}>{t('common.edit')}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)}
                        style={{ color: '#EF4444' }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

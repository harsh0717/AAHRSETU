'use client';
import { useState } from 'react';
import { getMenu, saveMenu, upsertMenuItem, deleteMenuItem } from '@/lib/store';
import { DEFAULT_MENU_ITEMS } from '@/lib/constants';

export default function MenuManager() {
  const [menu, setMenu] = useState(() => typeof window !== 'undefined' ? getMenu() : DEFAULT_MENU_ITEMS);
  const [editing, setEditing] = useState(null); // { id, name, price, unit }
  const [newItem, setNewItem] = useState({ name: '', price: '', unit: 'per piece' });
  const [showAdd, setShowAdd] = useState(false);

  function handleSaveNew() {
    if (!newItem.name.trim() || !newItem.price) return;
    const item = {
      id: 'm' + Date.now(),
      name: newItem.name.trim(),
      price: parseFloat(newItem.price),
      unit: newItem.unit || 'per piece',
    };
    upsertMenuItem(item);
    setMenu(getMenu());
    setNewItem({ name: '', price: '', unit: 'per piece' });
    setShowAdd(false);
  }

  function handleSaveEdit() {
    if (!editing.name.trim() || !editing.price) return;
    upsertMenuItem({ ...editing, price: parseFloat(editing.price) });
    setMenu(getMenu());
    setEditing(null);
  }

  function handleDelete(id) {
    if (!confirm('Remove this item from menu?')) return;
    deleteMenuItem(id);
    setMenu(getMenu());
  }

  const UNIT_OPTIONS = ['per cup', 'per plate', 'per bottle', 'per pack', 'per piece', 'per portion'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0 }}>Menu Items</h4>
          <p style={{ fontSize: '0.8125rem', margin: '4px 0 0' }}>
            Prices set here auto-fill in order pricing. {menu.length} items.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ '--role-accent': '#059669' }}>
          + Add Item
        </button>
      </div>

      {/* Add new item */}
      {showAdd && (
        <div style={{
          padding: '16px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '10px',
          display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div className="form-group" style={{ flex: '2', minWidth: '140px' }}>
            <label className="form-label">Item Name</label>
            <input className="form-input" style={{ '--role-accent': '#059669' }} value={newItem.name}
              onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Samosa" />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '100px' }}>
            <label className="form-label">Price (₹)</label>
            <input className="form-input" style={{ '--role-accent': '#059669' }} type="number" value={newItem.price}
              onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} placeholder="0" min={0} />
          </div>
          <div className="form-group" style={{ flex: '1', minWidth: '120px' }}>
            <label className="form-label">Unit</label>
            <select className="form-select" style={{ '--role-accent': '#059669' }} value={newItem.unit}
              onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}>
              {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '2px' }}>
            <button className="btn btn-success btn-sm" onClick={handleSaveNew}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Menu table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th style={{ textAlign: 'right' }}>Price (₹)</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menu.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ color: 'var(--gray-400)', fontSize: '0.8125rem' }}>{idx + 1}</td>
                {editing?.id === item.id ? (
                  <>
                    <td>
                      <input className="form-input" style={{ '--role-accent': '#059669', padding: '6px 10px' }}
                        value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
                    </td>
                    <td>
                      <select className="form-select" style={{ '--role-accent': '#059669', padding: '6px 10px' }}
                        value={editing.unit} onChange={e => setEditing(p => ({ ...p, unit: e.target.value }))}>
                        {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="number" className="form-input" style={{ '--role-accent': '#059669', padding: '6px 10px', textAlign: 'right' }}
                        value={editing.price} onChange={e => setEditing(p => ({ ...p, price: e.target.value }))} min={0} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn btn-success btn-sm" onClick={handleSaveEdit}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>{item.unit}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}>₹{item.price}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...item })}
                          style={{ '--role-accent': '#059669' }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

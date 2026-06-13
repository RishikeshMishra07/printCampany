"use client";
import React, { useState, useEffect } from 'react';

type Item = {
  id: number;
  name: string;
  category: string;
  unit_of_measure: string;
  min_stock_level: number;
};

export default function MasterDataPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Paint', unit_of_measure: 'Litres', min_stock_level: '10' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const res = await fetch('/api/store/items');
    const data = await res.json();
    if (data.items) setItems(data.items);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', category: 'Paint', unit_of_measure: 'Litres', min_stock_level: '10' });
    setShowModal(true);
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, unit_of_measure: item.unit_of_measure, min_stock_level: String(item.min_stock_level) });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        await fetch(`/api/store/items/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, min_stock_level: parseInt(form.min_stock_level) })
        });
      } else {
        await fetch('/api/store/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, min_stock_level: parseInt(form.min_stock_level) })
        });
      }
      setShowModal(false);
      fetchItems();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const catOptions = ['All', 'Paint', 'Consumable', 'Raw Part'];
  const unitOptions: Record<string, string[]> = {
    'Paint': ['Litres', 'Kg'],
    'Consumable': ['Nos', 'Rolls', 'Metres', 'Kg', 'Litres'],
    'Raw Part': ['Nos'],
  };

  const filtered = items.filter(i => {
    if (filterCat !== 'All' && i.category !== filterCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catColors: Record<string, { bg: string; text: string }> = {
    'Paint':      { bg: '#6366f120', text: '#6366f1' },
    'Consumable': { bg: '#f59e0b20', text: '#f59e0b' },
    'Raw Part':   { bg: '#10b98120', text: '#10b981' },
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🗂️ Master Data — Items</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage all paints, consumables, and car parts used in production</p>
          </div>
          <button onClick={openCreate}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            + Add Item
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: items.length, icon: '📦', color: 'text-blue-500' },
            { label: 'Paint Types', value: items.filter(i => i.category === 'Paint').length, icon: '🎨', color: 'text-purple-500' },
            { label: 'Consumables', value: items.filter(i => i.category === 'Consumable').length, icon: '🧴', color: 'text-amber-500' },
            { label: 'Part Types', value: items.filter(i => i.category === 'Raw Part').length, icon: '🔩', color: 'text-green-500' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder="🔍 Search item name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
          <span className="text-xs text-muted-foreground font-semibold ml-2">Category:</span>
          {catOptions.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterCat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['#', 'Item Name', 'Category', 'Unit of Measure', 'Min Stock Level', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>
                    No items found. Click "+ Add Item" to get started.
                  </td>
                </tr>
              ) : filtered.map((item, i) => {
                const catStyle = catColors[item.category] || { bg: '#94a3b820', text: '#94a3b8' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)', fontSize: 10 }}>{item.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{item.name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 4, fontWeight: 700, background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.text}` }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{item.unit_of_measure}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="text-sm font-bold text-foreground">{item.min_stock_level}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{item.unit_of_measure}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => openEdit(item)}
                        style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-foreground)' }}>
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">{editItem ? '✏️ Edit Item' : '+ Add New Item'}</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Item Name *</label>
                <input
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Red Oxide Primer, Bumper, Masking Tape"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category *</label>
                <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value, unit_of_measure: unitOptions[e.target.value][0] })}>
                  <option value="Paint">🎨 Paint — Main & primer paints, thinners</option>
                  <option value="Consumable">🧴 Consumable — Tape, sandpaper, cleaning agents</option>
                  <option value="Raw Part">🔩 Raw Part — Car parts received from client for painting</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Unit of Measure *</label>
                <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}>
                  {(unitOptions[form.category] || ['Nos']).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Minimum Stock Alert Level</label>
                <input type="number" min="0"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. 10 (alert if stock falls below this)"
                  value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })} />
                <p className="text-[10px] text-muted-foreground mt-1">System will flag LOW STOCK when current quantity falls below this value.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';

type Vendor = { id: number; name: string; contact_person: string; phone: string; email: string; address: string; items_supplied: string; notes: string };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const blank = { name: '', contact_person: '', phone: '', email: '', address: '', items_supplied: '', notes: '' };
  const [form, setForm] = useState(blank);

  useEffect(() => { fetch('/api/store/vendors').then(r => r.json()).then(d => { if (d.vendors) setVendors(d.vendors); setLoading(false); }); }, []);

  const refresh = () => fetch('/api/store/vendors').then(r => r.json()).then(d => { if (d.vendors) setVendors(d.vendors); });

  const openCreate = () => { setEditVendor(null); setForm(blank); setShowModal(true); };
  const openEdit = (v: Vendor) => { setEditVendor(v); setForm({ name: v.name, contact_person: v.contact_person || '', phone: v.phone || '', email: v.email || '', address: v.address || '', items_supplied: v.items_supplied || '', notes: v.notes || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editVendor) {
        await fetch(`/api/store/vendors/${editVendor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await fetch('/api/store/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setShowModal(false); refresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this vendor?')) return;
    await fetch(`/api/store/vendors/${id}`, { method: 'DELETE' }); refresh();
  };

  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.items_supplied || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #0ea5e9' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🏭 Vendor Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage paint and material suppliers — name, contact, and items supplied</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: '#0ea5e9' }}>+ Add Vendor</button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="🔍 Search vendors or items supplied..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-72" />
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} vendors</span>
        </div>
        {loading ? <div className="p-12 text-center text-sm text-muted-foreground">Loading...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(v => (
              <div key={v.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-foreground">{v.name}</div>
                    {v.contact_person && <div className="text-xs text-muted-foreground mt-0.5">👤 {v.contact_person}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-border hover:bg-muted">✏️</button>
                    <button onClick={() => handleDelete(v.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border border-red-200 hover:bg-red-50">🗑</button>
                  </div>
                </div>
                {v.phone && <div className="text-xs text-muted-foreground">📞 {v.phone}</div>}
                {v.email && <div className="text-xs text-muted-foreground">✉️ {v.email}</div>}
                {v.address && <div className="text-xs text-muted-foreground">📍 {v.address}</div>}
                {v.items_supplied && (
                  <div className="mt-1">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Supplies</div>
                    <div className="flex flex-wrap gap-1">{v.items_supplied.split(',').map((item, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#0ea5e920', color: '#0ea5e9', border: '1px solid #0ea5e940' }}>{item.trim()}</span>
                    ))}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-5">{editVendor ? '✏️ Edit Vendor' : '+ Add Vendor'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Company Name *</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. AkzoNobel India Ltd." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Contact Person</label>
                  <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone</label>
                  <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
                <input type="email" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Address</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Items Supplied (comma separated)</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Top Coat, Primer, Thinner" value={form.items_supplied} onChange={e => setForm({...form, items_supplied: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes</label>
                <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 h-10 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: '#0ea5e9' }}>
                {saving ? 'Saving...' : editVendor ? 'Update' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

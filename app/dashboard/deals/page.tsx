"use client";
import React, { useState, useEffect } from 'react';

type Deal = {
  id: number;
  client_name: string;
  deal_type: 'Open' | 'Closed';
  item_name: string;
  target_qty: number;
  per_part_paint_budget: number;
  status: string;
  dispatched_qty: number;
  unit_of_measure: string;
  created_at: string;
};

type Item = { id: number; name: string; unit_of_measure: string; category: string };

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Open' | 'Closed'>('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [form, setForm] = useState({
    client_name: '', deal_type: 'Open', item_id: '', target_qty: '', per_part_paint_budget: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDeals(); fetchItems(); }, []);

  const fetchDeals = async () => {
    const res = await fetch('/api/store/deals');
    const data = await res.json();
    if (data.deals) setDeals(data.deals);
  };

  const fetchItems = async () => {
    const res = await fetch('/api/store/items');
    const data = await res.json();
    if (data.items) setItems(data.items);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/store/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        item_id: form.item_id ? parseInt(form.item_id) : null,
        target_qty: form.target_qty ? parseInt(form.target_qty) : null,
        per_part_paint_budget: form.per_part_paint_budget ? parseFloat(form.per_part_paint_budget) : null,
      })
    });
    setSaving(false);
    setShowModal(false);
    setForm({ client_name: '', deal_type: 'Open', item_id: '', target_qty: '', per_part_paint_budget: '' });
    fetchDeals();
  };

  const handleStatusToggle = async (deal: Deal) => {
    const newStatus = deal.status === 'Active' ? 'Closed' : 'Active';
    await fetch(`/api/store/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchDeals();
  };

  const filtered = deals.filter(d => {
    if (filterType !== 'All' && d.deal_type !== filterType) return false;
    if (filterStatus !== 'All' && d.status !== filterStatus) return false;
    return true;
  });

  const openDeals = deals.filter(d => d.deal_type === 'Open' && d.status === 'Active');
  const closedDeals = deals.filter(d => d.deal_type === 'Closed');
  const activeCount = deals.filter(d => d.status === 'Active').length;

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📋 Deals & Contracts</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage client contracts — Open (continuous) and Closed (fixed tender)</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + New Deal
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Deals', value: deals.length, icon: '📋', color: 'text-blue-500' },
            { label: 'Active Deals', value: activeCount, icon: '✅', color: 'text-green-500' },
            { label: 'Open (Continuous)', value: openDeals.length, icon: '🔄', color: 'text-amber-500' },
            { label: 'Closed (Tendered)', value: closedDeals.length, icon: '🔒', color: 'text-purple-500' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-semibold">Filter:</span>
          {['All', 'Open', 'Closed'].map(t => (
            <button key={t} onClick={() => setFilterType(t as any)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
              {t}
            </button>
          ))}
          <span className="text-xs text-muted-foreground font-semibold ml-4">Status:</span>
          {['All', 'Active', 'Closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Deals Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['Client Name', 'Deal Type', 'Part / Item', 'Target Qty', 'Dispatched', 'Progress', 'Paint Budget / Part', 'Status', 'Created', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>No deals found. Create your first deal.</td></tr>
              ) : filtered.map((deal, i) => {
                const dispatched = parseFloat(deal.dispatched_qty as any || 0);
                const target = deal.target_qty || 0;
                const pct = target > 0 ? Math.min((dispatched / target) * 100, 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{deal.client_name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: deal.deal_type === 'Open' ? '#10b98120' : '#f59e0b20', color: deal.deal_type === 'Open' ? '#10b981' : '#f59e0b', border: `1px solid ${deal.deal_type === 'Open' ? '#10b981' : '#f59e0b'}` }}>
                        {deal.deal_type === 'Open' ? '🔄 Open' : '🔒 Closed'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{deal.item_name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{target > 0 ? `${target} ${deal.unit_of_measure || 'Nos'}` : '∞ (Open)'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#6366f1' }}>{dispatched}</td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>
                      {target > 0 ? (
                        <div>
                          <div style={{ height: 6, background: 'var(--color-muted)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#6366f1', borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--color-muted-foreground)', marginTop: 2 }}>{pct.toFixed(0)}% complete</div>
                        </div>
                      ) : <span style={{ fontSize: 10, color: 'var(--color-muted-foreground)' }}>Continuous</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#f59e0b', fontWeight: 600 }}>{deal.per_part_paint_budget ? `${deal.per_part_paint_budget}L` : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: deal.status === 'Active' ? '#10b98120' : '#ef444420', color: deal.status === 'Active' ? '#10b981' : '#ef4444', border: `1px solid ${deal.status === 'Active' ? '#10b981' : '#ef4444'}` }}>
                        {deal.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 10 }}>{new Date(deal.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => handleStatusToggle(deal)}
                        style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-foreground)' }}>
                        {deal.status === 'Active' ? 'Close' : 'Reopen'}
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
            <h2 className="text-lg font-bold text-foreground mb-5">New Deal / Contract</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Client Name *</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Maruti Suzuki, Tata Motors"
                  value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Deal Type *</label>
                <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.deal_type} onChange={e => setForm({ ...form, deal_type: e.target.value })}>
                  <option value="Open">Open (Continuous — client sends parts daily)</option>
                  <option value="Closed">Closed (Fixed Tender — fixed quantity, fixed budget)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {form.deal_type === 'Open' ? '🔄 Parts flow continuously. No fixed end date.' : '🔒 Fixed quantity target. Marks complete when dispatched.'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Part / Item</label>
                <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })}>
                  <option value="">— Select part being painted —</option>
                  {items.filter(i => i.category === 'Raw Part').map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              {form.deal_type === 'Closed' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Target Quantity (Nos)</label>
                  <input type="number" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. 10000"
                    value={form.target_qty} onChange={e => setForm({ ...form, target_qty: e.target.value })} />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Paint Budget per Part (Litres)</label>
                <input type="number" step="0.01" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. 0.5 (litres of paint per part)"
                  value={form.per_part_paint_budget} onChange={e => setForm({ ...form, per_part_paint_budget: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.client_name}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

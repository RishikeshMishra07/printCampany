"use client";
import React, { useState, useEffect } from 'react';

type Return = { id: number; client_name: string; item_name: string; unit_of_measure: string; qty_returned: number; reason: string; return_type: string; challan_ref: string; action_taken: string; recorded_by: string; created_at: string };
type Deal = { id: number; client_name: string };
type Item = { id: number; name: string; unit_of_measure: string };

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Rejection: { color: '#ef4444', bg: '#ef444415', icon: '❌' },
  Rework:    { color: '#f59e0b', bg: '#f59e0b15', icon: '🔧' },
  Damage:    { color: '#8b5cf6', bg: '#8b5cf615', icon: '💥' },
};

export default function ClientReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = { deal_id: '', item_id: '', challan_ref: '', qty_returned: '', reason: '', return_type: 'Rejection', action_taken: '' };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    fetch('/api/store/client-returns').then(r => r.json()).then(d => { if (d.returns) setReturns(d.returns); });
    fetch('/api/store/deals').then(r => r.json()).then(d => { if (d.deals) setDeals(d.deals); });
    fetch('/api/store/items').then(r => r.json()).then(d => { if (d.items) setItems(d.items); });
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
  }, []);

  const refresh = () => fetch('/api/store/client-returns').then(r => r.json()).then(d => { if (d.returns) setReturns(d.returns); });

  const handleCreate = async () => {
    if (!form.qty_returned || !form.reason) return;
    setSaving(true);
    try {
      await fetch('/api/store/client-returns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qty_returned: parseInt(form.qty_returned), item_id: form.item_id || null, deal_id: form.deal_id || null, recorded_by: user?.name || user?.employee_id }),
      });
      setShowModal(false); setForm(blank); refresh();
    } finally { setSaving(false); }
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #ef4444' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">↩️ Client Returns / Rejections</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Record parts returned or rejected by clients — Rejection, Rework, or Damage</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: '#ef4444' }}>+ Record Return</button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Returns', value: returns.length, color: '#ef4444' },
            { label: 'Total Qty Returned', value: returns.reduce((a, b) => a + b.qty_returned, 0), color: '#f59e0b' },
            { label: 'Unique Clients', value: new Set(returns.map(r => r.client_name)).size, color: '#6366f1' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase">{k.label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['Date', 'Client', 'Item', 'Qty', 'Type', 'Challan Ref', 'Reason', 'Action Taken', 'By'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)' }}>No returns recorded yet.</td></tr>
              ) : returns.map((r, i) => {
                const cfg = TYPE_CONFIG[r.return_type] || TYPE_CONFIG.Rejection;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 10, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.client_name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{r.item_name || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#ef4444' }}>{r.qty_returned}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>{cfg.icon} {r.return_type}</span></td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontFamily: 'monospace', fontSize: 11 }}>{r.challan_ref || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 11 }}>{r.action_taken || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 11 }}>{r.recorded_by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-5">↩️ Record Client Return</h2>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Client Deal</label>
                  <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.deal_id} onChange={e => setForm({...form, deal_id: e.target.value})}>
                    <option value="">— Select Deal —</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.client_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Return Type *</label>
                  <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.return_type} onChange={e => setForm({...form, return_type: e.target.value})}>
                    <option value="Rejection">❌ Rejection</option>
                    <option value="Rework">🔧 Rework</option>
                    <option value="Damage">💥 Damage</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Item</label>
                  <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}>
                    <option value="">— Select Item —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty Returned *</label>
                  <input type="number" min="1" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. 10" value={form.qty_returned} onChange={e => setForm({...form, qty_returned: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Challan Reference</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono" placeholder="e.g. CH-2025-0001" value={form.challan_ref} onChange={e => setForm({...form, challan_ref: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason for Return *</label>
                <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={2} placeholder="e.g. Surface paint peeling, uneven coat quality..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Action Taken</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Sent for rework, Scrapped" value={form.action_taken} onChange={e => setForm({...form, action_taken: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.qty_returned || !form.reason} className="flex-1 h-10 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: '#ef4444' }}>
                {saving ? 'Recording...' : 'Record Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

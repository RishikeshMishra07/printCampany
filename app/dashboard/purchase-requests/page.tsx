"use client";
import React, { useState, useEffect } from 'react';

type PR = {
  id: number; item_name: string; unit_of_measure: string; vendor_name: string;
  requested_qty: string; reason: string; status: string; raised_by: string;
  approved_by: string; created_at: string;
};
type StockItem = { id: number; name: string; unit_of_measure: string; current_qty: string; min_stock_level: number; category: string };
type Vendor = { id: number; name: string };

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Pending:  { color: '#f59e0b', bg: '#f59e0b15' },
  Approved: { color: '#10b981', bg: '#10b98115' },
  Rejected: { color: '#ef4444', bg: '#ef444415' },
};

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PR[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [form, setForm] = useState({ item_id: '', vendor_id: '', requested_qty: '', reason: '' });

  useEffect(() => {
    fetch('/api/store/purchase-requests').then(r => r.json()).then(d => { if (d.requests) setRequests(d.requests); });
    fetch('/api/store/live-stock').then(r => r.json()).then(d => { if (d.stock) setStockItems(d.stock); });
    fetch('/api/store/vendors').then(r => r.json()).then(d => { if (d.vendors) setVendors(d.vendors); });
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
  }, []);

  const refresh = () => fetch('/api/store/purchase-requests').then(r => r.json()).then(d => { if (d.requests) setRequests(d.requests); });

  const selectedItem = stockItems.find(i => i.id === parseInt(form.item_id));

  const handleCreate = async () => {
    if (!form.item_id || !form.requested_qty || !form.reason) return;
    setSaving(true);
    try {
      await fetch('/api/store/purchase-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: parseInt(form.item_id),
          vendor_id: form.vendor_id ? parseInt(form.vendor_id) : null,
          requested_qty: parseFloat(form.requested_qty),
          unit_of_measure: selectedItem?.unit_of_measure || '',
          reason: form.reason,
          raised_by: user?.name || user?.employee_id || 'Unknown',
        }),
      });
      setShowModal(false);
      setForm({ item_id: '', vendor_id: '', requested_qty: '', reason: '' });
      refresh();
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/store/purchase-requests/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approved_by: user?.name || user?.employee_id }),
    });
    refresh();
  };

  const filtered = requests.filter(r => filterStatus === 'All' || r.status === filterStatus);
  const lowStockItems = stockItems.filter(s => parseFloat(s.current_qty) <= s.min_stock_level);

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #f97316' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📋 Purchase Requests</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Raise and manage material purchase requests — Admin can approve or reject</p>
          </div>
          {user?.role !== 'user' && (
            <button onClick={() => setShowModal(true)} className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors" style={{ background: '#f97316' }}>
              + Raise PR
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="p-4 rounded-xl border" style={{ background: '#ef444410', borderColor: '#ef4444' }}>
            <div className="text-sm font-bold mb-1" style={{ color: '#ef4444' }}>⚠️ {lowStockItems.length} items below minimum stock level — Raise PRs now!</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockItems.map(s => (
                <button key={s.id} onClick={() => { setForm({...form, item_id: String(s.id), reason: `Stock critically low — current: ${parseFloat(s.current_qty).toFixed(1)} ${s.unit_of_measure}, min: ${s.min_stock_level}`}); setShowModal(true); }}
                  className="px-3 py-1 text-xs rounded-full font-semibold" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444' }}>
                  🛒 {s.name} ({parseFloat(s.current_qty).toFixed(1)}/{s.min_stock_level} {s.unit_of_measure})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total PRs',    value: requests.length,                             color: 'text-blue-500' },
            { label: 'Pending',      value: requests.filter(r => r.status === 'Pending').length,  color: 'text-amber-500' },
            { label: 'Approved',     value: requests.filter(r => r.status === 'Approved').length, color: 'text-green-500' },
            { label: 'Low Stock Now',value: lowStockItems.length,                        color: lowStockItems.length > 0 ? 'text-red-500' : 'text-green-500' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 text-xs rounded-full border font-semibold transition-colors"
              style={filterStatus === s ? { background: STATUS_COLORS[s]?.color || 'var(--color-primary)', color: '#fff', borderColor: STATUS_COLORS[s]?.color || 'var(--color-primary)' } : { borderColor: 'var(--color-border)' }}>
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['Date', 'Item', 'Qty Requested', 'Vendor', 'Reason', 'Raised By', 'Status', user?.role === 'admin' ? 'Action' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>No purchase requests yet.</td></tr>
              ) : filtered.map((r, i) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.Pending;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.item_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{parseFloat(r.requested_qty).toFixed(1)} {r.unit_of_measure}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{r.vendor_name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{r.raised_by}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}` }}>{r.status}</span>
                      {r.approved_by && <div style={{ fontSize: 9, color: 'var(--color-muted-foreground)', marginTop: 2 }}>by {r.approved_by}</div>}
                    </td>
                    {user?.role === 'admin' && (
                      <td style={{ padding: '10px 14px' }}>
                        {r.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateStatus(r.id, 'Approved')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#10b98120', color: '#10b981', border: '1px solid #10b981', cursor: 'pointer' }}>✓ Approve</button>
                            <button onClick={() => updateStatus(r.id, 'Rejected')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer' }}>✕ Reject</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Backdrop */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={() => setShowModal(false)} />
      )}

      {/* Slide-over Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${showModal ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/10">
          <h2 className="text-lg font-bold">📋 Raise Purchase Request</h2>
          <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Item Required *</label>
            <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}>
              <option value="">— Select Item —</option>
              {stockItems.map(i => (
                <option key={i.id} value={i.id}>{i.name} {parseFloat(i.current_qty) <= i.min_stock_level ? '⚠' : ''} (Stock: {parseFloat(i.current_qty).toFixed(1)} {i.unit_of_measure})</option>
              ))}
            </select>
            {selectedItem && (
              <div className="mt-2 p-3 rounded-xl flex items-center justify-between" style={{ background: parseFloat(selectedItem.current_qty) <= selectedItem.min_stock_level ? '#ef444412' : '#10b98112', border: `1px solid ${parseFloat(selectedItem.current_qty) <= selectedItem.min_stock_level ? '#ef4444' : '#10b981'}` }}>
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: parseFloat(selectedItem.current_qty) <= selectedItem.min_stock_level ? '#ef4444' : '#10b981' }}>
                  {parseFloat(selectedItem.current_qty) <= selectedItem.min_stock_level ? '⚠️ LOW STOCK' : '✓ OK'}
                </span>
                <span className="text-[11px] font-bold px-2 py-1 bg-background rounded-md border border-border shadow-sm">{parseFloat(selectedItem.current_qty).toFixed(1)} {selectedItem.unit_of_measure} in stock</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quantity Required *</label>
              <input type="number" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`e.g. 50 ${selectedItem?.unit_of_measure || ''}`}
                value={form.requested_qty} onChange={e => setForm({...form, requested_qty: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Preferred Vendor</label>
              <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.vendor_id} onChange={e => setForm({...form, vendor_id: e.target.value})}>
                <option value="">— Any vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason / Urgency *</label>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none shadow-sm"
              rows={4} placeholder="e.g. Stock critically low, production halted. Need within 2 days..."
              value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          </div>
        </div>
        
        <div className="p-6 border-t border-border flex gap-3 bg-muted/20">
          <button onClick={() => setShowModal(false)} className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold hover:bg-muted shadow-sm transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !form.item_id || !form.requested_qty || !form.reason}
            className="flex-1 h-11 rounded-xl text-sm font-bold disabled:opacity-50 shadow-md transition-transform active:scale-[0.98]" style={{ background: '#f97316', color: '#fff' }}>
            {saving ? 'Submitting...' : 'Submit PR'}
          </button>
        </div>
      </div>
    </div>
  );
}

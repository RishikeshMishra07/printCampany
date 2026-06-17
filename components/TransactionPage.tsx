"use client";
import React, { useState, useEffect } from 'react';

type Item = { id: number; name: string; category: string; current_qty: string; unit_of_measure: string; min_stock_level: string };
type Transaction = { id: number; item_id: number; item_name: string; transaction_type: string; quantity: string; reference_no: string; notes: string; created_at: string; recorded_by: string; status: string };

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Approved: { color: '#10b981', bg: '#10b98115' },
  Pending:  { color: '#f59e0b', bg: '#f59e0b15' },
  Rejected: { color: '#ef4444', bg: '#ef444415' },
};

const THEME: Record<string, { color: string; label: string; icon: string; desc: string }> = {
  Inward:  { color: '#10b981', label: 'Material Inward (GRN)', icon: '📥', desc: 'Record incoming materials from vendors' },
  Outward: { color: '#3b82f6', label: 'Dispatch (Outward)',    icon: '🚛', desc: 'Record finished goods sent to clients' },
  Issue:   { color: '#f59e0b', label: 'Issue to Production',   icon: '🏭', desc: 'Record raw materials issued to shop floor' },
};

export default function TransactionPage({ txType }: { txType: 'Inward' | 'Outward' | 'Issue' }) {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [formData, setFormData] = useState({ item_id: '', quantity: '', reference_no: '', remarks: '', deal_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showSlider, setShowSlider] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<number | null>(null);
  const PAGE_SIZE = 100;

  const theme = THEME[txType];

  const loadData = async () => {
    try {
      const promises = [
        fetch('/api/store/live-stock').then(r => r.json()),
        fetch('/api/auth/me').then(r => r.json()),
        fetch('/api/store/transactions').then(r => r.json()),
      ];
      if (txType === 'Outward') {
        promises.push(fetch('/api/store/deals').then(r => r.json()));
      }
      const [itemsData, userData, txData, dealsData] = await Promise.all(promises);
      if (itemsData.stock) setItems(itemsData.stock);
      if (userData.success) setUser(userData.user);
      if (txData.transactions) setTransactions(txData.transactions.filter((t: Transaction) => t.transaction_type === txType));
      if (dealsData?.deals) setDeals(dealsData.deals);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [txType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_id || !formData.quantity) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/store/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: formData.item_id,
          transaction_type: txType,
          quantity: formData.quantity,
          reference_no: formData.reference_no,
          notes: formData.remarks,
          deal_id: formData.deal_id || undefined,
          recorded_by: user?.name || user?.employee_id || 'Unknown',
          user_role: user?.role,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({ item_id: '', quantity: '', reference_no: '', remarks: '', deal_id: '' });
        setShowSlider(false);
        loadData();
        if (data.status === 'Pending') {
          alert('✅ Inward entry submitted! It will be counted in Live Stock once Admin approves it.');
        }
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch { alert('Error submitting transaction'); }
    finally { setIsSubmitting(false); }
  };

  const handleAction = async (id: number, status: 'Approved' | 'Rejected') => {
    setProcessing(id);
    try {
      await fetch(`/api/store/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: user?.name || user?.employee_id || 'Admin' }),
      });
      await loadData(); // reload to show updated status
    } finally {
      setProcessing(null);
    }
  };

  const selectedItem = items.find(i => i.id === parseInt(formData.item_id));

  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.item_name?.toLowerCase().includes(search.toLowerCase()) || tx.reference_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || tx.status === filterStatus || (!tx.status && filterStatus === 'Approved');
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filter/search changes
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleFilter = (val: string) => { setFilterStatus(val); setPage(1); };

  const totalToday = transactions
    .filter(tx => new Date(tx.created_at).toDateString() === new Date().toDateString())
    .reduce((s, tx) => s + parseFloat(tx.quantity || '0'), 0);

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0 flex items-center justify-between" style={{ borderLeft: `4px solid ${theme.color}` }}>
        <div>
          <h1 className="text-xl font-bold text-foreground">{theme.icon} {theme.label}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{theme.desc}</p>
        </div>
        <button
          onClick={() => setShowSlider(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white shadow-md transition-transform active:scale-[0.97]"
          style={{ background: theme.color }}
        >
          <span className="text-base leading-none">+</span>
          New {txType} Entry
        </button>
      </div>

      {/* Body */}
      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: `Total ${txType}s`, value: transactions.length, icon: '📋' },
            { label: "Today's Entries", value: transactions.filter(tx => new Date(tx.created_at).toDateString() === new Date().toDateString()).length, icon: '📅' },
            { label: "Today's Qty", value: totalToday.toFixed(1), icon: '📦' },
            txType === 'Inward'
              ? { label: 'Pending Approval', value: transactions.filter(tx => tx.status === 'Pending').length, icon: '⏳' }
              : { label: 'Items Transacted', value: new Set(transactions.map(t => t.item_id)).size, icon: '🗂️' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: theme.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden flex-1">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-border bg-muted/10 flex items-center justify-between flex-shrink-0 gap-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider whitespace-nowrap">Recent {txType} History</h2>

            {/* Right side: filter chips + search */}
            <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
              {/* Status Filter Chips — only for Inward */}
              {txType === 'Inward' && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border">
                  {(['All', 'Approved', 'Pending', 'Rejected'] as const).map(s => {
                    const icons: Record<string, string> = { All: '☰', Approved: '✓', Pending: '⏳', Rejected: '✕' };
                    const colors: Record<string, string> = { Approved: '#10b981', Pending: '#f59e0b', Rejected: '#ef4444', All: '' };
                    const count = s === 'All' ? transactions.length
                      : transactions.filter(t => (t.status === s) || (!t.status && s === 'Approved')).length;
                    const active = filterStatus === s;
                    return (
                      <button key={s} onClick={() => handleFilter(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all"
                        style={active
                          ? { background: colors[s] || theme.color, color: '#fff', boxShadow: `0 1px 4px ${colors[s] || theme.color}60` }
                          : { background: 'transparent', color: 'var(--color-muted-foreground)' }
                        }>
                        <span>{icons[s]}</span>
                        <span>{s}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={active
                            ? { background: 'rgba(255,255,255,0.25)' }
                            : { background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
                          }>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search item or ref no..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="h-8 pl-7 pr-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left" style={{ fontSize: '11px' }}>
              <thead className="text-[10px] uppercase text-muted-foreground tracking-wider" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-card, hsl(var(--card)))' }}>
                <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'hsl(var(--muted))' }}>
                  <th className="px-3 py-2.5 font-bold whitespace-nowrap">Date & Time</th>
                  <th className="px-3 py-2.5 font-bold">Item</th>
                  <th className="px-3 py-2.5 font-bold">Category</th>
                  <th className="px-3 py-2.5 font-bold text-right">Qty</th>
                  {txType === 'Outward' && <th className="px-3 py-2.5 font-bold">Client / Deal</th>}
                  <th className="px-3 py-2.5 font-bold">Ref / Challan No.</th>
                  <th className="px-3 py-2.5 font-bold">Remarks</th>
                  <th className="px-3 py-2.5 font-bold">By</th>
                  {txType === 'Inward' && <th className="px-3 py-2.5 font-bold">Status</th>}
                  {txType === 'Inward' && user?.role === 'admin' && <th className="px-3 py-2.5 font-bold">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={txType === 'Inward' ? 8 : 7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      <div className="text-3xl mb-2">💭</div>
                      No {txType.toLowerCase()} records found.
                    </td>
                  </tr>
                ) : paginated.map(tx => {
                  const sc = STATUS_COLORS[tx.status] || STATUS_COLORS.Approved;
                  return (
                    <tr key={tx.id} className="hover:bg-muted/40 transition-colors" style={tx.status === 'Pending' ? { background: '#f59e0b05' } : undefined}>
                      <td className="px-3 py-2 whitespace-nowrap text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 font-bold text-[11px]">{tx.item_name}</td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{(tx as any).category || '—'}</td>
                      <td className="px-3 py-2 font-bold text-[12px] text-right" style={{ color: tx.status === 'Pending' ? '#f59e0b' : theme.color }}>
                        {txType === 'Inward' ? '+' : '-'}{parseFloat(tx.quantity).toFixed(2)}
                      </td>
                      {txType === 'Outward' && (
                        <td className="px-3 py-2 text-[11px] text-muted-foreground">{(tx as any).client_name || '—'}</td>
                      )}
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{tx.reference_no || '—'}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[160px] truncate">{tx.notes || '—'}</td>
                      <td className="px-3 py-2 text-[10px]">{tx.recorded_by || '—'}</td>
                      {txType === 'Inward' && (
                        <td className="px-3 py-2">
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}`, whiteSpace: 'nowrap' }}>
                            {tx.status === 'Pending' ? '⏳ Pending' : tx.status === 'Rejected' ? '✕ Rejected' : '✓ Approved'}
                          </span>
                        </td>
                      )}
                      {/* Admin Approve/Reject inline buttons */}
                      {txType === 'Inward' && user?.role === 'admin' && (
                        <td className="px-3 py-2">
                          {tx.status === 'Pending' ? (
                            <div className="flex gap-1.5">
                              <button
                                disabled={processing === tx.id}
                                onClick={() => handleAction(tx.id, 'Approved')}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all"
                                style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b981', opacity: processing === tx.id ? 0.5 : 1, cursor: processing === tx.id ? 'not-allowed' : 'pointer' }}
                              >
                                {processing === tx.id ? '...' : '✓ Approve'}
                              </button>
                              <button
                                disabled={processing === tx.id}
                                onClick={() => handleAction(tx.id, 'Rejected')}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all"
                                style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', opacity: processing === tx.id ? 0.5 : 1, cursor: processing === tx.id ? 'not-allowed' : 'pointer' }}
                              >
                                {processing === tx.id ? '...' : '✕ Reject'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar — always visible */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              Showing <strong>{filtered.length === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1}</strong>–<strong>{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className="w-7 h-7 text-xs rounded border font-semibold transition-all"
                    style={page === p ? { background: theme.color, color: '#fff', borderColor: theme.color } : { borderColor: 'var(--color-border)' }}>
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next ›
              </button>
              <button
                onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {showSlider && (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={() => setShowSlider(false)} />
      )}

      {/* Slide-over Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${showSlider ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-border flex items-center justify-between" style={{ borderTop: `3px solid ${theme.color}` }}>
          <div>
            <h2 className="text-base font-bold">{theme.icon} New {txType} Entry</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{theme.desc}</p>
          </div>
          <button onClick={() => setShowSlider(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Item Select */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Select Item *</label>
            <select required
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={formData.item_id} onChange={e => setFormData({ ...formData, item_id: e.target.value })}>
              <option value="">— Select Item —</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name} ({parseFloat(item.current_qty).toFixed(1)} {item.unit_of_measure})</option>
              ))}
            </select>
            {selectedItem && (
              <div className="mt-2 p-3 rounded-xl flex items-center justify-between" style={{ background: `${theme.color}10`, border: `1px solid ${theme.color}` }}>
                <span className="text-xs font-bold" style={{ color: theme.color }}>Current Stock</span>
                <span className="text-sm font-bold">{parseFloat(selectedItem.current_qty).toFixed(2)} {selectedItem.unit_of_measure}</span>
              </div>
            )}
          </div>

          {/* Deal Select for Dispatch */}
          {txType === 'Outward' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Select Deal / Client</label>
              <select
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.deal_id} onChange={e => setFormData({ ...formData, deal_id: e.target.value })}>
                <option value="">— Internal / No specific client —</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>{d.client_name} {d.item_name ? `(${d.item_name})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Qty + Ref */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantity *</label>
              <input required type="number" step="0.01" min="0.01"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
                value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Challan / Ref No.</label>
              <input type="text"
                list="reference-no-list"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. CH-12345"
                value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} />
              <datalist id="reference-no-list">
                {Array.from(new Set(transactions.map(t => t.reference_no).filter(Boolean))).map(ref => (
                  <option key={ref} value={ref} />
                ))}
                {/* Fallback option to ensure dropdown arrow is always visible */}
                {Array.from(new Set(transactions.map(t => t.reference_no).filter(Boolean))).length === 0 && (
                  <option value="Example: CH-999" />
                )}
              </datalist>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Remarks</label>
            <textarea rows={4}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Optional notes..."
              value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
          </div>

          {txType === 'Inward' && (
            <div className="p-3 rounded-xl text-xs" style={{ background: '#f59e0b12', border: '1px solid #f59e0b40', color: '#f59e0b' }}>
              ⏳ <strong>Note:</strong> Your entry will be sent for Admin approval before stock is updated.
            </div>
          )}
        </form>

        <div className="p-6 border-t border-border flex gap-3 bg-muted/10">
          <button type="button" onClick={() => setShowSlider(false)}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button disabled={isSubmitting || !formData.item_id || !formData.quantity}
            onClick={handleSubmit as any}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50 shadow-md transition-transform active:scale-[0.98]"
            style={{ background: theme.color }}>
            {isSubmitting ? 'Saving...' : `Record ${txType}`}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';

const TYPE_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  Inward:  { color: '#10b981', bg: '#10b98115', icon: '📥' },
  Issue:   { color: '#f59e0b', bg: '#f59e0b15', icon: '🏭' },
  Outward: { color: '#6366f1', bg: '#6366f115', icon: '🚛' },
  Scrap:   { color: '#ef4444', bg: '#ef444415', icon: '🗑️' },
};

export default function AuditLogsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [filterClient, setFilterClient] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/store/transactions?limit=500');
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const clients = ['All', ...Array.from(new Set(transactions.map(t => t.client_name).filter(Boolean))) as string[]];

  const filtered = transactions.filter(t => {
    if (filterType !== 'All' && t.transaction_type !== filterType) return false;
    if (filterClient !== 'All' && t.client_name !== filterClient) return false;
    if (search && !t.item_name?.toLowerCase().includes(search.toLowerCase()) && !t.recorded_by?.toLowerCase().includes(search.toLowerCase()) && !t.notes?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // Summary stats for filtered data
  const summary = {
    Inward:  filtered.filter(t => t.transaction_type === 'Inward').reduce((a, b) => a + parseFloat(b.quantity), 0),
    Issue:   filtered.filter(t => t.transaction_type === 'Issue').reduce((a, b) => a + parseFloat(b.quantity), 0),
    Outward: filtered.filter(t => t.transaction_type === 'Outward').reduce((a, b) => a + parseFloat(b.quantity), 0),
    Scrap:   filtered.filter(t => t.transaction_type === 'Scrap').reduce((a, b) => a + parseFloat(b.quantity), 0),
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📋 Audit Logs</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Complete transaction history — every Inward, Issue, Dispatch, and Scrap entry</p>
          </div>
          <button onClick={fetchAll} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted transition-colors">🔄 Refresh</button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary).map(([type, total]) => {
            const cfg = TYPE_COLORS[type];
            return (
              <div key={type} className="p-4 rounded-xl border border-border bg-card shadow-sm" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{cfg.icon} Total {type}</div>
                <div className="text-xl font-bold mt-1" style={{ color: cfg.color }}>{total.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{filtered.filter(t => t.transaction_type === type).length} entries</div>
              </div>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-3">🔍 Filter & Search</div>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <input
              type="text"
              placeholder="Search item, operator, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
            />
            {/* Type filter */}
            <div className="flex gap-1.5">
              {['All', 'Inward', 'Issue', 'Outward', 'Scrap'].map(t => {
                const cfg = TYPE_COLORS[t];
                return (
                  <button key={t} onClick={() => setFilterType(t)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-colors font-semibold"
                    style={{ background: filterType === t ? (cfg?.color || 'var(--color-primary)') : 'transparent', color: filterType === t ? '#fff' : 'var(--color-foreground)', borderColor: cfg?.color || 'var(--color-border)' }}>
                    {cfg?.icon} {t}
                  </button>
                );
              })}
            </div>
            {/* Client filter */}
            <select
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
            >
              {clients.map(c => <option key={c} value={c}>{c === 'All' ? '— All Clients —' : c}</option>)}
            </select>
            {/* Date range */}
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {/* Clear */}
            {(filterType !== 'All' || filterClient !== 'All' || search || dateFrom || dateTo) && (
              <button onClick={() => { setFilterType('All'); setFilterClient('All'); setSearch(''); setDateFrom(''); setDateTo(''); }}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors" style={{ color: '#ef4444', border: '1px solid #ef4444', background: 'transparent' }}>
                ✕ Clear Filters
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground font-semibold">{filtered.length} of {transactions.length} entries</span>
          </div>
        </div>

        {/* Full Audit Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading audit log...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                    {['#', 'Date & Time', 'Type', 'Item', 'Category', 'Qty', 'Unit', 'Deal / Client', 'Recorded By', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>
                      No transactions match the selected filters.
                    </td></tr>
                  ) : filtered.map((tx, i) => {
                    const cfg = TYPE_COLORS[tx.transaction_type] || { color: '#94a3b8', bg: '#94a3b815', icon: '•' };
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 10 }}>{tx.id}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}`, whiteSpace: 'nowrap' }}>
                            {cfg.icon} {tx.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{tx.item_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{tx.category || '—'}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: cfg.color }}>{parseFloat(tx.quantity).toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{tx.unit_of_measure || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{tx.client_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{tx.recorded_by || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

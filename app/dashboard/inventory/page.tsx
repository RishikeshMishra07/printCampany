"use client";
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function InventoryPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, txRes] = await Promise.all([
        fetch('/api/store/live-stock'),
        fetch('/api/store/transactions?limit=100'),
      ]);
      const [stockData, txData] = await Promise.all([stockRes.json(), txRes.json()]);
      if (stockData.stock) setStock(stockData.stock);
      if (txData.transactions) setTransactions(txData.transactions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredStock = stock.filter(s => filterCat === 'All' || s.category === filterCat);

  // KPIs
  const totalItems = stock.length;
  const lowStock = stock.filter(s => parseFloat(s.current_qty) <= s.min_stock_level);
  const totalInward = transactions.filter(t => t.transaction_type === 'Inward').reduce((a, b) => a + parseFloat(b.quantity), 0);
  const totalIssued = transactions.filter(t => t.transaction_type === 'Issue').reduce((a, b) => a + parseFloat(b.quantity), 0);
  const totalDispatched = transactions.filter(t => t.transaction_type === 'Outward').reduce((a, b) => a + parseFloat(b.quantity), 0);
  const totalScrap = transactions.filter(t => t.transaction_type === 'Scrap').reduce((a, b) => a + parseFloat(b.quantity), 0);

  // Last 7 days trend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayTx = transactions.filter(t => t.created_at?.startsWith(dateStr));
    return {
      day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      Inward:   dayTx.filter(t => t.transaction_type === 'Inward').reduce((a, b) => a + parseFloat(b.quantity), 0),
      Issue:    dayTx.filter(t => t.transaction_type === 'Issue').reduce((a, b) => a + parseFloat(b.quantity), 0),
      Outward:  dayTx.filter(t => t.transaction_type === 'Outward').reduce((a, b) => a + parseFloat(b.quantity), 0),
      Scrap:    dayTx.filter(t => t.transaction_type === 'Scrap').reduce((a, b) => a + parseFloat(b.quantity), 0),
    };
  });

  // Stock valuation by category (treating qty as value proxy)
  const byCat = ['Paint', 'Consumable', 'Raw Part'].map(cat => ({
    name: cat,
    qty: filteredStock.filter(s => s.category === cat).reduce((a, b) => a + Math.max(0, parseFloat(b.current_qty || 0)), 0),
    items: stock.filter(s => s.category === cat).length,
  }));

  if (loading) {
    return (
      <div className="flex-grow flex flex-col overflow-hidden bg-background p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-card border border-border rounded-xl h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📊 Inventory Overview</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Complete view of all stock levels, flow analysis, and transaction history</p>
          </div>
          <button onClick={fetchData} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted transition-colors">🔄 Refresh</button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Item Types', value: totalItems, icon: '📦', color: 'text-blue-500', sub: 'Across all categories' },
            { label: 'Low Stock Alerts', value: lowStock.length, icon: '⚠️', color: lowStock.length > 0 ? 'text-red-500' : 'text-green-500', sub: lowStock.length > 0 ? lowStock.map(s => s.name).slice(0, 2).join(', ') + (lowStock.length > 2 ? '...' : '') : 'All OK' },
            { label: 'Total Inward (All Time)', value: totalInward.toFixed(1), icon: '📥', color: 'text-green-500', sub: 'Total qty received' },
            { label: 'Total Issued to Production', value: totalIssued.toFixed(1), icon: '🏭', color: 'text-amber-500', sub: 'To shop floor' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Dispatched', value: totalDispatched.toFixed(1), icon: '🚛', color: 'text-blue-500', sub: 'Outward to clients' },
            { label: 'Total Scrap', value: totalScrap.toFixed(1), icon: '🗑️', color: totalScrap > 0 ? 'text-red-500' : 'text-green-500', sub: 'Rejected/damaged' },
            { label: 'Total Transactions', value: transactions.length, icon: '📋', color: 'text-purple-500', sub: 'All movements logged' },
            { label: 'Inventory Efficiency', value: totalInward > 0 ? `${(((totalInward - totalScrap) / totalInward) * 100).toFixed(1)}%` : '—', icon: '📈', color: 'text-green-500', sub: '(Inward - Scrap) / Inward' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 7-day trend */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">📈 7-Day Material Flow Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={last7} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Inward" stroke="#10b981" fill="url(#gIn)" strokeWidth={2} name="Inward" />
                <Area type="monotone" dataKey="Outward" stroke="#6366f1" fill="url(#gOut)" strokeWidth={2} name="Dispatched" />
                <Area type="monotone" dataKey="Issue" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Issued" />
                <Area type="monotone" dataKey="Scrap" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="2 2" name="Scrap" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stock by Category */}
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">📦 Current Stock Qty by Category</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byCat} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]} name="Qty in Stock">
                  {byCat.map((_, i) => <Cell key={i} fill={['#6366f1', '#f59e0b', '#10b981'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Details Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">📋 All Items — Current Stock</div>
            <div className="flex gap-2">
              {['All', 'Paint', 'Consumable', 'Raw Part'].map(c => (
                <button key={c} onClick={() => setFilterCat(c)}
                  className={`px-3 py-1 text-[10px] rounded-full border transition-colors ${filterCat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['Item Name', 'Category', 'Current Qty', 'Unit', 'Min Level', 'Buffer (Qty above min)', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStock.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>No items in inventory yet.</td></tr>
              ) : filteredStock.map((item, i) => {
                const qty = parseFloat(item.current_qty || 0);
                const min = item.min_stock_level;
                const isLow = qty <= min;
                const buffer = (qty - min).toFixed(2);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: isLow ? '#ef444408' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{isLow && '⚠️ '}{item.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{item.category}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: isLow ? '#ef4444' : '#10b981', fontSize: 14 }}>{qty.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{item.unit_of_measure}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{min}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: parseFloat(buffer) < 0 ? '#ef4444' : '#10b981' }}>{buffer}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700, background: isLow ? '#ef444420' : '#10b98120', color: isLow ? '#ef4444' : '#10b981', border: `1px solid ${isLow ? '#ef4444' : '#10b981'}` }}>
                        {isLow ? '⚠ LOW STOCK' : '✓ OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Full Transaction Log */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">🕐 Complete Transaction Log (Last 100)</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                  {['Date & Time', 'Item', 'Type', 'Qty', 'Unit', 'Deal/Client', 'Recorded By', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>No transactions yet.</td></tr>
                ) : transactions.map((tx, i) => {
                  const typeColors: Record<string, string> = { Inward: '#10b981', Issue: '#f59e0b', Outward: '#6366f1', Scrap: '#ef4444' };
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)', fontSize: 10, whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{tx.item_name || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: typeColors[tx.transaction_type] || '#94a3b8', border: `1px solid ${typeColors[tx.transaction_type] || '#94a3b8'}` }}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{parseFloat(tx.quantity).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)' }}>{tx.unit_of_measure || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)' }}>{tx.client_name || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)' }}>{tx.recorded_by || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

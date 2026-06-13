"use client";
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444', '#84cc16'];

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

const ChartCard = ({ title, children, span }: { title: string; children: React.ReactNode; span?: number }) => (
  <div className={`p-5 rounded-xl border border-border bg-card shadow-sm ${span === 2 ? 'lg:col-span-2' : ''} ${span === 3 ? 'lg:col-span-3' : ''}`}>
    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">{title}</div>
    {children}
  </div>
);

const KPICard = ({ label, value, icon, color, sub }: { label: string; value: any; icon: string; color: string; sub?: string }) => (
  <div className="p-4 rounded-xl border border-border bg-card flex flex-col gap-1 shadow-sm">
    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
      <span>{icon}</span> {label}
    </div>
    <div className={`text-lg font-bold tracking-tight truncate ${color}`}>{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
  </div>
);

const NoData = () => <div className="text-xs text-muted-foreground text-center py-8">No data available</div>;

export default function StoreDashboard() {
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [stock, setStock] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: true }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [stockRes, dealsRes, txRes] = await Promise.all([
        fetch('/api/store/live-stock'),
        fetch('/api/store/deals'),
        fetch('/api/store/transactions?limit=10'),
      ]);
      const [stockData, dealsData, txData] = await Promise.all([
        stockRes.json(), dealsRes.json(), txRes.json()
      ]);
      if (stockData.stock) setStock(stockData.stock);
      if (dealsData.deals) setDeals(dealsData.deals);
      if (txData.transactions) setRecentTx(txData.transactions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // KPI calculations
  const totalItems = stock.length;
  const lowStockItems = stock.filter(s => parseFloat(s.current_qty) <= s.min_stock_level);
  const activeDeals = deals.filter(d => d.status === 'Active');
  const closedDeals = deals.filter(d => d.status !== 'Active');
  const totalInward = recentTx.filter(t => t.transaction_type === 'Inward').reduce((a, b) => a + parseFloat(b.quantity), 0);
  const totalIssued = recentTx.filter(t => t.transaction_type === 'Issue').reduce((a, b) => a + parseFloat(b.quantity), 0);
  const totalDispatched = recentTx.filter(t => t.transaction_type === 'Outward').reduce((a, b) => a + parseFloat(b.quantity), 0);
  const totalScrap = recentTx.filter(t => t.transaction_type === 'Scrap').reduce((a, b) => a + parseFloat(b.quantity), 0);

  // Chart data
  const stockByCategory = ['Paint', 'Consumable', 'Raw Part'].map(cat => ({
    name: cat,
    value: stock.filter(s => s.category === cat).reduce((a, b) => a + Math.max(0, parseFloat(b.current_qty || 0)), 0)
  }));

  const txTypeChart = [
    { name: 'Inward', value: totalInward, fill: '#10b981' },
    { name: 'Issued', value: totalIssued, fill: '#f59e0b' },
    { name: 'Dispatched', value: totalDispatched, fill: '#6366f1' },
    { name: 'Scrap', value: totalScrap, fill: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="flex-grow flex flex-col overflow-hidden bg-background">
        <div className="px-6 py-4 border-b border-border bg-card shadow-sm">
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="animate-pulse bg-card border border-border rounded-xl h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            {user?.name && (
              <div className="text-xl font-bold text-foreground mb-0.5">
                Welcome, <span className="text-primary">{user.name}</span>
              </div>
            )}
            <div className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>🏭 Store Department — Inventory Control</span>
              <span className="text-[9px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">LIVE</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">AutoPaint Workshop • {currentTime}</div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          <KPICard label="Total Item Types" value={totalItems} icon="📦" color="text-blue-500" sub="Paints, Parts, Consumables" />
          <KPICard label="Low Stock Alerts" value={lowStockItems.length} icon="⚠️" color={lowStockItems.length > 0 ? 'text-red-500' : 'text-green-500'} sub={lowStockItems.length > 0 ? lowStockItems.map(s => s.name).join(', ') : 'All stock OK'} />
          <KPICard label="Active Deals" value={activeDeals.length} icon="📋" color="text-amber-500" sub="Open/Continuous orders" />
          <KPICard label="Closed Deals" value={closedDeals.length} icon="✅" color="text-green-500" sub="Tendered & completed" />
        </div>

        {/* Today's Flow */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Inward (Recent)" value={totalInward.toFixed(1)} icon="📥" color="text-green-500" sub="Parts/Litres received" />
          <KPICard label="Issued to Production" value={totalIssued.toFixed(1)} icon="🏭" color="text-amber-500" sub="Sent to shop floor" />
          <KPICard label="Dispatched to Client" value={totalDispatched.toFixed(1)} icon="🚛" color="text-blue-500" sub="Outward / painted parts" />
          <KPICard label="Scrap / Rejected" value={totalScrap.toFixed(1)} icon="🗑️" color={totalScrap > 0 ? 'text-red-500' : 'text-green-500'} sub="Damaged / rejected" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock by Category Pie */}
          <ChartCard title="📊 Stock by Category">
            {stockByCategory.every(c => c.value === 0) ? <NoData /> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={stockByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={28} paddingAngle={3}>
                      {stockByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 mt-2">
                  {stockByCategory.map((c, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i], display: 'inline-block' }} />
                        {c.name}
                      </span>
                      <span className="font-semibold text-foreground">{c.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>

          {/* Material Flow Bar Chart */}
          <ChartCard title="🔄 Material Flow (Recent Transactions)">
            {txTypeChart.every(t => t.value === 0) ? <NoData /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={txTypeChart} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Qty">
                    {txTypeChart.map((t, i) => <Cell key={i} fill={t.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Active Deals Status */}
          <ChartCard title="📋 Active Deals Overview">
            {activeDeals.length === 0 ? <NoData /> : (
              <div className="flex flex-col gap-2 mt-1">
                {activeDeals.slice(0, 5).map((deal, i) => {
                  const dispatched = deal.dispatched_qty || 0;
                  const target = deal.target_qty || 1;
                  const pct = Math.min((dispatched / target) * 100, 100);
                  return (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex justify-between text-[11px] font-semibold text-foreground mb-1">
                        <span>{deal.client_name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${deal.deal_type === 'Open' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{deal.deal_type}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-1.5">{deal.item_name || 'Item'} • Target: {target}</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{dispatched} dispatched ({pct.toFixed(0)}%)</div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Live Stock Table */}
        <ChartCard title="📦 Live Inventory — Current Stock Levels" span={3}>
          {stock.length === 0 ? <NoData /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Item Name', 'Category', 'Current Stock', 'Unit', 'Min Level', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item, i) => {
                    const qty = parseFloat(item.current_qty || 0);
                    const isLow = qty <= item.min_stock_level;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)' }}>{item.category}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: isLow ? '#ef4444' : '#10b981' }}>{qty.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)' }}>{item.unit_of_measure}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)' }}>{item.min_stock_level}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: isLow ? '#ef4444/10' : '#10b981/10', color: isLow ? '#ef4444' : '#10b981', border: `1px solid ${isLow ? '#ef4444' : '#10b981'}` }}>
                            {isLow ? '⚠ LOW STOCK' : '✓ OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        {/* Recent Transactions */}
        <ChartCard title="🕐 Recent Transactions (Last 10)" span={3}>
          {recentTx.length === 0 ? <NoData /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Date & Time', 'Item', 'Type', 'Quantity', 'Unit', 'Deal / Client', 'Recorded By', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx, i) => {
                    const typeColors: Record<string, string> = { Inward: '#10b981', Issue: '#f59e0b', Outward: '#6366f1', Scrap: '#ef4444' };
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)', fontSize: 10 }}>{new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{tx.item_name || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: typeColors[tx.transaction_type] || '#94a3b8', border: `1px solid ${typeColors[tx.transaction_type] || '#94a3b8'}` }}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{parseFloat(tx.quantity).toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)' }}>{tx.unit_of_measure || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)' }}>{tx.client_name || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)' }}>{tx.recorded_by || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--color-muted-foreground)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

      </div>
    </div>
  );
}

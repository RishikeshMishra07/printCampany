"use client";
import React, { useState, useEffect, useCallback } from 'react';

export default function LiveStockPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');

  const fetchStock = useCallback(async () => {
    try {
      const res = await fetch('/api/store/live-stock');
      const data = await res.json();
      if (data.stock) setStock(data.stock);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: true }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStock();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStock, 30000);
    return () => clearInterval(interval);
  }, [fetchStock]);

  const filtered = stock.filter(s => {
    if (filterCat !== 'All' && s.category !== filterCat) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lowStockItems = stock.filter(s => parseFloat(s.current_qty) <= s.min_stock_level);
  const okItems = stock.filter(s => parseFloat(s.current_qty) > s.min_stock_level);

  const catColors: Record<string, { bg: string; border: string; text: string }> = {
    'Paint':      { bg: '#6366f110', border: '#6366f1', text: '#6366f1' },
    'Consumable': { bg: '#f59e0b10', border: '#f59e0b', text: '#f59e0b' },
    'Raw Part':   { bg: '#10b98110', border: '#10b981', text: '#10b981' },
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📦 Live Stock</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Real-time inventory levels • Auto-refreshes every 30s
              {lastUpdated && <span> • Last updated: <span className="font-semibold text-foreground">{lastUpdated}</span></span>}
            </p>
          </div>
          <button onClick={fetchStock} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted transition-colors">
            🔄 Refresh Now
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">

        {/* Alert Banner for Low Stock */}
        {lowStockItems.length > 0 && (
          <div className="p-4 rounded-xl border" style={{ background: '#ef444410', borderColor: '#ef4444' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="text-sm font-bold" style={{ color: '#ef4444' }}>
                  {lowStockItems.length} item{lowStockItems.length > 1 ? 's are' : ' is'} below minimum stock level!
                </div>
                <div className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {lowStockItems.map(s => `${s.name} (${parseFloat(s.current_qty).toFixed(1)} ${s.unit_of_measure})`).join(' • ')}
                </div>
                <div className="text-[10px] mt-1 text-muted-foreground">
                  Please notify the Admin or raise a purchase request immediately.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: stock.length, icon: '📦', color: 'text-blue-500' },
            { label: 'OK — Sufficient', value: okItems.length, icon: '✅', color: 'text-green-500' },
            { label: 'Low Stock Alert', value: lowStockItems.length, icon: '⚠️', color: lowStockItems.length > 0 ? 'text-red-500' : 'text-green-500' },
            { label: 'Categories', value: 3, icon: '🗂️', color: 'text-purple-500' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40"
          />
          {['All', 'Paint', 'Consumable', 'Raw Part'].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterCat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Stock Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse bg-card border border-border rounded-xl h-28" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-3">📦</div>
              <div className="text-sm font-semibold">No items found</div>
              <div className="text-xs mt-1">Add items in Master Data to see stock here.</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => {
              const qty = parseFloat(item.current_qty || 0);
              const min = item.min_stock_level;
              const isLow = qty <= min;
              const pct = min > 0 ? Math.min((qty / (min * 3)) * 100, 100) : 100;
              const catStyle = catColors[item.category] || { bg: '#94a3b810', border: '#94a3b8', text: '#94a3b8' };

              return (
                <div key={i} className="p-5 rounded-xl border bg-card shadow-sm"
                  style={{ borderColor: isLow ? '#ef4444' : 'var(--color-border)', background: isLow ? '#ef444406' : undefined }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="text-sm font-bold text-foreground truncate">{item.name}</div>
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`, display: 'inline-block', marginTop: 3 }}>
                        {item.category}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700, background: isLow ? '#ef444420' : '#10b98120', color: isLow ? '#ef4444' : '#10b981', border: `1px solid ${isLow ? '#ef4444' : '#10b981'}`, flexShrink: 0 }}>
                      {isLow ? '⚠ LOW' : '✓ OK'}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <div className={`text-3xl font-bold tracking-tight ${isLow ? 'text-red-500' : 'text-foreground'}`}>
                        {qty.toFixed(qty % 1 === 0 ? 0 : 2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.unit_of_measure}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">Min Level</div>
                      <div className="text-sm font-semibold text-muted-foreground">{min} {item.unit_of_measure}</div>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isLow ? '#ef4444' : pct < 40 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  {isLow && (
                    <div className="text-[10px] mt-1.5 font-semibold" style={{ color: '#ef4444' }}>
                      {(qty - min).toFixed(2)} {item.unit_of_measure} below minimum — reorder needed!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

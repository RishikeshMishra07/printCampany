"use client";
import React, { useState, useEffect, useCallback } from 'react';

export default function LiveStockPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', category: '', unit_of_measure: '', min_stock_level: 0, project: '', new_rate: '', old_rate: ''
  });

  const fetchStock = useCallback(async () => {
    try {
      const url = filterMonth ? `/api/store/live-stock?month=${filterMonth}` : '/api/store/live-stock';
      const res = await fetch(url);
      const data = await res.json();
      if (data.stock) setStock(data.stock);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: true }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterMonth]);

  useEffect(() => {
    fetchStock();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStock, 30000);
    return () => clearInterval(interval);
  }, [fetchStock]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setUser(d.user);
    }).catch(() => {});
  }, []);

  const handleSaveItem = async () => {
    try {
      const url = editingItem ? `/api/store/items/${editingItem.id}` : `/api/store/items`;
      const method = editingItem ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchStock();
      } else {
        alert('Failed to save item');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving item');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', category: '', unit_of_measure: '', min_stock_level: 0, project: '', new_rate: '', old_rate: '' });
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '', category: item.category || '', unit_of_measure: item.unit_of_measure || '',
      min_stock_level: item.min_stock_level || 0, project: item.project || '', new_rate: item.new_rate || '', old_rate: item.old_rate || ''
    });
    setShowModal(true);
  };

  const filtered = stock.filter(s => {
    if (filterCat !== 'All' && s.category !== filterCat) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lowStockItems = stock.filter(s => parseFloat(s.current_qty) <= s.min_stock_level);
  const okItems = stock.filter(s => parseFloat(s.current_qty) > s.min_stock_level);

  const categories = ['All', ...Array.from(new Set(stock.map(s => s.category).filter(Boolean)))].sort();

  // Keep a few known colors, fallback to a dynamic hash color for others
  const getCatStyle = (cat: string) => {
    if (cat === 'Paint' || cat === 'PAINT') return { bg: '#6366f110', border: '#6366f1', text: '#6366f1' };
    if (cat === 'Consumable' || cat === 'CONSUMEING') return { bg: '#f59e0b10', border: '#f59e0b', text: '#f59e0b' };
    if (cat === 'Raw Part' || cat === 'MOULDING' || cat === 'CHILD PART') return { bg: '#10b98110', border: '#10b981', text: '#10b981' };
    
    // Hash string to color
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    const color = `hsl(${hash % 360}, 70%, 50%)`;
    return { bg: `${color}15`, border: color, text: color };
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
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <button onClick={openAddModal} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                ➕ Add Item
              </button>
            )}
            <button onClick={fetchStock} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted transition-colors">
              🔄 Refresh
            </button>
          </div>
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
            { label: 'Categories', value: categories.length - 1, icon: '🗂️', color: 'text-purple-500' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center bg-muted/20 p-2 rounded-xl border border-border">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <input
            type="text"
            placeholder="🔍 Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 ml-auto">
            {categories.map(c => (
              <button key={c as string} onClick={() => setFilterCat(c as string)}
                className={`flex-shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${filterCat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                {c as string}
              </button>
            ))}
          </div>
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
              const qty = parseFloat(item.closing_qty || item.current_qty || 0);
              const opQty = parseFloat(item.opening_qty || 0);
              const inQty = parseFloat(item.inward_qty || 0);
              const outQty = parseFloat(item.outward_qty || 0);
              
              const min = item.min_stock_level;
              const isLow = qty <= min;
              const pct = min > 0 ? Math.min((qty / (min * 3)) * 100, 100) : 100;
              const catStyle = getCatStyle(item.category || '');

              return (
                <div key={i} className="p-5 rounded-xl border bg-card shadow-sm"
                  style={{ borderColor: isLow ? '#ef4444' : 'var(--color-border)', background: isLow ? '#ef444406' : undefined }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="text-sm font-bold text-foreground truncate">{item.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`, display: 'inline-block' }}>
                          {item.category}
                        </span>
                        {item.project && (
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: '#3b82f610', color: '#3b82f6', border: '1px solid #3b82f6', display: 'inline-block' }}>
                            PROJECT: {item.project}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700, background: isLow ? '#ef444420' : '#10b98120', color: isLow ? '#ef4444' : '#10b981', border: `1px solid ${isLow ? '#ef4444' : '#10b981'}` }}>
                        {isLow ? '⚠ LOW' : '✓ OK'}
                      </span>
                      {user?.role === 'admin' && (
                        <button onClick={() => openEditModal(item)} className="text-[10px] bg-muted hover:bg-muted/80 text-foreground px-2 py-1 rounded border border-border transition-colors">
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col mb-3 mt-1">
                    <div className="flex items-end justify-between mb-2 mt-2">
                      <div>
                        <div className={`text-3xl font-bold tracking-tight ${isLow ? 'text-red-500' : 'text-foreground'}`}>
                          {qty.toFixed(qty % 1 === 0 ? 0 : 2)}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                          CLOSING STOCK ({item.unit_of_measure})
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {(item.old_rate || item.new_rate) && (
                          <div className="mb-2 text-right bg-muted/40 px-2 py-1 rounded-md border border-border/50 min-w-[70px]">
                             <div className="text-[8px] font-bold text-muted-foreground tracking-widest uppercase mb-[2px]">Rate</div>
                             {item.old_rate && <div className={`text-[10px] ${item.new_rate ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}`}>₹{item.old_rate}</div>}
                             {item.new_rate && <div className="text-xs font-bold text-green-600 dark:text-green-500">₹{item.new_rate}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* The small history strip */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border mt-1">
                       <div className="flex-1 text-left border-r border-border/50">
                         <div className="font-bold text-foreground">{opQty.toFixed(opQty % 1 === 0 ? 0 : 1)}</div>
                         <div className="text-[8px] uppercase font-semibold">Opening</div>
                       </div>
                       <div className="flex-1 text-center border-r border-border/50">
                         <div className="font-bold text-green-500">+{inQty.toFixed(inQty % 1 === 0 ? 0 : 1)}</div>
                         <div className="text-[8px] uppercase font-semibold">Inward</div>
                       </div>
                       <div className="flex-1 text-right">
                         <div className="font-bold text-red-400">-{outQty.toFixed(outQty % 1 === 0 ? 0 : 1)}</div>
                         <div className="text-[8px] uppercase font-semibold">Outward</div>
                       </div>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-grow flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Name <span className="text-red-500">*</span></label>
                <input type="text" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Category <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. PAINT" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Project</label>
                  <input type="text" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} placeholder="e.g. YCA" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Unit of Measure <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    value={formData.unit_of_measure} onChange={e => setFormData({...formData, unit_of_measure: e.target.value})} placeholder="e.g. KG, LTR, NOS" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Min Stock Level <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">New Rate (Price)</label>
                  <input type="text" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    value={formData.new_rate} onChange={e => setFormData({...formData, new_rate: e.target.value})} placeholder="e.g. 150.50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Old Rate (Price)</label>
                  <input type="text" className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                    value={formData.old_rate} onChange={e => setFormData({...formData, old_rate: e.target.value})} placeholder="e.g. 120.00" />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-background border border-border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSaveItem} disabled={!formData.name || !formData.category || !formData.unit_of_measure} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

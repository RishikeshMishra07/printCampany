"use client";
import React, { useState, useEffect } from 'react';

type StockItem = { id: number; name: string; category: string; unit_of_measure: string; current_qty: string; min_stock_level: number };

export default function StockCountPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [countedBy, setCountedBy] = useState('');
  const [physicalCounts, setPhysicalCounts] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/store/live-stock').then(r => r.json()).then(d => { if (d.stock) setItems(d.stock); });
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) { setUser(d.user); setCountedBy(d.user?.name || d.user?.employee_id || ''); } });
  }, []);

  const handleCount = (id: number, val: string) => setPhysicalCounts(prev => ({ ...prev, [id]: val }));

  const handleSubmit = async () => {
    if (!countedBy) return;
    setSaving(true);
    try {
      const itemsData = items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        system_qty: parseFloat(item.current_qty),
        physical_qty: parseFloat(physicalCounts[item.id] || item.current_qty),
        difference: parseFloat(physicalCounts[item.id] || item.current_qty) - parseFloat(item.current_qty),
        unit: item.unit_of_measure,
      }));
      await fetch('/api/store/stock-counts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count_date: countDate, counted_by: countedBy, status: 'Closed', items_json: itemsData }),
      });
      setSubmitted(true);
    } finally { setSaving(false); }
  };

  const discrepancies = items.filter(item => {
    const physical = parseFloat(physicalCounts[item.id] || '');
    return !isNaN(physical) && Math.abs(physical - parseFloat(item.current_qty)) > 0.01;
  });

  if (submitted) {
    return (
      <div className="flex-grow flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-xl font-bold text-foreground">Stock Count Submitted!</div>
          <div className="text-sm text-muted-foreground mt-2">Count for {countDate} saved successfully.</div>
          {discrepancies.length > 0 ? (
            <div className="mt-4 p-4 rounded-xl border max-w-md mx-auto" style={{ background: '#f59e0b12', borderColor: '#f59e0b' }}>
              <div className="text-sm font-bold" style={{ color: '#f59e0b' }}>⚠ {discrepancies.length} discrepancies found</div>
              <div className="text-xs text-muted-foreground mt-1">Review with admin and adjust if needed.</div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl border max-w-md mx-auto" style={{ background: '#10b98112', borderColor: '#10b981' }}>
              <div className="text-sm font-bold" style={{ color: '#10b981' }}>✓ No discrepancies — Stock is perfectly matched!</div>
            </div>
          )}
          <button onClick={() => { setSubmitted(false); setPhysicalCounts({}); }} className="mt-6 px-6 py-2 rounded-xl border border-border text-sm hover:bg-muted">Start New Count</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #14b8a6' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📦 Physical Stock Count</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Compare physical stock with system records — enter actual quantities counted on floor</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={countDate} onChange={e => setCountDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
        {/* Count Info */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Counted By *</label>
            <input className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
              value={countedBy} onChange={e => setCountedBy(e.target.value)} placeholder="Enter your name" />
          </div>
          {discrepancies.length > 0 && (
            <div className="px-4 py-2 rounded-xl border" style={{ background: '#f59e0b12', borderColor: '#f59e0b' }}>
              <div className="text-xs font-bold" style={{ color: '#f59e0b' }}>⚠ {discrepancies.length} discrepancies</div>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{Object.keys(physicalCounts).length} of {items.length} items counted</div>
        </div>

        {/* Count Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['Item', 'Category', 'System Qty', 'Physical Count', 'Difference', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const physical = physicalCounts[item.id];
                const system = parseFloat(item.current_qty);
                const diff = physical !== undefined ? parseFloat(physical) - system : null;
                const hasDiff = diff !== null && Math.abs(diff) > 0.01;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: hasDiff ? '#f59e0b08' : undefined }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{item.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{item.category}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="font-bold" style={{ color: '#6366f1' }}>{system.toFixed(2)}</span>
                      <span className="text-muted-foreground ml-1 text-[10px]">{item.unit_of_measure}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={system.toFixed(2)}
                        value={physical || ''}
                        onChange={e => handleCount(item.id, e.target.value)}
                        className="w-28 h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-bold"
                        style={{ borderColor: hasDiff ? '#f59e0b' : 'var(--color-input)', background: hasDiff ? '#f59e0b08' : 'var(--color-background)' }}
                      />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {diff === null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : hasDiff ? (
                        <span className="font-bold text-sm" style={{ color: diff > 0 ? '#10b981' : '#ef4444' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)} {item.unit_of_measure}
                        </span>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: '#10b981' }}>✓ Match</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {diff === null ? (
                        <span className="text-[10px] px-2 py-1 rounded-full text-muted-foreground border border-border">Not counted</span>
                      ) : hasDiff ? (
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b' }}>⚠ Mismatch</span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b981' }}>✓ OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button onClick={() => setPhysicalCounts({})} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Clear All</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !countedBy || Object.keys(physicalCounts).length === 0}
            className="px-6 py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-50 transition-all"
            style={{ background: '#14b8a6' }}>
            {saving ? 'Saving...' : '✓ Submit Stock Count'}
          </button>
        </div>
      </div>
    </div>
  );
}

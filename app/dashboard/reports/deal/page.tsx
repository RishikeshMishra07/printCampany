"use client";
import React, { useState, useEffect } from 'react';

type Deal = { id: number; client_name: string; deal_type: string; part_name: string; target_qty: number; total_dispatched: number; total_paint_used: number; total_inward: number; total_scrap: number; per_part_paint_budget: number; deal_status: string; dispatch_entries: number };

export default function DealConsumptionPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/store/reports/deal-consumption').then(r => r.json()).then(d => { if (d.deals) setDeals(d.deals); setLoading(false); });
  }, []);

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #3b82f6' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📊 Deal-wise Consumption Report</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Per-deal paint usage, dispatch progress, and scrap — everything in one view</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">🔄 Refresh</button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
        {loading ? <div className="p-12 text-center text-sm text-muted-foreground">Loading...</div> : deals.length === 0 ? (
          <div className="p-20 text-center text-sm text-muted-foreground">No deals found.</div>
        ) : (
          <div className="flex flex-col gap-6">
            {deals.map((d, i) => {
              const progress = d.target_qty ? Math.min((d.total_dispatched / d.target_qty) * 100, 100) : 0;
              const paintUsedVsBudget = d.per_part_paint_budget && d.total_dispatched ? (d.total_paint_used / (d.per_part_paint_budget * d.total_dispatched)) * 100 : 0;
              const overBudget = paintUsedVsBudget > 100;
              return (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold">{d.client_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Part: {d.part_name || '—'} · {d.deal_type} Deal</div>
                    </div>
                    <span className="text-[10px] px-3 py-1 rounded-full font-bold" style={{ background: d.deal_status === 'Active' ? '#10b98115' : '#6b728015', color: d.deal_status === 'Active' ? '#10b981' : '#6b7280', border: `1px solid ${d.deal_status === 'Active' ? '#10b981' : '#6b7280'}` }}>
                      {d.deal_status === 'Active' ? '🟢 Active' : '⬛ Closed'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                      { label: 'Parts Inward',     value: d.total_inward,     color: '#10b981', suffix: 'Nos' },
                      { label: 'Parts Dispatched',  value: d.total_dispatched, color: '#6366f1', suffix: 'Nos' },
                      { label: 'Paint Used (Issue)', value: d.total_paint_used, color: '#f59e0b', suffix: 'Litres' },
                      { label: 'Parts Scrapped',    value: d.total_scrap,      color: '#ef4444', suffix: 'Nos' },
                    ].map(({ label, value, color, suffix }) => (
                      <div key={label} className="p-3 rounded-xl border border-border">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase">{label}</div>
                        <div className="text-xl font-bold mt-1" style={{ color }}>{parseFloat(String(value || 0)).toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">{suffix}</div>
                      </div>
                    ))}
                  </div>
                  {/* Dispatch Progress */}
                  {d.target_qty && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Dispatch Progress</span>
                        <span className="text-xs font-bold">{d.total_dispatched} / {d.target_qty} ({progress.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress >= 100 ? '#10b981' : '#6366f1' }} />
                      </div>
                    </div>
                  )}
                  {/* Paint Budget vs Actual */}
                  {d.per_part_paint_budget > 0 && d.total_dispatched > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Paint Budget Utilisation</span>
                        <span className="text-xs font-bold" style={{ color: overBudget ? '#ef4444' : '#10b981' }}>
                          {overBudget ? '⚠ Over budget' : '✓ Within budget'} ({paintUsedVsBudget.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="flex text-[10px] text-muted-foreground justify-between">
                        <span>Budget: {(d.per_part_paint_budget * d.total_dispatched).toFixed(1)}L ({d.per_part_paint_budget}L/part × {d.total_dispatched})</span>
                        <span>Actual used: {parseFloat(String(d.total_paint_used || 0)).toFixed(1)}L</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-muted mt-1">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(paintUsedVsBudget, 100)}%`, background: overBudget ? '#ef4444' : '#10b981' }} />
                      </div>
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

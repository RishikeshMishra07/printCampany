"use client";
import React, { useState, useEffect } from 'react';

const TYPE_COLORS: Record<string, string> = { Inward: '#10b981', Issue: '#f59e0b', Outward: '#6366f1', Scrap: '#ef4444' };
const TYPE_ICONS:  Record<string, string> = { Inward: '📥', Issue: '🏭', Outward: '🚛', Scrap: '🗑️' };

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(date); }, [date]);

  const fetchReport = async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/store/reports/daily?date=${d}`);
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const goDay = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
  };

  const txns = data?.transactions || [];
  const summary = data?.summary || {};

  const byItem = txns.reduce((acc: any, t: any) => {
    const key = t.item_name;
    if (!acc[key]) acc[key] = { name: key, category: t.category, unit: t.unit_of_measure, types: {} };
    if (!acc[key].types[t.transaction_type]) acc[key].types[t.transaction_type] = 0;
    acc[key].types[t.transaction_type] += parseFloat(t.quantity);
    return acc;
  }, {});

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #14b8a6' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📅 Daily Shift Report</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Complete summary of all store transactions for a selected date</p>
          </div>
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => goDay(-1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-sm">←</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => goDay(1)} disabled={isToday} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-sm disabled:opacity-40">→</button>
            {!isToday && <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">Today</button>}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">

        {/* Date Banner */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-foreground">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{summary.total || 0} total transactions recorded</div>
          </div>
          <div className="text-3xl">{isToday ? '🔴 LIVE' : '📋'}</div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'Inward',  val: summary.inward  || 0, label: 'Total Inward',           sub: 'Parts/Materials received' },
            { type: 'Issue',   val: summary.issue   || 0, label: 'Issued to Production',   sub: 'Sent to shop floor' },
            { type: 'Outward', val: summary.outward || 0, label: 'Dispatched to Client',   sub: 'Outward / painted parts' },
            { type: 'Scrap',   val: summary.scrap   || 0, label: 'Scrap / Rejected',        sub: 'Damaged parts' },
          ].map(({ type, val, label, sub }) => (
            <div key={type} className="p-4 rounded-xl border bg-card shadow-sm" style={{ borderLeft: `4px solid ${TYPE_COLORS[type]}` }}>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{TYPE_ICONS[type]} {label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: TYPE_COLORS[type] }}>{val.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading report...</div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-2xl">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-semibold text-muted-foreground">No transactions on this date</div>
            <div className="text-xs text-muted-foreground mt-1">Try a different date or record transactions first</div>
          </div>
        ) : (
          <>
            {/* Item-wise Summary */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">📦 Item-wise Activity Summary</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                    {['Item', 'Category', 'Inward', 'Issued', 'Dispatched', 'Scrap', 'Unit'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(byItem).map((item: any, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{item.name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{item.category}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>{(item.types.Inward || 0).toFixed(1) || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f59e0b' }}>{(item.types.Issue || 0).toFixed(1) || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#6366f1' }}>{(item.types.Outward || 0).toFixed(1) || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#ef4444' }}>{(item.types.Scrap || 0).toFixed(1) || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chronological Log */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                🕐 Chronological Transaction Log — {txns.length} entries
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      {['Time', 'Type', 'Item', 'Qty', 'Unit', 'Deal / Client', 'Recorded By', 'Notes'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((tx: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: `${TYPE_COLORS[tx.transaction_type]}20`, color: TYPE_COLORS[tx.transaction_type], border: `1px solid ${TYPE_COLORS[tx.transaction_type]}` }}>
                            {TYPE_ICONS[tx.transaction_type]} {tx.transaction_type}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{tx.item_name || '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: TYPE_COLORS[tx.transaction_type] }}>{parseFloat(tx.quantity).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)' }}>{tx.unit_of_measure || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)' }}>{tx.client_name || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)' }}>{tx.recorded_by || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';

type Batch = {
  id: number; batch_no: string; part_name: string; deal_id: number; client_name: string;
  qty_received: number; qty_in_painting: number; qty_qc: number; qty_dispatched: number; qty_rejected: number;
  current_stage: string; vehicle_no: string; notes: string; created_at: string;
};
type Deal = { id: number; client_name: string };

const STAGES = ['Received', 'InPainting', 'QC', 'Dispatched'];
const STAGE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  Received:    { label: 'Received',     icon: '📥', color: '#10b981', bg: '#10b98115' },
  InPainting:  { label: 'In Painting',  icon: '🎨', color: '#6366f1', bg: '#6366f115' },
  QC:          { label: 'Quality Check',icon: '🔍', color: '#f59e0b', bg: '#f59e0b15' },
  Dispatched:  { label: 'Dispatched',   icon: '🚛', color: '#3b82f6', bg: '#3b82f615' },
};

export default function WIPPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({ batch_no: '', deal_id: '', part_name: '', qty_received: '', vehicle_no: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/store/part-batches').then(r => r.json()).then(d => { if (d.batches) setBatches(d.batches); });
    fetch('/api/store/deals').then(r => r.json()).then(d => { if (d.deals) setDeals(d.deals.filter((d: any) => d.status === 'Active')); });
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
  }, []);

  const refresh = () => fetch('/api/store/part-batches').then(r => r.json()).then(d => { if (d.batches) setBatches(d.batches); });

  const handleCreate = async () => {
    if (!form.batch_no || !form.part_name || !form.qty_received) return;
    setSaving(true);
    try {
      await fetch('/api/store/part-batches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qty_received: parseInt(form.qty_received), deal_id: form.deal_id || null, created_by: user?.name || user?.employee_id }),
      });
      setShowCreate(false);
      setForm({ batch_no: '', deal_id: '', part_name: '', qty_received: '', vehicle_no: '', notes: '' });
      refresh();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const advance = async (batch: Batch) => {
    const idx = STAGES.indexOf(batch.current_stage);
    if (idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    setAdvancing(batch.id);
    try {
      const update: any = { current_stage: next };
      if (next === 'InPainting') update.qty_in_painting = batch.qty_received;
      if (next === 'QC')         update.qty_qc          = batch.qty_in_painting;
      if (next === 'Dispatched') update.qty_dispatched   = batch.qty_qc;
      await fetch(`/api/store/part-batches/${batch.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      refresh();
    } finally { setAdvancing(null); }
  };

  const filtered = filter === 'All' ? batches : batches.filter(b => b.current_stage === filter);
  const stageCounts = STAGES.reduce((acc, s) => ({ ...acc, [s]: batches.filter(b => b.current_stage === s).length }), {} as Record<string, number>);

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #6366f1' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🎨 WIP Tracking — Parts in Production</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track each batch of parts from Received → Painting → QC → Dispatched</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            + New Batch
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
        {/* Stage Summary */}
        <div className="grid grid-cols-4 gap-4">
          {STAGES.map(s => {
            const cfg = STAGE_CONFIG[s];
            return (
              <div key={s} onClick={() => setFilter(filter === s ? 'All' : s)} className="p-4 rounded-xl border bg-card shadow-sm cursor-pointer transition-all hover:scale-[1.02]"
                style={{ borderColor: filter === s ? cfg.color : 'var(--color-border)', background: filter === s ? cfg.bg : undefined }}>
                <div className="text-lg mb-1">{cfg.icon}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase">{cfg.label}</div>
                <div className="text-2xl font-bold mt-1" style={{ color: cfg.color }}>{stageCounts[s] || 0}</div>
                <div className="text-[10px] text-muted-foreground">batches</div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const stageBatches = batches.filter(b => b.current_stage === stage);
            return (
              <div key={stage} className="flex flex-col gap-3">
                <div className="px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }}>
                  <span>{cfg.icon}</span>
                  <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="ml-auto text-xs font-bold" style={{ color: cfg.color }}>{stageBatches.length}</span>
                </div>
                {stageBatches.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">No batches</div>
                ) : stageBatches.map(b => (
                  <div key={b.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs font-mono font-bold text-muted-foreground">{b.batch_no}</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">{b.part_name}</div>
                      </div>
                      <div className="text-xl font-bold" style={{ color: cfg.color }}>{b.qty_received}</div>
                    </div>
                    {b.client_name && <div className="text-[10px] text-muted-foreground">🤝 {b.client_name}</div>}
                    {b.vehicle_no && <div className="text-[10px] text-muted-foreground">🚛 {b.vehicle_no}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    {/* Qty breakdown */}
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                      {b.qty_dispatched > 0 && <div><span className="text-muted-foreground">Dispatched:</span> <span className="font-bold text-blue-500">{b.qty_dispatched}</span></div>}
                      {b.qty_rejected > 0 && <div><span className="text-muted-foreground">Rejected:</span> <span className="font-bold text-red-500">{b.qty_rejected}</span></div>}
                    </div>
                    {stage !== 'Dispatched' && (
                      <button onClick={() => advance(b)} disabled={advancing === b.id}
                        className="mt-3 w-full h-8 text-[11px] font-bold rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: STAGE_CONFIG[STAGES[STAGES.indexOf(stage) + 1]]?.color || '#10b981', color: '#fff' }}>
                        {advancing === b.id ? '...' : `→ Move to ${STAGE_CONFIG[STAGES[STAGES.indexOf(stage) + 1]]?.label}`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-5">📦 Register New Parts Batch</h2>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Batch No. *</label>
                  <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    placeholder="e.g. BTH-2025-001" value={form.batch_no} onChange={e => setForm({...form, batch_no: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty Received *</label>
                  <input type="number" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. 500" value={form.qty_received} onChange={e => setForm({...form, qty_received: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Part Name *</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Car Bumper — Front" value={form.part_name} onChange={e => setForm({...form, part_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Client Deal</label>
                <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.deal_id} onChange={e => setForm({...form, deal_id: e.target.value})}>
                  <option value="">— No specific deal —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.client_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Vehicle No.</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. MH-04-AB-1234" value={form.vehicle_no} onChange={e => setForm({...form, vehicle_no: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes</label>
                <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.batch_no || !form.part_name || !form.qty_received}
                className="flex-1 h-10 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: '#6366f1', color: '#fff' }}>
                {saving ? 'Creating...' : 'Register Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

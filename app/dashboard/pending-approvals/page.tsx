"use client";
import React, { useState, useEffect } from 'react';

type PendingTx = {
  id: number;
  item_id: number;
  item_name: string;
  unit_of_measure: string;
  quantity: string;
  reference_no: string;
  notes: string;
  recorded_by: string;
  created_at: string;
  status: string;
};

type PaintReq = {
  id: number;
  norm_part_name: string;
  client_name: string;
  parts_qty: number;
  primer_standard: string;
  primer_extra: string;
  topcoat_standard: string;
  topcoat_extra: string;
  thinner_standard: string;
  thinner_extra: string;
  reason: string;
  status: string;
  requested_by: string;
  created_at: string;
};

export default function PendingApprovalsPage() {
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [paintReqs, setPaintReqs] = useState<PaintReq[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [processingPaint, setProcessingPaint] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'Inward' | 'Paint'>('Inward');

  const load = async () => {
    setLoading(true);
    try {
      const [txRes, userRes, paintRes] = await Promise.all([
        fetch('/api/store/transactions?pending=true').then(r => r.json()),
        fetch('/api/auth/me').then(r => r.json()),
        fetch('/api/store/paint-requests').then(r => r.json()),
      ]);
      if (txRes.transactions) setPending(txRes.transactions);
      if (userRes.success) setUser(userRes.user);
      if (paintRes.requests) setPaintReqs(paintRes.requests.filter((r: any) => r.status === 'Pending'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: number, status: 'Approved' | 'Rejected') => {
    setProcessing(id);
    try {
      await fetch(`/api/store/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: user?.name || user?.employee_id || 'Admin' }),
      });
      load();
    } finally {
      setProcessing(null);
    }
  };

  const handlePaintAction = async (id: number, status: 'Approved' | 'Rejected') => {
    setProcessingPaint(id);
    try {
      const res = await fetch(`/api/store/paint-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: user?.name || user?.employee_id || 'Admin' }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert('Error: ' + d.error);
      }
      load();
    } finally {
      setProcessingPaint(null);
    }
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #f59e0b' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">⏳ Pending Approvals</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review material inward entries and paint issue requests
            </p>
          </div>
          <button onClick={load} className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending Approvals', value: pending.length, color: '#f59e0b', icon: '⏳' },
            { label: 'Total Qty Pending', value: pending.reduce((s, t) => s + parseFloat(t.quantity), 0).toFixed(1), color: '#6366f1', icon: '📦' },
            { label: 'Items Affected', value: new Set(pending.map(t => t.item_id)).size, color: '#10b981', icon: '🗂️' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 border-b border-border">
          <button onClick={() => setActiveTab('Inward')}
            className={`pb-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'Inward' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            📦 Inward Entries ({pending.length})
          </button>
          <button onClick={() => setActiveTab('Paint')}
            className={`pb-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'Paint' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            🎨 Paint Issue Requests ({paintReqs.length})
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex-grow">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : activeTab === 'Inward' ? (
            pending.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">✅</div>
                <div className="text-lg font-bold text-foreground">All clear!</div>
                <div className="text-sm text-muted-foreground mt-1">No pending inward entries to approve right now.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                    {['Date & Time', 'Item', 'Quantity', 'Challan / Ref No.', 'Submitted By', 'Notes', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.map((tx, i) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)', background: '#f59e0b05' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{tx.item_name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="font-bold text-base" style={{ color: '#f59e0b' }}>+{parseFloat(tx.quantity).toFixed(2)}</span>
                        <span className="text-muted-foreground ml-1 text-[10px]">{tx.unit_of_measure}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-muted-foreground)' }}>{tx.reference_no || '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{tx.recorded_by || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-muted-foreground)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex gap-2">
                          <button
                            disabled={processing === tx.id}
                            onClick={() => handleAction(tx.id, 'Approved')}
                            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: '#10b98120', color: '#10b981', border: '1px solid #10b981', cursor: 'pointer', fontWeight: 700, opacity: processing === tx.id ? 0.5 : 1 }}
                          >
                            {processing === tx.id ? '...' : '✓ Approve'}
                          </button>
                          <button
                            disabled={processing === tx.id}
                            onClick={() => handleAction(tx.id, 'Rejected')}
                            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 700, opacity: processing === tx.id ? 0.5 : 1 }}
                          >
                            {processing === tx.id ? '...' : '✕ Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            paintReqs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">🎨</div>
                <div className="text-lg font-bold text-foreground">All clear!</div>
                <div className="text-sm text-muted-foreground mt-1">No pending paint issue requests right now.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                    {['Date', 'Part & Deal', 'Req Details', 'Standard', 'Extra (Requested)', 'Total (To Issue)', 'Reason', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paintReqs.map((req, i) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--color-border)', background: '#8b5cf605' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>
                        {new Date(req.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] mt-1 font-bold text-foreground">{req.requested_by}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="font-bold">{req.parts_qty} × {req.norm_part_name || 'Part'}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">{req.client_name || 'No Deal Linked'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-muted-foreground)', fontSize: 10 }}>
                        <div>Primer:</div>
                        <div>Top Coat:</div>
                        <div>Thinner:</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 11 }}>
                        <div style={{ color: '#8b5cf6' }}>{parseFloat(req.primer_standard).toFixed(2)} L</div>
                        <div style={{ color: '#3b82f6' }}>{parseFloat(req.topcoat_standard).toFixed(2)} L</div>
                        <div style={{ color: '#f59e0b' }}>{parseFloat(req.thinner_standard).toFixed(2)} L</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 11 }}>
                        <div style={{ color: parseFloat(req.primer_extra) > 0 ? '#ef4444' : '#10b981' }}>+{parseFloat(req.primer_extra).toFixed(2)} L</div>
                        <div style={{ color: parseFloat(req.topcoat_extra) > 0 ? '#ef4444' : '#10b981' }}>+{parseFloat(req.topcoat_extra).toFixed(2)} L</div>
                        <div style={{ color: parseFloat(req.thinner_extra) > 0 ? '#ef4444' : '#10b981' }}>+{parseFloat(req.thinner_extra).toFixed(2)} L</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 11, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8 }}>
                        <div style={{ color: '#10b981' }}>={(parseFloat(req.primer_standard) + parseFloat(req.primer_extra)).toFixed(2)} L</div>
                        <div style={{ color: '#10b981' }}>={(parseFloat(req.topcoat_standard) + parseFloat(req.topcoat_extra)).toFixed(2)} L</div>
                        <div style={{ color: '#10b981' }}>={(parseFloat(req.thinner_standard) + parseFloat(req.thinner_extra)).toFixed(2)} L</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-muted-foreground)', maxWidth: 150 }}>
                        {req.reason || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex flex-col gap-2">
                          <button
                            disabled={processingPaint === req.id}
                            onClick={() => handlePaintAction(req.id, 'Approved')}
                            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: '#10b98120', color: '#10b981', border: '1px solid #10b981', cursor: 'pointer', fontWeight: 700, opacity: processingPaint === req.id ? 0.5 : 1 }}
                          >
                            {processingPaint === req.id ? '...' : '✓ Approve & Issue'}
                          </button>
                          <button
                            disabled={processingPaint === req.id}
                            onClick={() => handlePaintAction(req.id, 'Rejected')}
                            style={{ fontSize: 11, padding: '5px 14px', borderRadius: 6, background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 700, opacity: processingPaint === req.id ? 0.5 : 1 }}
                          >
                            {processingPaint === req.id ? '...' : '✕ Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

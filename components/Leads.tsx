"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import SButton from './SButton';
import { ButtonGroup, Button } from '@shopify/polaris';
import * as XLSX from 'xlsx';

const DISPOSITION_LOGIC: Record<string, Record<string, any[]>> = {
  "Right Party Connect": {
    "Customer Refused to Pay": [
      { name: "Financial Issue - Job Loss" },
      { name: "Financial Issue - Business Loss" },
      { name: "Financial Issue - Others" },
      { name: "Financial Issue - Medical Condition" },
      { name: "Dispute - Card No Usages" },
      { name: "Dispute - Card Not Received" },
      { name: "Dispute - Charges Related Issue" },
      { name: "Dispute - Fraud and Others" },
      { name: "Dispute - False Commitment" },
      { name: "Not Ready to Disclose" },
      { name: "Not Ready to Listen" },
    ],
    "Promised to Pay": [
      { name: "Full Outstanding Amount", date: true, amount: true },
      { name: "Minimum Amount", date: true, amount: true },
      { name: "Partial Amount", date: true, amount: true },
      { name: "Customer Wants Settlement", date: true, amount: true, settlement: true },
    ],
    "Follow-Up": [
      { name: "Requested for Waiver", date: true },
      { name: "Asking for some time", date: true },
      { name: "Requested for Statement", date: true },
      { name: "Call Back", date: true },
    ],
    "Customer Visit at Branch": [
      { name: "Customer Visit at Branch", date: true, amount: true }
    ]
  },
  "Third Party Connect": {
    "Customer Not Available": [
      { name: "Out of Country" },
      { name: "Out of City" },
      { name: "Customer Hospitalized" },
      { name: "Not Ready to Disclosed" },
      { name: "Not Ready to Listen" },
      { name: "Customer Deceased" }
    ],
    "Follow-up": [
      { name: "Call Back", date: true }
    ]
  },
  "Wrong Party Connect": {
    "Invalid Contact Number": []
  },
  "Not Connected": {
    "Wrong Number": [],
    "Incorrect Number": [],
    "Switched Off": [],
    "Ringing No Response": [],
    "IVR Call": [],
    "Temporary Out of Service": [],
    "Call Not Connected": [],
    "Call Disconnect": [],
    "No Response After Call Answer": []
  }
};

const CONNECT_STATUS_COLORS: Record<string, string> = {
  'Right Party Connect': '#22c55e',
  'Third Party Connect': '#f59e0b',
  'Wrong Party Connect': '#ef4444',
  'Not Connected': '#6b7280',
};

const PAGE_SIZE = 25;

const MultiSelect = ({ label, options, selected, onChange }: { label: string, options: string[], selected: string[], onChange: (s: string[]) => void }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(x => x !== val));
    else onChange([...selected, val]);
  };

  const filteredOptions = options.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative', width: 'auto' }}>
      <div 
        className="finp" 
        style={{ fontSize: 12, padding: '6px 10px', minWidth: 120, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2, #ffffff)', border: '1px solid var(--bdr)', borderRadius: 4 }}
        onClick={() => setOpen(!open)}
      >
        <span>{selected.length === 0 ? label : `${label} (${selected.length})`}</span>
        <span style={{ fontSize: 10 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg2, #ffffff)', border: '1px solid var(--bdr)', borderRadius: 6, zIndex: 100, maxHeight: 250, overflowY: 'auto', minWidth: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '6px', position: 'sticky', top: 0, background: 'var(--bg2, #ffffff)', borderBottom: '1px solid var(--bdr)', zIndex: 2 }}>
            <input 
              type="text" 
              placeholder={`Search ${label}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: 11, border: '1px solid var(--bdr)', borderRadius: 4, outline: 'none' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          {filteredOptions.length === 0 ? <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--txt3)' }}>No options</div> : null}
          {filteredOptions.map(o => (
            <div key={o} onClick={() => toggle(o)} style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid var(--faint)' }}>
              <input type="checkbox" checked={selected.includes(o)} readOnly style={{ cursor: 'pointer' }} />
              <span style={{ whiteSpace: 'nowrap' }}>{o}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Payment History Modal ─────────────────────────────────────────────────
const PaymentHistoryModal = ({ lead }: { lead: any }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  useEffect(() => {
    if (!lead?.id) return;
    setLoading(true);
    fetch(`/api/leads/${lead.id}/payments?page=${page}&limit=${LIMIT}&status=${statusFilter}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lead?.id, page, statusFilter]);

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    cleared: { label: 'Cleared', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    pending_approval: { label: 'Pending Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  };

  const payments = data?.payments || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div style={{ padding: '0 20px 20px' }}>
      {/* Summary KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total Payments', val: data?.summary?.count || 0, color: 'var(--acc2)', bg: 'rgba(79,125,255,0.06)', isCount: true },
          { label: 'Cleared', val: data?.summary?.clearedCount || 0, color: '#22c55e', bg: 'rgba(34,197,94,0.06)', isCount: true },
          { label: 'Pending', val: data?.summary?.pendingCount || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', isCount: true },
          { label: 'Rejected', val: data?.summary?.rejectedCount || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', isCount: true },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}25`, borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 8, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: 'var(--txt)', outline: 'none' }}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="cleared">Cleared</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="rejected">Rejected</option>
        </select>
        <div style={{ fontSize: 10, color: 'var(--txt3)', marginLeft: 'auto' }}>{data?.total || 0} records total</div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--bdr)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg2)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 100px 110px 100px 1fr 140px 130px', background: 'var(--bg3)', borderBottom: '1px solid var(--bdr)', padding: '10px 16px', gap: 12 }}>
          {['#', 'Date', 'Amount', 'Mode', 'Reference No.', 'Agent', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: '45vh', overflowY: 'auto', background: 'var(--bg2)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>⏳ Loading...</div>
          ) : !payments.length ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              No payment records found.
            </div>
          ) : (
            payments.map((p: any, idx: number) => {
              const cfg = STATUS_CFG[p.status] || { label: p.status, color: 'var(--txt3)', bg: 'var(--faint)' };
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '40px 100px 110px 100px 1fr 140px 130px', padding: '12px 16px', gap: 12, alignItems: 'center', borderBottom: idx < payments.length - 1 ? '1px solid var(--faint)' : 'none', transition: 'background 0.2s' }}>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{(page - 1) * LIMIT + idx + 1}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt)', fontWeight: 600 }}>{p.date}</div>
                  <div style={{ fontSize: 12, color: 'var(--grn)', fontWeight: 800 }}>₹{Number(p.amount).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt2)', fontWeight: 600 }}>{p.mode}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'monospace', opacity: 0.8 }}>{p.ref || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', fontWeight: 500 }}>{p.agent?.name || '—'}</div>
                  <div>
                    <span style={{ 
                      display: 'inline-flex', 
                      background: cfg.bg, 
                      color: cfg.color, 
                      border: `1px solid ${cfg.color}30`, 
                      padding: '3px 10px', 
                      borderRadius: 12, 
                      fontSize: 9, 
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      letterSpacing: 0.3
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px', borderTop: '1px solid var(--bdr)', background: 'var(--bg3)' }}>
            <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 12px', fontSize: 11 }}>Previous</button>
            <div style={{ fontSize: 11, fontWeight: 700 }}>Page {page} of {totalPages}</div>
            <button className="btn sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 12px', fontSize: 11 }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Payment Summary Modal ─────────────────────────────────────────────────
const PaymentSummaryModal = ({ lead }: { lead: any }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lead?.id) return;
    setLoading(true);
    fetch(`/api/leads/${lead.id}/payments`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lead?.id]);

  const s = data?.summary || {};
  const outstanding = lead?.outstanding || 0;
  const recovered = s.cleared || 0;
  const recoveryPct = outstanding > 0 ? Math.min(100, (recovered / outstanding) * 100) : 0;

  // Group payments by month for chart
  const monthlyData: Record<string, number> = {};
  (data?.payments || []).filter((p: any) => p.status === 'cleared').forEach((p: any) => {
    const m = p.date?.substring(0, 7) || 'Unknown';
    monthlyData[m] = (monthlyData[m] || 0) + p.amount;
  });
  const months = Object.keys(monthlyData).sort().slice(-6);
  const maxMonthly = Math.max(...months.map(m => monthlyData[m]), 1);

  return (
    <div style={{ padding: '0 20px 20px' }}>
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)' }}>⏳ Loading...</div>
      ) : (
        <>
          {/* Top KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Collected', val: `₹${Number(s.cleared || 0).toLocaleString('en-IN')}`, color: '#22c55e', bg: 'rgba(34,197,94,0.06)', icon: '✅', note: `${s.clearedCount || 0} cleared payments` },
              { label: 'Pending Approval', val: `₹${Number(s.pending || 0).toLocaleString('en-IN')}`, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', icon: '⏳', note: `${s.pendingCount || 0} pending payments` },
              { label: 'Rejected Amount', val: `₹${Number(s.rejected || 0).toLocaleString('en-IN')}`, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', icon: '❌', note: `${s.rejectedCount || 0} rejected payments` },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.color}25`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginBottom: 2 }}>{k.val}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: k.color, marginBottom: 2 }}>{k.val}</div>
                <div style={{ fontSize: 10, color: 'var(--txt)', fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontSize: 9, color: 'var(--txt3)', marginTop: 2 }}>{k.note}</div>
              </div>
            ))}
          </div>

          {/* Recovery Progress */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>Recovery Progress</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                  Outstanding: ₹{Number(outstanding).toLocaleString('en-IN')} &nbsp;•&nbsp; Collected: ₹{Number(recovered).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: recoveryPct >= 75 ? '#22c55e' : recoveryPct >= 40 ? '#f59e0b' : '#ef4444' }}>
                {recoveryPct.toFixed(1)}%
              </div>
            </div>
            <div style={{ height: 10, background: 'var(--faint)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${recoveryPct}%`, background: recoveryPct >= 75 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : recoveryPct >= 40 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)', borderRadius: 999, transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* Monthly bar chart */}
          {months.length > 0 && (
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 14 }}>Monthly Collections (Last 6 Months)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                {months.map(m => {
                  const val = monthlyData[m];
                  const h = Math.max(6, (val / maxMonthly) * 90);
                  const [yr, mo] = m.split('-');
                  const label = new Date(parseInt(yr), parseInt(mo) - 1).toLocaleString('default', { month: 'short' });
                  return (
                    <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700 }}>₹{(val / 1000).toFixed(0)}K</div>
                      <div style={{ width: '100%', height: `${h}px`, background: 'linear-gradient(180deg, #22c55e, #16a34a)', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} title={`${m}: ₹${val.toLocaleString('en-IN')}`} />
                      <div style={{ fontSize: 8, color: 'var(--txt3)' }}>{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {months.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              No cleared payments found yet.
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ── Settlement History Modal ─────────────────────────────── */
const SettlementHistoryModal = ({ lead }: { lead: any }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!lead?.id) return;
    setLoading(true);
    fetch(`/api/settlements?customerId=${lead.id}&status=all&page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setData(list);
        setTotal(d?.total || list.length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lead?.id, page]);

  const totalPages = Math.ceil(total / limit);

  const STATUS_MAP: any = {
    Raised: { color: 'var(--amb)', label: 'RAISED', icon: '⏳' },
    Approve: { color: 'var(--grn)', label: 'APPROVED', icon: '✅' },
    Rejected: { color: 'var(--red)', label: 'REJECTED', icon: '❌' },
    Pending: { color: 'var(--pur)', label: 'PENDING', icon: '🔄' },
  };

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -468px 0 }
          100% { background-position: 468px 0 }
        }
        .skeleton {
          background: #f6f7f8;
          background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
          background-repeat: no-repeat;
          background-size: 800px 100%;
          display: inline-block;
          position: relative;
          animation: shimmer 1.2s infinite linear;
          border-radius: 4px;
        }
      `}</style>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }}></div>
                  <div className="skeleton" style={{ height: 12, width: '40%' }}></div>
                </div>
                <div className="skeleton" style={{ height: 24, width: 80, borderRadius: 12 }}></div>
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: 12, border: '1px solid var(--bdr)' }}>
                <div className="skeleton" style={{ height: 10, width: '100%', marginBottom: 6 }}></div>
                <div className="skeleton" style={{ height: 10, width: '80%' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                <div className="skeleton" style={{ height: 10, width: 100 }}></div>
                <div className="skeleton" style={{ height: 10, width: 80 }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
          No settlement history found for this customer.
        </div>
      ) : (
        <>
          <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 20 }}>
            {data.map((s: any) => {
              const cfg = STATUS_MAP[s.status] || { color: 'var(--txt3)', label: s.status, icon: '•' };
              return (
                <div key={s.id} style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--bdr)',
                  borderRadius: 6,
                  padding: '16px',
                  position: 'relative',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: cfg.color }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{s.reason}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', background: 'rgba(239,68,68,0.06)', padding: '2px 8px', borderRadius: 4 }}>
                          ₹{Number(s.amount).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--txt3)', fontWeight: 700, letterSpacing: 0.5 }}>SETTLEMENT AMOUNT</span>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: cfg.color, background: `${cfg.color}10`,
                      padding: '4px 10px', borderRadius: 4,
                      border: `1px solid ${cfg.color}25`,
                      fontSize: 10, fontWeight: 800, letterSpacing: 0.5
                    }}>
                      <span>{cfg.icon}</span> {cfg.label}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 6, padding: 12 }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--txt3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Agent Remarks</div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)', lineHeight: 1.5, fontStyle: 'italic' }}>"{s.justification || 'No justification provided'}"</div>
                    </div>

                    {s.remarks && (
                      <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 10 }}>
                        <div style={{ fontSize: 9, color: 'var(--acc2)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Manager Response</div>
                        <div style={{ fontSize: 11, color: 'var(--txt)', lineHeight: 1.5, fontWeight: 600 }}>{s.remarks}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      👤 <span style={{ fontWeight: 600 }}>{s.agent?.name || 'Unknown Agent'}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600 }}>
                      📅 {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24, padding: '10px 0', borderTop: '1px solid var(--bdr)' }}>
              <button
                className="btn sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{ opacity: page <= 1 ? 0.5 : 1, background: 'var(--bg2)', border: '1px solid var(--bdr)', padding: '6px 12px', fontSize: 11 }}
              >
                ‹ Previous
              </button>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)' }}>
                Page {page} of {totalPages}
              </div>
              <button
                className="btn sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ opacity: page >= totalPages ? 0.5 : 1, background: 'var(--bg2)', border: '1px solid var(--bdr)', padding: '6px 12px', fontSize: 11 }}
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};


const CallLogsModal = ({ lead }: { lead: any }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ rpcCount: 0, ptpCount: 0, ncCount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterCS, setFilterCS] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!lead) {
      setLoading(false);
      return;
    }
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: page.toString(),
          limit: PAGE_SIZE.toString()
        });
        if (filterCS) query.append('status', filterCS);
        if (search) query.append('search', search);

        const res = await fetch(`/api/leads/${lead.id}/call-logs?${query.toString()}`);
        const data = await res.json();

        if (data && data.logs) {
          setLogs(data.logs);
          setTotalCount(data.totalCount || 0);
          if (data.stats) setStats(data.stats);
        } else if (Array.isArray(data)) {
          // Fallback if API hasn't deployed properly
          setLogs(data);
          setTotalCount(data.length);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchLogs();
  }, [lead?.id, page, filterCS, search]); // Re-fetch on page or filter change

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div style={{ padding: '0 20px 20px' }}>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total Calls', val: totalCount, color: 'var(--acc2)', bg: 'rgba(79,125,255,0.06)' },
          { label: 'RPC', val: stats.rpcCount, color: '#22c55e', bg: 'rgba(34,197,94,0.06)' },
          { label: 'PTP', val: stats.ptpCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
          { label: 'Not Connected', val: stats.ncCount, color: '#6b7280', bg: 'rgba(107,114,128,0.06)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 6, padding: '4px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 8, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)', fontSize: 13 }}>⌕</span>
          <input
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px 6px 28px', fontSize: 11, color: 'var(--txt)', outline: 'none' }}
            placeholder="Search logs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none' }}
          value={filterCS}
          onChange={e => { setFilterCS(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {Object.keys(CONNECT_STATUS_COLORS).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ fontSize: 10, color: 'var(--txt3)', whiteSpace: 'nowrap' }}>
          {totalCount} records
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--bdr)', borderRadius: 8, overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '30px 100px 1.3fr 1.3fr 1.6fr 110px 80px', background: 'var(--bg-top)', borderBottom: '1px solid var(--bdr)', padding: '6px 10px', gap: 6 }}>
          {['#', 'Date & Time', 'Connect Status', 'Disposition', 'Sub-Disposition', 'Agent', 'Amount'].map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ maxHeight: '55vh', overflowY: 'auto', background: 'var(--bg2)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading...
            </div>
          ) : !logs.length ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>No logs match your filter.
            </div>
          ) : (
            logs.map((log, idx) => {
              const d = log.details as any;
              const csColor = CONNECT_STATUS_COLORS[d?.connectStatus] || '#6b7280';
              const ts = new Date(log.timestamp);
              const dateStr = ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
              const isExp = expanded === log.id;

              return (
                <div key={log.id}
                  onClick={() => setExpanded(isExp ? null : log.id)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    borderBottom: idx < logs.length - 1 ? '1px solid var(--faint)' : 'none',
                    cursor: 'pointer',
                    background: isExp ? 'rgba(79,125,255,0.03)' : 'transparent',
                    transition: 'background 0.1s'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '30px 100px 1.3fr 1.3fr 1.6fr 110px 80px', padding: '7px 10px', gap: 6, alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{rowNum}</div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--txt)', fontWeight: 600 }}>{dateStr}</div>
                      <div style={{ fontSize: 9, color: 'var(--txt3)' }}>{timeStr}</div>
                    </div>
                    <div>
                      <span style={{ background: `${csColor}15`, color: csColor, border: `1px solid ${csColor}30`, borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>
                        {d?.connectStatus || '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{d?.disposition || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{d?.subDisposition || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt2)', display: 'flex', flexDirection: 'column' }}>
                      <span>{log.user?.name || '—'}</span>
                      {log.user?.empId && <span style={{ color: 'var(--txt3)', fontSize: 9 }}>({log.user.empId})</span>}
                    </div>
                    <div style={{ fontSize: 10, color: d?.amount ? '#22c55e' : 'var(--txt3)', fontWeight: d?.amount ? 700 : 400 }}>
                      {d?.amount ? `₹${Number(d.amount).toLocaleString('en-IN')}` : '—'}
                    </div>
                  </div>

                  {/* Expanded remarks row - ALWAYS SHOWN */}
                  {(d && Object.keys(d).length > 0) && (
                    <div style={{ padding: '0 10px 8px 46px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {d?.remarks && (
                        <div style={{ fontSize: 11, color: 'var(--txt3)', background: 'var(--bg3)', padding: '5px 8px', borderRadius: 4, borderLeft: '2px solid rgba(79,125,255,0.4)', fontStyle: 'italic', flex: 1 }}>
                          "{d.remarks}"
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                        {d?.date && <span style={{ fontSize: 10, color: 'var(--txt3)' }}>📅 PTP Date: {d.date}</span>}
                        {d?.altNumber && <span style={{ fontSize: 10, color: 'var(--txt2)' }}>📱 Alt: {d.altNumber}</span>}
                        {d?.callDrop && d.callDrop !== 'No' && <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 3 }}>⚠ Call Drop: {d.callDrop}</span>}
                        {d?.upgradeFlag && (
                          <span style={{ fontSize: 10, color: 'var(--pur)', background: 'var(--purbg)', border: '1px solid rgba(167,139,250,0.3)', padding: '1px 5px', borderRadius: 3 }}>
                            ⭐ {d.upgradeFlag} {d.upgradeType ? `(${d.upgradeType})` : d.upgradeReason ? `(${d.upgradeReason})` : ''}
                          </span>
                        )}
                        {/* Dynamic render for any other fields not explicitly handled */}
                        {Object.entries(d || {})
                          .filter(([k, v]) => !['connectStatus', 'disposition', 'subDisposition', 'remarks', 'callDrop', 'altNumber', 'userId', 'amount', 'date', 'upgradeFlag', 'upgradeType', 'upgradeReason'].includes(k) && v !== null && v !== undefined && v !== '')
                          .map(([k, v]) => (
                            <span key={k} style={{ fontSize: 10, color: 'var(--txt2)', background: 'var(--faint)', border: '1px solid var(--bdr)', padding: '1px 5px', borderRadius: 3 }}>
                              {k.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}: {String(v)}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
            Page {page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn sm" onClick={() => setPage(1)} disabled={page === 1} style={{ opacity: page === 1 ? 0.4 : 1, padding: '4px 8px', fontSize: 10 }}>«</button>
            <button className="btn sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ opacity: page === 1 ? 0.4 : 1, padding: '4px 8px', fontSize: 10 }}>‹ Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} className="btn sm"
                  onClick={() => setPage(p)}
                  style={{ background: p === page ? 'var(--acc)' : 'transparent', color: p === page ? '#fff' : 'var(--txt2)', border: '1px solid var(--bdr)', minWidth: 26, padding: '4px 0', fontSize: 10 }}>
                  {p}
                </button>
              );
            })}
            <button className="btn sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ opacity: page === totalPages ? 0.4 : 1, padding: '4px 8px', fontSize: 10 }}>Next ›</button>
            <button className="btn sm" onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ opacity: page === totalPages ? 0.4 : 1, padding: '4px 8px', fontSize: 10 }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
};

const EditLeadModal = ({ lead, onDone }: { lead: any, onDone: () => void }) => {
  const { user, closeModal, toast } = useApp();
  const [loading, setLoading] = useState(false);
  // ... rest of state ...
  const [connectStatus, setConnectStatus] = useState('');
  const [disposition, setDisposition] = useState('');
  const [subDisposition, setSubDisposition] = useState('');

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [settlement, setSettlement] = useState('');
  const [callDrop, setCallDrop] = useState('No');
  const [altNumber, setAltNumber] = useState('');
  const [remarks, setRemarks] = useState('');


  const dispositions = connectStatus && DISPOSITION_LOGIC[connectStatus] ? Object.keys(DISPOSITION_LOGIC[connectStatus]) : [];
  const subDispositions = connectStatus && disposition && DISPOSITION_LOGIC[connectStatus][disposition] ? DISPOSITION_LOGIC[connectStatus][disposition] : [];
  const activeLogic = subDispositions.find((s: any) => s.name === subDisposition) || {};

  // Reset dependent fields when parent changes
  useEffect(() => { setDisposition(''); setSubDisposition(''); }, [connectStatus]);
  useEffect(() => { setSubDisposition(''); }, [disposition]);

  const handleSubmit = async () => {
    const isSubReq = subDispositions.length > 0;
    const isDateReq = !!activeLogic.date;
    const isAmtReq = !!activeLogic.amount;

    if (!connectStatus || !disposition || (isSubReq && !subDisposition) || (isDateReq && !date) || (isAmtReq && !amount) || !remarks) {
      toast('Please fill all required fields');
      return;
    }
    if (showAltNumber && !altNumber) {
      toast('Please provide an alternate number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          connectStatus,
          disposition,
          subDisposition,
          date,
          amount,
          settlement,
          callDrop,
          altNumber,
          remarks,

        })
      });
      if (res.ok) {
        toast('Lead disposition updated successfully');
        closeModal();
        onDone();
      } else {
        toast('Failed to update disposition');
      }
    } catch (e) {
      console.error(e);
      toast('Error updating disposition');
    } finally {
      setLoading(false);
    }
  };

  const showAltNumber = ['Right Party Connect', 'Third Party Connect', 'Wrong Party Connect'].includes(connectStatus);

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ background: 'rgba(79,125,255,0.08)', border: '1px solid rgba(79,125,255,0.2)', padding: '12px 16px', borderRadius: 8, marginBottom: 20, color: 'var(--acc2)', fontSize: 13 }}>
        Updating Disposition for: <b>{lead?.name}</b> <span style={{ color: 'var(--txt3)' }}>·</span> <b>{(lead?.account_no || '').replace(/LN-|-/g, '')}</b>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 15 }}>
        <div className="ff">
          <label>CONNECT STATUS *</label>
          <select className="finp" value={connectStatus} onChange={e => setConnectStatus(e.target.value)}>
            <option value="">— Select —</option>
            {Object.keys(DISPOSITION_LOGIC).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="ff">
          <label>DISPOSITION *</label>
          <select className="finp" value={disposition} onChange={e => setDisposition(e.target.value)} disabled={!dispositions.length}>
            <option value="">— Select —</option>
            {dispositions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="ff">
          <label>SUB DISPOSITION {subDispositions.length > 0 ? '*' : ''}</label>
          <select className="finp" value={subDisposition} onChange={e => setSubDisposition(e.target.value)} disabled={!subDispositions.length}>
            <option value="">— Select —</option>
            {subDispositions.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 15 }}>
        {activeLogic.date && (
          <div className="ff">
            <label>ACTION DATE *</label>
            <input className="finp" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        )}
        {activeLogic.amount && (
          <div className="ff">
            <label>AMOUNT (₹) *</label>
            <input className="finp" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        )}

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 20 }}>
        {showAltNumber && (
          <div className="ff">
            <label>CALL DROP?</label>
            <select className="finp" value={callDrop} onChange={e => setCallDrop(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        )}
        {showAltNumber && (
          <div className="ff">
            <label>ALTERNATE NUMBER *</label>
            <input className="finp" placeholder="Enter alternate mobile..." value={altNumber} onChange={e => setAltNumber(e.target.value)} />
          </div>
        )}
      </div>



      <div className="ff" style={{ marginBottom: 25 }}>
        <label>REMARKS / CALL NOTES *</label>
        <textarea className="finp" rows={3} style={{ resize: 'vertical' }} placeholder="Enter detailed interaction notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
      </div>

      <button 
        className="btn pr" 
        style={{ 
          width: '100%', 
          padding: '12px', 
          background: (() => {
            const isSubReq = subDispositions.length > 0;
            const isDateReq = !!activeLogic.date;
            const isAmtReq = !!activeLogic.amount;
            const isValid = !!(connectStatus && disposition && (!isSubReq || subDisposition) && (!isDateReq || date) && (!isAmtReq || amount) && remarks && (!showAltNumber || altNumber));
            return isValid ? 'var(--acc)' : 'var(--bg3)';
          })(),
          color: (() => {
            const isSubReq = subDispositions.length > 0;
            const isDateReq = !!activeLogic.date;
            const isAmtReq = !!activeLogic.amount;
            const isValid = !!(connectStatus && disposition && (!isSubReq || subDisposition) && (!isDateReq || date) && (!isAmtReq || amount) && remarks && (!showAltNumber || altNumber));
            return isValid ? '#fff' : 'var(--txt3)';
          })(),
          cursor: 'pointer'
        }} 
        onClick={handleSubmit} 
        disabled={loading}
      >
        {loading ? 'Saving...' : '✓ Save Disposition'}
      </button>
    </div>
  );
};

const RecordLeadPaymentModal = ({ lead, onDone }: { lead: any, onDone: () => void }) => {
  const { user, closeModal, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    mode: 'NEFT',
    ref: '',
    date: '',
    remarks: '',
    upgradeFlag: '',
    upgradeType: '',
    upgradeReason: '',
    status: ''
  });
  const [dupWarning, setDupWarning] = useState<{ type: string; message: string } | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  // Reset duplicate warning when ref changes
  const handleRefChange = (val: string) => {
    setForm({ ...form, ref: val });
    setDupWarning(null);
    setConfirmDuplicate(false);
  };

  const handleSubmit = async (force = false) => {
    // Basic fields
    if (!form.amount || !form.date || !form.mode || !form.ref || !form.status || !form.remarks) {
      toast('Please fill all required fields: Amount, Mode, Date, Ref No, Status, and Remarks');
      return;
    }
    // Upgrade fields if eligible
    if (lead.eligible_upgrade === 'Y' || lead.eligible_for_update === 'Y') {
      if (!form.upgradeFlag) {
        toast('Please select an Upgrade Flag');
        return;
      }
      if (form.upgradeFlag === 'Upgraded' && !form.upgradeType) {
        toast('Please select an Upgrade Type');
        return;
      }
      if (form.upgradeFlag === 'Pending For Upgrade' && !form.upgradeReason) {
        toast('Please select an Upgrade Reason');
        return;
      }
    }
    setLoading(true);
    setDupWarning(null);
    try {
      // 1. Create Payment (with duplicate check)
      const payRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: lead.id,
          amount: form.amount,
          mode: form.mode,
          ref: form.ref,
          date: form.date,
          remarks: form.remarks,
          agentId: user?.id,
          upgradeFlag: form.upgradeFlag,
          upgradeType: form.upgradeType,
          upgradeReason: form.upgradeReason,
          confirmDuplicate: force // tells backend to bypass soft duplicate check
        })
      });

      // Handle duplicate responses
      if (payRes.status === 409) {
        const dupData = await payRes.json();
        if (dupData.type === 'ref_duplicate') {
          // Hard block — cannot proceed
          setDupWarning({ type: 'hard', message: dupData.message });
          setLoading(false);
          return;
        } else if (dupData.type === 'soft_duplicate') {
          // Soft warning — agent can confirm and proceed
          setDupWarning({ type: 'soft', message: dupData.message });
          setConfirmDuplicate(true);
          setLoading(false);
          return;
        }
      }

      if (!payRes.ok) {
        const errData = await payRes.json();
        toast(errData.message || 'Error recording payment');
        setLoading(false);
        return;
      }

      // 1.5 Update Lead Status if changed
      if (form.status && form.status !== lead.status) {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: form.status })
        });
      }

      // 2. If Upgraded, update lead via disposition API
      if (lead.eligible_upgrade === 'Y' && form.upgradeFlag) {
        await fetch(`/api/leads/${lead.id}/disposition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            connectStatus: 'Right Party Connect',
            disposition: 'Promised to Pay',
            subDisposition: 'Full Outstanding Amount',
            remarks: `Payment Recorded: ${form.remarks}`,
            upgradeFlag: form.upgradeFlag,
            upgradeType: form.upgradeType,
            upgradeReason: form.upgradeReason
          })
        });
      }

      toast('Payment recorded successfully ✓');
      closeModal();
      onDone();
    } catch (e) {
      toast('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '0 20px 15px' }}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px', marginRight: '-5px' }} className="hide-scrollbar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 15 }}>
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', padding: '10px 14px', borderRadius: 8, color: 'var(--grn)', fontSize: 12.5, fontWeight: 600 }}>
            <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Outstanding</div>
            ₹{Number(lead.outstanding || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', padding: '10px 14px', borderRadius: 8, color: 'var(--red)', fontSize: 12.5, fontWeight: 600 }}>
            <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Min Amount Due</div>
            ₹{Number(lead.min_amt_due || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ background: 'rgba(79,125,255,0.06)', border: '1px solid rgba(79,125,255,0.15)', padding: '10px 14px', borderRadius: 8, color: 'var(--blu)', fontSize: 12.5, fontWeight: 600 }}>
            <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Principle Outstanding</div>
            ₹{Number(lead.principle_outstanding || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', padding: '10px 14px', borderRadius: 8, color: 'var(--amb)', fontSize: 11, lineHeight: 1.4, display: 'flex', alignItems: 'center', marginBottom: 15 }}>
          ⌛ Payment will go to <b style={{ color: 'var(--amb)', marginLeft: 4, marginRight: 4 }}>Pending Approval queue</b>. Manager approval required.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="ff">
            <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>AMOUNT (₹) *</label>
            <input className="finp" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>
          <div className="ff">
            <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>PAYMENT MODE *</label>
            <select className="finp" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
              <option value="">— Select —</option>
              {['NEFT', 'IMPS', 'UPI', 'Cash', 'Cheque', 'Payment Recieved'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="ff">
            <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>PAYMENT DATE *</label>
            <input className="finp" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="ff">
            <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>REFERENCE NO. *</label>
            <input className="finp" value={form.ref} onChange={e => handleRefChange(e.target.value)} placeholder="UTR / Ref number" />
          </div>
          <div className="ff">
            <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>UPDATE STATUS *</label>
            <select
              className="finp"
              style={{ height: '36px', borderRadius: 10, border: '1px solid var(--pur)', background: 'var(--purbg)', color: 'var(--pur)', fontWeight: 700 }}
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <option value="">— Select Status —</option>
              {['Rollback', 'Rollforward', 'Normilization', 'STAB'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upgrade Section - Only show if eligible */}
        {(lead.eligible_upgrade === 'Y' || lead.eligible_for_update === 'Y') && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase' }}>Upgrade Status</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(46,204,138,0.1)', color: 'var(--grn)', padding: '2px 8px', borderRadius: 12, fontSize: 10, border: '1px solid rgba(46,204,138,0.3)', fontWeight: 600 }}>
                <span style={{ fontSize: 11 }}>✓</span> Eligible for Upgrade
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="ff">
                <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>UPGRADE FLAG *</label>
                <select
                  className="finp"
                  value={form.upgradeFlag}
                  onChange={e => setForm({ ...form, upgradeFlag: e.target.value, upgradeType: '', upgradeReason: '' })}
                >
                  <option value="">— Select —</option>
                  <option value="Upgraded">Upgraded</option>
                  <option value="Pending For Upgrade">Pending For Upgrade</option>
                </select>
              </div>

              {form.upgradeFlag === 'Upgraded' && (
                <div className="ff">
                  <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>UPGRADE TYPE *</label>
                  <select className="finp" value={form.upgradeType} onChange={e => setForm({ ...form, upgradeType: e.target.value })}>
                    <option value="">— Select —</option>
                    <option value="System">System</option>
                    <option value="Payment Received">Payment Received</option>
                    <option value="Money Collection">Money Collection</option>
                    <option value="Reversal">Reversal</option>
                  </select>
                </div>
              )}

              {form.upgradeFlag === 'Pending For Upgrade' && (
                <div className="ff">
                  <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>REASON *</label>
                  <select className="finp" value={form.upgradeReason} onChange={e => setForm({ ...form, upgradeReason: e.target.value })}>
                    <option value="">— Select Reason —</option>
                    <option value="Multi Card Payment Due">Multi Card Payment Due</option>
                    <option value="ONE Card Write Off">ONE Card Write Off</option>
                    <option value="Multi Card Write Off">Multi Card Write Off</option>
                    <option value="Card Settlement">Card Settlement</option>
                    <option value="Card Settlement (J5/J6)">Card Settlement (J5/J6)</option>
                    <option value="Intrest Payment Due">Intrest Payment Due</option>
                    <option value="Customer Refused to Pay">Customer Refused to Pay</option>
                    <option value="Customer Not Contactable">Customer Not Contactable</option>
                    <option value="Partial Payment">Partial Payment</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ff" style={{ marginBottom: 15 }}>
          <label style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--txt3)' }}>REMARKS / NOTES *</label>
          <textarea className="finp" rows={2} style={{ resize: 'vertical', minHeight: '60px' }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Payment notes..." />
        </div>
      </div>

      {/* ── Duplicate Warning Banner ───────────────────────────── */}
      {dupWarning && (
        <div style={{
          marginTop: 10,
          marginBottom: 10,
          padding: '12px 14px',
          borderRadius: 8,
          border: dupWarning.type === 'hard' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,166,35,0.4)',
          background: dupWarning.type === 'hard' ? 'rgba(239,68,68,0.08)' : 'rgba(245,166,35,0.08)',
          color: dupWarning.type === 'hard' ? '#ef4444' : 'var(--amb)',
          fontSize: 12,
          lineHeight: 1.5
        }}>
          <div style={{ fontWeight: 700, marginBottom: dupWarning.type === 'soft' ? 8 : 0 }}>
            {dupWarning.message}
          </div>
          {dupWarning.type === 'soft' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn"
                style={{ flex: 1, padding: '7px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)', color: 'var(--amb)', fontSize: 11, fontWeight: 700 }}
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? 'Processing...' : '⚠️ Yes, Submit Anyway'}
              </button>
              <button
                className="btn"
                style={{ flex: 1, padding: '7px', background: 'var(--bg3)', border: '1px solid var(--bdr)', color: 'var(--txt2)', fontSize: 11 }}
                onClick={() => { setDupWarning(null); setConfirmDuplicate(false); }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Submit Button ── */}
      {(() => {
        const isUpgradeRequired = lead.eligible_upgrade === 'Y' || lead.eligible_for_update === 'Y';
        const isUpgradeValid = !isUpgradeRequired || (
          form.upgradeFlag && (
            (form.upgradeFlag === 'Upgraded' && form.upgradeType) ||
            (form.upgradeFlag === 'Pending For Upgrade' && form.upgradeReason) ||
            (form.upgradeFlag && form.upgradeFlag !== 'Upgraded' && form.upgradeFlag !== 'Pending For Upgrade')
          )
        );

        const isFormValid = !!(form.amount && form.date && form.mode && form.ref && form.status && form.remarks && isUpgradeValid);
        const isHardBlocked = dupWarning?.type === 'hard';
        return (
          !dupWarning?.type || dupWarning.type === 'hard' ? (
            <button
              className="btn pr"
              style={{
                width: '100%',
                padding: '12px',
                marginTop: 10,
                background: (!isFormValid || isHardBlocked) ? 'var(--bg3)' : 'var(--acc2)',
                color: (!isFormValid || isHardBlocked) ? 'var(--txt3)' : '#fff',
                opacity: (!isFormValid || isHardBlocked) ? 0.6 : 1,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: (!isFormValid || isHardBlocked) ? 'not-allowed' : 'pointer'
              }}
              onClick={() => handleSubmit(false)}
              disabled={loading || !isFormValid || isHardBlocked}
            >
              {loading ? 'Processing...' : isHardBlocked ? '🚫 Blocked — Duplicate Reference' : <><span style={{ fontSize: 16 }}>💳</span> Submit for Approval</>}
            </button>
          ) : null
        );
      })()}
    </div>
  );
};

const RecordFormModal = ({ mode, record, onClose, onSave }: { mode: 'add' | 'edit', record?: any, onClose: () => void, onSave: () => void }) => {
  const [formData, setFormData] = useState({
    account_no: record?.account_no || '',
    employee_code: record?.employee_code || '',
    name: record?.name || record?.employee_name || '',
    client: record?.client || '',
    product: record?.product || '',
    bucket: record?.bucket || '',
    location: record?.location || '',
    outstanding: record?.outstanding || record?.money_collected || '',
    payment_mode: record?.payment_mode || '',
    tl_name: record?.tl_name || '',
    agent: record?.agent || record?.am || '',
    aph: record?.aph || '',
    ph: record?.ph || '',
    phone_no: record?.phone_no || ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useApp();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = mode === 'add' ? '/api/leads' : `/api/leads/${record.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        toast(`Record ${mode === 'add' ? 'added' : 'updated'} successfully`);
        onSave();
        onClose();
      } else {
        toast(data.error || 'Operation failed');
      }
    } catch (err) {
      toast('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg2, #ffffff)', width: '600px', maxWidth: '90%', maxHeight: '90vh', borderRadius: 12, display: 'flex', flexDirection: 'column', border: '1px solid var(--bdr)' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16, color: 'var(--txt)' }}>{mode === 'add' ? 'Add New Record' : 'Edit Record'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--txt)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: 16, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="ff"><label>Account Number *</label><input required className="finp" name="account_no" value={formData.account_no} onChange={handleChange} /></div>
          <div className="ff"><label>Customer Name *</label><input required className="finp" name="name" value={formData.name} onChange={handleChange} /></div>
          <div className="ff"><label>Money_Collected *</label><input required type="number" className="finp" name="outstanding" value={formData.outstanding} onChange={handleChange} /></div>
          <div className="ff"><label>Product Type</label><input className="finp" name="product" value={formData.product} onChange={handleChange} /></div>
          <div className="ff"><label>Emp Code</label><input className="finp" name="employee_code" value={formData.employee_code} onChange={handleChange} /></div>
          <div className="ff"><label>Client</label><input className="finp" name="client" value={formData.client} onChange={handleChange} /></div>
          <div className="ff"><label>Bucket</label><input className="finp" name="bucket" value={formData.bucket} onChange={handleChange} /></div>
          <div className="ff"><label>Location</label><input className="finp" name="location" value={formData.location} onChange={handleChange} /></div>
          <div className="ff"><label>Payment Mode</label><input className="finp" name="payment_mode" value={formData.payment_mode} onChange={handleChange} /></div>
          <div className="ff"><label>TL Name</label><input className="finp" name="tl_name" value={formData.tl_name} onChange={handleChange} /></div>
          <div className="ff"><label>Agent Name</label><input className="finp" name="agent" value={formData.agent} onChange={handleChange} /></div>
          <div className="ff"><label>APH</label><input className="finp" name="aph" value={formData.aph} onChange={handleChange} /></div>
          <div className="ff"><label>PH</label><input className="finp" name="ph" value={formData.ph} onChange={handleChange} /></div>
          <div className="ff"><label>Phone No</label><input className="finp" name="phone_no" value={formData.phone_no} onChange={handleChange} /></div>
          
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn pr" disabled={loading}>{loading ? 'Saving...' : 'Save Record'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Leads = ({ duplicateOnly }: { duplicateOnly?: boolean }) => {
  const { openModal, user } = useApp();
  const [leads, setLeads] = useState<any[]>([]);
  const [leadColumns, setLeadColumns] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [filterTab, setFilterTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [portfolioOptions, setPortfolioOptions] = useState<any[]>([]);
  const [portfolioFilter, setPortfolioFilter] = useState('');
  const [dpdMin, setDpdMin] = useState('');
  const [dpdMax, setDpdMax] = useState('');
  const [outMin, setOutMin] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterUploadDate, setFilterUploadDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [filters, setFilters] = useState<any>({
    employee_code: [],
    product: [],
    bucket: [],
    location: [],
    aph: [],
    ph: [],
    client: [],
    tl_name: [],
    employee_name: []
  });
  const [isTableMaximized, setIsTableMaximized] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [leadPaySummary, setLeadPaySummary] = useState<any>(null);
  const [latestSettlement, setLatestSettlement] = useState<any>(null);
  const [openAltIdx, setOpenAltIdx] = useState<number | null>(null);
  const [showRecordModal, setShowRecordModal] = useState<'add' | 'edit' | null>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Record deleted successfully');
        fetchLeads();
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch (e) {
      alert('Error deleting record');
    }
  };

  const handleTransferRecord = async (id: string) => {
    if (!confirm('Are you sure you want to transfer this record to the main leads table? This will mark it as a valid lead.')) return;
    try {
      const res = await fetch(`/api/leads/${id}/transfer`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Record transferred to leads successfully');
        fetchLeads();
      } else {
        alert(data.error || 'Failed to transfer record');
      }
    } catch (e) {
      alert('Error transferring record');
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (!selectedLead?.id) {
      setLeadPaySummary(null);
      setLatestSettlement(null);
      return;
    }

    // Fetch payment summary
    fetch(`/api/leads/${selectedLead.id}/payments`)
      .then(r => r.json())
      .then(d => setLeadPaySummary(d?.summary || null))
      .catch(() => setLeadPaySummary(null));

    // Fetch latest settlement status
    fetch(`/api/settlements?customerId=${selectedLead.id}&status=all&limit=1`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setLatestSettlement(list.length > 0 ? list[0] : null);
      })
      .catch(() => setLatestSettlement(null));
  }, [selectedLead?.id]);

  useEffect(() => {
    setPage(1);
  }, [search, filterTab, statusFilter, sortBy, portfolioFilter, dpdMin, dpdMax, outMin, filterMonth, filterYear, filterUploadDate, JSON.stringify(filters)]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchLeads();
    }, 2000);
    return () => clearTimeout(timer);
  }, [search, filterTab, statusFilter, sortBy, portfolioFilter, dpdMin, dpdMax, outMin, filterMonth, filterYear, filterUploadDate, page, limit, user?.id, JSON.stringify(filters)]);

  const fetchMetadata = async () => {
    try {
      const res = await fetch(`/api/metadata?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.leadColumns) setLeadColumns(data.leadColumns);
      if (data.lists?.leadStatuses) setStatusOptions(data.lists.leadStatuses);
      if (data.portfolios) setPortfolioOptions(data.portfolios);
    } catch (e) { console.error(e); }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ q: search, searchType: filterTab, userId: user?.id || '' });
      if (statusFilter) query.append('status', statusFilter);
      if (sortBy) query.append('sortBy', sortBy);
      if (portfolioFilter) query.append('portfolio', portfolioFilter);
      if (dpdMin) query.append('dpdMin', dpdMin);
      if (dpdMax) query.append('dpdMax', dpdMax);
      if (outMin) query.append('outMin', outMin);
      if (filterMonth) query.append('month', filterMonth);
      if (filterYear) query.append('year', filterYear);
      if (filterUploadDate) query.append('uploadDate', filterUploadDate);
      Object.entries(filters).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(val => query.append(k, val));
        } else if (v) {
          query.append(k, v as string);
        }
      });
      query.append('paginate', 'true');
      query.append('page', page.toString());
      query.append('limit', limit.toString());
      query.append('t', Date.now().toString());
      if (duplicateOnly) query.append('duplicateOnly', 'true');

      const queryString = query.toString();

      // Fetch dynamic filters based on current selections
      fetch(`/api/leads/filters?${queryString}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setFilterOptions(data.filters);
          }
        })
        .catch(e => console.error('Error fetching filters:', e));

      const res = await fetch(`/api/leads?${queryString}`, { cache: 'no-store' });
      const data = await res.json();

      let leadsData = [];
      if (data.leads && Array.isArray(data.leads)) {
        leadsData = data.leads;
        setTotalCount(data.total || 0);
      } else if (Array.isArray(data)) {
        leadsData = data;
        setTotalCount(data.length);
      }

      setLeads(leadsData);
      if (leadsData.length > 0) {
        // If current selection is not in the new data, pick the first one
        if (!selectedLead || !leadsData.find((l: any) => l.id === selectedLead.id)) {
          setSelectedLead(leadsData[0]);
        }
      } else {
        setSelectedLead(null);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
      setSelectedLead(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({ q: search, searchType: filterTab, userId: user?.id || '' });
      if (statusFilter) query.append('status', statusFilter);
      if (sortBy) query.append('sortBy', sortBy);
      if (portfolioFilter) query.append('portfolio', portfolioFilter);
      if (dpdMin) query.append('dpdMin', dpdMin);
      if (dpdMax) query.append('dpdMax', dpdMax);
      if (outMin) query.append('outMin', outMin);
      if (filterMonth) query.append('month', filterMonth);
      if (filterYear) query.append('year', filterYear);
      Object.entries(filters).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(val => query.append(k, val));
        } else if (v) {
          query.append(k, v as string);
        }
      });
      query.append('export', 'true');
      query.append('t', Date.now().toString());
      if (duplicateOnly) query.append('duplicateOnly', 'true');

      const res = await fetch(`/api/leads?${query.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      
      const records = Array.isArray(data.leads) ? data.leads : (Array.isArray(data) ? data : []);
      
      if (records.length === 0) {
        alert("No records to export");
        return;
      }

      const formattedRecords = records.map((r: any, index: number) => {
        const { id, upload_at, created_at, outstanding, ...rest } = r;
        return { 'S.No.': index + 1, ...rest, 'Money_Collected': outstanding };
      });

      const ws = XLSX.utils.json_to_sheet(formattedRecords);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Filtered_Records");
      XLSX.writeFile(wb, "Current_Excel.xlsx");
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  // Fixed column order & label overrides (independent of DB order)
  const COLUMN_ORDER: Record<string, { order: number; label: string }> = {
    account_no: { order: 1, label: 'Account Number' },
    name: { order: 2, label: 'Customer Name' },
    mobile: { order: 3, label: 'Mobile Number' },
    address: { order: 4, label: 'Address' },
    city: { order: 5, label: 'City' },
    state: { order: 6, label: 'State' },
    email: { order: 7, label: 'Email' },
    bank: { order: 8, label: 'Bank / Lender' },
    portfolio: { order: 9, label: 'Portfolio' },
    dpd: { order: 10, label: 'DPD' },
    bkt_2: { order: 11, label: 'Bucket' },
    min_amt_due: { order: 12, label: 'Min Amount Due' },
    principle_outstanding: { order: 13, label: 'Principle Outstanding' },
    outstanding: { order: 14, label: 'Money_Collected' },
    product: { order: 15, label: 'Product Type' },
    'credit card number': { order: 16, label: 'Credit Card Number' },
    credit_card_number: { order: 16, label: 'Credit Card Number' },
    pan: { order: 17, label: 'PAN Number' },
    createdat: { order: 18, label: 'Allocation Date' },
    assignedagent: { order: 19, label: 'Assigned Agent' },
  };

  const applyOrder = (cols: any[]) =>
    cols
      .map(c => {
        const k = c.key?.toLowerCase();
        const override = COLUMN_ORDER[k];
        return override ? { ...c, label: override.label, _order: override.order } : { ...c, _order: 999 };
      })
      .sort((a, b) => a._order - b._order);

  const excluded = (c: any) => {
    const k = c.key?.toLowerCase();
    return k === 'eligible_for_update' || k === 'eligible_upgrade' || k === 'alt_mobile' || k === 'alt mobile' || k === 'alt_mobile_2' || k === 'alt_mobile_3' || k === 'alt_mobile_4';
  };

  const tableCols = applyOrder(leadColumns.filter(c => c.visible !== false && !excluded(c)));
  const profileCols = applyOrder(leadColumns.filter(c => c.showInProfile !== false && !excluded(c)));

  const RaiseSettlementModal = ({ lead, onDone }: { lead: any, onDone: () => void }) => {
    const { toast, closeModal, user } = useApp();
    const [reason, setReason] = useState('');
    const [justification, setJustification] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const reasons = [
      'Accident',
      'dispute',
      'medical issue',
      'job loss',
      'business Loss',
      'depht in family',
      'customer dead'
    ];

    const handleSubmit = async () => {
      if (!reason) { toast('Please select a reason for settlement'); return; }
      if (!amount || Number(amount) <= 0) { toast('Please provide a valid settlement amount'); return; }
      if (!justification.trim()) { toast('Please provide justification'); return; }
      setLoading(true);
      try {
        const res = await fetch('/api/settlements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: lead.id,
            agentId: user?.id,
            reason,
            amount: Number(amount),
            justification
          })
        });
        if (res.ok) {
          toast('Settlement Request Raised ✓');
          closeModal();
          // Trigger a refresh of the dashboard status specifically
          if (selectedLead?.id) {
            fetch(`/api/settlements?customerId=${selectedLead.id}&status=all&limit=1`)
              .then(r => r.json())
              .then(d => {
                const list = Array.isArray(d) ? d : (d?.data || []);
                setLatestSettlement(list.length > 0 ? list[0] : null);
              });
          }
          onDone();
        } else {
          toast((await res.json()).message || 'Failed to raise request');
        }
      } catch (e) {
        toast('Error raising request');
      } finally {
        setLoading(false);
      }
    };

    const isFormValid = !!(reason && amount && Number(amount) > 0 && justification.trim());

    return (
      <div style={{ padding: '20px' }}>
        <div className="ff">
          <label>Reason for Settlement *</label>
          <select className="finp" style={{ borderRadius: 4 }} value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">— Select Reason —</option>
            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="ff">
          <label>Settlement Amount (₹) *</label>
          <input type="number" className="finp" style={{ borderRadius: 4 }} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 50000" />
        </div>

        <div className="ff">
          <label>Agent Justification *</label>
          <textarea className="finp" rows={4} style={{ borderRadius: 4, resize: 'vertical' }} value={justification} onChange={e => setJustification(e.target.value)} placeholder="Provide detailed justification for this settlement request..." />
        </div>

        <button 
          className="btn pr" 
          style={{ 
            width: '100%', 
            padding: '12px', 
            fontSize: 13, 
            borderRadius: 4,
            background: isFormValid ? 'var(--acc)' : 'var(--bg3)',
            color: isFormValid ? '#fff' : 'var(--txt3)',
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            opacity: isFormValid ? 1 : 0.7
          }} 
          onClick={handleSubmit} 
          disabled={loading || !isFormValid}
        >
          {loading ? 'Raising...' : 'Raise Request for Settlement'}
        </button>
      </div>
    );
  };

  return (
    <>
      {showRecordModal && (
        <RecordFormModal 
          mode={showRecordModal} 
          record={editingRecord} 
          onClose={() => { setShowRecordModal(null); setEditingRecord(null); }} 
          onSave={fetchLeads} 
        />
      )}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .num-dropdown { position: relative; }
        .num-dropdown .num-dropdown-list { 
          display: none; 
          position: absolute; 
          top: calc(100% + 4px); 
          left: 0; 
          z-index: 1000; 
          background: var(--bg); 
          border: 1px solid var(--bdr); 
          border-radius: 10px; 
          box-shadow: 0 12px 30px rgba(0,0,0,0.25); 
          min-width: 100%; 
          width: max-content;
          padding: 8px 0;
          pointer-events: auto;
          animation: slideDown 0.2s ease-out;
        }
        .num-dropdown .num-dropdown-list.show {
          display: block !important;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Main Layout */
        .leads-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
          background-color: var(--color-background);
        }

        /* Customer Dash Detail Panel */
        .cust-dash {
          display: flex;
          flex-direction: column;
          padding: 16px;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-background);
          width: 100%;
          box-sizing: border-box;
        }

        .cust-dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
        }

        .cust-dash-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        .cust-dash-actions-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .cust-dash-filters {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        /* Responsive Grid of Data fields */
        .cust-dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
          gap: 8px;
          width: 100%;
          margin-top: 12px;
        }

        .cust-dash-grid-item {
          padding: 6px 10px;
          background-color: var(--color-muted);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .item-lbl {
          font-size: 9px;
          font-weight: 700;
          color: var(--color-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .item-val {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-val.amt {
          color: #ef4444;
        }

        /* Search & Navigation Bar */
        .sbar {
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          gap: 12px;
          align-items: center;
          background-color: var(--color-background);
          width: 100%;
          box-sizing: border-box;
          flex-wrap: wrap;
        }

        .sinp-wrap {
          display: flex;
          align-items: center;
          background-color: var(--color-muted);
          border: 1px solid var(--color-border);
          border-radius: 24px;
          padding: 0 12px;
          flex: 1;
          min-width: 260px;
          transition: all 0.2s ease;
        }

        .sinp-wrap:focus-within {
          border-color: var(--color-primary);
          background-color: var(--color-background);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
        }

        .sinp {
          width: 100%;
          background: transparent;
          border: none;
          padding: 8px 0;
          font-size: 13px;
          color: var(--color-foreground);
          outline: none;
        }

        /* Tabs styling */
        .stab {
          cursor: pointer;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-muted-foreground);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 20px;
          transition: all 0.2s ease;
          user-select: none;
        }

        .stab:hover {
          color: var(--color-foreground);
          background-color: var(--color-muted);
        }

        .stab.on {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.2);
        }

        .result-area {
          flex: 1;
          overflow: auto;
          background-color: var(--color-background);
          width: 100%;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .result-area::-webkit-scrollbar {
          display: none;
        }

        .result-area-mobile-scroll {
          width: 100%;
          min-width: 100%;
          overflow-x: auto;
        }

        /* Table design */
        .tbl {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .tbl th {
          background-color: var(--color-muted);
          color: var(--color-muted-foreground);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .tbl td {
          padding: 12px 16px;
          font-size: 13px;
          color: var(--color-foreground);
          border-bottom: 1px solid var(--color-border);
          transition: background-color 0.2s ease;
        }

        .tbl tr:hover {
          background-color: var(--color-muted) !important;
        }

        /* Pagination & footer */
        .pager {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-top: 1px solid var(--color-border);
          background-color: var(--color-background);
          width: 100%;
          box-sizing: border-box;
          flex-wrap: wrap;
          gap: 12px;
        }

        .p-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          min-width: 32px;
          padding: 0 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-muted-foreground);
          background-color: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .p-btn:hover:not(:disabled) {
          color: var(--color-foreground);
          border-color: var(--color-primary);
          background-color: var(--color-muted);
        }

        .p-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .p-btn.cur {
          background-color: #3b82f6;
          color: #ffffff;
          border-color: #3b82f6;
        }

        /* Buttons & Badges general overrides */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid var(--color-border);
          background-color: var(--color-background);
          color: var(--color-foreground);
          box-sizing: border-box;
        }

        .btn:hover:not(:disabled) {
          background-color: var(--color-muted);
          border-color: var(--color-primary);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn.sm {
          padding: 6px 12px;
          font-size: 11px;
          border-radius: 6px;
        }

        .btn.pr {
          background-color: #3b82f6;
          color: #ffffff;
          border-color: #3b82f6;
        }

        .btn.pr:hover:not(:disabled) {
          background-color: #2563eb;
          border-color: #2563eb;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* ─── MEDIA QUERY FOR SMALL SCREENS / MOBILE RESPONSIVENESS ─── */
        @media (max-width: 1024px) {
          .cust-dash-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .cust-dash-actions {
            align-items: stretch;
            width: 100%;
          }

          .cust-dash-actions-btns {
            justify-content: flex-start;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 8px;
            width: 100%;
          }

          .cust-dash-actions-btns .btn {
            width: 100%;
            justify-content: center;
          }

          .cust-dash-filters {
            justify-content: space-between;
            width: 100%;
          }

          .cust-dash-filters select {
            flex: 1;
          }
        }

        @media (max-width: 768px) {
          .cust-dash-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .sbar {
            flex-direction: column;
            align-items: stretch;
            padding: 12px;
            gap: 8px;
          }

          .sinp-wrap {
            max-width: 100%;
            width: 100%;
          }

          .sbar > div:nth-child(2) {
            display: flex;
            justify-content: space-between;
            width: 100%;
            overflow-x: auto;
            padding-bottom: 2px;
          }

          .stab {
            flex: 1;
            text-align: center;
            padding: 6px 8px;
            font-size: 11px;
          }

          .pager {
            flex-direction: column;
            align-items: center;
            gap: 10px;
            text-align: center;
          }

          .pager select {
            width: 100%;
            max-width: 120px;
          }
        }

        @media (max-width: 480px) {
          .cust-dash-grid {
            grid-template-columns: 1fr;
          }

          .cust-dash-actions-btns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div id="pg-leads" className="page on flex-1 flex flex-col overflow-hidden" style={{ height: '100%' }}>
        <div className="leads-wrapper" style={{ flex: 1 }}>
          {/* CUSTOMER DASHBOARD HEADER */}
          {!isTableMaximized && (
            <div id="custDash" className="cust-dash filled" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--bdr)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--txt)', margin: '0 0 4px 0' }}>
                    {duplicateOnly ? 'Duplicate Records' : 'Leads Management'}
                  </h1>
                  <p style={{ fontSize: 12, color: 'var(--txt3)', margin: 0 }}>
                    {duplicateOnly ? 'View and manage duplicate file uploads' : 'View, filter, and manage your uploaded leads'}
                  </p>
                </div>
              </div>
              <div className="cust-dash-header" style={{ alignItems: 'flex-start' }}>

                {/* LEFT SIDE: Avatar + Name OR skeleton OR placeholder */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {loading ? (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--faint)', flexShrink: 0 }} className="skel" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="skel" style={{ width: 180, maxWidth: '100%', height: 16, marginBottom: 8 }} />
                        <div className="skel" style={{ width: 260, maxWidth: '100%', height: 11 }} />
                      </div>
                    </div>
                  ) : !selectedLead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--txt3)', height: 48 }}>
                      <div style={{ fontSize: '20px', opacity: 0.5 }}>◉</div>
                      <div>Search and select a customer below to view details</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="av" style={{ flexShrink: 0, width: 48, height: 48, fontSize: 18, background: 'var(--faint)', color: 'var(--acc2)', border: '1px solid var(--bdr)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedLead.name?.split(' ').map((n: any) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedLead.name}</span>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                          <span>
                            {(selectedLead.account_no || '').replace(/LN-|-/g, '')} - {selectedLead.product || 'Personal Loan'} - {(() => {
                              const metaEntries = Object.entries(selectedLead.metadata || {});
                              const cardEntry = metaEntries.find(([k]) => k.toLowerCase().includes('card') && !k.toLowerCase().includes('type'));
                              const cn = cardEntry ? cardEntry[1] : '';
                              return cn ? `XXXX ${String(cn).slice(-4)}` : (selectedLead.bank || '—');
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE: Action Buttons & Filters */}
                <div className="cust-dash-actions">

                  <div className="cust-dash-filters" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="sinp-wrap" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg2)', borderRadius: 20, border: '1px solid var(--bdr)', overflow: 'hidden' }}>
                      <span style={{ padding: '0 10px', color: 'var(--txt3)', fontSize: 13, height: '100%', display: 'flex', alignItems: 'center' }}>⌕</span>
                      <input
                        className="sinp"
                        style={{ background: 'transparent', border: 'none', padding: '6px 10px 6px 0', fontSize: 12, minWidth: 200, outline: 'none' }}
                        placeholder="Search by account, mobile, name, PAN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => { setSearch(''); setFilterTab('all'); }}
                      style={{ padding: '6px 14px', background: 'var(--red)', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* LOWER SIDE: Grid Info Boxes */}
              {loading ? (
                <div className="cust-dash-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="cust-dash-grid-item">
                      <div className="skel" style={{ width: '60%', height: 8, marginBottom: 2 }} />
                      <div className="skel" style={{ width: '80%', height: 11 }} />
                    </div>
                  ))}
                </div>
              ) : selectedLead ? (
                <div className="cust-dash-grid">
                  {(profileCols.length > 0 ? profileCols : [
                    { label: 'ACCOUNT NUMBER', key: 'account_no' },
                    { label: 'MOBILE NUMBER', key: 'mobile' },
                    { label: 'OUTSTANDING', key: 'outstanding', type: 'amount' }
                  ]).map((item: any, i: number) => {
                    const lowerKey = item.key?.toLowerCase();
                    const rawVal = selectedLead[item.key] ?? selectedLead[lowerKey]
                      ?? selectedLead.metadata?.[item.key] ?? selectedLead.metadata?.[lowerKey]
                      ?? selectedLead.metadata?.[item.label] ?? selectedLead.metadata?.[item.label?.toUpperCase()] ?? '—';
                    let val = (rawVal && typeof rawVal === 'object') ? (rawVal.name || rawVal.label || '—') : rawVal;

                    // Masking logic for Credit Cards (Always show last 4 only)
                    const isCardField = item.label?.toLowerCase().includes('card') || lowerKey?.includes('card');
                    if (isCardField && typeof val === 'string' && val.length > 4) {
                      val = 'XXXX ' + val.slice(-4);
                    }

                    const isMobile = lowerKey === 'mobile' || lowerKey === 'mobile_number' || lowerKey === 'mobile_no';
                    const allAlts = Array.from(new Set([
                      selectedLead.alt_mobile,
                      selectedLead.alt_mobile_2,
                      selectedLead.alt_mobile_3,
                      selectedLead.alt_mobile_4,
                      selectedLead.metadata?.alt_mobile,
                      selectedLead.metadata?.ALT_MOBILE,
                      selectedLead.metadata?.['ALT MOBILE'],
                      selectedLead.metadata?.alt_mobile_2,
                      selectedLead.metadata?.alt_mobile_3,
                      selectedLead.metadata?.alt_mobile_4
                    ])).filter(n => n && n !== '—' && n !== val);

                    return (
                      <div key={i} className={`cust-dash-grid-item ${isMobile && allAlts.length > 0 ? 'num-dropdown' : ''}`}
                        style={{ position: 'relative', overflow: 'visible' }}
                      >
                        <div className="item-lbl" title={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{item.label}</span>
                          {isMobile && allAlts.length > 0 && (
                            <div
                              style={{ padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenAltIdx(openAltIdx === i ? null : i);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, color: 'var(--acc2)', transform: openAltIdx === i ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </div>
                          )}
                          {isMobile && allAlts.length > 0 && (
                            <div className={`num-dropdown-list ${openAltIdx === i ? 'show' : ''}`}>
                              <div style={{ padding: '8px 15px', fontSize: 10, color: 'var(--acc2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--faint)', marginBottom: 5 }}>Contact Numbers</div>
                              <div style={{ padding: '10px 15px', fontSize: 12, color: 'var(--txt)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{val}</span>
                                <span style={{ color: 'var(--grn)', fontSize: 9, background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 4 }}>PRIMARY</span>
                              </div>
                              {allAlts.map((alt, idx) => (
                                <div key={idx} style={{ padding: '10px 15px', fontSize: 12, color: 'var(--txt2)', borderTop: '1px solid var(--faint)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{String(alt)}</span>
                                  <span style={{ color: 'var(--txt3)', fontSize: 9, background: 'var(--faint)', padding: '2px 6px', borderRadius: 4 }}>ALT {idx + 1}</span>
                                </div>
                              ))}
                              <div
                                style={{ padding: '8px 15px', fontSize: 10, textAlign: 'center', color: 'var(--red)', fontWeight: 700, cursor: 'pointer', borderTop: '1px solid var(--faint)', marginTop: 4 }}
                                onClick={() => setOpenAltIdx(null)}
                              >
                                ✕ CLOSE
                              </div>
                            </div>
                          )}
                        </div>
                        <div 
                          className={`item-val ${item.type === 'amount' ? 'amt' : ''}`} 
                          title={String(val)}
                          style={isCardField ? { fontSize: '12px', fontWeight: 'bold', color: 'var(--txt)' } : {}}
                        >
                          {item.type === 'amount' ? `₹${Number(val).toLocaleString('en-IN')}` :
                            lowerKey === 'account_no' ? String(val).replace(/LN-|-/g, '') :
                              (lowerKey === 'createdat' || lowerKey === 'upload_at' || lowerKey === 'upload at' || lowerKey === 'uploadat') ? String(val).split('T')[0] :
                                String(val)}
                        </div>
                      </div>
                    );
                  })}

                </div>
              ) : null}
            </div>
          )}

          {/* SEARCH BAR */}
          <div className="sbar" style={{ padding: '8px 16px', borderBottom: '1px solid var(--bdr)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <SButton size="slim" variant="secondary" onClick={() => setShowFilters(!showFilters)}>⊞ More {showFilters ? '▲' : '▼'}</SButton>
            <span style={{ fontSize: 12, color: 'var(--txt3)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {leads.length} records
              <button
                onClick={() => setIsTableMaximized(!isTableMaximized)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: 4, transition: '0.2s', backgroundColor: 'var(--bg3)' }}
                title={isTableMaximized ? "Restore Layout" : "Maximize Table"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isTableMaximized ? (
                    <>
                      <polyline points="4 14 12 22 20 14"></polyline>
                      <line x1="12" y1="2" x2="12" y2="22"></line>
                    </>
                  ) : (
                    <>
                      <polyline points="4 10 12 2 20 10"></polyline>
                      <line x1="12" y1="2" x2="12" y2="22"></line>
                    </>
                  )}
                </svg>
              </button>
            </span>
          </div>

          {/* FILTER ROW */}
          {showFilters && (
            <div id="fRow" style={{ display: 'flex', padding: '10px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--bdr)', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="finp" type="number" placeholder="DPD Min" style={{ width: '90px', padding: '6px 10px' }} value={dpdMin} onChange={e => setDpdMin(e.target.value)} />
              <input className="finp" type="number" placeholder="DPD Max" style={{ width: '90px', padding: '6px 10px' }} value={dpdMax} onChange={e => setDpdMax(e.target.value)} />
              <input className="finp" type="number" placeholder="₹ Min" style={{ width: '100px', padding: '6px 10px' }} value={outMin} onChange={e => setOutMin(e.target.value)} />
              <select className="finp" style={{ fontSize: 12, padding: '6px 10px', width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="">Sort By</option>
                <option value="high">Highest Amount</option>
                <option value="low">Lowest Amount</option>
              </select>
              <select className="finp" style={{ fontSize: 12, padding: '6px 10px', width: 'auto' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                <option value="">Month</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'short' })}</option>
                ))}
              </select>
              <select className="finp" style={{ fontSize: 12, padding: '6px 10px', width: 'auto' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">Year</option>
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div style={{ position: 'relative' }}>
                <input className="finp" type="date" title="Upload Date" style={{ fontSize: 12, padding: '5px 10px', width: 'auto', background: 'var(--bg2)' }} value={filterUploadDate} onChange={e => { setFilterUploadDate(e.target.value); setFilterMonth(''); setFilterYear(''); }} />
                <span style={{ position: 'absolute', top: -8, left: 6, fontSize: 8, fontWeight: 700, color: 'var(--txt3)', background: 'var(--bg2)', padding: '0 4px', letterSpacing: 0.5, textTransform: 'uppercase' }}>Upload At</span>
              </div>
              {[
                { key: 'employeeCode', filterKey: 'employee_code', label: 'Emp Code', isMulti: true },
                { key: 'product', filterKey: 'product', label: 'Product Type', isMulti: true },
                { key: 'bucket', filterKey: 'bucket', label: 'Bucket', isMulti: true },
                { key: 'location', filterKey: 'location', label: 'Location', isMulti: true },
                { key: 'aph', filterKey: 'aph', label: 'APH', isMulti: true },
                { key: 'ph', filterKey: 'ph', label: 'PH', isMulti: true },
                { key: 'client', filterKey: 'client', label: 'Client', isMulti: true },
                { key: 'tlName', filterKey: 'tl_name', label: 'TL Name', isMulti: true },
                { key: 'agentName', filterKey: 'employee_name', label: 'Agent Name', isMulti: true }
              ].map(opt => (
                opt.isMulti ? (
                  <MultiSelect
                    key={opt.key}
                    label={opt.label}
                    options={filterOptions[opt.key] || []}
                    selected={Array.isArray(filters[opt.filterKey]) ? filters[opt.filterKey] : (filters[opt.filterKey] ? [filters[opt.filterKey]] : [])}
                    onChange={(newVal) => setFilters({ ...filters, [opt.filterKey]: newVal })}
                  />
                ) : (
                  <select 
                    key={opt.key}
                    className="finp" 
                    style={{ fontSize: 12, padding: '6px 10px', width: 'auto' }} 
                    value={filters[opt.filterKey] || ''} 
                    onChange={e => setFilters({ ...filters, [opt.filterKey]: e.target.value })}
                  >
                    <option value="">{opt.label}</option>
                    {(filterOptions[opt.key] || []).map((val: string) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                )
              ))}
              <SButton size="slim" variant="secondary" onClick={exportToExcel} disabled={exporting}>
                {exporting ? '⏳ Processing...' : '📥 Current Excel'}
              </SButton>
              {user?.role === 'admin' && (
                <SButton size="slim" variant="primary" onClick={() => { setEditingRecord(null); setShowRecordModal('add'); }}>➕ Add Record</SButton>
              )}
              <SButton size="slim" variant="critical" onClick={() => {
                setStatusFilter(''); setSortBy(''); setDpdMin(''); setDpdMax(''); setOutMin(''); setPortfolioFilter(''); setSearch(''); setFilterTab('all'); setFilterMonth(String(new Date().getMonth() + 1)); setFilterYear(String(new Date().getFullYear())); setFilterUploadDate('');
                setFilters({
                  employee_code: [], product: [], bucket: [], location: [], aph: [], ph: [], client: [], tl_name: [], employee_name: []
                });
              }}>Clear Filters</SButton>
            </div>
          )}

          {/* RESULTS AREA */}
          <div className="result-area hide-scrollbar" style={{ flex: 1, overflow: 'auto', background: 'var(--bg2)' }}>
            <div className="result-area-mobile-scroll">
              <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bdr)' }}>
                    {tableCols.length > 0 ? tableCols.map(col => (
                      <th key={col.key} style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, border: 'none', padding: '8px 10px', color: 'var(--txt3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left' }}>
                        {col.label}
                      </th>
                    )) : (
                      <>
                        <th style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, border: 'none', padding: '8px 10px', color: 'var(--txt3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Account Number</th>
                        <th style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, border: 'none', padding: '8px 10px', color: 'var(--txt3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer Name</th>
                        <th style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, border: 'none', padding: '8px 10px', color: 'var(--txt3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Money_Collected</th>
                        <th style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, border: 'none', padding: '8px 10px', color: 'var(--txt3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned To</th>
                      </>
                    )}
                    {user?.role === 'admin' && (
                      <th style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10, border: 'none', padding: '8px 10px', color: 'var(--txt3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--faint)' }}>
                        {Array.from({ length: (tableCols.length || 6) + 1 }).map((_, j) => (
                          <td key={j} style={{ padding: '8px 10px' }}>
                            <div className="skeleton" style={{ width: `${Math.floor(Math.random() * 40) + 40}%`, height: '14px' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : leads.map(lead => (
                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} style={{ borderBottom: '1px solid var(--faint)', cursor: 'pointer', background: selectedLead?.id === lead.id ? 'var(--accbg)' : 'transparent' }}>
                      {tableCols.length > 0 ? tableCols.map(col => {
                        const lowerKey = col.key?.toLowerCase();
                        const rawVal = lead[col.key] ?? lead[lowerKey]
                          ?? lead.metadata?.[col.key] ?? lead.metadata?.[lowerKey]
                          ?? lead.metadata?.[col.label] ?? lead.metadata?.[col.label?.toUpperCase()] ?? '—';
                        const val = (rawVal && typeof rawVal === 'object') ? (rawVal.name || rawVal.label || '—') : rawVal;
                        return (
                          <td key={col.key} style={{ padding: '8px 10px', fontSize: 11, color: col.type === 'amount' ? 'var(--red)' : 'var(--txt2)' }}>
                            {(lowerKey === 'settlement' || lowerKey.includes('settlement')) ? (
                              lead.settlements && lead.settlements.length > 0 ? (
                                <span className="badge" style={{
                                  background: 'transparent',
                                  border: `1px solid ${lead.settlements[0].status === 'Approve' ? 'rgba(34,197,94,0.3)' : lead.settlements[0].status === 'Rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                  color: lead.settlements[0].status === 'Approve' ? 'var(--grn)' : lead.settlements[0].status === 'Rejected' ? 'var(--red)' : 'var(--amb)',
                                  fontSize: 9,
                                  borderRadius: 12
                                }}>
                                  {lead.settlements[0].status}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--txt3)', fontSize: 9, opacity: 0.5 }}>—</span>
                              )
                            ) : col.type === 'amount' ? `₹${Number(val).toLocaleString('en-IN')}` :
                              col.type === 'badge' ? <span className="badge" style={{ background: 'var(--purbg)', color: 'var(--pur)', border: '1px solid var(--purbg)', borderRadius: 12, padding: '2px 8px' }}>{String(val)}</span> :
                                lowerKey === 'account_no' ? String(val).replace(/LN-|-/g, '') :
                                  (lowerKey === 'createdat' || lowerKey === 'upload_at') ? String(val).split('T')[0] :
                                    (lowerKey.includes('card') || col.label?.toLowerCase().includes('card')) && String(val).length > 4 ? 
                                      'XXXX ' + String(val).slice(-4) : 
                                      String(val)}
                          </td>
                        );
                      }) : (
                        <>
                          <td className="mn" style={{ padding: '8px 10px', color: 'var(--txt3)' }}>
                            {String(lead.account_no || '').replace(/LN-|-/g, '')}
                            {lead.is_duplicate && <span style={{ marginLeft: 4, background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, verticalAlign: 'middle' }}>DUP</span>}
                            {lead.fraud_flag && <span style={{ marginLeft: 4, background: '#f59e0b', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, verticalAlign: 'middle' }} title={lead.fraud_flag}>FRAUD</span>}
                          </td>
                          <td className="nm" style={{ padding: '8px 10px', color: 'var(--txt)' }}>{lead.name}</td>
                          <td className="mn" style={{ padding: '8px 10px', color: 'var(--red)', fontWeight: 600 }}>₹{lead.outstanding?.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--txt2)' }}>{lead.agent || lead.assignedAgent?.name || 'Unassigned'}</td>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {duplicateOnly && (
                            <button onClick={(e) => { e.stopPropagation(); handleTransferRecord(lead.id); }} style={{ background: 'var(--grnbg)', border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 6, cursor: 'pointer', color: 'var(--grn)', marginRight: 12, fontSize: 10, padding: '4px 8px', fontWeight: 600 }} title="Transfer to Leads (Approve)">Approve to Leads</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setEditingRecord(lead); setShowRecordModal('edit'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--acc2)', marginRight: 12, fontSize: 16 }} title="Edit">✎</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(lead.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }} title="Delete">🗑</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGER */}
          <div className="pager">
            <span style={{ fontSize: 11, color: 'var(--txt3)', flex: 1 }}>Page {page} of {Math.max(1, Math.ceil(totalCount / limit))} • {totalCount} records</span>
            <div style={{ display: 'flex', gap: 3 }}>
              <button className="p-btn" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
              <button className="p-btn" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>‹</button>
              <button className="p-btn cur">{page}</button>
              <button className="p-btn" disabled={page >= Math.ceil(totalCount / limit)} onClick={() => setPage(page + 1)}>›</button>
              <button className="p-btn" disabled={page >= Math.ceil(totalCount / limit)} onClick={() => setPage(Math.ceil(totalCount / limit))}>»</button>
            </div>
            <select className="finp" style={{ fontSize: 10, padding: '3px 6px', width: 'auto', marginLeft: 10 }} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
              <option value="25">25/page</option>
              <option value="50">50/page</option>
              <option value="100">100/page</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
};

export default Leads;

"use client";
import React, { useState, useEffect } from 'react';

export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    Pending:  { color: '#f59e0b', bg: '#f59e0b15' },
    Approved: { color: '#10b981', bg: '#10b98115' },
    Rejected: { color: '#ef4444', bg: '#ef444415' },
  };

  const fetchRequests = async (dept?: string) => {
    try {
      const url = dept ? `/api/production/material-requests?department=${dept}` : '/api/production/material-requests';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) {
        setUser(d.user);
        // If user is Admin, fetch all. If production user, fetch only theirs.
        if (d.user.role === 'admin' || d.user.department_name === 'Store') {
          fetchRequests();
        } else {
          fetchRequests(d.user.department_name);
        }
      }
    });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    if (!confirm(`Are you sure you want to mark this request as ${status}?`)) return;
    
    try {
      const res = await fetch(`/api/production/material-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: user?.name || user?.employee_id })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh list
        if (user.role === 'admin' || user.department_name === 'Store') {
          fetchRequests();
        } else {
          fetchRequests(user.department_name);
        }
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (e) {
      alert('Error updating status');
    }
  };

  const filtered = requests.filter(r => filterStatus === 'All' || r.status === filterStatus);

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #f97316' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📥 Internal Material Requests</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.role === 'admin' || user?.department_name === 'Store' 
                ? 'Manage paint and material demands from Production floors'
                : 'Track the status of materials you requested from the Store'}
            </p>
          </div>
          <button onClick={() => fetchRequests(user?.role !== 'admin' && user?.department_name !== 'Store' ? user?.department_name : undefined)} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card hover:bg-muted transition-colors">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
        {/* Filter */}
        <div className="flex gap-2">
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 text-xs rounded-full border font-semibold transition-colors"
              style={filterStatus === s ? { background: STATUS_COLORS[s]?.color || 'var(--color-primary)', color: '#fff', borderColor: STATUS_COLORS[s]?.color || 'var(--color-primary)' } : { borderColor: 'var(--color-border)' }}>
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                {['Date', 'Department', 'Item', 'Qty Requested', 'Reason', 'Requested By', 'Status', (user?.role === 'admin' || user?.department_name === 'Store') ? 'Action' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>Loading requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>No material requests found.</td></tr>
              ) : filtered.map((r, i) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.Pending;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.department}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.item_name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f97316' }}>{parseFloat(r.requested_qty).toFixed(2)} {r.unit_of_measure}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>{r.reason}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{r.requested_by}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}` }}>{r.status}</span>
                      {r.approved_by && <div style={{ fontSize: 9, color: 'var(--color-muted-foreground)', marginTop: 2 }}>by {r.approved_by}</div>}
                    </td>
                    {(user?.role === 'admin' || user?.department_name === 'Store') && (
                      <td style={{ padding: '10px 14px' }}>
                        {r.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateStatus(r.id, 'Approved')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#10b98120', color: '#10b981', border: '1px solid #10b981', cursor: 'pointer', fontWeight: 600 }}>Approve & Issue</button>
                            <button onClick={() => updateStatus(r.id, 'Rejected')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { LineChart, Shield, Calendar, User, Activity, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AuditPage() {
  const date = new Date();
  const [month, setMonth] = useState((date.getMonth() + 1).toString());
  const [year, setYear] = useState(date.getFullYear().toString());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useApp();
  const router = useRouter();

  const months = [
    {v:'1',l:'Jan'},{v:'2',l:'Feb'},{v:'3',l:'Mar'},{v:'4',l:'Apr'},{v:'5',l:'May'},{v:'6',l:'Jun'},
    {v:'7',l:'Jul'},{v:'8',l:'Aug'},{v:'9',l:'Sep'},{v:'10',l:'Oct'},{v:'11',l:'Nov'},{v:'12',l:'Dec'}
  ];
  const years = ['2024','2025','2026','2027'];

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchLogs = () => {
    setLoading(true);
    fetch(`/api/audit?month=${month}&year=${year}&page=${page}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setLogs(d.logs);
          setTotalPages(d.totalPages || 1);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchLogs();
    }
  }, [user, month, year, page]);

  // Reset page to 1 when month or year changes
  useEffect(() => {
    setPage(1);
  }, [month, year]);

  const handleDownloadExcel = () => {
    if (logs.length === 0) {
      alert('No logs to download for this month.');
      return;
    }
    const data = logs.map(log => ({
      ID: log.id,
      Timestamp: new Date(log.created_at).toLocaleString(),
      Action: log.action,
      Entity_Type: log.entity_type,
      Entity_ID: log.entity_id || '',
      Changed_By: log.changed_by,
      Emp_ID: log.details?.action_by_emp_id || log.details?.employee_id || 'N/A',
      Details: JSON.stringify(log.details)
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
    XLSX.writeFile(workbook, `Audit_Logs_${month}_${year}.xlsx`);
  };

  const handleDeleteLogs = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ALL audit logs for ${month}/${year}? This action cannot be undone.`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/audit?month=${month}&year=${year}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Logs deleted successfully!');
        fetchLogs();
      } else {
        alert(data.error || 'Failed to delete logs');
      }
    } catch (e) {
      alert('An error occurred while deleting logs');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <Activity className="w-8 h-8 text-primary mb-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You do not have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  const formatAction = (action: string) => {
    switch(action) {
      case 'CREATE_USER': return <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-bold">CREATED USER</span>;
      case 'DELETE_USER': return <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-bold">DELETED USER</span>;
      case 'UPDATE_PASSWORD': return <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs font-bold">CHANGED PASSWORD</span>;
      case 'UPLOAD_EXCEL': return <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-xs font-bold">UPLOADED BATCH</span>;
      case 'DELETE_EXCEL': return <span className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-xs font-bold">DELETED BATCH</span>;
      default: return <span className="text-muted-foreground bg-muted px-2 py-1 rounded text-xs font-bold">{action}</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10 h-full w-full">
      <div className="w-full mx-auto flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <LineChart className="text-primary" /> System Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">Track all database changes and administrative actions.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select 
              className="px-3 py-2 rounded-lg border border-border bg-card text-foreground font-semibold text-sm cursor-pointer focus:outline-none focus:border-primary/50" 
              value={month} 
              onChange={e => setMonth(e.target.value)}
            >
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select 
              className="px-3 py-2 rounded-lg border border-border bg-card text-foreground font-semibold text-sm cursor-pointer focus:outline-none focus:border-primary/50" 
              value={year} 
              onChange={e => setYear(e.target.value)}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button 
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <Download size={16} /> Excel
            </button>
            <button 
              onClick={handleDeleteLogs}
              disabled={isDeleting || logs.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} /> Delete Logs
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider border-b border-border sticky top-0 z-10 backdrop-blur bg-muted/95">
                <tr>
                  <th className="px-3 py-2 font-semibold">Timestamp</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Entity</th>
                  <th className="px-3 py-2 font-semibold">Changed By</th>
                  <th className="px-3 py-2 font-semibold">Emp ID</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3 py-2"><div className="h-3 bg-muted rounded w-20"></div></td>
                      <td className="px-3 py-2"><div className="h-4 bg-muted rounded w-24"></div></td>
                      <td className="px-3 py-2"><div className="h-3 bg-muted rounded w-16"></div></td>
                      <td className="px-3 py-2"><div className="h-3 bg-muted rounded w-20"></div></td>
                      <td className="px-3 py-2"><div className="h-3 bg-muted rounded w-16"></div></td>
                      <td className="px-3 py-2"><div className="h-3 bg-muted rounded w-40"></div></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No audit logs found for the selected month.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar size={12} />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatAction(log.action)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[10px] text-muted-foreground border border-border px-1 py-0.5 rounded">
                          {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <User size={12} className="text-muted-foreground" />
                          {log.changed_by}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-mono text-[10px] text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {log.details?.action_by_emp_id || log.details?.employee_id || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <pre className="text-[9px] font-mono bg-muted/50 p-1.5 rounded max-w-[200px] sm:max-w-sm overflow-x-auto text-muted-foreground border border-border/50">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border shrink-0">
              <div className="text-xs text-muted-foreground font-medium">
                Showing page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

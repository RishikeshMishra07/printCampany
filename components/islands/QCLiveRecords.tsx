"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@shopify/polaris';
import { Search, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function QCLiveRecords() {
  const [pendingBatches, setPendingBatches] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Inspection
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [passedQty, setPassedQty] = useState('');
  const [reworkQty, setReworkQty] = useState('');
  const [defectReason, setDefectReason] = useState('None');

  const defectOptions = ['None', 'Orange Peel', 'Dust Inclusions', 'Sagging/Runs', 'Color Mismatch', 'Fisheyes'];

  const fetchData = async () => {
    const res = await fetch('/api/qc/live-records');
    const data = await res.json();
    if (data.success) {
      setPendingBatches(data.pendingBatches);
      setInspections(data.inspections);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    await fetch('/api/qc/live-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: selectedBatch.batch_id,
        inspected_qty: selectedBatch.completed_qty,
        passed_qty: parseInt(passedQty),
        rework_qty: parseInt(reworkQty),
        defect_reason: defectReason
      })
    });
    
    setSelectedBatch(null);
    setPassedQty('');
    setReworkQty('');
    fetchData();
  };

  if (loading) return <div className="p-6">Loading Inspection Data...</div>;

  return (
    <div className="p-6 space-y-8 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Control: Live Inspection Queue</h1>
        <p className="text-muted-foreground mt-1">Inspect painted automotive parts and log rework loops.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inspection Queue */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Search className="w-5 h-5 text-indigo-500"/> Pending Inspections</h2>
          {pendingBatches.length === 0 ? (
            <div className="p-6 bg-muted/20 border border-border rounded-xl text-center text-muted-foreground text-sm">
              No batches are currently waiting for inspection.
            </div>
          ) : (
            pendingBatches.map(batch => (
              <div key={batch.id} className="bg-card border border-indigo-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{batch.part_name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">Batch: {batch.batch_id}</p>
                  </div>
                  <Badge tone="attention">Requires QC</Badge>
                </div>
                <div className="flex gap-4 mb-4 text-sm font-medium">
                  <div className="px-3 py-1 bg-muted rounded-md">Total Baked: {batch.completed_qty}</div>
                </div>
                {selectedBatch?.batch_id === batch.batch_id ? (
                  <form onSubmit={handleSubmitInspection} className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-semibold mb-1 block">Passed Qty</label>
                        <input required type="number" value={passedQty} onChange={e=>setPassedQty(e.target.value)} className="w-full p-2 text-sm border rounded-md" placeholder="e.g. 480" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold mb-1 block text-red-500">Failed/Rework Qty</label>
                        <input required type="number" value={reworkQty} onChange={e=>setReworkQty(e.target.value)} className="w-full p-2 text-sm border rounded-md" placeholder="e.g. 20" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block">Defect Reason</label>
                      <select value={defectReason} onChange={e=>setDefectReason(e.target.value)} className="w-full p-2 text-sm border rounded-md">
                        {defectOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button type="button" onClick={()=>setSelectedBatch(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md">Cancel</button>
                      <button type="submit" className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Submit Report</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={()=>setSelectedBatch(batch)} className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold text-sm rounded-lg transition-colors">
                    Start Inspection
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent Inspection Log */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> Inspection Log</h2>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-3 font-semibold">Batch</th>
                  <th className="p-3 font-semibold">Passed</th>
                  <th className="p-3 font-semibold">Rework</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No recent inspections</td></tr>
                ) : (
                  inspections.map(ins => (
                    <tr key={ins.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="font-medium">{ins.part_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{ins.batch_id}</div>
                      </td>
                      <td className="p-3 font-bold text-green-600">{ins.passed_qty}</td>
                      <td className="p-3 font-bold text-red-500">{ins.rework_qty}</td>
                      <td className="p-3">
                        {ins.rework_qty > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
                            <ShieldAlert className="w-3 h-3"/> Sent to Rework
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3"/> Cleared
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@shopify/polaris';

export default function PaintLiveRecords() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newBatchId, setNewBatchId] = useState('');
  const [partName, setPartName] = useState('');
  const [totalQty, setTotalQty] = useState('');

  const fetchBatches = async () => {
    const res = await fetch('/api/printing/live-records');
    const data = await res.json();
    if (data.success) {
      setBatches(data.batches);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/printing/live-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: newBatchId, part_name: partName, total_qty: parseInt(totalQty) })
    });
    setNewBatchId(''); setPartName(''); setTotalQty('');
    fetchBatches();
  };

  const handleUpdateBatch = async (batch_id: string, currentTotal: number, currentCompleted: number, currentInProgress: number, currentStage: string) => {
    // For demo purposes, we automatically advance the process by moving 50 items from Rest -> In Progress -> Completed
    let newCompleted = currentCompleted;
    let newInProgress = currentInProgress;
    let newStage = currentStage;
    
    const remaining = currentTotal - currentCompleted - currentInProgress;
    
    if (remaining > 0) {
      // Move 50 from Remaining to In Progress
      const moving = Math.min(50, remaining);
      newInProgress += moving;
      newStage = 'In Spray Booth';
    } else if (newInProgress > 0) {
      // Move 50 from In Progress to Completed
      const moving = Math.min(50, newInProgress);
      newInProgress -= moving;
      newCompleted += moving;
      if (newCompleted === currentTotal) newStage = 'Ready for QC';
      else newStage = 'Baking/Curing';
    }

    await fetch('/api/printing/live-records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id, completed_qty: newCompleted, in_progress_qty: newInProgress, stage: newStage })
    });
    fetchBatches();
  };

  if (loading) return <div className="p-6">Loading Live Records...</div>;

  return (
    <div className="p-6 space-y-8 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paint Shop: Live Records</h1>
        <p className="text-muted-foreground mt-1">Track the exact progress of each automotive part batch (e.g. 500 Bumpers).</p>
      </div>

      {/* Add New Batch Form */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold mb-4">Ingest New Raw Material Batch</h2>
        <form onSubmit={handleAddBatch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Batch ID</label>
            <input required value={newBatchId} onChange={e => setNewBatchId(e.target.value)} placeholder="e.g. BATCH-101" className="w-full p-2 border border-border rounded-md bg-background text-sm" />
          </div>
          <div className="flex-2">
            <label className="block text-xs font-medium mb-1">Part Name</label>
            <input required value={partName} onChange={e => setPartName(e.target.value)} placeholder="e.g. Swift Front Bumper" className="w-full p-2 border border-border rounded-md bg-background text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Total Quantity</label>
            <input required type="number" value={totalQty} onChange={e => setTotalQty(e.target.value)} placeholder="e.g. 500" className="w-full p-2 border border-border rounded-md bg-background text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 text-sm h-[38px]">
            Add Batch
          </button>
        </form>
      </div>

      {/* Active Batches Tracker */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Active Batch Tracker</h2>
        {batches.length === 0 ? (
          <div className="text-center p-8 bg-muted/20 border border-border rounded-xl">No active batches. Add one above!</div>
        ) : (
          batches.map((batch) => {
            const remaining = batch.total_qty - batch.completed_qty - batch.in_progress_qty;
            const completedPct = (batch.completed_qty / batch.total_qty) * 100;
            const inProgressPct = (batch.in_progress_qty / batch.total_qty) * 100;
            const remainingPct = (remaining / batch.total_qty) * 100;

            return (
              <div key={batch.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{batch.part_name} <span className="text-muted-foreground font-mono text-sm ml-2">#{batch.batch_id}</span></h3>
                    <p className="text-sm text-muted-foreground">Total: {batch.total_qty} units</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge tone={batch.stage === 'Ready for QC' ? 'success' : 'info'}>{batch.stage}</Badge>
                    <button 
                      onClick={() => handleUpdateBatch(batch.batch_id, batch.total_qty, batch.completed_qty, batch.in_progress_qty, batch.stage)}
                      disabled={batch.stage === 'Ready for QC'}
                      className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md hover:bg-secondary/80 disabled:opacity-50"
                    >
                      Advance Process (+50 items)
                    </button>
                  </div>
                </div>

                {/* The Progress Bar Visualization */}
                <div className="w-full h-6 rounded-full overflow-hidden flex border border-border/50">
                  {completedPct > 0 && <div style={{ width: `${completedPct}%` }} className="bg-green-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500">{completedPct > 5 ? `${batch.completed_qty}` : ''}</div>}
                  {inProgressPct > 0 && <div style={{ width: `${inProgressPct}%` }} className="bg-yellow-500 h-full flex items-center justify-center text-[10px] text-yellow-900 font-bold transition-all duration-500">{inProgressPct > 5 ? `${batch.in_progress_qty}` : ''}</div>}
                  {remainingPct > 0 && <div style={{ width: `${remainingPct}%` }} className="bg-gray-200 dark:bg-zinc-800 h-full flex items-center justify-center text-[10px] text-muted-foreground font-bold transition-all duration-500">{remainingPct > 5 ? `${remaining}` : ''}</div>}
                </div>
                
                {/* Legend */}
                <div className="flex gap-6 mt-3 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500"></div> Khatam (Completed): {batch.completed_qty}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500"></div> Process (In Spray): {batch.in_progress_qty}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-200 dark:bg-zinc-800 border border-border"></div> Rest (Remaining): {remaining}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

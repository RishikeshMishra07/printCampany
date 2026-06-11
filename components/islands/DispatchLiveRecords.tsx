"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@shopify/polaris';
import { Package, Truck, ArrowRight } from 'lucide-react';

export default function DispatchLiveRecords() {
  const [readyToPack, setReadyToPack] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [rackId, setRackId] = useState('');
  const [clientName, setClientName] = useState('Maruti Suzuki');

  const clients = ['Maruti Suzuki', 'Hyundai Motors', 'Tata Motors', 'Mahindra'];

  const fetchData = async () => {
    const res = await fetch('/api/dispatch/live-records');
    const data = await res.json();
    if (data.success) {
      setReadyToPack(data.readyToPack);
      setShipments(data.shipments);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    await fetch('/api/dispatch/live-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: selectedBatch.batch_id,
        rack_id: rackId,
        client_name: clientName
      })
    });
    
    setSelectedBatch(null);
    setRackId('');
    fetchData();
  };

  if (loading) return <div className="p-6">Loading Dispatch Data...</div>;

  return (
    <div className="p-6 space-y-8 w-full max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispatch & Packaging: Live Logistics</h1>
        <p className="text-muted-foreground mt-1">Assign scratch-free racks to painted parts and ship to OEM plants (JIS).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ready to Pack Queue */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5 text-amber-500"/> QC Cleared (Ready for Rack)</h2>
          {readyToPack.length === 0 ? (
            <div className="p-6 bg-muted/20 border border-border rounded-xl text-center text-muted-foreground text-sm">
              No batches are currently waiting to be packed.
            </div>
          ) : (
            readyToPack.map(batch => (
              <div key={batch.id} className="bg-card border border-amber-500/30 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{batch.part_name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">Batch: {batch.batch_id}</p>
                  </div>
                  <Badge tone="success">QC Passed</Badge>
                </div>
                
                {selectedBatch?.batch_id === batch.batch_id ? (
                  <form onSubmit={handleDispatch} className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-semibold mb-1 block text-amber-600">Assign Foam Rack ID</label>
                        <input required value={rackId} onChange={e=>setRackId(e.target.value)} className="w-full p-2 text-sm border border-amber-500/50 rounded-md bg-amber-50/50 dark:bg-amber-900/10 focus:ring-amber-500" placeholder="e.g. RACK-A42" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold mb-1 block">Destination OEM</label>
                        <select value={clientName} onChange={e=>setClientName(e.target.value)} className="w-full p-2 text-sm border rounded-md">
                          {clients.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button type="button" onClick={()=>setSelectedBatch(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md">Cancel</button>
                      <button type="submit" className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-md hover:bg-amber-600 flex items-center gap-1">Mark as In-Transit <ArrowRight className="w-3 h-3"/></button>
                    </div>
                  </form>
                ) : (
                  <button onClick={()=>setSelectedBatch(batch)} className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold text-sm rounded-lg transition-colors border border-amber-200 dark:border-amber-900/50">
                    Assign Rack & Dispatch
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Active Shipments */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500"/> Active Shipments (JIS Tracker)</h2>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-3 font-semibold">Rack ID</th>
                  <th className="p-3 font-semibold">Parts</th>
                  <th className="p-3 font-semibold">OEM Client</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {shipments.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No active shipments</td></tr>
                ) : (
                  shipments.map(ship => (
                    <tr key={ship.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-bold text-amber-600 font-mono">{ship.rack_id}</td>
                      <td className="p-3">
                        <div className="font-medium">{ship.part_name}</div>
                        <div className="text-[10px] text-muted-foreground">Batch: {ship.batch_id}</div>
                      </td>
                      <td className="p-3 font-medium">{ship.client_name}</td>
                      <td className="p-3">
                        <Badge tone={ship.status === 'Delivered' ? 'success' : 'info'}>{ship.status}</Badge>
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

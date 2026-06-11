"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@shopify/polaris';
import { Truck, Package, PackageCheck, Clock } from 'lucide-react';

export default function DispatchDashboardUI() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dispatch/dashboard')
      .then(res => res.json())
      .then(d => { if (d.success) setData(d); });
  }, []);

  if (!data) return <div className="p-6 text-muted-foreground">Loading Dispatch Metrics...</div>;

  const metrics = [
    { title: 'Ready for Dispatch', value: data.metrics.readyForDispatch, icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Shipped Today', value: data.metrics.shippedToday, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Delivered', value: data.metrics.delivered, icon: PackageCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Pending Shipments', value: data.metrics.pendingShipments, icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logistics & Dispatch</h1>
          <p className="text-muted-foreground mt-1">Track shipments, packaging, and courier status.</p>
        </div>
        <Badge tone="info">All Systems Go</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${m.bg}`}>
                  <Icon className={`w-6 h-6 ${m.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{m.title}</p>
                  <p className="text-2xl font-bold">{m.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold mb-4">Active Shipments Tracker</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="p-3 font-semibold">Order ID</th>
                <th className="p-3 font-semibold">Client</th>
                <th className="p-3 font-semibold">Parts</th>
                <th className="p-3 font-semibold">Courier</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.shipments.map((row: any) => (
                <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                  <td className="p-3 font-mono text-xs">#ORD-{row.id}</td>
                  <td className="p-3 font-medium">{row.client}</td>
                  <td className="p-3 text-muted-foreground">{row.parts}</td>
                  <td className="p-3 text-muted-foreground">{row.courier}</td>
                  <td className="p-3">
                    <Badge tone={row.status === 'Delivered' ? 'success' : row.status === 'Delayed' ? 'critical' : 'info'}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { Card, Text, BlockStack, InlineGrid, Box, Badge } from '@shopify/polaris';
import { Settings, Printer, Droplet, AlertTriangle } from 'lucide-react';

export default function PrintingDashboardUI() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/printing/dashboard')
      .then(res => res.json())
      .then(d => { if (d.success) setData(d); });
  }, []);

  if (!data) return <div className="p-6 text-muted-foreground">Loading Printing Metrics...</div>;

  const metrics = [
    { title: 'Total Parts Printed', value: data.metrics.totalPrinted, icon: Printer, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Printers', value: data.metrics.activePrinters, icon: Settings, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Material Usage (kg)', value: data.metrics.materialUsage, icon: Droplet, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Failed Prints', value: data.metrics.failedPrints, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Printing Operations</h1>
          <p className="text-muted-foreground mt-1">Live monitoring of 3D printers and production metrics.</p>
        </div>
        <Badge tone="success">System Online</Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">Production Trend</h2>
          <div className="h-[300px] w-full flex items-center justify-center bg-muted/30 rounded-xl border border-dashed border-border">
            <span className="text-muted-foreground">Production Chart Visualization Placeholder</span>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">Machine Status</h2>
          <div className="space-y-4">
            {data.machines.map((machine: any) => (
              <div key={machine.id} className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${machine.status === 'error' ? 'bg-red-500' : machine.status === 'printing' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="font-medium">{machine.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {machine.details}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

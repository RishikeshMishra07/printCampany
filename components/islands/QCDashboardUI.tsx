"use client";

import React, { useEffect, useState } from 'react';
import { Card, Text, Badge } from '@shopify/polaris';
import { CheckCircle, XCircle, Search, Activity } from 'lucide-react';

export default function QCDashboardUI() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/qc/dashboard')
      .then(res => res.json())
      .then(d => { if (d.success) setData(d); });
  }, []);

  if (!data) return <div className="p-6 text-muted-foreground">Loading QC Metrics...</div>;

  const metrics = [
    { title: 'Parts Inspected', value: data.metrics.partsInspected, icon: Search, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Defect Rate', value: data.metrics.defectRate, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Approved', value: data.metrics.approved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Rejected', value: data.metrics.rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quality Control (QC)</h1>
          <p className="text-muted-foreground mt-1">Inspection logs, defects, and pass/fail ratios.</p>
        </div>
        <Badge tone="warning">12 Pending Checks</Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">Recent Inspections</h2>
          <div className="space-y-4">
            {data.recentInspections.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-muted/20 rounded-xl border border-border">
                <div>
                  <p className="font-semibold">Bumper Bracket - Batch #{item.batch}</p>
                  <p className="text-xs text-muted-foreground">Inspector: {item.inspector}</p>
                </div>
                <Badge tone={item.status === 'failed' ? "critical" : "success"}>
                  {item.note}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">Defect Types Distribution</h2>
          <div className="h-[300px] w-full flex items-center justify-center bg-muted/30 rounded-xl border border-dashed border-border">
            <span className="text-muted-foreground">Pie Chart Visualization Placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}

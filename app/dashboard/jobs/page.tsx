"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  FileSpreadsheet, 
  History,
  Activity,
  AlertTriangle
} from "lucide-react";

interface Job {
  id: string;
  file_path: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  error_log: string | null;
  created_at: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold"><CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-500 hover:bg-blue-600 font-bold"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> PROCESSING</Badge>;
      case 'FAILED':
        return <Badge variant="destructive" className="font-bold"><XCircle className="w-3 h-3 mr-1" /> FAILED</Badge>;
      default:
        return <Badge variant="secondary" className="font-bold"><Clock className="w-3 h-3 mr-1" /> PENDING</Badge>;
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Background Jobs</h2>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Track real-time Excel processing status and error logs.
          </p>
        </div>
        <Button onClick={fetchJobs} variant="outline" className="h-11 px-5 rounded-xl font-bold shadow-sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6">
        {loading && jobs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/60 shadow-sm border-dashed">
            <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
            <p className="text-slate-400 font-bold">Synchronizing queue...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200/60 bg-slate-50/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 mb-6">
                <Activity className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">No active jobs</h3>
              <p className="text-slate-400 mt-2 max-w-[300px] font-medium">Upload a DPF file to see it appear in the background processing queue.</p>
              <Button asChild className="mt-8 rounded-xl font-bold">
                <a href="/dashboard/upload">Start New Upload</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const progress = job.total_rows > 0 ? (job.processed_rows / job.total_rows) * 100 : 0;
              const isFailed = job.status === 'FAILED';
              
              return (
                <Card key={job.id} className={`border-slate-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden ${isFailed ? 'border-rose-100' : ''}`}>
                  <CardContent className="p-0">
                    <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      
                      {/* Left: Info */}
                      <div className="flex items-start gap-5 min-w-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isFailed ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                          <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <h4 className="text-[17px] font-black text-slate-900 truncate max-w-[200px] sm:max-w-[400px]">
                              {job.file_path.split('\\').pop()?.split('/').pop()}
                            </h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-[13px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(job.created_at).toLocaleTimeString()}</span>
                            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> ID: {job.id.slice(0,8)}...</span>
                            <span className="text-slate-500 font-black">{job.processed_rows.toLocaleString()} / {job.total_rows.toLocaleString()} Rows</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress & Status */}
                      <div className="w-full lg:w-[320px] space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest mb-1.5">
                          <span className={isFailed ? 'text-rose-500' : 'text-slate-500'}>
                            {job.status === 'PROCESSING' ? 'Processing Progress' : job.status === 'FAILED' ? 'Execution Halted' : 'Job Finalized'}
                          </span>
                          <span className="font-black text-slate-900">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div 
                            className={`h-full transition-all duration-500 ${isFailed ? 'bg-rose-500' : job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-primary'}`} 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {job.error_log && (
                          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl mt-3">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
                              Error: {typeof job.error_log === 'string' ? job.error_log : JSON.stringify(job.error_log)}
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

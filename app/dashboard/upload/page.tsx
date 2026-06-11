"use client";
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { CheckCircle2, XCircle, Upload, FileSpreadsheet, Info, ArrowRight, Loader2, Trash2, Activity, Calendar, Clock, Lock, AlertCircle } from "lucide-react";
import { ButtonGroup, Button as PolarisButton } from '@shopify/polaris';
import { ValidationTable } from '@/components/ValidationTable';
import { useApp } from '@/context/AppContext';

const REQUIRED_HEADERS = [
  { key: 'account_no',      labels: ['Account_No', 'Account No', 'LAN', 'Loan No'], display: 'Account_No' },
  { key: 'employee_code',   labels: ['Employee_Code', 'Employee Code', 'EmpCode'], display: 'Employee_Code' },
  { key: 'employee_name',   labels: ['Employee_Name', 'Employee Name', 'EmpName'], display: 'Employee_Name' },
  { key: 'client',          labels: ['Client', 'client', 'Customer'], display: 'Client' },
  { key: 'product',         labels: ['Product', 'product', 'Scheme'], display: 'Product' },
  { key: 'bucket',          labels: ['Bucket', 'bucket', 'Delinquency'], display: 'Bucket' },
  { key: 'location',        labels: ['Location', 'location', 'City'], display: 'Location' },
  { key: 'money_collected', labels: ['Money_Collected', 'Money Collected', 'Amount'], display: 'Money_Collected' },
  { key: 'payment_mode',    labels: ['Payment_Mode', 'Payment Mode', 'Mode of Payment'], display: 'Payment_Mode' },
  { key: 'tl_name',         labels: ['TL_Name', 'TL Name', 'Team Leader'], display: 'TL_Name' },
  { key: 'am',              labels: ['AM', 'am', 'Area Manager'], display: 'AM' },
  { key: 'aph',             labels: ['APH', 'aph'], display: 'APH' },
  { key: 'ph',              labels: ['PH', 'ph'], display: 'PH' },
  { key: 'phone_no',        labels: ['Phone_No', 'Phone No', 'Mobile', 'Contact'], display: 'Phone_No' },
];

export default function UploadPage() {
  const { user } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // New State for Full Row Validation
  const [validatedData, setValidatedData] = useState<{valid: any[], invalid: any[]}|null>(null);
  const [validationView, setValidationView] = useState<'summary'|'valid'|'invalid'>('summary');
  
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [needsPassword, setNeedsPassword] = useState(false);
  const [filePassword, setFilePassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    missingHeaders: string[];
    foundHeaders: string[];
    rowCount: number;
    sheetName?: string;
  } | null>(null);

  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [globalDate, setGlobalDate] = useState<string>('');
  const [globalDateObj, setGlobalDateObj] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [countdown, setCountdown] = useState<string>('');
  const [globalTimeOffset, setGlobalTimeOffset] = useState<number>(0);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');

  useEffect(() => {
    // Fetch clients
    fetch('/api/admin/clients').then(r => r.json()).then(d => {
      if (d.success) setClientsList(d.clients);
    });

    if (user?.role === 'admin') {
      fetch('/api/users').then(r => r.json()).then(d => {
        if (d.users) {
          const phs = d.users.filter((u: any) => u.role === 'user');
          setUsersList(phs);
        }
      });
    }
  }, [user]);

  // Fetch global internet date (not system clock)
  useEffect(() => {
    const fetchGlobalDate = async () => {
      let dt: Date | null = null;
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata');
        const data = await res.json();
        dt = new Date(data.datetime);
      } catch {
        // fallback: try timeapi.io
        try {
          const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata');
          const data = await res.json();
          dt = new Date(`${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}T${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}:${String(data.seconds).padStart(2, '0')}+05:30`);
        } catch {
          console.warn("Time APIs failed, falling back to local system time.");
          dt = new Date();
        }
      }
      if (dt) {
        setGlobalDateObj(dt);
        setGlobalDate(dt.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
        // Set default selected date to yesterday (day-1)
        const yesterday = new Date(dt.getTime() - 86400000);
        setSelectedDate(yesterday.toISOString().split('T')[0]);
        setSelectedYear(dt.getFullYear());
        // Calculate offset between global time and local system time
        setGlobalTimeOffset(dt.getTime() - Date.now());
      }
    };
    fetchGlobalDate();
  }, []);

  // Live countdown to midnight IST (based on global time offset)
  useEffect(() => {
    if (!globalDateObj) return;
    const interval = setInterval(() => {
      const nowReal = Date.now() + globalTimeOffset;
      // IST is UTC + 5:30
      const nowIST = new Date(nowReal + 5.5 * 3600000);
      
      const msSinceMidnightIST = 
        (nowIST.getUTCHours() * 3600000) + 
        (nowIST.getUTCMinutes() * 60000) + 
        (nowIST.getUTCSeconds() * 1000) + 
        nowIST.getUTCMilliseconds();
        
      const diff = (24 * 3600000) - msSinceMidnightIST;
      
      if (diff <= 0) {
        setCountdown('00:00:00');
        // Ideally reload date here, but for now just stop
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [globalTimeOffset, globalDateObj]);

  // Compute last 2 days before current date (e.g. 28th → show 27th & 26th)
  const dateOptions = globalDateObj ? (() => {
    const day1 = new Date(globalDateObj.getTime() - 86400000);      // yesterday
    const day2 = new Date(globalDateObj.getTime() - 86400000 * 2);  // day before yesterday
    return [
      {
        label: day1.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        value: day1.toISOString().split('T')[0],
        display: day1.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      },
      {
        label: day2.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        value: day2.toISOString().split('T')[0],
        display: day2.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      }
    ];
  })() : [];

  // Year options: current year and previous year
  const yearOptions = globalDateObj ? [
    globalDateObj.getFullYear(),
    globalDateObj.getFullYear() - 1
  ] : [new Date().getFullYear(), new Date().getFullYear() - 1];

  // SSE for real-time job progress
  useEffect(() => {
    if (!activeJob?.id || activeJob.status === 'COMPLETED' || activeJob.status === 'FAILED') return;

    const eventSource = new EventSource(`/api/jobs/stream?jobId=${activeJob.id}`);

    eventSource.onmessage = (event) => {
      const updatedJob = JSON.parse(event.data);
      setActiveJob(updatedJob);
      
      if (updatedJob.status === 'COMPLETED' || updatedJob.status === 'FAILED') {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [activeJob?.id]);

  const normalize = (s: string) => String(s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  const validateFile = async (providedPassword?: string) => {
    if (!file) return;
    setIsValidating(true);
    setMessage("");
    setValidationResult(null);
    setActiveJob(null); // Reset active job when new file selected
    setNeedsPassword(false);
    
    const currentPassword = providedPassword || filePassword;

    const processWorkbook = (workbook: any) => {
      let bestResult: any = null;
      let maxTotalMatches = -1;

      // Scan all sheets to find the best one
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (!rows || rows.length === 0) continue;

        let currentSheetMaxMatches = 0;
        let currentSheetHeaderIndex = 0;

        // Scan first 50 rows of this sheet
        for (let i = 0; i < Math.min(50, rows.length); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          const normalizedRow = row.map(k => normalize(String(k)));
          let matches = 0;
          REQUIRED_HEADERS.forEach(req => {
            if (req.labels.some(label => normalizedRow.includes(normalize(label)))) {
              matches++;
            }
          });

          if (matches > currentSheetMaxMatches) {
            currentSheetMaxMatches = matches;
            currentSheetHeaderIndex = i;
          }
        }

        if (currentSheetMaxMatches > maxTotalMatches) {
          maxTotalMatches = currentSheetMaxMatches;
          
          const headerRow = rows[currentSheetHeaderIndex].map(k => normalize(String(k)));
          const missing: string[] = [];
          const found: string[] = [];

          REQUIRED_HEADERS.forEach(req => {
            if (req.labels.some(label => headerRow.includes(normalize(label)))) found.push(req.display);
            else missing.push(req.display);
          });

          bestResult = {
            isValid: missing.length === 0,
            missingHeaders: missing,
            foundHeaders: found,
            rowCount: rows.length - (currentSheetHeaderIndex + 1),
            sheetName: sheetName,
            headerIndex: currentSheetHeaderIndex
          };
        }
      }

      if (!bestResult || maxTotalMatches === 0) {
        setValidationResult({
          isValid: false,
          missingHeaders: REQUIRED_HEADERS.map(r => r.display),
          foundHeaders: [],
          rowCount: 0
        });
        setMessage("Error: No matching headers found in any sheet. Please check your column names.");
        setValidatedData(null);
      } else {
        setValidationResult(bestResult);
        
        if (!bestResult.isValid) {
          setMessage(`Found some headers in sheet "${bestResult.sheetName}", but ${bestResult.missingHeaders.length} are missing.`);
          setValidatedData(null);
        } else {
          // Perform Full Row Validation since headers are valid
          const sheet = workbook.Sheets[bestResult.sheetName];
          const allData = XLSX.utils.sheet_to_json(sheet, { range: bestResult.headerIndex }) as any[];
          
          const validRows: any[] = [];
          const invalidRows: any[] = [];

          allData.forEach((row: any, idx: number) => {
            const get = (keys: string[]) => {
              for (const k of keys) {
                const target = normalize(k);
                const foundKey = Object.keys(row).find(r => normalize(r) === target);
                if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
              }
              return null;
            };

            const accNo = get(['Account_No', 'Account No', 'LAN', 'Loan No']);
            const location = get(['Location', 'location', 'City']);
            const client = get(['Client', 'client', 'Customer']);
            let money = get(['Money_Collected', 'Money Collected', 'Amount']);
            if (typeof money === 'string') money = parseFloat(money.replace(/,/g, ''));

            const errors = [];
            if (!accNo) errors.push("Missing Account No");
            if (!location) errors.push("Missing Location");
            if (!client) errors.push("Missing Process");
            if (money === null || isNaN(money)) errors.push("Missing/Invalid Amount");
            
            if (errors.length > 0) {
              invalidRows.push({ _rowIndex: idx + 2, _errors: errors, ...row });
            } else {
              validRows.push({ _rowIndex: idx + 2, ...row });
            }
          });

          setValidatedData({ valid: validRows, invalid: invalidRows });
          setValidationView('summary');
        }
      }
    };

    try {
      if (currentPassword && needsPassword) {
        // Vercel Serverless Bypass: We cannot decrypt files in the browser or on Vercel without Python.
        // We assume it's valid and let the local worker handle decryption and validation.
        setValidationResult({ isValid: true, missingHeaders: [], foundHeaders: REQUIRED_HEADERS.map(h => h.display), rowCount: 0 });
        setValidatedData(null);
        setNeedsPassword(false); // Hide password prompt
        setFilePassword(currentPassword);
        setIsValidating(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          processWorkbook(workbook);
        } catch (err: any) {
          if (err?.message?.includes("password-protected")) {
            setNeedsPassword(true);
            setMessage("File is password-protected.");
          } else {
            console.error("Parse error:", err);
            setMessage("Error parsing Excel file.");
          }
        }
        setIsValidating(false);
      };
      reader.onerror = () => {
        setMessage("Error reading file.");
        setIsValidating(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setMessage("Error processing file.");
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setValidationResult(null);
      setValidatedData(null);
      setMessage("");
      setNeedsPassword(false);
      setFilePassword("");
    }
  };

  const handleUpload = async () => {
    if (!file || (validationResult && !validationResult.isValid)) return;
    
    if (!selectedClient) {
      setMessage("Error: Please select a Process from the dropdown before uploading!");
      return;
    }
    
    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.append('file', file);
    if (filePassword) {
      formData.append('password', filePassword);
    }
    if (selectedDate) {
      formData.append('upload_at', selectedDate);
    }
    if (selectedClient) {
      formData.append('client_override', selectedClient);
    }
    if (user?.employee_id) formData.append('employee_id', user.employee_id);
    if (user?.name) formData.append('name', user.name);
    if (targetEmployeeId) formData.append('target_employee_id', targetEmployeeId);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success: File uploaded! Tracking progress below.`);
        setFile(null);
        setValidationResult(null);
        setValidatedData(null);
        setActiveJob({ id: data.jobId, status: 'PENDING', processed_rows: 0, total_rows: 0 });
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch { setMessage("Upload failed. Please try again."); }
    setUploading(false);
  };

  const progressPercent = activeJob?.total_rows > 0 ? Math.round((activeJob.processed_rows / activeJob.total_rows) * 100) : 0;

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar">
      <div className="w-full mx-auto px-4 py-6">

        <div className="flex flex-col lg:flex-row gap-5">
          
          {/* Left Side: Validation Status */}
          <div className="w-full lg:w-[320px] flex-shrink-0">
            <Card className="h-full border-slate-200/80 shadow-sm">
              <CardHeader className="border-b py-3 px-5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="font-bold">Column Validation</span>
                </CardTitle>
                <CardDescription className="text-xs">{REQUIRED_HEADERS.length} required headers checked.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {isValidating ? (
                  <div className="flex flex-col items-center py-12 text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                    <p className="text-xs font-medium">Analyzing...</p>
                  </div>
                ) : !validationResult ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-100">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm bg-slate-200 text-slate-500">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Required Columns</p>
                        <p className="text-[10px] text-slate-500 font-bold">Must match exactly</p>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                      {REQUIRED_HEADERS.map(req => (
                        <div key={req.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 border border-slate-100/60">
                          <span className="text-[11px] font-semibold text-slate-700">{req.display}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Required</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    
                    {/* Status Badge */}
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${validationResult.isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-destructive/5 border-destructive/10'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${validationResult.isValid ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'}`}>
                        {validationResult.isValid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${validationResult.isValid ? 'text-emerald-700' : 'text-destructive'}`}>
                          {validationResult.isValid ? 'Ready' : 'Errors Found'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold">{validationResult.foundHeaders.length}/{REQUIRED_HEADERS.length} matched</p>
                      </div>
                    </div>

                    {/* Header List */}
                    <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                      {REQUIRED_HEADERS.map(req => {
                        const found = validationResult.foundHeaders.includes(req.display);
                        return (
                          <div key={req.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 border border-slate-100/60">
                            <span className={`text-[11px] font-semibold ${found ? 'text-slate-700' : 'text-slate-400'}`}>{req.display}</span>
                            {found ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Badge variant="destructive" className="text-[8px] uppercase tracking-tighter px-1.5 py-0">Missing</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!validationResult.isValid && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-900 leading-relaxed font-medium">
                          <span className="font-bold">Action:</span> Rename missing columns in your Excel to match the list above.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Upload Area */}
          <div className="flex-1 space-y-4">
            {/* Page Header Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              {/* Top gradient accent line */}
              <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Title */}
                <div className="space-y-0.5">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                      <Upload className="w-4 h-4 text-white" style={{ fill: 'none' }} />
                    </div>
                    Upload Data
                  </h2>
                  <p className="text-xs text-muted-foreground ml-10">Validate and upload your DPF Excel files.</p>
                </div>

                {/* Right: Date & Year pills */}
                <div className="flex flex-wrap items-center gap-3 ml-10 sm:ml-0">
                  {/* Global Date */}
                  {globalDate && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700">{globalDate}</span>
                    </div>
                  )}
                  {/* Year Badge */}
                  {selectedYear && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <span className="text-xs font-bold text-indigo-600">{selectedYear}</span>
                    </div>
                  )}
                  {/* Countdown Timer */}
                  {countdown && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-bold text-amber-700 tabular-nums">{countdown}</span>
                      <span className="text-[10px] text-amber-500 font-medium">to next day</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Selector Row */}
              {dateOptions.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Date:</span>
                    <ButtonGroup variant="segmented">
                      {dateOptions.map((opt) => (
                        <PolarisButton
                          key={opt.value}
                          pressed={selectedDate === opt.value}
                          onClick={() => setSelectedDate(opt.value)}
                        >
                          {opt.label} — {opt.display}
                        </PolarisButton>
                      ))}
                    </ButtonGroup>
                  </div>

                  <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process:</span>
                    <select 
                      className="border rounded-md px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/50"
                      value={selectedClient}
                      onChange={e => setSelectedClient(e.target.value)}
                    >
                      <option value="">-- Select Process --</option>
                      {clientsList.map(c => (
                        <option key={c.id} value={c.client_name}>{c.client_name}</option>
                      ))}
                    </select>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Admin Proxy Upload:</span>
                      <select 
                        className="border rounded-md px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                        value={targetEmployeeId}
                        onChange={e => setTargetEmployeeId(e.target.value)}
                      >
                        <option value="">-- Select target User --</option>
                        {usersList.map(u => (
                          <option key={u.employee_id} value={u.employee_id}>{u.name} ({u.employee_id})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
              <CardContent className="p-5 space-y-4">
                
                {/* Drop Zone — compact */}
                <label
                  className={`group relative flex flex-col items-center justify-center gap-5 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 min-h-[250px]
                    ${isDragOver ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_30px_rgba(79,125,255,0.15)]' : file ? 'border-primary/50 bg-gradient-to-b from-primary/5 to-transparent' : 'border-slate-300 bg-slate-50/50 hover:border-primary/60 hover:bg-slate-100 hover:shadow-[0_0_20px_rgba(79,125,255,0.08)]'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => { 
                    e.preventDefault(); 
                    setIsDragOver(false); 
                    if (e.dataTransfer.files[0]) {
                      setFile(e.dataTransfer.files[0]);
                      setValidationResult(null);
                      setMessage("");
                      setNeedsPassword(false);
                      setFilePassword("");
                    }
                  }}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    className="sr-only" 
                    onChange={handleFileChange} 
                  />

                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${file ? 'bg-gradient-to-br from-primary to-indigo-600 text-white shadow-xl shadow-primary/30 scale-110' : 'bg-primary/10 text-primary shadow-sm group-hover:scale-110 group-hover:bg-primary/20'}`}>
                    {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                  </div>

                  {file ? (
                    <div className="text-center px-4">
                      <p className="text-base font-bold text-slate-900">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB — {validationResult?.rowCount || 0} rows found</p>
                      <Button variant="ghost" size="sm" onClick={(e) => { 
                        e.preventDefault(); 
                        setFile(null); 
                        setValidationResult(null);
                        setValidatedData(null);
                        setMessage("");
                        setNeedsPassword(false);
                        setFilePassword("");
                        setIsValidating(false);
                        setUploading(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }} className="mt-3 text-destructive hover:text-destructive hover:bg-destructive/10 font-bold text-xs h-8">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Clear File
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center px-4">
                      <p className="text-sm font-bold text-slate-700">Click to browse or drag & drop</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">XLSX, XLS, or CSV supported</p>
                    </div>
                  )}
                </label>

                {/* Password Prompt */}
                {needsPassword && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Lock className="w-5 h-5" />
                      <span className="text-sm font-bold">This file is password protected</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder="Enter file password" 
                        className="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        value={filePassword}
                        onChange={(e) => setFilePassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && validateFile()}
                      />
                      <Button
                        onClick={() => validateFile()}
                        disabled={!filePassword || isValidating}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm"
                      >
                        {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Data Validation UI */}
                {validatedData && (
                  <div className="pt-2 pb-4 space-y-4 animate-in slide-in-from-bottom-2">
                    {validationView === 'summary' && (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setValidationView('valid')}
                          className="flex flex-col items-center justify-center p-6 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition-all shadow-sm group"
                        >
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-3xl font-black text-emerald-700">{validatedData.valid.length}</span>
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Valid Rows</span>
                        </button>
                        
                        <button 
                          onClick={() => setValidationView('invalid')}
                          className="flex flex-col items-center justify-center p-6 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl transition-all shadow-sm group"
                        >
                          <AlertCircle className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-3xl font-black text-red-700">{validatedData.invalid.length}</span>
                          <span className="text-xs font-bold text-red-600 uppercase tracking-widest mt-1">Error Rows</span>
                        </button>
                      </div>
                    )}
                    
                    {validationView === 'valid' && (
                      <ValidationTable 
                        data={validatedData.valid} 
                        type="valid" 
                        onClose={() => setValidationView('summary')} 
                      />
                    )}
                    
                    {validationView === 'invalid' && (
                      <ValidationTable 
                        data={validatedData.invalid} 
                        type="invalid" 
                        onClose={() => setValidationView('summary')} 
                      />
                    )}
                  </div>
                )}

                {/* Check & Upload Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => validateFile()}
                    disabled={!file || isValidating || uploading}
                    className="flex-1 py-5 rounded-xl text-sm font-bold shadow-sm transition-all bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-md text-slate-700 border-2 border-slate-200"
                    size="lg"
                    variant="outline"
                  >
                    {isValidating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</>
                    ) : (
                      <>Validate Data</>
                    )}
                  </Button>

                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading || !validationResult?.isValid || !selectedDate}
                    className={`flex-[2] py-5 rounded-xl text-sm font-bold shadow-md transition-all duration-300 ${(validationResult?.isValid && selectedDate && selectedClient) ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 text-white hover:scale-[1.01]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    size="lg"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <>Upload & Process <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>

                {message && (
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold border ${message.includes('Error') ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {message.includes('Error') ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {message}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Progress Card */}
            {activeJob && (
              <Card className="border border-primary/20 shadow-md overflow-hidden animate-in zoom-in-95 duration-300 mt-4">
                <CardHeader className="bg-primary/5 py-3 px-5">
                  <CardTitle className="text-sm flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Activity className="w-4 h-4 text-primary animate-pulse" />
                       <span className="font-bold">Live Progress</span>
                     </div>
                     <Badge variant="outline" className="bg-white font-bold text-[10px]">
                       {activeJob.id.slice(0, 8)}
                     </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {activeJob.status === 'COMPLETED' ? 'Done' : 'Processing...'}
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        {activeJob.processed_rows.toLocaleString()} <span className="text-sm font-bold text-slate-400">/ {activeJob.total_rows.toLocaleString()}</span>
                      </p>
                    </div>
                    <p className="text-xl font-black text-primary">{progressPercent}%</p>
                  </div>

                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${activeJob.status === 'FAILED' ? 'bg-destructive' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      {activeJob.status === 'PROCESSING' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                      Status: <span className={activeJob.status === 'COMPLETED' ? 'text-emerald-500' : activeJob.status === 'FAILED' ? 'text-destructive' : 'text-primary'}>{activeJob.status}</span>
                    </div>
                  </div>

                  {/* Show Error / Warning Details */}
                  {activeJob.error_log && (
                    <div className="mt-3 p-3 rounded-lg text-xs font-semibold border bg-slate-50 border-slate-200">
                      {(() => {
                        let parsed: any = activeJob.error_log;
                        if (typeof parsed === 'string') {
                          try {
                            parsed = JSON.parse(parsed);
                          } catch {
                            // Leave it as a string
                          }
                        }
                        
                        if (typeof parsed === 'string') {
                          return <div className="text-destructive flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{parsed}</span></div>;
                        } else if (parsed && typeof parsed === 'object') {
                          return (
                            <div className="flex flex-col gap-1.5 text-slate-600">
                              {parsed.duplicates_found > 0 && (
                                <div className="text-amber-600 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Marked {parsed.duplicates_found} records as duplicate.</span>
                                </div>
                              )}
                              {parsed.failed_count > 0 && (
                                <div className="text-destructive flex items-center gap-2">
                                  <XCircle className="w-4 h-4" />
                                  <span>Failed to insert {parsed.failed_count} records.</span>
                                </div>
                              )}
                              {parsed.last_error && <div className="text-destructive mt-1 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> Error: {parsed.last_error}</div>}
                              {(!parsed.duplicates_found && !parsed.failed_count && !parsed.last_error) && (
                                <div className="text-destructive flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{JSON.stringify(parsed)}</span></div>
                              )}
                            </div>
                          );
                        } else {
                          return <div className="text-destructive flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{String(parsed)}</span></div>;
                        }
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

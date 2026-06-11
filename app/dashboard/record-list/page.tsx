"use client";
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import TraceEngine from '@/components/TraceEngine';

export default function RecordListPage() {
  const { user } = useApp();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedAM, setSelectedAM] = useState("");
  const [selectedTL, setSelectedTL] = useState("");
  const [selectedAPH, setSelectedAPH] = useState("");
  const [selectedPH, setSelectedPH] = useState("");
  const [selectedDesig, setSelectedDesig] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  useEffect(() => {
    setPage(1);
  }, [search, selectedLocation, selectedAM, selectedTL, selectedAPH, selectedPH, selectedDesig]);

  useEffect(() => {
    // Only admins allowed to see this raw master list
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kekaRes, incRes] = await Promise.all([
        fetch('/api/keka'),
        fetch('/api/incentives?groupBy=employee_code')
      ]);
      
      const kekaResult = await kekaRes.json();
      const incResult = await incRes.json();
      
      if (kekaResult.success) {
        const kekaData = kekaResult.data;
        const incData = incResult.success ? incResult.data : [];
        
        const mergedData = kekaData.map((emp: any) => {
          const match = incData.find((inc: any) => inc.employee_id === emp.employee_id) || {};
          return {
            ...emp,
            ...match,
            final_incentive: match.incentive || 0,
            total_collection: match.total_collection || 0,
            am_name: match.am_name || emp.am_name || '—',
            tl_name: match.tl_name || emp.tl_name || '—',
            aph: match.aph || emp.aph || '—',
            ph: match.ph || emp.ph || '—',
            designation: match.designation || emp.designation || '—'
          };
        });
        
        setData(mergedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const locationStats = data.reduce((acc, row) => {
    const loc = row.location || 'Unknown';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const uniqueLocations = Object.keys(locationStats).sort();
  const uniqueAMs = Array.from(new Set(data.map(d => d.am_name).filter(x => x && x !== '—'))).sort();
  const uniqueTLs = Array.from(new Set(data.map(d => d.tl_name).filter(x => x && x !== '—'))).sort();
  const uniqueAPHs = Array.from(new Set(data.map(d => d.aph).filter(x => x && x !== '—'))).sort();
  const uniquePHs = Array.from(new Set(data.map(d => d.ph).filter(x => x && x !== '—'))).sort();
  const uniqueDesigs = Array.from(new Set(data.map(d => d.designation).filter(x => x && x !== '—'))).sort();

  const filteredData = data.filter(r => {
    const locMatch = !selectedLocation || selectedLocation === "All" || r.location === selectedLocation || (!r.location && selectedLocation === "Unknown");
    const amMatch = !selectedAM || r.am_name === selectedAM;
    const tlMatch = !selectedTL || r.tl_name === selectedTL;
    const aphMatch = !selectedAPH || r.aph === selectedAPH;
    const phMatch = !selectedPH || r.ph === selectedPH;
    const desigMatch = !selectedDesig || r.designation === selectedDesig;
    
    const searchMatch = (
      (r.name?.toLowerCase().includes(search.toLowerCase())) ||
      (r.employee_id?.toLowerCase().includes(search.toLowerCase())) ||
      (r.location?.toLowerCase().includes(search.toLowerCase())) ||
      (r.designation?.toLowerCase().includes(search.toLowerCase()))
    );
    return locMatch && amMatch && tlMatch && aphMatch && phMatch && desigMatch && searchMatch;
  });

  const totalCount = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatCurrency = (amt: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

  // Stats
  const totalIncentives = filteredData.reduce((sum, r) => sum + (r.final_incentive || 0), 0);
  const totalColl = filteredData.reduce((sum, r) => sum + (r.total_collection || 0), 0);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Dynamic Top Flow Viewer */}
      {selectedRecord && (
        <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bdr)' }}>
            <TraceEngine record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total Employees', val: totalCount, color: 'var(--acc2)', bg: 'rgba(79,125,255,0.06)' },
          { label: 'Active Incentives', val: filteredData.filter(d => d.final_incentive > 0).length, color: '#22c55e', bg: 'rgba(34,197,94,0.06)' },
          { label: 'Total Collection', val: formatCurrency(totalColl), color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
          { label: 'Total Payout', val: formatCurrency(totalIncentives), color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 6, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)', fontSize: 13 }}>⌕</span>
          <input
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px 6px 28px', fontSize: 11, color: 'var(--txt)', outline: 'none' }}
            placeholder="Search employee, ID, location..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        
        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none', minWidth: 120 }}
          value={selectedDesig}
          onChange={e => {
            setSelectedDesig(e.target.value);
            setSelectedPH(""); setSelectedAPH(""); setSelectedAM(""); setSelectedTL("");
            setPage(1);
          }}
        >
          <option value="">Designation</option>
          {uniqueDesigs.map(x => <option key={x as string} value={x as string}>{x as string}</option>)}
        </select>

        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none', minWidth: 120 }}
          value={selectedPH}
          onChange={e => {
            setSelectedPH(e.target.value);
            setSelectedDesig(""); setSelectedAPH(""); setSelectedAM(""); setSelectedTL("");
            setPage(1);
          }}
        >
          <option value="">PH Name</option>
          {uniquePHs.map(x => <option key={x as string} value={x as string}>{x as string}</option>)}
        </select>

        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none', minWidth: 120 }}
          value={selectedAPH}
          onChange={e => {
            setSelectedAPH(e.target.value);
            setSelectedDesig(""); setSelectedPH(""); setSelectedAM(""); setSelectedTL("");
            setPage(1);
          }}
        >
          <option value="">APH Name</option>
          {uniqueAPHs.map(x => <option key={x as string} value={x as string}>{x as string}</option>)}
        </select>

        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none', minWidth: 120 }}
          value={selectedAM}
          onChange={e => {
            setSelectedAM(e.target.value);
            setSelectedDesig(""); setSelectedPH(""); setSelectedAPH(""); setSelectedTL("");
            setPage(1);
          }}
        >
          <option value="">AM Name</option>
          {uniqueAMs.map(x => <option key={x as string} value={x as string}>{x as string}</option>)}
        </select>

        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none', minWidth: 120 }}
          value={selectedTL}
          onChange={e => {
            setSelectedTL(e.target.value);
            setSelectedDesig(""); setSelectedPH(""); setSelectedAPH(""); setSelectedAM("");
            setPage(1);
          }}
        >
          <option value="">TL Name</option>
          {uniqueTLs.map(x => <option key={x as string} value={x as string}>{x as string}</option>)}
        </select>

        <select
          style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--txt)', outline: 'none', minWidth: 120 }}
          value={selectedLocation}
          onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
        >
          <option value="">Location</option>
          {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
        
        <div style={{ fontSize: 10, color: 'var(--txt3)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {totalCount} records
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--bdr)', borderRadius: 8, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '30px 1.5fr 1fr 1fr 1fr 1fr 1fr 90px 70px 80px', background: 'var(--bg-top)', borderBottom: '1px solid var(--bdr)', padding: '6px 10px', gap: 6 }}>
          {['#', 'Employee', 'Designation', 'AM Name', 'TL Name', 'APH', 'PH', 'Collection', 'Vintage', 'Incentive'].map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: h === 'Incentive' ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', background: 'var(--bg2)', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading Master Records...
            </div>
          ) : !paginatedData.length ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--txt3)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>No records match your filter.
            </div>
          ) : (
            paginatedData.map((row, idx) => {
              const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
              const isSelected = selectedRecord?.employee_id === row.employee_id;
              
              const totalDays = row.doc ? Math.floor((new Date().getTime() - new Date(row.doc).getTime()) / (1000 * 60 * 60 * 24)) : null;
              let vintage = '—';
              if (totalDays !== null) {
                if (totalDays <= 30) vintage = '0-30';
                else if (totalDays <= 60) vintage = '31-60';
                else if (totalDays <= 90) vintage = '61-90';
                else if (totalDays <= 120) vintage = '91-120';
                else vintage = '120+';
              }

              return (
                <div key={row.employee_id}
                  onClick={() => setSelectedRecord(row)}
                  style={{
                    display: 'grid', gridTemplateColumns: '30px 1.5fr 1fr 1fr 1fr 1fr 1fr 90px 70px 80px',
                    padding: '8px 10px', gap: 6, alignItems: 'center',
                    borderBottom: idx < paginatedData.length - 1 ? '1px solid var(--faint)' : 'none',
                    background: isSelected ? 'rgba(79,125,255,0.08)' : 'transparent',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-top)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 600 }}>{rowNum}</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? 'var(--acc2)' : 'var(--txt)' }}>{row.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--txt3)' }}>{row.employee_id} &bull; {row.location}</div>
                  </div>

                  <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{row.designation || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{row.am_name || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{row.tl_name || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{row.aph || '—'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{row.ph || '—'}</div>
                  
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt)' }}>{formatCurrency(row.total_collection || 0)}</div>
                  
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--txt3)' }}>{vintage !== '—' ? `${vintage} d` : '—'}</div>
                  
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', textAlign: 'right' }}>
                    {formatCurrency(row.final_incentive || 0)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div style={{ background: 'var(--bg-top)', borderTop: '1px solid var(--bdr)', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
            Showing {paginatedData.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, totalCount)}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: page === 1 ? 'var(--txt3)' : 'var(--txt)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Prev
            </button>
            <div style={{ fontSize: 10, color: 'var(--txt)', padding: '2px 4px' }}>
              {page} / {totalPages}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: page >= totalPages ? 'var(--txt3)' : 'var(--txt)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from 'react';

type Norm = { id: number; part_name: string; primer_litres: string; topcoat_litres: string; thinner_litres: string; labour_hours: string };
type StockItem = { id: number; name: string; category: string; current_qty: string; unit_of_measure: string };
type Deal = { id: number; client_name: string; deal_type: string; item_name: string };

export default function PaintCalcPage() {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedNorm, setSelectedNorm] = useState('');
  const [selectedDeal, setSelectedDeal] = useState('');
  const [qty, setQty] = useState('');
  const [result, setResult] = useState<any>(null);
  const [extraPrimer, setExtraPrimer] = useState('0');
  const [extraTopcoat, setExtraTopcoat] = useState('0');
  const [extraThinner, setExtraThinner] = useState('0');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const loadRequests = async (username: string) => {
    try {
      const r = await fetch('/api/store/paint-requests').then(res => res.json());
      if (r.requests) {
        setMyRequests(r.requests.filter((req: any) => req.requested_by === username));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetch('/api/store/paint-norms').then(r => r.json()).then(d => { if (d.norms) setNorms(d.norms); });
    fetch('/api/store/live-stock').then(r => r.json()).then(d => { if (d.stock) setStock(d.stock.filter((s: any) => s.category === 'Paint')); });
    fetch('/api/store/deals').then(r => r.json()).then(d => { if (d.deals) setDeals(d.deals.filter((d: any) => d.status === 'Active')); });
    fetch('/api/auth/me').then(r => r.json()).then(d => { 
      if (d.success) {
        setUser(d.user); 
        loadRequests(d.user.name || d.user.employee_id || 'Unknown');
      }
    });
  }, []);

  const norm = norms.find(n => n.id === parseInt(selectedNorm));
  const deal = deals.find(d => d.id === parseInt(selectedDeal));
  const parts = parseFloat(qty) || 0;

  const getStock = (name: string) => {
    const s = stock.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
    return s ? parseFloat(s.current_qty) : 0;
  };

  const calculate = () => {
    if (!norm || !parts) return;
    const primer  = parseFloat(norm.primer_litres)  * parts;
    const topcoat = parseFloat(norm.topcoat_litres) * parts;
    const thinner = parseFloat(norm.thinner_litres) * parts;

    const primerStock   = getStock('Primer') || getStock('primer');
    const topcoatStock  = getStock('Top Coat') || getStock('topcoat');
    const thinnerStock  = getStock('Thinner') || getStock('thinner');

    setResult({
      parts,
      norm,
      needed:   { primer, topcoat, thinner },
      inStock:  { primer: primerStock, topcoat: topcoatStock, thinner: thinnerStock },
      deficit:  {
        primer:  Math.max(0, primer - primerStock),
        topcoat: Math.max(0, topcoat - topcoatStock),
        thinner: Math.max(0, thinner - thinnerStock),
      },
      canProduce: {
        primer:  primerStock > 0 ? Math.floor(primerStock  / parseFloat(norm.primer_litres))  : Infinity,
        topcoat: topcoatStock > 0 ? Math.floor(topcoatStock / parseFloat(norm.topcoat_litres)) : Infinity,
        thinner: thinnerStock > 0 ? Math.floor(thinnerStock / parseFloat(norm.thinner_litres)) : Infinity,
      }
    });
  };

  const maxPossible = result ? Math.min(...Object.values(result.canProduce as Record<string, number>).filter(v => isFinite(v as number))) : 0;
  const feasible = result && Object.values(result.deficit as Record<string, number>).every(v => v === 0);

  const submitRequest = async () => {
    if (!result || !norm) return;
    setSubmitting(true);
    try {
      const payload = {
        deal_id: selectedDeal ? parseInt(selectedDeal) : null,
        norm_id: norm.id,
        parts_qty: parts,
        primer_standard: result.needed.primer,
        primer_extra: parseFloat(extraPrimer) || 0,
        topcoat_standard: result.needed.topcoat,
        topcoat_extra: parseFloat(extraTopcoat) || 0,
        thinner_standard: result.needed.thinner,
        thinner_extra: parseFloat(extraThinner) || 0,
        reason,
        requested_by: user?.name || user?.employee_id || 'Unknown',
      };
      
      const res = await fetch('/api/store/paint-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Paint Issue Request submitted successfully for Admin approval!');
        setResult(null);
        setExtraPrimer('0');
        setExtraTopcoat('0');
        setExtraThinner('0');
        setReason('');
        loadRequests(user?.name || user?.employee_id || 'Unknown');
      } else {
        const d = await res.json();
        alert('Error: ' + d.error);
      }
    } catch (e) {
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <h1 className="text-xl font-bold text-foreground">🧮 Paint Requirement Calculator</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Calculate total paint, primer, and thinner needed for a production run — check stock availability instantly</p>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Input Panel */}
          <div className="lg:w-[400px] flex-shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="text-sm font-bold text-foreground border-b border-border pb-3">📋 Enter Production Details</div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">🔩 Part Type *</label>
              <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedNorm} onChange={e => { setSelectedNorm(e.target.value); setResult(null); }}>
                <option value="">— Select Part Type —</option>
                {norms.map(n => <option key={n.id} value={n.id}>{n.part_name}</option>)}
              </select>
              {norm && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border grid grid-cols-3 gap-2 text-[10px]">
                  <div className="text-center"><div className="text-muted-foreground">Primer/part</div><div className="font-bold text-purple-500">{norm.primer_litres}L</div></div>
                  <div className="text-center"><div className="text-muted-foreground">Top Coat/part</div><div className="font-bold text-blue-500">{norm.topcoat_litres}L</div></div>
                  <div className="text-center"><div className="text-muted-foreground">Thinner/part</div><div className="font-bold text-amber-500">{norm.thinner_litres}L</div></div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">🔢 Number of Parts *</label>
              <input type="number" min="1" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 500 (bumpers in this batch)"
                value={qty} onChange={e => { setQty(e.target.value); setResult(null); }} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">🤝 Link to Deal (Optional)</label>
              <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)}>
                <option value="">— No specific deal —</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.client_name} — {d.item_name || 'General'}</option>)}
              </select>
            </div>

            <button onClick={calculate} disabled={!selectedNorm || !qty}
              className="h-11 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#8b5cf6', color: '#fff' }}>
              🧮 Calculate Paint Requirement
            </button>
          </div>

          {/* Paint Norms Reference */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">📊 Paint Norms Reference</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    {['Part', 'Primer', 'Top Coat', 'Thinner'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {norms.map((n, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 11 }}>{n.part_name}</td>
                      <td style={{ padding: '6px 8px', color: '#8b5cf6' }}>{n.primer_litres}L</td>
                      <td style={{ padding: '6px 8px', color: '#3b82f6' }}>{n.topcoat_litres}L</td>
                      <td style={{ padding: '6px 8px', color: '#f59e0b' }}>{n.thinner_litres}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="flex-1 flex flex-col gap-4">
          {!result ? (
            <div className="flex-1 flex items-center justify-center bg-card border border-dashed border-border rounded-2xl">
              <div className="text-center">
                <div className="text-5xl mb-4">🧮</div>
                <div className="text-sm font-semibold text-muted-foreground">Select a part type and enter quantity</div>
                <div className="text-xs text-muted-foreground mt-1">Results will appear here instantly</div>
              </div>
            </div>
          ) : (
            <>
              {/* Feasibility Banner */}
              <div className="p-4 rounded-xl border-2 flex items-center gap-4"
                style={{ borderColor: feasible ? '#10b981' : '#ef4444', background: feasible ? '#10b98110' : '#ef444410' }}>
                <div className="text-3xl">{feasible ? '✅' : '⚠️'}</div>
                <div>
                  <div className="font-bold text-sm" style={{ color: feasible ? '#10b981' : '#ef4444' }}>
                    {feasible
                      ? `Production FEASIBLE — Stock is sufficient for ${parts} parts`
                      : `Stock INSUFFICIENT — Paint deficit exists for ${parts} parts`}
                  </div>
                  {!feasible && (
                    <div className="text-xs mt-0.5" style={{ color: '#ef4444' }}>
                      Maximum you can produce with current stock: <strong>{maxPossible} parts</strong>. Raise a Purchase Request for remaining.
                    </div>
                  )}
                  {deal && <div className="text-xs mt-0.5 text-muted-foreground">Deal: {deal.client_name}</div>}
                </div>
              </div>

              {/* Paint Requirements Grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Primer Required', key: 'primer', color: '#8b5cf6', icon: '🟣' },
                  { label: 'Top Coat Required', key: 'topcoat', color: '#3b82f6', icon: '🔵' },
                  { label: 'Thinner Required', key: 'thinner', color: '#f59e0b', icon: '🟡' },
                ].map(({ label, key, color, icon }) => {
                  const needed  = (result.needed as any)[key];
                  const inStock = (result.inStock as any)[key];
                  const deficit = (result.deficit as any)[key];
                  const ok = deficit === 0;
                  return (
                    <div key={key} className="p-4 rounded-xl border bg-card shadow-sm" style={{ borderColor: ok ? color : '#ef4444' }}>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{icon} {label}</div>
                      <div className="text-2xl font-bold" style={{ color }}>{needed.toFixed(2)} L</div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">In Stock:</span>
                          <span className="font-bold" style={{ color: ok ? '#10b981' : '#ef4444' }}>{inStock.toFixed(2)} L</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Deficit:</span>
                          <span className="font-bold" style={{ color: deficit > 0 ? '#ef4444' : '#10b981' }}>
                            {deficit > 0 ? `-${deficit.toFixed(2)} L` : '✓ OK'}
                          </span>
                        </div>
                      </div>
                      {/* Stock bar */}
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${Math.min((inStock / needed) * 100, 100)}%`, background: ok ? color : '#ef4444' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Table */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                  📋 Complete Production Summary — {parts} × {result.norm.part_name}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold mb-2">PAINT MATERIALS NEEDED</div>
                    {[
                      { label: 'Primer', val: result.needed.primer, color: '#8b5cf6' },
                      { label: 'Top Coat', val: result.needed.topcoat, color: '#3b82f6' },
                      { label: 'Thinner', val: result.needed.thinner, color: '#f59e0b' },
                      { label: 'TOTAL PAINT', val: result.needed.primer + result.needed.topcoat + result.needed.thinner, color: '#10b981' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold" style={{ color }}>{val.toFixed(2)} Litres</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold mb-2">PRODUCTION CAPACITY (CURRENT STOCK)</div>
                    {[
                      { label: `From Primer stock (${result.inStock.primer.toFixed(2)} L)`, val: isFinite(result.canProduce.primer) ? result.canProduce.primer : '∞', color: '#8b5cf6' },
                      { label: `From Top Coat stock (${result.inStock.topcoat.toFixed(2)} L)`, val: isFinite(result.canProduce.topcoat) ? result.canProduce.topcoat : '∞', color: '#3b82f6' },
                      { label: `From Thinner stock (${result.inStock.thinner.toFixed(2)} L)`, val: isFinite(result.canProduce.thinner) ? result.canProduce.thinner : '∞', color: '#f59e0b' },
                      { label: 'MAX POSSIBLE PARTS', val: isFinite(maxPossible) ? maxPossible : '∞', color: feasible ? '#10b981' : '#ef4444' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold" style={{ color }}>{val} parts</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  💡 <strong>Labour estimate:</strong> {(parseFloat(result.norm.labour_hours) * parts).toFixed(1)} hours ({result.norm.labour_hours}h/part × {parts} parts)
                  {!feasible && <span className="ml-4" style={{ color: '#ef4444' }}>⚠ Raise a Purchase Request for deficit materials before starting production.</span>}
                </div>
              </div>

              {/* Request Paint Section */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm mt-2">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                  📤 Request Paint Issuance
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  If you need additional paint beyond the standard calculated norms (e.g. for rework or spillage), enter the extra amount below. The total will be sent to the Admin for approval.
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Extra Primer (L)</label>
                    <input type="number" step="0.01" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      value={extraPrimer} onChange={e => setExtraPrimer(e.target.value)} />
                    <div className="text-[10px] mt-1 text-muted-foreground">
                      Total Request: <span className="font-bold text-foreground">{(result.needed.primer + (parseFloat(extraPrimer)||0)).toFixed(2)} L</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Extra Top Coat (L)</label>
                    <input type="number" step="0.01" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      value={extraTopcoat} onChange={e => setExtraTopcoat(e.target.value)} />
                    <div className="text-[10px] mt-1 text-muted-foreground">
                      Total Request: <span className="font-bold text-foreground">{(result.needed.topcoat + (parseFloat(extraTopcoat)||0)).toFixed(2)} L</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Extra Thinner (L)</label>
                    <input type="number" step="0.01" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      value={extraThinner} onChange={e => setExtraThinner(e.target.value)} />
                    <div className="text-[10px] mt-1 text-muted-foreground">
                      Total Request: <span className="font-bold text-foreground">{(result.needed.thinner + (parseFloat(extraThinner)||0)).toFixed(2)} L</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason for Request</label>
                  <input type="text" className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    placeholder="E.g. Batch #12, including extra for rework"
                    value={reason} onChange={e => setReason(e.target.value)} />
                </div>

                <button onClick={submitRequest} disabled={submitting}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white transition-all shadow-md disabled:opacity-50"
                  style={{ background: '#10b981' }}>
                  {submitting ? 'Submitting...' : 'Send Request to Admin'}
                </button>
              </div>
            </>
          )}
        </div>
        </div>

        {/* My Recent Requests */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4">🕒 My Recent Paint Requests</div>
          {myRequests.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground text-xs">No requests made yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                    {['Date', 'Part', 'Total Requested (Std + Extra)', 'Reason', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((req, i) => {
                    const totalPrimer = parseFloat(req.primer_standard) + parseFloat(req.primer_extra);
                    const totalTopcoat = parseFloat(req.topcoat_standard) + parseFloat(req.topcoat_extra);
                    const totalThinner = parseFloat(req.thinner_standard) + parseFloat(req.thinner_extra);
                    
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }}>
                          {new Date(req.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{req.parts_qty} × {req.norm_part_name || 'Part'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: '#8b5cf6', marginRight: 8 }}>{totalPrimer.toFixed(2)}L Primer</span>
                          <span style={{ color: '#3b82f6', marginRight: 8 }}>{totalTopcoat.toFixed(2)}L Topcoat</span>
                          <span style={{ color: '#f59e0b' }}>{totalThinner.toFixed(2)}L Thinner</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-muted-foreground)', maxWidth: 150 }}>{req.reason || '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                          {req.status === 'Pending' && <span style={{ color: '#f59e0b', background: '#f59e0b20', padding: '4px 8px', borderRadius: 4 }}>⏳ Pending</span>}
                          {req.status === 'Approved' && <span style={{ color: '#10b981', background: '#10b98120', padding: '4px 8px', borderRadius: 4 }}>✓ Approved</span>}
                          {req.status === 'Rejected' && <span style={{ color: '#ef4444', background: '#ef444420', padding: '4px 8px', borderRadius: 4 }}>✕ Rejected</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect, useRef } from 'react';

type Deal = { id: number; client_name: string; item_name: string };
type StockItem = { id: number; name: string; unit_of_measure: string; current_qty: string };

export default function ChallanPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [challans, setChallans] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    deal_id: '', vehicle_no: '', driver_name: '', driver_phone: '',
    rows: [{ item_name: '', qty: '', unit: '', remarks: '' }],
  });

  useEffect(() => {
    fetch('/api/store/deals').then(r => r.json()).then(d => { if (d.deals) setDeals(d.deals); });
    fetch('/api/store/live-stock').then(r => r.json()).then(d => { if (d.stock) setItems(d.stock); });
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
    fetch('/api/store/challans').then(r => r.json()).then(d => { if (d.challans) setChallans(d.challans); });
  }, []);

  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, { item_name: '', qty: '', unit: '', remarks: '' }] }));
  const removeRow = (i: number) => setForm(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }));
  const updateRow = (i: number, field: string, val: string) => {
    setForm(f => {
      const rows = [...f.rows];
      (rows[i] as any)[field] = val;
      // Auto-fill unit from item
      if (field === 'item_name') {
        const found = items.find(it => it.name === val);
        if (found) rows[i].unit = found.unit_of_measure;
      }
      return { ...f, rows };
    });
  };

  const handleGenerate = async () => {
    if (!form.rows.some(r => r.item_name && r.qty)) return;
    setSaving(true);
    try {
      const deal = deals.find(d => d.id === parseInt(form.deal_id));
      const total_qty = form.rows.reduce((a, r) => a + (parseInt(r.qty) || 0), 0);
      const res = await fetch('/api/store/challans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: form.deal_id || null,
          vehicle_no: form.vehicle_no, driver_name: form.driver_name, driver_phone: form.driver_phone,
          items_json: form.rows.filter(r => r.item_name && r.qty),
          total_qty, created_by: user?.name || user?.employee_id,
        }),
      });
      const data = await res.json();
      if (data.challan) {
        setPrintMode({ ...data.challan, deal, rows: form.rows.filter(r => r.item_name && r.qty) });
        fetch('/api/store/challans').then(r => r.json()).then(d => { if (d.challans) setChallans(d.challans); });
      }
    } finally { setSaving(false); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #6366f1' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🧾 Outward Challan Generator</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Generate a delivery challan for dispatch — auto-numbered, printable</p>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
        {/* Form */}
        <div className="lg:w-[520px] flex-shrink-0">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="text-sm font-bold border-b border-border pb-3">📝 New Challan Details</div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Client Deal</label>
              <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.deal_id} onChange={e => setForm({...form, deal_id: e.target.value})}>
                <option value="">— General Dispatch (no deal) —</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.client_name} — {d.item_name || 'General'}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Vehicle No.</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="MH-04-AB-1234" value={form.vehicle_no} onChange={e => setForm({...form, vehicle_no: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Driver Name</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ramesh Kumar" value={form.driver_name} onChange={e => setForm({...form, driver_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Driver Phone</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="9876543210" value={form.driver_phone} onChange={e => setForm({...form, driver_phone: e.target.value})} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted-foreground">Items Dispatched *</label>
                <button onClick={addRow} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">+ Add Row</button>
              </div>
              <div className="flex flex-col gap-2">
                {form.rows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        value={row.item_name} onChange={e => updateRow(i, 'item_name', e.target.value)}>
                        <option value="">— Select Item —</option>
                        {items.map(it => <option key={it.id} value={it.name}>{it.name}</option>)}
                      </select>
                    </div>
                    <input type="number" placeholder="Qty" className="w-20 h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.qty} onChange={e => updateRow(i, 'qty', e.target.value)} />
                    <input placeholder="Unit" className="w-16 h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.unit} onChange={e => updateRow(i, 'unit', e.target.value)} />
                    <input placeholder="Remarks" className="w-28 h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      value={row.remarks} onChange={e => updateRow(i, 'remarks', e.target.value)} />
                    {form.rows.length > 1 && (
                      <button onClick={() => removeRow(i)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs flex-shrink-0">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={saving || !form.rows.some(r => r.item_name && r.qty)}
              className="h-11 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: '#6366f1' }}>
              {saving ? 'Generating...' : '🧾 Generate Challan'}
            </button>
          </div>
        </div>

        {/* Right — print preview or history */}
        <div className="flex-1 flex flex-col gap-4">
          {printMode ? (
            <div>
              <div className="flex gap-3 mb-4">
                <button onClick={handlePrint} className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: '#10b981' }}>🖨️ Print Challan</button>
                <button onClick={() => setPrintMode(null)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted">← New Challan</button>
              </div>
              {/* Printable challan */}
              <div ref={printRef} className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg print:shadow-none print:border-none" style={{ color: '#000', fontFamily: 'serif' }}>
                <div className="text-center mb-6">
                  <div className="text-2xl font-bold">AutoPrint Workshop</div>
                  <div className="text-sm text-gray-600">Delivery / Dispatch Challan</div>
                  <div className="mt-2 text-xs text-gray-500">Industrial Area, Phase II, Maharashtra</div>
                </div>
                <div className="flex justify-between mb-4 text-sm">
                  <div><span className="font-bold">Challan No:</span> <span className="font-mono text-blue-700">{printMode.challan_no}</span></div>
                  <div><span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 border border-gray-200 rounded-lg text-sm">
                  <div>
                    <div className="font-bold text-xs text-gray-500 uppercase mb-1">To (Client)</div>
                    <div className="font-bold">{printMode.deal?.client_name || 'General'}</div>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-gray-500 uppercase mb-1">Vehicle / Driver</div>
                    <div>{printMode.vehicle_no || '—'} / {printMode.driver_name || '—'}</div>
                    {printMode.driver_phone && <div className="text-xs text-gray-500">📞 {printMode.driver_phone}</div>}
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      {['#', 'Item / Part Description', 'Quantity', 'Unit', 'Remarks'].map(h => (
                        <th key={h} style={{ border: '1px solid #d1d5db', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {printMode.rows.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px 10px' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px 10px', fontWeight: 600 }}>{r.item_name}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px 10px', fontWeight: 700 }}>{r.qty}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px 10px' }}>{r.unit}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px 10px', color: '#6b7280' }}>{r.remarks || '—'}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f9fafb' }}>
                      <td colSpan={2} style={{ border: '1px solid #d1d5db', padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>TOTAL</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '8px 10px', fontWeight: 700 }}>{printMode.total_qty}</td>
                      <td colSpan={2} style={{ border: '1px solid #d1d5db' }}></td>
                    </tr>
                  </tbody>
                </table>
                <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-gray-300 text-center text-xs">
                  <div className="pt-8 border-t border-gray-400"><div className="font-bold">Prepared By</div><div className="text-gray-500">{printMode.created_by}</div></div>
                  <div className="pt-8 border-t border-gray-400"><div className="font-bold">Checked By</div></div>
                  <div className="pt-8 border-t border-gray-400"><div className="font-bold">Receiver Signature</div></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">🧾 Recent Challans</div>
              {challans.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No challans generated yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      {['Challan No.', 'Client', 'Vehicle', 'Driver', 'Total Qty', 'Date'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map((c: any, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{c.challan_no}</td>
                        <td style={{ padding: '10px 12px' }}>{c.client_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{c.vehicle_no || '—'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)' }}>{c.driver_name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{c.total_qty}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-muted-foreground)', fontSize: 10 }}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

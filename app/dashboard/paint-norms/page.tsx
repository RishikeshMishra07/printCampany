"use client";
import React, { useState, useEffect } from 'react';

type Norm = { id: number; part_name: string; primer_litres: string; topcoat_litres: string; thinner_litres: string; labour_hours: string; notes: string };

export default function PaintNormsPage() {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNorm, setEditNorm] = useState<Norm | null>(null);
  const [saving, setSaving] = useState(false);
  const blank = { part_name: '', primer_litres: '', topcoat_litres: '', thinner_litres: '', labour_hours: '', notes: '' };
  const [form, setForm] = useState(blank);

  useEffect(() => { fetch('/api/store/paint-norms').then(r => r.json()).then(d => { if (d.norms) setNorms(d.norms); setLoading(false); }); }, []);
  const refresh = () => fetch('/api/store/paint-norms').then(r => r.json()).then(d => { if (d.norms) setNorms(d.norms); });

  const openCreate = () => { setEditNorm(null); setForm(blank); setShowModal(true); };
  const openEdit = (n: Norm) => { setEditNorm(n); setForm({ part_name: n.part_name, primer_litres: n.primer_litres, topcoat_litres: n.topcoat_litres, thinner_litres: n.thinner_litres, labour_hours: n.labour_hours, notes: n.notes || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.part_name) return;
    setSaving(true);
    try {
      if (editNorm) {
        await fetch(`/api/store/paint-norms/${editNorm.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      } else {
        await fetch('/api/store/paint-norms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setShowModal(false); refresh();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this paint norm?')) return;
    await fetch(`/api/store/paint-norms/${id}`, { method: 'DELETE' }); refresh();
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🎨 Paint Norms / Standards</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Define standard paint consumption per part type — used by the Paint Calculator</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: '#8b5cf6' }}>+ Add Norm</button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6">
        {loading ? <div className="p-12 text-center text-sm text-muted-foreground">Loading...</div> : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                  {['Part Type', 'Primer/Part', 'Top Coat/Part', 'Thinner/Part', 'Labour Hrs', 'Total Paint', 'Notes', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {norms.map((n, i) => {
                  const totalPaint = parseFloat(n.primer_litres) + parseFloat(n.topcoat_litres) + parseFloat(n.thinner_litres);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{n.part_name}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#8b5cf6' }}>{n.primer_litres} L</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#3b82f6' }}>{n.topcoat_litres} L</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f59e0b' }}>{n.thinner_litres} L</td>
                      <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)' }}>{n.labour_hours} hrs</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#10b981' }}>{totalPaint.toFixed(3)} L</td>
                      <td style={{ padding: '10px 14px', color: 'var(--color-muted-foreground)', fontSize: 11 }}>{n.notes || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(n)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer' }}>✏️ Edit</button>
                          <button onClick={() => handleDelete(n.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', cursor: 'pointer' }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-5">{editNorm ? '✏️ Edit Paint Norm' : '+ Add Paint Norm'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Part Type *</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Car Bumper — Front" value={form.part_name} onChange={e => setForm({...form, part_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Primer per Part (Litres)', key: 'primer_litres', color: '#8b5cf6' },
                  { label: 'Top Coat per Part (Litres)', key: 'topcoat_litres', color: '#3b82f6' },
                  { label: 'Thinner per Part (Litres)', key: 'thinner_litres', color: '#f59e0b' },
                  { label: 'Labour per Part (Hours)', key: 'labour_hours', color: '#10b981' },
                ].map(({ label, key, color }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold mb-1 block" style={{ color }}>{label}</label>
                    <input type="number" step="0.001" min="0" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0.000" value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes</label>
                <input className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.part_name} className="flex-1 h-10 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: '#8b5cf6' }}>
                {saving ? 'Saving...' : editNorm ? 'Update' : 'Add Norm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

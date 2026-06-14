"use client";
import React, { useState, useEffect } from 'react';

type Item = { id: number; name: string; category: string; current_qty: string; unit_of_measure: string; min_stock_level: string };
type Transaction = { id: number; item_id: number; item_name: string; transaction_type: string; quantity: string; reference_no: string; remarks: string; created_at: string; created_by_name: string };

export default function TransactionPage({ txType }: { txType: 'Inward' | 'Outward' | 'Issue' }) {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState({ item_id: '', quantity: '', reference_no: '', remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  const loadData = async () => {
    try {
      const itemsRes = await fetch('/api/store/live-stock');
      const itemsData = await itemsRes.json();
      if (itemsData.stock) setItems(itemsData.stock);

      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (userData.success) setUser(userData.user);

      const txRes = await fetch('/api/store/transactions');
      const txData = await txRes.json();
      if (txData.transactions) {
        setTransactions(txData.transactions.filter((t: Transaction) => t.transaction_type === txType));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadData(); }, [txType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_id || !formData.quantity) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/store/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: formData.item_id,
          transaction_type: txType,
          quantity: formData.quantity,
          reference_no: formData.reference_no,
          remarks: formData.remarks,
        }),
      });
      if (res.ok) {
        setFormData({ item_id: '', quantity: '', reference_no: '', remarks: '' });
        loadData();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      alert('Error submitting transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getThemeColor = () => {
    if (txType === 'Inward') return '#10b981'; // Emerald
    if (txType === 'Outward') return '#3b82f6'; // Blue
    return '#f59e0b'; // Amber (Issue)
  };

  const themeColor = getThemeColor();

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: `4px solid ${themeColor}` }}>
        <h1 className="text-xl font-bold text-foreground">
          {txType === 'Inward' ? '📥 Material Inward (GRN)' : txType === 'Outward' ? '🚛 Dispatch (Outward)' : '🏭 Issue to Production'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {txType === 'Inward' ? 'Record incoming materials from vendors' : txType === 'Outward' ? 'Record finished goods sent to clients' : 'Record raw materials issued to shop floor'}
        </p>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
        {/* Add Form */}
        {user?.role !== 'user' && (
          <div className="lg:w-[350px] flex-shrink-0 flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="text-sm font-bold border-b border-border pb-2 text-foreground">New {txType} Entry</div>
              
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Select Item *</label>
                <select required className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={formData.item_id} onChange={e => setFormData({ ...formData, item_id: e.target.value })}>
                  <option value="">— Select Item —</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.current_qty} {item.unit_of_measure} in stock)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantity *</label>
                <input required type="number" step="0.01" min="0.01" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  placeholder="0.00"
                  value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Reference / Challan No.</label>
                <input type="text" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  placeholder="e.g. CH-12345"
                  value={formData.reference_no} onChange={e => setFormData({ ...formData, reference_no: e.target.value })} />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Remarks</label>
                <textarea className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px]"
                  placeholder="Optional notes..."
                  value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
              </div>

              <button disabled={isSubmitting} type="submit" className="h-10 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50" style={{ background: themeColor }}>
                {isSubmitting ? 'Saving...' : `Record ${txType}`}
              </button>
            </form>
          </div>
        )}

        {/* History Table */}
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent {txType} History</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold text-right">Qty</th>
                  <th className="px-4 py-3 font-semibold">Ref No</th>
                  <th className="px-4 py-3 font-semibold">Remarks</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No recent {txType.toLowerCase()} records found.
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">{tx.item_name}</td>
                      <td className="px-4 py-3 font-bold text-right" style={{ color: themeColor }}>
                        {txType === 'Inward' ? '+' : '-'}{parseFloat(tx.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.reference_no || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{tx.remarks || '—'}</td>
                      <td className="px-4 py-3 text-xs">{tx.created_by_name}</td>
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

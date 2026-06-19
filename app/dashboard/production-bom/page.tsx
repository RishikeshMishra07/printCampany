"use client";
import React, { useState, useEffect } from 'react';

export default function ProductionBOMPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newPart, setNewPart] = useState({
    part_name: '',
    part_no: '',
    group_name: '',
    specification: '',
    qty: '',
    unit: ''
  });

  const fetchBOM = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/production/bom?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBOM();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBOM();
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.part_name || !newPart.group_name) {
      alert("Part Name and Group are required!");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/production/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPart)
      });
      const data = await res.json();
      if (data.success) {
        setItems([data.item, ...items]);
        setShowModal(false);
        setNewPart({ part_name: '', part_no: '', group_name: '', specification: '', qty: '', unit: '' });
      } else {
        alert("Error adding part: " + data.error);
      }
    } catch (e: any) {
      alert("An error occurred: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);

  const groups = ['All', ...Array.from(new Set(items.map(item => item.group_name).filter(Boolean)))];

  const filteredItems = activeTab === 'All' ? items : items.filter(item => item.group_name === activeTab);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background relative">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #f97316' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">📋 Bill of Materials (BOM)</h1>
            <p className="text-xs text-muted-foreground mt-0.5">View all required parts and materials for production</p>
          </div>

          <div className="flex gap-4 items-center">
            <form onSubmit={handleSearch} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search by part no or name..."
                className="h-9 w-64 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="h-9 px-4 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors">
                Search
              </button>
              <button type="button" onClick={() => { setSearch(''); setTimeout(fetchBOM, 0); }} className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors">
                Clear
              </button>
            </form>

            <div className="h-6 border-l border-border mx-1"></div>

            <button
              onClick={() => setShowModal(true)}
              className="h-9 px-4 flex items-center gap-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              Add New
            </button>
          </div>
        </div>

        {!loading && items.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {groups.map((group: any) => (
              <button
                key={group}
                onClick={() => setActiveTab(group)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === group
                    ? 'bg-orange-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {group}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col">
        <div className="rounded-xl border border-border bg-card shadow-sm flex-grow overflow-auto mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b-2 border-border sticky top-0 z-10 shadow-sm">
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Part No</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Part Name</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Group</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Specification</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">Loading BOM data...</td></tr>
              ) : paginatedItems.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">No parts found matching your criteria.</td></tr>
              ) : paginatedItems.map((item, i) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-orange-600">{item.part_no}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">{item.part_name || '-'}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{item.group_name || '-'}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{item.specification || '-'}</td>
                  <td className="py-3 px-4 text-sm font-bold">{item.qty ? parseFloat(item.qty).toFixed(3).replace(/\.?0+$/, '') : '-'}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground uppercase">{item.unit || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredItems.length > 0 && (
          <div className="flex items-center justify-between mt-auto">
            <div className="text-sm text-muted-foreground font-medium">
              Showing <span className="font-bold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-foreground">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of <span className="font-bold text-foreground">{filteredItems.length}</span> entries
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center px-3 font-semibold text-sm">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Part Side Panel */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300 ${showModal ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setShowModal(false)}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-2xl border-l border-border flex flex-col transform transition-transform duration-300 ease-in-out ${showModal ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 flex-shrink-0">
          <h2 className="text-lg font-bold">Add New Part</h2>
          <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <form id="add-part-form" onSubmit={handleAddPart} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Part Name *</label>
                <input
                  type="text" required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newPart.part_name} onChange={e => setNewPart({ ...newPart, part_name: e.target.value })}
                />

              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Group (Category) *</label>
                <input
                  type="text" required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newPart.group_name} onChange={e => setNewPart({ ...newPart, group_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Part No (Optional)</label>
                <input
                  type="text" placeholder="Auto-generated if empty"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newPart.part_no} onChange={e => setNewPart({ ...newPart, part_no: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Specification</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newPart.specification} onChange={e => setNewPart({ ...newPart, specification: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Quantity</label>
                <input
                  type="number" step="0.001"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newPart.qty} onChange={e => setNewPart({ ...newPart, qty: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Unit (e.g., LTR, KGS)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newPart.unit} onChange={e => setNewPart({ ...newPart, unit: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button" onClick={() => setShowModal(false)}
            className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit" form="add-part-form" disabled={adding}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 font-medium text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {adding ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</>
            ) : 'Save Part'}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect, use } from 'react';

export default function FloorWorkPage({ params }: { params: Promise<{ floor: string }> }) {
  const resolvedParams = use(params);
  const floorParam = resolvedParams.floor; // e.g., 'floor-1'
  const floorName = floorParam.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()); // "Floor 1"
  const formattedFloorName = floorParam.charAt(0).toUpperCase() + floorParam.slice(1); // "Floor-1"

  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [formData, setFormData] = useState({
    assigned_to: '',
    bom_id: '',
    task_description: '',
    target_qty: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, usersRes, bomRes] = await Promise.all([
        fetch(`/api/production/work-assignments?floor=${formattedFloorName}`),
        fetch('/api/production/users'),
        fetch('/api/production/bom')
      ]);

      const assignData = await assignRes.json();
      const usersData = await usersRes.json();
      const bomData = await bomRes.json();

      if (assignData.success) setAssignments(assignData.assignments);
      if (usersData.success) setUsers(usersData.users);
      if (bomData.success) setBomItems(bomData.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [formattedFloorName]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_to) {
      alert("Please select a user to assign work.");
      return;
    }

    setIsAssigning(true);
    try {
      const res = await fetch('/api/production/work-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          floor_name: formattedFloorName,
          assigned_to: formData.assigned_to,
          bom_id: formData.bom_id || null,
          task_description: formData.task_description,
          target_qty: formData.target_qty ? parseFloat(formData.target_qty) : null,
          assigned_by: 'admin' // Hardcoded for admin for now
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({ assigned_to: '', bom_id: '', task_description: '', target_qty: '' });
        fetchData(); // Refresh list
      } else {
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      alert("Error assigning work: " + e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'In Progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0" style={{ borderLeft: '4px solid #10b981' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🏭 {floorName} Work Assignments</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage and track tasks assigned to operators on this floor</p>
          </div>
          
          <div className="flex gap-2 items-center">
            <button onClick={fetchData} className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors">
              🔄 Refresh
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="h-9 px-4 flex items-center gap-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Assign Work
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6">
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b-2 border-border">
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Task / Part</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Qty</th>
                <th className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">Loading assignments...</td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-sm">No work assigned on this floor yet.</td></tr>
              ) : assignments.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">
                    {item.assigned_to_name} <span className="text-xs font-normal text-muted-foreground">({item.assigned_to})</span>
                  </td>
                  <td className="py-3 px-4">
                    {item.bom_id ? (
                      <div>
                        <div className="text-sm font-semibold text-orange-600">{item.part_name}</div>
                        <div className="text-xs font-mono text-muted-foreground">Part No: {item.part_no}</div>
                        {item.task_description && <div className="text-xs mt-1 text-foreground/80">{item.task_description}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/90">{item.task_description || '-'}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold">
                    {item.target_qty ? `${item.target_qty} ${item.unit || ''}` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Work Side Panel */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300 ${showModal ? 'opacity-100 visible' : 'opacity-0 invisible'}`} 
        onClick={() => setShowModal(false)}
      />
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-2xl border-l border-border flex flex-col transform transition-transform duration-300 ease-in-out ${showModal ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 flex-shrink-0">
          <h2 className="text-lg font-bold">Assign Work - {floorName}</h2>
          <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          <form id="assign-work-form" onSubmit={handleAssign} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Assign To (User) *</label>
              <select 
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}
              >
                <option value="">-- Select User --</option>
                {users.map(u => (
                  <option key={u.employee_id} value={u.employee_id}>
                    {u.name} ({u.department_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">BOM Part (Optional)</label>
              <select 
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.bom_id} onChange={e => setFormData({...formData, bom_id: e.target.value})}
              >
                <option value="">-- No specific part --</option>
                {bomItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.part_name} ({item.part_no}) - {item.group_name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Select a part if this task is specifically to produce or work on a BOM item.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Task Description / Instructions</label>
                <textarea 
                  rows={4}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  value={formData.task_description} onChange={e => setFormData({...formData, task_description: e.target.value})}
                  placeholder="e.g. Paint 50 pieces by evening..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Target Quantity (Optional)</label>
                <input 
                  type="number" step="1"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={formData.target_qty} onChange={e => setFormData({...formData, target_qty: e.target.value})}
                  placeholder="e.g. 50"
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
            type="submit" form="assign-work-form" disabled={isAssigning}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-emerald-500/20"
          >
            {isAssigning ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Assigning...</>
            ) : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

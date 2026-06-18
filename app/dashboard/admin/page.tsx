"use client";
import React, { useState, useEffect } from 'react';

type User = {
  id: number;
  employee_id: string;
  name: string;
  username: string;
  role: string;
  department_name: string;
};

type Dept = { id: number; name: string };

const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  admin: { color: '#6366f1', bg: '#6366f115' },
  user:  { color: '#10b981', bg: '#10b98115' },
};

export default function AdminPage() {
  const [users, setUsers]   = useState<User[]>([]);
  const [depts, setDepts]   = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    employee_id: '', name: '', username: '', password: '', role: 'user', department_id: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/departments'),
      ]);
      const [uData, dData] = await Promise.all([uRes.json(), dRes.json()]);
      if (uData.users) setUsers(uData.users);
      if (dData.departments) setDepts(dData.departments);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ employee_id: '', name: '', username: '', password: '', role: 'user', department_id: depts[0]?.id?.toString() || '' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    const dept = depts.find(d => d.name === u.department_name);
    setForm({ employee_id: u.employee_id, name: u.name, username: u.username, password: '', role: u.role, department_id: dept?.id?.toString() || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.username || (!editUser && !form.password)) return;
    setSaving(true);
    try {
      const parsedDeptId = form.department_id ? parseInt(form.department_id) : null;
      const payload: any = { ...form, department_id: parsedDeptId };
      if (editUser && !form.password) delete payload.password;
      
      let res;
      if (editUser) {
        res = await fetch(`/api/admin/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      
      setShowModal(false);
      fetchAll();
    } catch (e: any) { 
      console.error(e); 
      alert(e.message);
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      fetchAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">👤 User Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage user roles, access, and profiles</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add User
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users',  value: users.length,                                            icon: '👥', color: 'text-blue-500' },
            { label: 'Admins',       value: users.filter(u => u.role === 'admin').length,             icon: '👑', color: 'text-purple-500' },
            { label: 'Store Users',  value: users.filter(u => u.role === 'user').length,              icon: '👷', color: 'text-green-500' },
            { label: 'Departments',  value: depts.length,                                             icon: '🏢', color: 'text-amber-500' },
          ].map((k, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.icon} {k.label}</div>
              <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="🔍 Search by name, Emp ID, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-72"
          />
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {users.length} users</span>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                  {['Emp ID', 'Name', 'Username', 'Role', 'Department', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 12 }}>
                      No users found. Click "+ Add User" to create one.
                    </td>
                  </tr>
                ) : filtered.map((u, i) => {
                  const rs = ROLE_STYLE[u.role] || ROLE_STYLE.user;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-muted-foreground)' }}>{u.employee_id}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        {u.name || <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{u.username}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, fontWeight: 700, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}`, textTransform: 'capitalize' }}>
                          {u.role === 'admin' ? '👑 Admin' : '👷 User'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-muted-foreground)' }}>
                        {u.department_name || <span style={{ color: 'var(--color-border)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-foreground)' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">
              {editUser ? '✏️ Edit User' : '+ Add New User'}
            </h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Emp ID *</label>
                  <input
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    placeholder="e.g. ST-002"
                    value={form.employee_id}
                    onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Username *</label>
                  <input
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    placeholder="e.g. store_02"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name</label>
                <input
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Password {editUser ? '(leave blank to keep existing)' : '*'}
                </label>
                <input
                  type="password"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={editUser ? 'Leave blank to keep existing password' : 'Set a password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Role *</label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="user">👷 User (Store Operator)</option>
                    <option value="admin">👑 Admin (Manager)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Department *</label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.department_id}
                    onChange={e => setForm({ ...form, department_id: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.employee_id || !form.username || (!editUser && !form.password)}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

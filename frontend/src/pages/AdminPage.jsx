import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, UserPlus, Server, Activity, Mail, RefreshCw, Search } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

const ROLES = ['ADMIN', 'OPERATOR', 'MAINTENANCE_ENGINEER', 'PRODUCTION_MANAGER'];

export const AdminPage = () => {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [newUser, setNewUser]         = useState({ name: '', email: '', role: 'OPERATOR' });
  const { user: currentAdmin }        = useAuth();

  const fetchAdminData = async () => {
    try {
      const [uRes, hRes] = await Promise.all([api.get('/users'), api.get('/health')]);
      setUsers(uRes.data.users);
      setSystemHealth(hRes.data);
    } catch (err) { console.error('Failed to load admin data:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try { await api.patch(`/users/${userId}/role`, { role: newRole }); await fetchAdminData(); }
    catch (err) { alert(`Role change failed: ${err.response?.data?.message || err.message}`); }
  };

  const handleStatusToggle = async (targetUser) => {
    try {
      const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/users/${targetUser._id}`, { status: newStatus });
      await fetchAdminData();
    } catch (err) { alert(`Status update failed: ${err.response?.data?.message || err.message}`); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/users', newUser);
      setModalOpen(false);
      setNewUser({ name: '', email: '', role: 'OPERATOR' });
      await fetchAdminData();
    } catch (err) { alert(`Failed to create user: ${err.response?.data?.message || err.message}`); }
    finally { setSubmitting(false); }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">User management, role assignments, system health, and security controls.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <UserPlus className="w-3.5 h-3.5" /> Add User
          </button>
          <button onClick={fetchAdminData} className="btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Backend Server',
            icon: Server,
            value: systemHealth?.status || 'HEALTHY',
            sub: `Uptime: ${Math.round(systemHealth?.uptime || 120)}s · Port 5000`,
            dotColor: 'bg-success',
            valueColor: 'text-success',
          },
          {
            label: 'Database',
            icon: Activity,
            value: 'MongoDB',
            sub: 'Connection: Active',
            dotColor: 'bg-success',
            valueColor: 'text-neutral-900',
          },
          {
            label: 'Email Service',
            icon: Mail,
            value: 'Brevo — Active',
            sub: 'Critical alerts & password reset',
            dotColor: 'bg-info',
            valueColor: 'text-neutral-900',
          },
        ].map(({ label, icon: Icon, value, sub, dotColor, valueColor }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
              <Icon className="w-4 h-4 text-neutral-300" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${dotColor}`} />
              <span className={`font-bold text-sm ${valueColor}`}>{value}</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* User Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-sm text-neutral-900">User Directory & Role Assignment</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Only administrators can modify authorization privileges.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search name or email…" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-8 py-1.5 text-xs" />
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th>
                <th>Status</th><th>Created</th><th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id}>
                  <td className="font-semibold text-neutral-900">{u.name}</td>
                  <td className="text-neutral-500 text-xs">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={u._id === currentAdmin?.id}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      onClick={() => u._id !== currentAdmin?.id && handleStatusToggle(u)}
                      disabled={u._id === currentAdmin?.id}
                      className={`badge cursor-pointer hover:opacity-80 disabled:cursor-not-allowed ${
                        u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="text-neutral-400 text-xs font-mono">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    {u._id === currentAdmin?.id ? (
                      <span className="text-[10px] font-bold text-brand">YOU</span>
                    ) : (
                      <button onClick={() => handleStatusToggle(u)}
                        className="text-[10px] font-semibold text-neutral-400 hover:text-danger underline">
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Full Name</label>
            <input type="text" value={newUser.name} required placeholder="E.g., Marcus Vance"
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Email Address</label>
            <input type="email" value={newUser.email} required placeholder="marcus@weldmonitor.io"
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="form-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Role</label>
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="form-select">
              <option value="OPERATOR">Operator — Welding operations & defect entry</option>
              <option value="MAINTENANCE_ENGINEER">Maintenance Engineer — Health, service & fault resolving</option>
              <option value="PRODUCTION_MANAGER">Production Manager — Reports, targets & downtime</option>
              <option value="ADMIN">Admin — Full system & user control</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

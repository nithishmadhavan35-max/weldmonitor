import React, { useState, useEffect } from 'react';
import { Timer, PlusCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-dropdown p-2.5 text-xs">
      <p className="font-semibold text-neutral-700 mb-1">{label}</p>
      {payload.map((p) => <p key={p.name} style={{ color: p.fill }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
};

export const DowntimePage = () => {
  const [downtimeData, setDowntimeData] = useState(null);
  const [machines, setMachines]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const [formData, setFormData] = useState({ machineId: 'WM-101', reason: 'ELECTRODE_REPLACEMENT', notes: '' });
  const { isOperator, isAdmin, isMaintenance } = useAuth();

  const fetchDowntime = async () => {
    try {
      const [dtRes, mRes] = await Promise.all([api.get('/downtime'), api.get('/machines')]);
      setDowntimeData(dtRes.data);
      setMachines(mRes.data.machines);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDowntime(); }, []);

  const handleCreateDowntime = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/downtime', formData);
      setModalOpen(false);
      setFormData({ machineId: 'WM-101', reason: 'ELECTRODE_REPLACEMENT', notes: '' });
      await fetchDowntime();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setSubmitting(false); }
  };

  const handleResolveIncident = async (id) => {
    try {
      await api.patch(`/downtime/${id}`, { status: 'RESOLVED', notes: 'Manually marked as resolved' });
      await fetchDowntime();
    } catch { alert('Failed to resolve incident'); }
  };

  const chartData = Object.entries(downtimeData?.downtimeByReason || {}).map(([reason, seconds]) => ({
    reason: reason.replace('_', ' '), minutes: Number((seconds / 60).toFixed(1)),
  }));
  const totalMinutes = Math.round((downtimeData?.totalDowntimeSeconds || 0) / 60);
  const activeCount  = (downtimeData?.incidents || []).filter((i) => i.status === 'ACTIVE').length;
  const availability = Math.max(88, 100 - Number((totalMinutes / 60).toFixed(1)));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Downtime</h1>
          <p className="page-subtitle">Root-cause categorization, non-overlapping interval tracking, and recovery auditing.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(isOperator || isAdmin || isMaintenance) && (
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              <PlusCircle className="w-3.5 h-3.5" /> Log Incident
            </button>
          )}
          <button onClick={fetchDowntime} className="btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Downtime</p>
          <p className="text-2xl font-display font-bold text-neutral-900 mt-1">{totalMinutes} <span className="text-sm font-normal text-neutral-400">min</span></p>
          <p className="text-xs text-neutral-400 mt-2">Deduplicated interval sum</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Active Outages</p>
          <p className={`text-2xl font-display font-bold mt-1 ${activeCount > 0 ? 'text-danger' : 'text-success'}`}>{activeCount}</p>
          <p className={`text-xs mt-2 ${activeCount > 0 ? 'text-danger' : 'text-success'}`}>
            {activeCount > 0 ? 'Currently stopped or faulted' : 'All cells operational'}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Fleet Availability</p>
          <p className="text-2xl font-display font-bold text-success mt-1">{availability}%</p>
          <p className="text-xs text-neutral-400 mt-2">Calculated uptime index</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-sm text-neutral-900">Downtime Minutes by Root Cause</h2>
          <span className="text-xs text-neutral-400">Total minutes</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="reason" stroke="#d1d5db" fontSize={10} angle={-15} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="minutes" fill="#dc2626" radius={[4, 4, 0, 0]} name="Minutes Lost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incidents table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <h2 className="font-display font-bold text-sm text-neutral-900">Incident Registry</h2>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine</th><th>Start</th><th>End</th><th>Duration</th>
                <th>Root Cause</th><th>Status</th><th>Notes</th><th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(downtimeData?.incidents || []).map((inc) => (
                <tr key={inc._id}>
                  <td><span className="font-mono font-bold text-brand">{inc.machineId}</span></td>
                  <td className="font-mono text-xs text-neutral-400 whitespace-nowrap">{new Date(inc.startTime).toLocaleTimeString()}</td>
                  <td className="font-mono text-xs text-neutral-400 whitespace-nowrap">
                    {inc.endTime ? new Date(inc.endTime).toLocaleTimeString() : <span className="text-danger">Active</span>}
                  </td>
                  <td className="font-mono text-xs font-semibold text-neutral-700">
                    {inc.durationSeconds ? `${Math.round(inc.durationSeconds / 60)} min` : '—'}
                  </td>
                  <td><span className="badge badge-gray font-mono">{inc.reason?.replace('_', ' ')}</span></td>
                  <td>
                    <span className={`badge ${inc.status === 'ACTIVE' ? 'badge-red' : 'badge-green'}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="text-neutral-400 text-xs max-w-[180px] truncate">{inc.notes || '—'}</td>
                  <td className="text-right">
                    {inc.status === 'ACTIVE' && (isMaintenance || isAdmin) ? (
                      <button onClick={() => handleResolveIncident(inc._id)} className="badge badge-green cursor-pointer hover:opacity-80">
                        Resolve
                      </button>
                    ) : (
                      <span className="text-neutral-300 text-xs">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Downtime Incident">
        <form onSubmit={handleCreateDowntime} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Machine</label>
            <select value={formData.machineId} onChange={(e) => setFormData({ ...formData, machineId: e.target.value })} className="form-select">
              {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Downtime Reason</label>
            <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="form-select">
              <option value="ELECTRODE_REPLACEMENT">Electrode Replacement</option>
              <option value="FEEDER_JAM">Wire Feeder Jam</option>
              <option value="OVERHEATING">Overheating / Cooling Issue</option>
              <option value="ROBOT_PATH_ERROR">Robot Path / Collision Error</option>
              <option value="SCHEDULED_MAINTENANCE">Scheduled Maintenance</option>
              <option value="OPERATOR_BREAK">Operator Shift Break</option>
              <option value="GAS_FLOW_ISSUE">Shielding Gas Pressure Drop</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Notes</label>
            <textarea rows={3} value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="E.g., Robot stopped due to wire snagging on feed drum reel…"
              className="form-input resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Logging…' : 'Start Tracking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

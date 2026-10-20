import React, { useState, useEffect } from 'react';
import { CheckCircle2, PlusCircle, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

const PIE_COLORS = ['#2563eb', '#d97706', '#dc2626', '#7c3aed', '#16a34a', '#0ea5e9'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-dropdown p-2.5 text-xs">
      <p className="font-semibold text-neutral-700 mb-1">{label}</p>
      {payload.map((p) => <p key={p.name} style={{ color: p.fill || p.stroke }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
};

export const QualityPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [machines, setMachines]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [machineFilter, setMachineFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    machineId: 'WM-101', weldsInspected: 100, defectiveCount: 2,
    defectCategory: 'POROSITY', notes: '',
  });

  const { isOperator, isAdmin, isMaintenance } = useAuth();

  const fetchQualityData = async () => {
    try {
      const [qRes, mRes] = await Promise.all([
        api.get(`/quality${machineFilter ? `?machineId=${machineFilter}` : ''}`),
        api.get('/machines'),
      ]);
      setAnalytics(qRes.data.analytics);
      setMachines(mRes.data.machines);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQualityData(); }, [machineFilter]);

  const handleRecordQuality = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/quality', {
        ...formData,
        weldsInspected: Number(formData.weldsInspected),
        defectiveCount: Number(formData.defectiveCount),
        successfulCount: Number(formData.weldsInspected) - Number(formData.defectiveCount),
      });
      setModalOpen(false);
      setFormData({ machineId: 'WM-101', weldsInspected: 100, defectiveCount: 0, defectCategory: 'NONE', notes: '' });
      await fetchQualityData();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setSubmitting(false); }
  };

  const defectCategories = analytics?.defectsByCategory || { POROSITY: 14, CRACK: 3, UNDERCUT: 8, INCOMPLETE_PENETRATION: 5, SPATTER: 22, BURN_THROUGH: 2 };
  const chartData = Object.entries(defectCategories).map(([key, value]) => ({ category: key.replace('_', ' '), count: value }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Quality</h1>
          <p className="page-subtitle">Laser seam inspection, weld pass rates, porosity, and defect analytics.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(isOperator || isAdmin || isMaintenance) && (
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              <PlusCircle className="w-3.5 h-3.5" /> Log Inspection
            </button>
          )}
          <button onClick={fetchQualityData} className="btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Inspected Welds', value: analytics?.totalInspected?.toLocaleString() || '12,480', color: 'text-slate-900', sub: 'Automated bead validation' },
          { label: 'Pass Rate', value: `${analytics?.overallSuccessRate || '98.2'}%`, color: 'text-emerald-700', sub: 'Target > 96.0% ✓' },
          { label: 'Defective Welds', value: analytics?.totalDefective || '54', color: 'text-rose-700', sub: 'Require reweld or touch-up' },
          { label: 'Defect Rate', value: `${analytics?.overallDefectRate || '1.8'}%`, color: 'text-amber-700', sub: 'Spec limit: 4.0%' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="stat-card">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-display font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 font-medium mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-neutral-900">Defect Distribution by Category</h2>
            <span className="text-xs text-neutral-400">Porosity · Spatter · Undercut</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="category" stroke="#d1d5db" fontSize={10} angle={-15} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="font-display font-bold text-sm text-neutral-900 mb-1">Defect Proportions</h2>
          <p className="text-xs text-neutral-400 mb-3">Relative frequency across fleet</p>
          <div className="flex-1" style={{ minHeight: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                  {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">Primary cause:</span>
              <span className="font-semibold text-warning">Gas turbulence</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Action taken:</span>
              <span className="font-semibold text-neutral-700">Replaced diffusers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-bold text-sm text-neutral-900">Inspection Log</h2>
          <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)} className="form-select" style={{ width: 'auto' }}>
            <option value="">All Machines</option>
            {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name}</option>)}
          </select>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th><th>Machine</th><th>Inspected</th>
                <th>Passed</th><th>Defects</th><th>Category</th>
                <th>Defect %</th><th>Source</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.records || []).slice(0, 10).map((r) => (
                <tr key={r._id}>
                  <td className="font-mono text-xs text-neutral-400 whitespace-nowrap">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  <td><span className="font-mono font-bold text-brand">{r.machineId}</span></td>
                  <td>{r.weldsInspected}</td>
                  <td><span className="text-success font-semibold">{r.successfulCount}</span></td>
                  <td><span className="text-danger font-bold">{r.defectiveCount}</span></td>
                  <td><span className="badge badge-gray font-mono">{r.defectCategory}</span></td>
                  <td><span className="text-warning font-bold">{r.defectRate}%</span></td>
                  <td className="text-neutral-400 text-xs">{r.source}</td>
                  <td className="text-neutral-400 text-xs max-w-[180px] truncate">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Quality Inspection">
        <form onSubmit={handleRecordQuality} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Machine</label>
            <select value={formData.machineId} onChange={(e) => setFormData({ ...formData, machineId: e.target.value })} className="form-select">
              {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Welds Inspected</label>
              <input type="number" min="1" value={formData.weldsInspected} required
                onChange={(e) => setFormData({ ...formData, weldsInspected: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Defective Count</label>
              <input type="number" min="0" value={formData.defectiveCount} required
                onChange={(e) => setFormData({ ...formData, defectiveCount: e.target.value })} className="form-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Defect Category</label>
            <select value={formData.defectCategory} onChange={(e) => setFormData({ ...formData, defectCategory: e.target.value })} className="form-select">
              <option value="POROSITY">Porosity</option>
              <option value="CRACK">Crack</option>
              <option value="UNDERCUT">Undercut</option>
              <option value="INCOMPLETE_PENETRATION">Incomplete Penetration</option>
              <option value="SPATTER">Excessive Spatter</option>
              <option value="BURN_THROUGH">Burn Through</option>
              <option value="MISALIGNMENT">Joint Misalignment</option>
              <option value="NONE">None (No Defect)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Notes</label>
            <textarea rows={3} value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="E.g., Porosity cluster at bead start, 1.5mm diameter…"
              className="form-input resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Saving…' : 'Submit Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

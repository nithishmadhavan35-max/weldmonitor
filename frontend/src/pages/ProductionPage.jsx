import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Award, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-dropdown p-2.5 text-xs">
      <p className="font-semibold text-neutral-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }} className="font-medium">
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

export const ProductionPage = () => {
  const [productionData, setProductionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProduction = async () => {
    try {
      const res = await api.get('/production/summary');
      setProductionData(res.data.summary);
    } catch (err) { console.error('Failed to load production summary:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProduction(); }, []);

  const breakdown = productionData?.machineBreakdown || [];
  const achievement = productionData?.overallAchievement || 78.7;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Production</h1>
          <p className="page-subtitle">Output KPIs, target achievement rates, and machine-to-machine yield comparison.</p>
        </div>
        <button onClick={fetchProduction} className="btn-secondary self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Welds</p>
            <Award className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-display font-bold text-neutral-900">
            {productionData?.totalWelds?.toLocaleString() || '9,840'}
          </p>
          <p className="text-xs text-neutral-400 mt-2">Active factory-wide counter</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Daily Target</p>
            <Target className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-display font-bold text-neutral-900">
            {productionData?.totalTarget?.toLocaleString() || '12,500'}
          </p>
          <p className="text-xs text-neutral-400 mt-2">Combined across 10 cells</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Achievement</p>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-display font-bold text-success">{achievement}%</p>
          <div className="progress-bar mt-3">
            <div className="progress-fill bg-success" style={{ width: `${Math.min(100, achievement)}%` }} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-sm text-neutral-900">Machine Output vs Target</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Completed welds per station vs shift target</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown} margin={{ top: 4, right: 4, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="machineId" stroke="#d1d5db" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="welds"  fill="#2563eb" radius={[4, 4, 0, 0]} name="Completed Welds" />
              <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Shift Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <h2 className="font-display font-bold text-sm text-neutral-900">Station Throughput Breakdown</h2>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine</th><th>Name & Station</th><th>Status</th>
                <th>Completed</th><th>Target</th><th>Achievement</th>
                <th>Defect %</th><th>Health</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.machineId}>
                  <td><span className="font-mono font-bold text-brand">{row.machineId}</span></td>
                  <td>
                    <span className="font-semibold text-neutral-800 text-xs">{row.name}</span>
                    <span className="block text-neutral-400 text-[11px]">{row.station}</span>
                  </td>
                  <td><span className="badge badge-gray font-mono text-[10px]">{row.state}</span></td>
                  <td className="font-mono font-bold text-neutral-900">{row.welds?.toLocaleString()}</td>
                  <td className="font-mono text-neutral-400">{row.target?.toLocaleString()}</td>
                  <td>
                    <span className={`font-mono font-bold text-xs ${
                      row.achievementPercent >= 80 ? 'text-success' :
                      row.achievementPercent >= 60 ? 'text-warning' : 'text-danger'
                    }`}>
                      {row.achievementPercent}%
                    </span>
                  </td>
                  <td className="font-mono text-xs text-neutral-500">{row.defectRate}%</td>
                  <td className="font-mono font-bold text-brand text-xs">{row.healthScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Cpu,
  CheckCircle,
  Wrench,
  ArrowUpRight,
  ShieldAlert,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge, AlertStateBadge } from '../components/common/SeverityBadge';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg shadow-dropdown p-3 text-xs">
        <p className="font-semibold text-neutral-700 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const OverviewPage = () => {
  const [summary, setSummary] = useState(null);
  const [machines, setMachines] = useState([]);
  const [productionData, setProductionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { liveMachines, isConnected } = useSocket();

  const fetchDashboardData = async () => {
    try {
      const [sumRes, machRes, prodRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/machines'),
        api.get('/production/summary'),
      ]);
      setSummary(sumRes.data.summary);
      setMachines(machRes.data.machines);
      setProductionData(prodRes.data.summary);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const mergedMachines = machines.map((m) => {
    const live = liveMachines[m.machineId];
    if (live) {
      return { ...m, state: live.state || m.state, latestTelemetry: { ...m.latestTelemetry, ...(live.telemetry || {}) } };
    }
    return m;
  });

  const runningCount = mergedMachines.filter((m) => m.state === 'RUNNING').length;
  const idleCount    = mergedMachines.filter((m) => m.state === 'IDLE').length;
  const errorCount   = mergedMachines.filter((m) => m.state === 'ERROR').length;
  const stoppedCount = mergedMachines.filter((m) => m.state === 'STOPPED').length;
  const totalWelds   = mergedMachines.reduce((acc, m) => acc + (m.latestTelemetry?.weldCount || 0), 0);
  const totalTarget  = mergedMachines.reduce((acc, m) => acc + (m.productionTarget || 1200), 0);
  const achievementRate = totalTarget > 0 ? ((totalWelds / totalTarget) * 100).toFixed(1) : 0;

  const hourlyData = productionData?.hourlyTrend || [
    { time: '06:00', actual: 400,  target: 450  },
    { time: '08:00', actual: 950,  target: 900  },
    { time: '10:00', actual: 1600, target: 1400 },
    { time: '12:00', actual: 2300, target: 2100 },
    { time: '14:00', actual: 3100, target: 2900 },
    { time: '16:00', actual: 3900, target: 3800 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Operations Overview</h1>
          <p className="page-subtitle">Real-time welding fleet status, telemetry aggregation, and quality assurance.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchDashboardData}
            className="btn-secondary"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link to="/factory-floor" className="btn-primary">
            Factory Floor
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Fleet Status */}
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fleet Status</p>
              <p className="text-2xl font-display font-bold text-slate-900 mt-1">{runningCount} <span className="text-sm font-semibold text-slate-500">/ 10</span></p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <Cpu className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs mb-3 font-semibold">
            <span className="text-emerald-700">{runningCount} Running</span>
            <span className="text-amber-700">{idleCount} Idle</span>
            <span className="text-rose-700">{errorCount} Fault</span>
          </div>
          <div className="progress-bar">
            <div className="flex h-full">
              <div style={{ width: `${(runningCount/10)*100}%` }} className="bg-emerald-600 rounded-l-full" />
              <div style={{ width: `${(idleCount/10)*100}%` }} className="bg-amber-500" />
              <div style={{ width: `${(errorCount/10)*100}%` }} className="bg-rose-600" />
              <div style={{ width: `${(stoppedCount/10)*100}%` }} className="bg-slate-300 rounded-r-full" />
            </div>
          </div>
        </div>

        {/* Production */}
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Output</p>
              <p className="text-2xl font-display font-bold text-slate-900 mt-1">{totalWelds.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3 font-medium">
            Target: <span className="font-bold text-slate-700">{totalTarget.toLocaleString()}</span> welds
            <span className="ml-2 text-emerald-700 font-bold">{achievementRate}%</span>
          </p>
          <div className="progress-bar">
            <div className="progress-fill bg-blue-600" style={{ width: `${Math.min(100, achievementRate)}%` }} />
          </div>
        </div>

        {/* Defect Rate */}
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Defect Rate</p>
              <p className="text-2xl font-display font-bold text-slate-900 mt-1">
                {summary?.production?.overallDefectRate ?? '1.8'}%
              </p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3 font-medium">
            Spec threshold: <span className="font-bold text-slate-700">&lt;4%</span>
            <span className="ml-2 text-emerald-700 font-bold">Within Spec</span>
          </p>
          <div className="progress-bar">
            <div className="progress-fill bg-amber-500" style={{ width: '45%' }} />
          </div>
        </div>

        {/* Alerts */}
        <div className="stat-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Alerts</p>
              <p className="text-2xl font-display font-bold text-rose-700 mt-1">
                {summary?.activeAlertsCount ?? 0}
              </p>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3 font-medium">
            Downtime today: <span className="font-bold text-slate-800">{summary?.totalDowntimeMinutes ?? 42} min</span>
          </p>
          <div className="progress-bar">
            <div className="progress-fill bg-rose-600" style={{ width: '25%' }} />
          </div>
        </div>
      </div>

      {/* Middle row: machine matrix + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Machine Matrix */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-base text-neutral-900">Live Machine Matrix</h2>
              <p className="text-xs text-neutral-400 mt-0.5">10 robotic cells — voltage, current & temperature</p>
            </div>
            <Link to="/machines" className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mergedMachines.slice(0, 6).map((m) => {
              const tel = m.latestTelemetry || {};
              const isErr = m.state === 'ERROR';
              return (
                <div
                  key={m.machineId}
                  className={`p-3 rounded-lg border transition-colors ${
                    isErr ? 'border-danger/30 bg-danger/[0.03]' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{m.machineId}</span>
                      <span className="text-xs text-slate-600 truncate max-w-[110px] font-medium">{m.name}</span>
                    </div>
                    <StatusBadge state={m.state} size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    {[
                      { label: 'Temp', value: `${tel.temperature ?? '—'}°C`, warn: tel.temperature > 275 },
                      { label: 'Voltage', value: `${tel.voltage ?? '—'} V` },
                      { label: 'Current', value: `${tel.current ?? '—'} A` },
                    ].map(({ label, value, warn }) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                        <p className={`text-xs font-bold mt-0.5 ${warn ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Production trend chart */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-base text-neutral-900">Hourly Trend</h2>
            <span className="badge badge-green font-mono">Shift 1</span>
          </div>
          <p className="text-xs text-neutral-400 mb-4">Completed welds vs planned target</p>

          <div className="flex-1" style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}  />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="time" stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#d1d5db" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#actualGrad)" name="Actual" />
                <Area type="monotone" dataKey="target" stroke="#d1d5db" strokeDasharray="4 4" strokeWidth={1.5} fill="none" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Fleet OEE:</span>
            <span className="font-bold text-success">94.8%</span>
          </div>
        </div>
      </div>

      {/* Bottom row: alerts + maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <h2 className="font-display font-bold text-base text-neutral-900">Active Alerts</h2>
            </div>
            <Link to="/alerts" className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1">
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {(summary?.activeAlerts || []).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                No active alerts — all machines nominal.
              </div>
            ) : (
              (summary.activeAlerts).slice(0, 4).map((alert) => (
                <div key={alert._id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={alert.severity} />
                      <span className="font-mono font-semibold text-xs text-neutral-900">{alert.machineId}</span>
                      <AlertStateBadge state={alert.state} />
                    </div>
                    <p className="text-xs text-neutral-600 truncate">{alert.message}</p>
                  </div>
                  <Link to="/alerts" className="btn-secondary text-xs py-1 px-2.5 flex-shrink-0">Action</Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-brand" />
              <h2 className="font-display font-bold text-base text-neutral-900">Upcoming Maintenance</h2>
            </div>
            <Link to="/maintenance" className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {(summary?.upcomingMaintenance || []).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                No maintenance due within 48 hours.
              </div>
            ) : (
              (summary.upcomingMaintenance).slice(0, 4).map((task) => (
                <div key={task._id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-100 hover:bg-neutral-50">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-brand">{task.machineId}</span>
                      <span className="text-xs font-semibold text-neutral-800 truncate">{task.title}</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                      {' · '}
                      <span className="text-warning font-semibold">{task.priority}</span>
                    </p>
                  </div>
                  <span className="badge badge-blue font-mono flex-shrink-0">{task.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

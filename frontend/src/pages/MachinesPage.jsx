import React, { useState, useEffect } from 'react';
import {
  Search,
  Cpu,
  Flame,
  Zap,
  Activity,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

const STATUS_FILTERS = ['ALL', 'RUNNING', 'IDLE', 'STOPPED', 'ERROR'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-dropdown p-2.5 text-xs">
      <p className="text-neutral-500 mb-1">{new Date(label).toLocaleTimeString()}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.stroke }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export const MachinesPage = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineTelemetry, setMachineTelemetry] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { liveMachines } = useSocket();
  const { isOperator, isAdmin } = useAuth();

  const fetchMachines = async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data.machines);
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMachines(); }, []);

  const openMachineDetail = async (machine) => {
    setSelectedMachine(machine);
    setModalOpen(true);
    try {
      const res = await api.get(`/machines/${machine.machineId}/telemetry?limit=25`);
      setMachineTelemetry(res.data.readings || []);
    } catch (err) {
      console.error('Failed to fetch telemetry history:', err);
    }
  };

  const mergedMachines = machines.map((m) => {
    const live = liveMachines[m.machineId];
    return live
      ? { ...m, state: live.state || m.state, latestTelemetry: { ...m.latestTelemetry, ...(live.telemetry || {}) } }
      : m;
  });

  const filteredMachines = mergedMachines.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = m.machineId.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.station.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || m.state === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSimAction = async (actionType) => {
    if (!selectedMachine) return;
    setActionLoading(true);
    try {
      const id = selectedMachine.machineId;
      if (actionType === 'overheat')   await api.post(`/simulation/machines/${id}/overheat`);
      else if (actionType === 'fault') await api.post(`/simulation/machines/${id}/fault`, { code: 'ERR_SERVO_OVERLOAD', message: 'Joint 3 servo tracking exceeded maximum angular torque' });
      else if (actionType === 'recover') await api.post(`/simulation/machines/${id}/recover`);
      await fetchMachines();
    } catch (err) {
      alert(`Simulation action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Machines</h1>
          <p className="page-subtitle">Real-time telemetry across all 10 robotic welding cells.</p>
        </div>
        <button onClick={fetchMachines} className="btn-secondary self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search machine ID, name, or station…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredMachines.length === 0 ? (
        <div className="card text-center py-16">
          <Cpu className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
          <p className="font-semibold text-neutral-500">No machines match your filter</p>
          <p className="text-xs text-neutral-400 mt-1">Try adjusting the search or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMachines.map((m) => {
            const tel = m.latestTelemetry || {};
            const isErr = m.state === 'ERROR';
            const tempExceeded = tel.temperature > (m.alertThresholds?.maxTemperature || 280);
            const progress = Math.min(100, ((tel.weldCount || 0) / (m.productionTarget || 1200)) * 100);

            return (
              <div
                key={m.machineId}
                className={`card flex flex-col gap-3 transition-all ${
                  isErr ? 'border-danger/30 bg-red-50/40' : 'hover:shadow-card-md hover:border-neutral-300'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{m.machineId}</span>
                      <span className="badge badge-gray font-mono">{m.location?.zone?.split('-')[0] || 'Zone A'}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{m.name}</p>
                    <p className="text-xs text-slate-500 truncate">{m.station}</p>
                  </div>
                  <StatusBadge state={m.state} size="sm" />
                </div>

                {/* Telemetry grid */}
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                  {[
                    { icon: Flame, label: 'TEMP',    value: `${tel.temperature ?? 0}°C`,  warn: tempExceeded, iconColor: 'text-amber-600' },
                    { icon: Zap,   label: 'VOLTAGE', value: `${tel.voltage ?? 0} V`,      iconColor: 'text-blue-600' },
                    { icon: Activity, label: 'AMPS', value: `${tel.current ?? 0} A`,      iconColor: 'text-emerald-600' },
                  ].map(({ icon: Icon, label, value, warn, iconColor }) => (
                    <div key={label}>
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">
                        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                        {label}
                      </div>
                      <p className={`text-sm font-bold ${warn ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* KPIs */}
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'Welds', value: `${(tel.weldCount || 0).toLocaleString()} / ${m.productionTarget || 1200}` },
                    { label: 'Defect Rate', value: `${tel.defectRate ?? 0}% (${tel.defectCount ?? 0} defects)`, color: (tel.defectRate || 0) > 3 ? 'text-rose-600' : 'text-emerald-700' },
                    { label: 'Health', value: `${tel.healthScore ?? 100}%`, color: 'text-blue-700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">{label}:</span>
                      <span className={`font-mono font-bold ${color || 'text-slate-800'}`}>{value}</span>
                    </div>
                  ))}
                  {/* Progress bar */}
                  <div className="progress-bar mt-1">
                    <div className="progress-fill bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">
                    {new Date(tel.lastUpdated || m.updatedAt).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => openMachineDetail(m)}
                    className="btn-secondary py-1 px-2.5 text-xs"
                  >
                    Inspect <ChevronRight className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`${selectedMachine.machineId} — ${selectedMachine.name}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            {/* Info row */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-neutral-50 border border-neutral-100">
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Station</p>
                <p className="font-semibold text-neutral-900 text-sm">{selectedMachine.station}</p>
                <p className="text-xs text-neutral-400">{selectedMachine.type}</p>
              </div>
              <StatusBadge state={selectedMachine.state} size="md" />
            </div>

            {/* Chart */}
            <div>
              <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand" />
                Temperature & Current — Recent Telemetry
              </h4>
              <div className="h-52 bg-neutral-50 rounded-lg border border-neutral-100 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={machineTelemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="#d1d5db" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString().slice(0, 5)} />
                    <YAxis stroke="#d1d5db" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="temperature" stroke="#d97706" strokeWidth={2} dot={false} name="Temp (°C)" />
                    <Line type="monotone" dataKey="current" stroke="#2563eb" strokeWidth={1.5} dot={false} name="Current (A)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Thresholds */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Alert Thresholds</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Max Temp', value: `${selectedMachine.alertThresholds?.maxTemperature || 280}°C` },
                  { label: 'Voltage', value: `${selectedMachine.alertThresholds?.minVoltage || 18}–${selectedMachine.alertThresholds?.maxVoltage || 34} V` },
                  { label: 'Current', value: `${selectedMachine.alertThresholds?.minCurrent || 120}–${selectedMachine.alertThresholds?.maxCurrent || 280} A` },
                  { label: 'Max Defect', value: `${selectedMachine.alertThresholds?.maxDefectRate || 4.0}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="font-bold text-sm text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulator controls */}
            {(isOperator || isAdmin) && (
              <div className="pt-4 border-t border-neutral-100">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
                  Simulation Controls — {selectedMachine.machineId}
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button disabled={actionLoading} onClick={() => handleSimAction('overheat')}
                    className="btn-secondary text-xs border-warning/30 text-warning hover:bg-warning/10 disabled:opacity-50">
                    Simulate Overheat
                  </button>
                  <button disabled={actionLoading} onClick={() => handleSimAction('fault')}
                    className="btn-danger text-xs disabled:opacity-50">
                    Inject Fault
                  </button>
                  <button disabled={actionLoading} onClick={() => handleSimAction('recover')}
                    className="btn-secondary text-xs border-success/30 text-success hover:bg-success/10 disabled:opacity-50">
                    Recover to Running
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

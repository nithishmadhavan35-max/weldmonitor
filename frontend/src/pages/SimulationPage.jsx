import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Play,
  Pause,
  RotateCcw,
  Flame,
  AlertTriangle,
  Activity,
  CheckCircle,
  ShieldAlert,
  Info,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const SimulationPage = () => {
  const [status, setStatus] = useState(null);
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('WM-101');
  const [faultReason, setFaultReason] = useState('SERVO_FAIL');
  const [targetState, setTargetState] = useState('ERROR');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { liveMachines } = useSocket();
  const { isOperator, isAdmin } = useAuth();

  const fetchStatusAndMachines = async () => {
    try {
      const [sRes, mRes] = await Promise.all([api.get('/simulation/status'), api.get('/machines')]);
      setStatus(sRes.data);
      setMachines(mRes.data.machines);
    } catch (err) { console.error('Failed to load simulation status:', err); }
  };

  useEffect(() => { fetchStatusAndMachines(); }, []);

  const exec = async (fn, msg) => {
    setLoading(true);
    try { await fn(); setMessage(msg); await fetchStatusAndMachines(); }
    catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  };

  const handleTogglePlay = () => exec(
    () => status?.isRunning ? api.post('/simulation/pause') : api.post('/simulation/resume'),
    status?.isRunning ? 'Simulation paused.' : 'Simulation resumed.'
  );
  const handleReset = () => {
    if (!window.confirm('Reset all 10 machines to nominal running parameters?')) return;
    exec(() => api.post('/simulation/reset'), 'All 10 cells reset to baseline.');
  };
  const handleTriggerFault = () => {
    const faultConfigs = {
      SERVO_FAIL: { code: 'ERR_SERVO_FAIL', msg: 'Joint 3 robotic servo tracking error' },
      FEEDER_JAM: { code: 'ERR_FEED_JAM', msg: 'Wire feed motor overload / liner jam' },
      GAS_DROP:   { code: 'ERR_GAS_LOW', msg: 'Argon shielding gas flow collapsed below 4 L/min' },
      ARC_BLOW:   { code: 'ERR_ARC_FAIL', msg: 'Arc strike ignition failure on joint seam' },
    };
    const cfg = faultConfigs[faultReason] || faultConfigs.SERVO_FAIL;
    exec(
      () => api.post(`/simulation/machines/${selectedMachineId}/fault`, { code: cfg.code, message: cfg.msg }),
      `Triggered ${cfg.code} on ${selectedMachineId}`
    );
  };
  const handleSimulateOverheat = () => exec(
    () => api.post(`/simulation/machines/${selectedMachineId}/overheat`),
    `Surged temperature to 318°C on ${selectedMachineId}`
  );
  const handleStateChange = () => exec(
    () => api.post(`/simulation/machines/${selectedMachineId}/state`, { state: targetState }),
    `Changed ${selectedMachineId} to ${targetState}`
  );
  const handleRecover = (mId) => exec(
    () => api.post(`/simulation/machines/${mId || selectedMachineId}/recover`),
    `Machine ${mId || selectedMachineId} recovered to RUNNING.`
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Simulator Controls</h1>
          <p className="page-subtitle">Inject faults, test telemetry fluctuations, and exercise the alert lifecycle.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleTogglePlay}
            disabled={loading}
            className={status?.isRunning
              ? 'btn-secondary border-warning/40 text-warning'
              : 'btn-secondary border-success/40 text-success'
            }
          >
            {status?.isRunning ? <><Pause className="w-3.5 h-3.5" />Pause Loop</> : <><Play className="w-3.5 h-3.5" />Resume Loop</>}
          </button>
          <button onClick={handleReset} disabled={loading} className="btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> Reset All
          </button>
        </div>
      </div>

      {/* Safety notice */}
      <div className="card border-l-4 border-l-info bg-blue-50/50 flex items-start gap-3 py-3">
        <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-neutral-800">Simulation Boundary Notice</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            This module operates in software simulation only. No commands are sent to physical PLCs or robotic welders.
            All faults trigger server-side alerts and WebSocket telemetry for training purposes.
          </p>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30 text-xs text-success font-semibold">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-neutral-400 hover:text-neutral-700 ml-4">✕</button>
        </div>
      )}

      {/* Control panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel 1: Machine Selector & Quick Actions */}
        <div className="card space-y-4">
          <h2 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" /> Target Machine
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Select Robot Cell</label>
            <select value={selectedMachineId} onChange={(e) => setSelectedMachineId(e.target.value)} className="form-select font-medium text-slate-800">
              {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name} ({m.state})</option>)}
            </select>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <button onClick={handleSimulateOverheat} disabled={loading}
              className="w-full py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Flame className="w-4 h-4 text-amber-600" /> Simulate Overheat (318°C)
            </button>
            <button onClick={() => handleRecover(selectedMachineId)} disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Recover to Running
            </button>
          </div>
        </div>

        {/* Panel 2: Fault Injection */}
        <div className="card space-y-4">
          <h2 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" /> Inject Fault
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Fault Type</label>
            <select value={faultReason} onChange={(e) => setFaultReason(e.target.value)} className="form-select font-medium text-slate-800">
              <option value="SERVO_FAIL">Servo Tracking Error (Critical)</option>
              <option value="FEEDER_JAM">Wire Feeder Motor Jam (Warning)</option>
              <option value="GAS_DROP">Argon Pressure Loss (Critical)</option>
              <option value="ARC_BLOW">Arc Strike Failure (Warning)</option>
            </select>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Injecting this fault transitions the machine to <strong className="text-rose-700 font-bold">ERROR</strong> state, logs downtime, and triggers an alert.
          </p>
          <button onClick={handleTriggerFault} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Inject on {selectedMachineId}
          </button>
        </div>

        {/* Panel 3: State Override */}
        <div className="card space-y-4">
          <h2 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> State Override
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Target State</label>
            <select value={targetState} onChange={(e) => setTargetState(e.target.value)} className="form-select font-medium text-slate-800">
              <option value="RUNNING">Running</option>
              <option value="IDLE">Idle</option>
              <option value="STOPPED">Stopped</option>
              <option value="ERROR">Error/Fault</option>
            </select>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Direct state overrides bypass sensor transitions to test frontend badge and status updates.
          </p>
          <button onClick={handleStateChange} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <Zap className="w-4 h-4 text-blue-600" /> Apply to {selectedMachineId}
          </button>
        </div>
      </div>

      {/* Fleet Summary */}
      <div className="card">
        <h2 className="font-display font-bold text-sm text-neutral-900 mb-4">Fleet State Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {machines.map((m) => {
            const live = liveMachines[m.machineId];
            const state = live?.state || m.state;
            const isErr = state === 'ERROR';
            return (
              <div key={m.machineId}
                className={`p-3 rounded-lg border flex flex-col gap-2 ${isErr ? 'border-danger/30 bg-red-50' : 'border-neutral-200 bg-neutral-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-neutral-900">{m.machineId}</span>
                  <StatusBadge state={state} size="sm" />
                </div>
                <p className="text-[11px] text-neutral-400 truncate">{m.name}</p>
                {isErr && (
                  <button onClick={() => handleRecover(m.machineId)}
                    className="py-1 px-2 rounded bg-success/10 text-success text-[10px] font-bold hover:bg-success/20">
                    Recover
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Info, Flame, Zap, Activity, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatusBadge } from '../components/common/StatusBadge';

export const FactoryFloorPage = () => {
  const [machines, setMachines]         = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading]           = useState(true);
  const { liveMachines }                = useSocket();

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const res = await api.get('/machines');
        setMachines(res.data.machines);
        if (res.data.machines.length > 0) setSelectedMachine(res.data.machines[0]);
      } catch (err) { console.error('Failed to load floor machines:', err); }
      finally { setLoading(false); }
    };
    fetchMachines();
  }, []);

  const mergedMachines = machines.map((m) => {
    const live = liveMachines[m.machineId];
    return live ? { ...m, state: live.state || m.state, latestTelemetry: { ...m.latestTelemetry, ...(live.telemetry || {}) } } : m;
  });

  const activeSelected = selectedMachine
    ? mergedMachines.find((m) => m.machineId === selectedMachine.machineId) || selectedMachine
    : null;

  const floorPositions = {
    'WM-101': { x: 120, y: 110 }, 'WM-102': { x: 320, y: 110 },
    'WM-103': { x: 520, y: 110 }, 'WM-104': { x: 720, y: 110 },
    'WM-105': { x: 120, y: 280 }, 'WM-106': { x: 320, y: 280 },
    'WM-107': { x: 520, y: 280 }, 'WM-108': { x: 120, y: 450 },
    'WM-109': { x: 320, y: 450 }, 'WM-110': { x: 520, y: 450 },
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'RUNNING': return { stroke: '#16a34a', fill: '#f0fdf4', dot: '#16a34a' };
      case 'IDLE':    return { stroke: '#d97706', fill: '#fffbeb', dot: '#d97706' };
      case 'ERROR':   return { stroke: '#dc2626', fill: '#fef2f2', dot: '#dc2626' };
      default:        return { stroke: '#9ca3af', fill: '#f9fafb', dot: '#9ca3af' };
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <div className="flex items-center gap-2">
            <h1 className="page-title">Factory Floor Map</h1>
            <span className="badge badge-yellow">Simulated Layout</span>
          </div>
          <p className="page-subtitle">2D schematic of all 10 robotic welding cells with live telemetry.</p>
        </div>
        <Link to="/machines" className="btn-secondary self-start sm:self-auto">
          <LayoutGrid className="w-3.5 h-3.5" /> Card Grid View
        </Link>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* SVG Map */}
        <div className="lg:col-span-2 card p-4">
          {/* Legend */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-brand inline-block" />
              FACILITY: DETROIT METAL FAB CELL 4
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              {[
                { label: 'Running', color: '#16a34a' },
                { label: 'Idle',    color: '#d97706' },
                { label: 'Fault',   color: '#dc2626' },
                { label: 'Stopped', color: '#9ca3af' },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                  <span className="text-neutral-500">{label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="w-full h-[520px] bg-neutral-50 rounded-lg border border-neutral-100 overflow-auto">
            <svg viewBox="0 0 880 570" className="w-full h-full min-w-[700px] select-none">
              <defs>
                <pattern id="factoryGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>

              {/* Grid background */}
              <rect width="880" height="570" fill="url(#factoryGrid)" />

              {/* Zone A */}
              <rect x="30" y="30" width="820" height="145" rx="10" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="6 4" />
              <text x="46" y="52" fill="#9ca3af" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="600">ZONE A — HEAVY CHASSIS &amp; SUBFRAME ARC CELLS</text>

              {/* Zone B */}
              <rect x="30" y="200" width="820" height="145" rx="10" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="6 4" />
              <text x="46" y="222" fill="#9ca3af" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="600">ZONE B — PRECISION ROOF &amp; DOOR ASSEMBLY</text>

              {/* Zone C */}
              <rect x="30" y="370" width="680" height="170" rx="10" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="6 4" />
              <text x="46" y="392" fill="#9ca3af" fontSize="10" fontFamily="ui-monospace, monospace" fontWeight="600">ZONE C — EV BATTERY ENCLOSURE &amp; EXHAUST</text>

              {/* Conveyor lines */}
              <line x1="60" y1="120" x2="830" y2="120" stroke="#d1d5db" strokeWidth="3" strokeDasharray="10 5" />
              <line x1="60" y1="290" x2="650" y2="290" stroke="#d1d5db" strokeWidth="3" strokeDasharray="10 5" />
              <line x1="60" y1="465" x2="650" y2="465" stroke="#d1d5db" strokeWidth="3" strokeDasharray="10 5" />

              {/* Machine nodes */}
              {mergedMachines.map((m) => {
                const pos = floorPositions[m.machineId] || { x: 100, y: 100 };
                const c   = getStateColor(m.state);
                const sel = activeSelected?.machineId === m.machineId;
                const tel = m.latestTelemetry || {};

                return (
                  <g key={m.machineId} transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer" onClick={() => setSelectedMachine(m)}>
                    {/* Selection ring */}
                    {sel && (
                      <rect x="-8" y="-8" width="156" height="84" rx="12"
                        fill="none" stroke="#1d4ed8" strokeWidth="2" />
                    )}
                    {/* Error pulse ring */}
                    {m.state === 'ERROR' && !sel && (
                      <rect x="-8" y="-8" width="156" height="84" rx="12"
                        fill="none" stroke="#dc2626" strokeWidth="2"
                        style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                    )}
                    {/* Cell body */}
                    <rect x="0" y="0" width="140" height="68" rx="8"
                      fill={sel ? '#eff6ff' : c.fill}
                      stroke={sel ? '#1d4ed8' : c.stroke}
                      strokeWidth={sel ? 2 : 1.5} />
                    {/* Status dot */}
                    <circle cx="18" cy="18" r="7" fill={c.dot} />
                    {/* Machine ID */}
                    <text x="32" y="22" fill="#111827" fontSize="12"
                      fontFamily="ui-monospace, monospace" fontWeight="700">{m.machineId}</text>
                    {/* State */}
                    <text x="32" y="38" fill={c.stroke} fontSize="9"
                      fontFamily="ui-monospace, monospace" fontWeight="600">{m.state}</text>
                    {/* Telemetry */}
                    <text x="32" y="54" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">
                      {tel.temperature ?? 0}°C | {tel.voltage ?? 0}V
                    </text>
                    {/* Status indicator */}
                    <circle cx="126" cy="16" r="4" fill={c.dot} />
                  </g>
                );
              })}
            </svg>
          </div>

          <p className="mt-2 text-xs text-neutral-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-brand flex-shrink-0" />
            Click any machine station to inspect real-time diagnostics.
          </p>
        </div>

        {/* Inspector Panel */}
        <div className="card flex flex-col">
          {activeSelected ? (
            <div className="flex flex-col h-full gap-4">
              {/* Header */}
              <div className="pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-lg text-neutral-900">{activeSelected.machineId}</span>
                  <StatusBadge state={activeSelected.state} size="sm" />
                </div>
                <p className="text-sm font-semibold text-neutral-700 mt-0.5">{activeSelected.name}</p>
                <p className="text-xs text-neutral-400">{activeSelected.station}</p>
              </div>

              {/* Telemetry grid */}
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Live Sensors (5s)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Flame, label: 'Temp', value: `${activeSelected.latestTelemetry?.temperature ?? 0}°C`, iconColor: 'text-warning' },
                    { icon: Zap,   label: 'Voltage', value: `${activeSelected.latestTelemetry?.voltage ?? 0} V`, iconColor: 'text-brand' },
                    { icon: Activity, label: 'Current', value: `${activeSelected.latestTelemetry?.current ?? 0} A`, iconColor: 'text-success' },
                    { icon: null,  label: 'Health', value: `${activeSelected.latestTelemetry?.healthScore ?? 100}%`, bold: true },
                  ].map(({ icon: Icon, label, value, iconColor, bold }) => (
                    <div key={label} className="p-3 rounded-lg bg-neutral-50 border border-neutral-100 text-xs">
                      <div className="flex items-center gap-1 text-neutral-400 mb-1">
                        {Icon && <Icon className={`w-3 h-3 ${iconColor}`} />}
                        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                      </div>
                      <p className={`text-base font-bold ${bold ? 'text-brand' : 'text-neutral-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weld progress */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100 text-xs">
                <div className="flex justify-between mb-1.5">
                  <span className="text-neutral-500">Welds completed:</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {activeSelected.latestTelemetry?.weldCount ?? 0} / {activeSelected.productionTarget ?? 1200}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill bg-brand" style={{
                    width: `${Math.min(100, ((activeSelected.latestTelemetry?.weldCount || 0) / (activeSelected.productionTarget || 1200)) * 100)}%`
                  }} />
                </div>
              </div>

              {/* Maintenance info */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Operating Hours:</span>
                  <span className="font-semibold text-neutral-700">{activeSelected.maintenanceConfig?.operatingHours || 140} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Next Maintenance:</span>
                  <span className="font-semibold text-neutral-700">
                    {activeSelected.maintenanceConfig?.nextMaintenanceDate
                      ? new Date(activeSelected.maintenanceConfig.nextMaintenanceDate).toLocaleDateString()
                      : 'Scheduled'}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-auto pt-4 border-t border-neutral-100">
                <Link to="/machines" className="btn-primary w-full justify-center">
                  Open Full Telemetry <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm text-center">
              Select a machine station on the map to inspect diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

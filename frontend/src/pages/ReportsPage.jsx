import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, FileCode, RefreshCw } from 'lucide-react';
import api from '../services/api';

const CATEGORIES = [
  { id: 'production',         label: 'Production',         desc: 'Shift outputs, targets, and achievement metrics' },
  { id: 'quality',            label: 'Quality',            desc: 'Defect rates, categories, and inspection logs' },
  { id: 'downtime',           label: 'Downtime',           desc: 'Outage durations, root causes, and timeline' },
  { id: 'maintenance',        label: 'Maintenance',        desc: 'Task schedules, parts replaced, and work performed' },
  { id: 'machine-performance', label: 'Machine Perf.',    desc: 'Fleet telemetry, gas flow, and health metrics' },
];

export const ReportsPage = () => {
  const [category, setCategory]     = useState('production');
  const [machineId, setMachineId]   = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [machines, setMachines]     = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
    api.get('/machines').then((res) => setMachines(res.data.machines)).catch(() => {});
  }, []);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (machineId) params.append('machineId', machineId);
      if (startDate) params.append('startDate', startDate);
      if (endDate)   params.append('endDate', endDate);
      const res = await api.get(`/reports/${category}?${params.toString()}`);
      setPreviewData(res.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPreview(); }, [category, machineId, startDate, endDate]);

  const handleDownload = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (machineId) params.append('machineId', machineId);
      if (startDate) params.append('startDate', startDate);
      if (endDate)   params.append('endDate', endDate);
      const res = await api.get(`/reports/${category}?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `weldmonitor_${category}_report.${format}`);
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
    } catch (err) { alert(`Export failed: ${err.message}`); } finally { setExporting(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Reports & Exports</h1>
          <p className="page-subtitle">Generate production, quality, downtime, maintenance, and performance records.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button disabled={exporting} onClick={() => handleDownload('pdf')}
            className="btn-danger text-xs py-1.5 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button disabled={exporting} onClick={() => handleDownload('xlsx')}
            className="btn-secondary border-success/30 text-success hover:bg-success/10 text-xs py-1.5 disabled:opacity-50">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button disabled={exporting} onClick={() => handleDownload('csv')}
            className="btn-secondary border-brand/30 text-brand hover:bg-brand/10 text-xs py-1.5 disabled:opacity-50">
            <FileCode className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className={`p-3 rounded-lg text-left border transition-all ${
              category === c.id ? 'bg-brand text-white border-brand shadow-sm' : 'card hover:border-neutral-300'
            }`}>
            <div className={`font-semibold text-xs mb-0.5 ${category === c.id ? 'text-white' : 'text-neutral-800'}`}>{c.label}</div>
            <div className={`text-[11px] leading-relaxed line-clamp-2 ${category === c.id ? 'text-blue-100' : 'text-neutral-400'}`}>{c.desc}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Machine</label>
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="form-select" style={{ width: 'auto' }}>
            <option value="">All Machines</option>
            {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" style={{ width: 'auto' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" style={{ width: 'auto' }} />
        </div>
        <button onClick={fetchPreview} className="btn-secondary">
          <RefreshCw className="w-3.5 h-3.5" /> Apply
        </button>
      </div>

      {/* Preview table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-sm text-neutral-900 capitalize">
            {category.replace('-', ' ')} Data Preview
          </h2>
          <span className="text-xs text-neutral-400">{previewData.length} records</span>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="spinner" /></div>
          ) : previewData.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-sm">No records found for the applied filter.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(previewData[0]).map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 15).map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, ci) => (
                      <td key={ci} className="font-mono text-xs whitespace-nowrap">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  History,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge, AlertStateBadge } from '../components/common/SeverityBadge';
import { Modal } from '../components/common/Modal';

export const AlertsPage = () => {
  const [alerts, setAlerts]             = useState([]);
  const [machines, setMachines]         = useState([]);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [stateFilter, setStateFilter]   = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen]   = useState(false);
  const [actionModalOpen, setActionModalOpen]   = useState(false);
  const [actionType, setActionType]     = useState('ACKNOWLEDGE');
  const [actionNotes, setActionNotes]   = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const [reportData, setReportData] = useState({
    machineId: 'WM-101', severity: 'WARNING', category: 'MECHANICAL', message: '',
  });

  const { user, isOperator, isMaintenance, isAdmin } = useAuth();

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.append('severity', severityFilter);
      if (stateFilter)    params.append('state', stateFilter);
      const [aRes, mRes] = await Promise.all([
        api.get(`/alerts?${params.toString()}`),
        api.get('/machines'),
      ]);
      setAlerts(aRes.data.alerts);
      setMachines(mRes.data.machines);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (isAdmin || isMaintenance) {
      try { const uRes = await api.get('/users'); setUsers(uRes.data.users); } catch (_) {}
    }
  };

  useEffect(() => { fetchAlerts(); fetchUsers(); }, [severityFilter, stateFilter]);

  const handleManualReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/alerts', reportData);
      setReportModalOpen(false);
      setReportData({ machineId: 'WM-101', severity: 'WARNING', category: 'MECHANICAL', message: '' });
      await fetchAlerts();
    } catch (err) {
      alert(`Failed: ${err.response?.data?.message || err.message}`);
    } finally { setSubmitting(false); }
  };

  const handleLifecycleAction = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmitting(true);
    try {
      const id = selectedAlert._id;
      const map = {
        ACKNOWLEDGE: () => api.post(`/alerts/${id}/acknowledge`, { notes: actionNotes }),
        ASSIGN:      () => api.post(`/alerts/${id}/assign`, { assignedTo: assignedUserId, notes: actionNotes }),
        INVESTIGATE: () => api.post(`/alerts/${id}/investigate`, { notes: actionNotes }),
        RESOLVE:     () => api.post(`/alerts/${id}/resolve`, { resolutionDetails: actionNotes }),
        CLOSE:       () => api.post(`/alerts/${id}/close`, { notes: actionNotes }),
      };
      await map[actionType]?.();
      setActionModalOpen(false);
      setActionNotes('');
      await fetchAlerts();
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.message || err.message}`);
    } finally { setSubmitting(false); }
  };

  const openAction = (alert, type) => { setSelectedAlert(alert); setActionType(type); setActionModalOpen(true); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Alerts & Faults</h1>
          <p className="page-subtitle">End-to-end incident lifecycle: OPEN → ACKNOWLEDGED → INVESTIGATING → RESOLVED → CLOSED</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(isOperator || isMaintenance || isAdmin) && (
            <button onClick={() => setReportModalOpen(true)} className="btn-danger">
              <PlusCircle className="w-3.5 h-3.5" /> Report Fault
            </button>
          )}
          <button onClick={fetchAlerts} className="btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">State:</span>
          {['', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStateFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                stateFilter === st ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Severity:</span>
          {['', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                severityFilter === sev ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              {sev || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Machine</th>
                <th>Category</th>
                <th>Message</th>
                <th>State</th>
                <th>Assigned</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-neutral-400">
                    No alerts match the selected filters.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id}>
                    <td><SeverityBadge severity={alert.severity} /></td>
                    <td><span className="font-mono font-bold text-brand">{alert.machineId}</span></td>
                    <td className="text-neutral-500 text-xs">{alert.category}</td>
                    <td className="max-w-xs">
                      <span className="text-neutral-800 text-xs truncate block max-w-[240px]">{alert.message}</span>
                    </td>
                    <td><AlertStateBadge state={alert.state} /></td>
                    <td className="text-neutral-400 text-xs">{alert.assignedTo?.name || '—'}</td>
                    <td className="text-neutral-400 text-xs font-mono whitespace-nowrap">{new Date(alert.createdAt).toLocaleTimeString()}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => { setSelectedAlert(alert); setHistoryModalOpen(true); }}
                          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                          title="View audit trail"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {alert.state === 'OPEN' && (
                          <button onClick={() => openAction(alert, 'ACKNOWLEDGE')} className="badge badge-yellow cursor-pointer hover:opacity-80">Ack</button>
                        )}
                        {(alert.state === 'OPEN' || alert.state === 'ACKNOWLEDGED') && (isMaintenance || isAdmin) && (
                          <button onClick={() => openAction(alert, 'ASSIGN')} className="badge badge-blue cursor-pointer hover:opacity-80">Assign</button>
                        )}
                        {alert.state === 'ACKNOWLEDGED' && (isMaintenance || isAdmin) && (
                          <button onClick={() => openAction(alert, 'INVESTIGATE')} className="badge badge-blue cursor-pointer hover:opacity-80">Investigate</button>
                        )}
                        {alert.state === 'INVESTIGATING' && (isMaintenance || isAdmin) && (
                          <button onClick={() => openAction(alert, 'RESOLVE')} className="badge badge-green cursor-pointer hover:opacity-80">Resolve</button>
                        )}
                        {alert.state === 'RESOLVED' && (isMaintenance || isAdmin) && (
                          <button onClick={() => openAction(alert, 'CLOSE')} className="badge badge-gray cursor-pointer hover:opacity-80">Close</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Modal */}
      {selectedAlert && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Audit Trail — ${selectedAlert.machineId}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100 text-sm">
              <p className="font-semibold text-neutral-800 mb-1">{selectedAlert.message}</p>
              <p className="text-xs text-neutral-400">
                {selectedAlert.category} · {selectedAlert.source} · {new Date(selectedAlert.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="relative pl-5 space-y-4 border-l-2 border-neutral-100 ml-1">
              {(selectedAlert.history || []).map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-brand ring-2 ring-white" />
                  <p className="text-xs font-semibold text-neutral-800">
                    → <span className="text-brand">{step.state}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    By: {step.changedByName || 'System'} · {new Date(step.timestamp).toLocaleTimeString()}
                  </p>
                  {step.notes && (
                    <p className="text-xs text-neutral-600 mt-1 p-2 rounded bg-neutral-50 border border-neutral-100">{step.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Report Modal */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Report Manual Fault">
        <form onSubmit={handleManualReport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Machine</label>
            <select value={reportData.machineId} onChange={(e) => setReportData({ ...reportData, machineId: e.target.value })} className="form-select">
              {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Severity</label>
              <select value={reportData.severity} onChange={(e) => setReportData({ ...reportData, severity: e.target.value })} className="form-select">
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Category</label>
              <select value={reportData.category} onChange={(e) => setReportData({ ...reportData, category: e.target.value })} className="form-select">
                <option value="MECHANICAL">Mechanical</option>
                <option value="TEMPERATURE">Temperature</option>
                <option value="VOLTAGE">Electrical</option>
                <option value="DEFECT_RATE">Weld Defect</option>
                <option value="MANUAL_REPORT">Operator Report</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
            <textarea
              rows={3} value={reportData.message} required
              onChange={(e) => setReportData({ ...reportData, message: e.target.value })}
              placeholder="Describe the abnormality observed…"
              className="form-input resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setReportModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-danger disabled:opacity-50">
              {submitting ? 'Reporting…' : 'Submit Fault'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lifecycle Action Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`${actionType} Alert`}
      >
        <form onSubmit={handleLifecycleAction} className="space-y-4">
          {actionType === 'ASSIGN' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Assign To</label>
              <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className="form-select" required>
                <option value="">Select Engineer…</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Notes / Resolution Details</label>
            <textarea
              rows={3} value={actionNotes} required
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Enter diagnostic findings or resolution steps…"
              className="form-input resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setActionModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Saving…' : `Confirm ${actionType}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  PlusCircle,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

const PRIORITY_BADGE = {
  CRITICAL: 'badge-red',
  HIGH:     'badge-yellow',
  MEDIUM:   'badge-blue',
  LOW:      'badge-gray',
};

const STATUS_BADGE = {
  COMPLETED:   'badge-green',
  IN_PROGRESS: 'badge-blue',
  SCHEDULED:   'badge-yellow',
  CANCELLED:   'badge-gray',
};

export const MaintenancePage = () => {
  const [tasks, setTasks]             = useState([]);
  const [machines, setMachines]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen]     = useState(false);
  const [selectedTask, setSelectedTask]       = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const { isMaintenance, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    machineId: 'WM-101', title: '', description: '', priority: 'MEDIUM',
    scheduledDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  });

  const [updateData, setUpdateData] = useState({ status: 'IN_PROGRESS', workPerformed: '', serviceNotes: '' });

  const fetchTasks = async () => {
    try {
      const [tRes, mRes] = await Promise.all([api.get('/maintenance'), api.get('/machines')]);
      setTasks(tRes.data.tasks);
      setMachines(mRes.data.machines);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.post('/maintenance', formData);
      setCreateModalOpen(false);
      setFormData({ machineId: 'WM-101', title: '', description: '', priority: 'MEDIUM',
        scheduledDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) });
      await fetchTasks();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setSubmitting(false); }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await api.patch(`/maintenance/${selectedTask._id}`, updateData);
      setEditModalOpen(false);
      await fetchTasks();
    } catch (err) { alert(err.response?.data?.message || err.message); }
    finally { setSubmitting(false); }
  };

  const filteredTasks = tasks.filter((t) => statusFilter === 'ALL' || t.status === statusFilter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Preventive and corrective service schedules, work logs, and technician records.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(isMaintenance || isAdmin) && (
            <button onClick={() => setCreateModalOpen(true)} className="btn-primary">
              <PlusCircle className="w-3.5 h-3.5" /> Schedule Task
            </button>
          )}
          <button onClick={fetchTasks} className="btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
          <button key={st} onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === st ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
            }`}>
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tasks grid */}
      {filteredTasks.length === 0 ? (
        <div className="card text-center py-16">
          <Wrench className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
          <p className="font-semibold text-neutral-500">No maintenance tasks found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <div key={task._id} className="card flex flex-col gap-3 hover:shadow-card-md transition-shadow">
              {/* Card header */}
              <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-brand">{task.machineId}</span>
                  <span className={`badge ${PRIORITY_BADGE[task.priority] || 'badge-gray'}`}>{task.priority}</span>
                </div>
                <span className={`badge ${STATUS_BADGE[task.status] || 'badge-gray'}`}>{task.status?.replace('_', ' ')}</span>
              </div>

              {/* Content */}
              <div>
                <h3 className="font-bold text-sm text-slate-900">{task.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {task.description || 'Routine scheduled inspection and preventive servicing.'}
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wide">Scheduled</p>
                  <p className="font-semibold text-slate-800">{new Date(task.scheduledDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-wide">Due</p>
                  <p className="font-bold text-amber-700">{new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Work performed */}
              {task.workPerformed && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-0.5">Work Performed</p>
                  <p className="text-slate-700">{task.workPerformed}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">Assigned: <strong className="text-slate-800">{task.assignedTo?.name || 'David Chen'}</strong></span>
                {(isMaintenance || isAdmin) && (
                  <button
                    onClick={() => { setSelectedTask(task); setUpdateData({ status: task.status, workPerformed: task.workPerformed || '', serviceNotes: task.serviceNotes || '' }); setEditModalOpen(true); }}
                    className="btn-secondary py-1 px-2.5 text-xs text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Update
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Schedule Maintenance Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Machine</label>
            <select value={formData.machineId} onChange={(e) => setFormData({ ...formData, machineId: e.target.value })} className="form-select">
              {machines.map((m) => <option key={m.machineId} value={m.machineId}>{m.machineId} — {m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Task Title</label>
            <input type="text" value={formData.title} required onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="E.g., Axis 1–6 Gearbox Lubrication" className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="form-select">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Due Date</label>
              <input type="date" value={formData.dueDate} required onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="form-input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specify safety lockout procedures, grease specs, torque tolerances…" className="form-input resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Scheduling…' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Update: ${selectedTask?.title || ''}`}>
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Status</label>
            <select value={updateData.status} onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })} className="form-select">
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Work Performed</label>
            <textarea rows={3} value={updateData.workPerformed} onChange={(e) => setUpdateData({ ...updateData, workPerformed: e.target.value })}
              placeholder="Document parts replaced, grease applied, torque verified…" className="form-input resize-none"
              required={updateData.status === 'COMPLETED'} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Service Notes</label>
            <input type="text" value={updateData.serviceNotes} onChange={(e) => setUpdateData({ ...updateData, serviceNotes: e.target.value })}
              placeholder="E.g., Recommend wire conduit replacement next shift" className="form-input" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save Work Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

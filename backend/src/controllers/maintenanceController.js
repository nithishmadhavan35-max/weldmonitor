import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { createMaintenanceTask, updateMaintenanceTask, checkOverdueMaintenance } from '../services/maintenanceService.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getMaintenanceTasks = async (req, res, next) => {
  try {
    const { status, priority, machineId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (machineId) filter.machineId = machineId;

    // Run proactive overdue status check
    await checkOverdueMaintenance();

    const tasks = await MaintenanceTask.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceTaskById = async (req, res, next) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Maintenance task not found' });
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const task = await createMaintenanceTask(req.body, req.user);

    await logAuditEvent({
      actor: req.user,
      action: 'MAINTENANCE_TASK_CREATED',
      targetType: 'MaintenanceTask',
      targetId: task._id,
      metadata: { machineId: task.machineId, title: task.title },
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await updateMaintenanceTask(req.params.id, req.body, req.user);

    await logAuditEvent({
      actor: req.user,
      action: 'MAINTENANCE_TASK_UPDATED',
      targetType: 'MaintenanceTask',
      targetId: task._id,
      metadata: { status: task.status },
    });

    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

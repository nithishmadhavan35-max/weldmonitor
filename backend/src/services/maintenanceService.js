import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Machine } from '../models/Machine.js';
import { MAINTENANCE_STATUSES, ALERT_SEVERITIES } from '../config/constants.js';
import { createAlert } from './alertService.js';
import { getIO } from '../socket/index.js';

export const createMaintenanceTask = async (taskData, user) => {
  const machine = await Machine.findOne({ machineId: taskData.machineId });
  if (!machine) {
    throw new Error(`Machine with ID ${taskData.machineId} not found`);
  }

  const task = await MaintenanceTask.create({
    ...taskData,
    machine: machine._id,
    createdBy: user?._id,
    operatingHoursAtService: machine.maintenanceConfig?.operatingHours || 0,
  });

  try {
    const io = getIO();
    if (io) io.emit('maintenance:updated', task);
  } catch (err) {}

  return task;
};

export const updateMaintenanceTask = async (taskId, updateData, user) => {
  const task = await MaintenanceTask.findById(taskId);
  if (!task) {
    throw new Error('Maintenance task not found');
  }

  // Update properties
  Object.assign(task, updateData);

  if (updateData.status === MAINTENANCE_STATUSES.COMPLETED && !task.completionDate) {
    task.completionDate = new Date();
    // Update machine last maintenance date
    await Machine.findByIdAndUpdate(task.machine, {
      'maintenanceConfig.lastMaintenanceDate': new Date(),
      'maintenanceConfig.nextMaintenanceDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
    });
  }

  await task.save();

  try {
    const io = getIO();
    if (io) io.emit('maintenance:updated', task);
  } catch (err) {}

  return task;
};

export const checkOverdueMaintenance = async () => {
  const now = new Date();
  const overdueTasks = await MaintenanceTask.find({
    status: { $in: [MAINTENANCE_STATUSES.SCHEDULED, MAINTENANCE_STATUSES.IN_PROGRESS] },
    dueDate: { $lt: now },
  });

  for (const task of overdueTasks) {
    await createAlert({
      machine: task.machine,
      machineId: task.machineId,
      severity: ALERT_SEVERITIES.WARNING,
      category: 'MAINTENANCE_DUE',
      message: `Preventive Maintenance Overdue: "${task.title}" for ${task.machineId}`,
      source: 'AUTOMATIC',
    });
  }

  return overdueTasks;
};

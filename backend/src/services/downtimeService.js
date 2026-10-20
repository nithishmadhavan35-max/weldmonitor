import { DowntimeIncident } from '../models/DowntimeIncident.js';
import { getIO } from '../socket/index.js';

export const startDowntime = async ({
  machine,
  machineId,
  reason = 'ROBOT_PATH_ERROR',
  source = 'AUTOMATIC',
  relatedAlert = null,
  notes = '',
  recordedBy = null,
}) => {
  // Check if there is already an active downtime incident for this machine to prevent overlapping duplicate tracking
  const existingActive = await DowntimeIncident.findOne({
    machineId,
    status: 'ACTIVE',
  });

  if (existingActive) {
    return existingActive;
  }

  const incident = await DowntimeIncident.create({
    machine,
    machineId,
    startTime: new Date(),
    reason,
    source,
    relatedAlert,
    notes,
    recordedBy,
    status: 'ACTIVE',
  });

  try {
    const io = getIO();
    if (io) {
      io.emit('downtime:started', incident);
    }
  } catch (err) {}

  return incident;
};

export const endDowntime = async ({ machineId, notes = '' }) => {
  const activeIncident = await DowntimeIncident.findOne({
    machineId,
    status: 'ACTIVE',
  });

  if (!activeIncident) {
    return null;
  }

  const endTime = new Date();
  const durationSeconds = Math.max(
    1,
    Math.round((endTime.getTime() - activeIncident.startTime.getTime()) / 1000)
  );

  activeIncident.endTime = endTime;
  activeIncident.durationSeconds = durationSeconds;
  activeIncident.status = 'RESOLVED';
  if (notes) activeIncident.notes = (activeIncident.notes ? activeIncident.notes + ' | ' : '') + notes;

  await activeIncident.save();

  try {
    const io = getIO();
    if (io) {
      io.emit('downtime:ended', activeIncident);
    }
  } catch (err) {}

  return activeIncident;
};

/**
 * Calculates aggregated downtime avoiding overlapping intervals
 */
export const getAggregatedDowntime = async ({ startDate, endDate, machineId }) => {
  const filter = {};
  if (machineId) filter.machineId = machineId;
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(endDate);
  }

  const incidents = await DowntimeIncident.find(filter).sort({ startTime: 1 });

  // Group by machine and merge overlapping intervals
  const machineIntervals = {};
  for (const inc of incidents) {
    if (!machineIntervals[inc.machineId]) {
      machineIntervals[inc.machineId] = [];
    }
    const start = inc.startTime.getTime();
    const end = inc.endTime ? inc.endTime.getTime() : Date.now();
    machineIntervals[inc.machineId].push({ start, end, reason: inc.reason });
  }

  let totalDowntimeSeconds = 0;
  const downtimeByReason = {};
  const downtimeByMachine = {};

  for (const [mId, intervals] of Object.entries(machineIntervals)) {
    // Sort intervals
    intervals.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const iv of intervals) {
      if (!merged.length) {
        merged.push({ ...iv });
      } else {
        const prev = merged[merged.length - 1];
        if (iv.start <= prev.end) {
          prev.end = Math.max(prev.end, iv.end);
        } else {
          merged.push({ ...iv });
        }
      }
      // Reason breakdown
      downtimeByReason[iv.reason] = (downtimeByReason[iv.reason] || 0) + Math.round((iv.end - iv.start) / 1000);
    }

    const machineSecs = merged.reduce((acc, curr) => acc + Math.round((curr.end - curr.start) / 1000), 0);
    totalDowntimeSeconds += machineSecs;
    downtimeByMachine[mId] = machineSecs;
  }

  return {
    totalDowntimeSeconds,
    downtimeByReason,
    downtimeByMachine,
    incidents,
  };
};

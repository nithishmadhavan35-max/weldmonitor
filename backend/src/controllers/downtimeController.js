import { DowntimeIncident } from '../models/DowntimeIncident.js';
import { Machine } from '../models/Machine.js';
import { startDowntime, endDowntime, getAggregatedDowntime } from '../services/downtimeService.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getDowntime = async (req, res, next) => {
  try {
    const { machineId, startDate, endDate } = req.query;
    const data = await getAggregatedDowntime({ machineId, startDate, endDate });

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

export const createDowntimeIncident = async (req, res, next) => {
  try {
    const { machineId, reason, notes } = req.body;

    if (!machineId) {
      return res.status(400).json({ success: false, message: 'machineId is required' });
    }

    const machine = await Machine.findOne({ machineId });
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const incident = await startDowntime({
      machine: machine._id,
      machineId,
      reason: reason || 'OPERATOR_BREAK',
      source: 'MANUAL',
      notes,
      recordedBy: req.user?._id,
    });

    await logAuditEvent({
      actor: req.user,
      action: 'DOWNTIME_LOGGED_MANUALLY',
      targetType: 'DowntimeIncident',
      targetId: incident._id,
      metadata: { machineId, reason },
    });

    res.status(201).json({
      success: true,
      message: 'Downtime incident logged',
      incident,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDowntimeIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, reason } = req.body;

    const incident = await DowntimeIncident.findById(id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (reason) incident.reason = reason;
    if (notes) incident.notes = notes;

    if (status === 'RESOLVED' && incident.status === 'ACTIVE') {
      await endDowntime({ machineId: incident.machineId, notes });
      incident.status = 'RESOLVED';
      incident.endTime = new Date();
      incident.durationSeconds = Math.round((incident.endTime.getTime() - incident.startTime.getTime()) / 1000);
      await incident.save();
    } else {
      await incident.save();
    }

    res.status(200).json({
      success: true,
      incident,
    });
  } catch (error) {
    next(error);
  }
};

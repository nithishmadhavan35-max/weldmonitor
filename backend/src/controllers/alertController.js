import { Alert } from '../models/Alert.js';
import { Machine } from '../models/Machine.js';
import { ALERT_STATES, ALERT_SEVERITIES } from '../config/constants.js';
import { createAlert, transitionAlertState } from '../services/alertService.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getAlerts = async (req, res, next) => {
  try {
    const { state, severity, machineId, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (state) {
      if (state === 'ACTIVE') {
        filter.state = { $in: [ALERT_STATES.OPEN, ALERT_STATES.ACKNOWLEDGED, ALERT_STATES.INVESTIGATING] };
      } else {
        filter.state = state;
      }
    }
    if (severity) filter.severity = severity;
    if (machineId) filter.machineId = machineId;

    const skip = (Number(page) - 1) * Number(limit);

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .populate('assignedTo', 'name email role')
        .populate('acknowledgedBy', 'name email')
        .populate('resolvedBy', 'name email')
        .populate('closedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Alert.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: alerts.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      alerts,
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertById = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('closedBy', 'name email');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

export const reportManualAlert = async (req, res, next) => {
  try {
    const { machineId, severity = ALERT_SEVERITIES.WARNING, category = 'MANUAL_REPORT', message } = req.body;

    if (!machineId || !message) {
      return res.status(400).json({ success: false, message: 'machineId and message are required' });
    }

    const machine = await Machine.findOne({ machineId });
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const alert = await createAlert({
      machine: machine._id,
      machineId,
      severity,
      category,
      message,
      source: 'MANUAL',
      actor: req.user,
    });

    await logAuditEvent({
      actor: req.user,
      action: 'MANUAL_ALERT_REPORTED',
      targetType: 'Alert',
      targetId: alert._id,
      metadata: { machineId, severity, message },
    });

    res.status(201).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAlert = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const alert = await transitionAlertState({
      alertId: req.params.id,
      targetState: ALERT_STATES.ACKNOWLEDGED,
      user: req.user,
      notes: notes || 'Alert acknowledged by user',
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ALERT_ACKNOWLEDGED',
      targetType: 'Alert',
      targetId: alert._id,
    });

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

export const assignAlert = async (req, res, next) => {
  try {
    const { assignedTo, notes } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'assignedTo user ID is required' });
    }

    const alert = await transitionAlertState({
      alertId: req.params.id,
      targetState: ALERT_STATES.INVESTIGATING,
      user: req.user,
      assignedTo,
      notes: notes || 'Alert assigned to engineer for investigation',
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ALERT_ASSIGNED',
      targetType: 'Alert',
      targetId: alert._id,
      metadata: { assignedTo },
    });

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

export const investigateAlert = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const alert = await transitionAlertState({
      alertId: req.params.id,
      targetState: ALERT_STATES.INVESTIGATING,
      user: req.user,
      notes: notes || 'Investigation active',
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ALERT_INVESTIGATION_UPDATED',
      targetType: 'Alert',
      targetId: alert._id,
      metadata: { notes },
    });

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req, res, next) => {
  try {
    const { resolutionDetails, notes } = req.body;
    const alert = await transitionAlertState({
      alertId: req.params.id,
      targetState: ALERT_STATES.RESOLVED,
      user: req.user,
      resolutionDetails: resolutionDetails || notes || 'Issue resolved by technician',
      notes,
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ALERT_RESOLVED',
      targetType: 'Alert',
      targetId: alert._id,
      metadata: { resolutionDetails },
    });

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

export const closeAlert = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const alert = await transitionAlertState({
      alertId: req.params.id,
      targetState: ALERT_STATES.CLOSED,
      user: req.user,
      notes: notes || 'Alert verified and closed',
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ALERT_CLOSED',
      targetType: 'Alert',
      targetId: alert._id,
    });

    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

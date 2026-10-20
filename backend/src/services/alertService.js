import { Alert } from '../models/Alert.js';
import { User } from '../models/User.js';
import { ALERT_STATES, ALERT_SEVERITIES, ROLES } from '../config/constants.js';
import { sendCriticalAlertEmail } from './emailService.js';
import { getIO } from '../socket/index.js';

// Cooldown tracker: machineId:category -> timestamp of last alert/email
const alertCooldownMap = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown for identical machine & category

export const createAlert = async ({
  machine,
  machineId,
  severity = ALERT_SEVERITIES.WARNING,
  category = 'MECHANICAL',
  message,
  source = 'AUTOMATIC',
  value,
  threshold,
  actor,
}) => {
  // Deduplication check: Is there already an active (OPEN / ACKNOWLEDGED / INVESTIGATING) alert for this machine and category?
  const cooldownKey = `${machineId}:${category}:${severity}`;
  const now = Date.now();
  const lastTriggered = alertCooldownMap.get(cooldownKey) || 0;

  if (source === 'AUTOMATIC') {
    const existingActiveAlert = await Alert.findOne({
      machineId,
      category,
      state: { $in: [ALERT_STATES.OPEN, ALERT_STATES.ACKNOWLEDGED, ALERT_STATES.INVESTIGATING] },
    });

    if (existingActiveAlert) {
      // Already actively tracked, prevent spamming
      return existingActiveAlert;
    }

    if (now - lastTriggered < COOLDOWN_MS) {
      return null;
    }
  }

  alertCooldownMap.set(cooldownKey, now);

  const initialHistory = {
    state: ALERT_STATES.OPEN,
    changedBy: actor?._id || null,
    changedByName: actor?.name || (source === 'AUTOMATIC' ? 'System Automated Sensor' : 'Operator'),
    timestamp: new Date(),
    notes: source === 'AUTOMATIC' ? 'Threshold violation detected by telemetry monitor' : 'Manual incident reported',
  };

  const alert = await Alert.create({
    machine,
    machineId,
    severity,
    category,
    message,
    source,
    state: ALERT_STATES.OPEN,
    value,
    threshold,
    history: [initialHistory],
  });

  // Real-time broadcast via Socket.IO
  try {
    const io = getIO();
    if (io) {
      io.emit('alert:created', alert);
    }
  } catch (err) {
    // Socket not ready or outside context
  }

  // Trigger Email for CRITICAL alerts to Admins / Maintenance Engineers
  if (severity === ALERT_SEVERITIES.CRITICAL) {
    try {
      const maintenanceEngineers = await User.find({
        role: { $in: [ROLES.MAINTENANCE_ENGINEER, ROLES.ADMIN] },
        status: 'ACTIVE',
      });

      for (const engineer of maintenanceEngineers) {
        if (engineer.email) {
          sendCriticalAlertEmail(engineer.email, alert).catch(() => {});
        }
      }
      alert.emailSent = true;
      await alert.save();
    } catch (emailErr) {
      console.warn('Could not dispatch critical alert email notification:', emailErr.message);
    }
  }

  return alert;
};

/**
 * Valid transitions:
 * OPEN -> ACKNOWLEDGED
 * ACKNOWLEDGED -> INVESTIGATING
 * INVESTIGATING -> RESOLVED
 * RESOLVED -> CLOSED
 * Admin can also close directly or re-open if needed.
 */
const VALID_TRANSITIONS = {
  [ALERT_STATES.OPEN]: [ALERT_STATES.ACKNOWLEDGED, ALERT_STATES.INVESTIGATING, ALERT_STATES.CLOSED],
  [ALERT_STATES.ACKNOWLEDGED]: [ALERT_STATES.INVESTIGATING, ALERT_STATES.RESOLVED, ALERT_STATES.CLOSED],
  [ALERT_STATES.INVESTIGATING]: [ALERT_STATES.RESOLVED, ALERT_STATES.CLOSED],
  [ALERT_STATES.RESOLVED]: [ALERT_STATES.CLOSED, ALERT_STATES.INVESTIGATING],
  [ALERT_STATES.CLOSED]: [ALERT_STATES.OPEN],
};

export const transitionAlertState = async ({
  alertId,
  targetState,
  user,
  notes = '',
  assignedTo = null,
  resolutionDetails = '',
}) => {
  const alert = await Alert.findById(alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  const allowedNext = VALID_TRANSITIONS[alert.state] || [];
  if (user.role !== ROLES.ADMIN && !allowedNext.includes(targetState)) {
    throw new Error(`Invalid alert state transition from ${alert.state} to ${targetState}`);
  }

  alert.state = targetState;

  if (targetState === ALERT_STATES.ACKNOWLEDGED) {
    alert.acknowledgedBy = user._id;
    alert.acknowledgedAt = new Date();
  }

  if (assignedTo) {
    alert.assignedTo = assignedTo;
    alert.assignedAt = new Date();
  }

  if (targetState === ALERT_STATES.INVESTIGATING) {
    if (notes) alert.investigationNotes = notes;
  }

  if (targetState === ALERT_STATES.RESOLVED) {
    alert.resolvedBy = user._id;
    alert.resolvedAt = new Date();
    alert.resolutionDetails = resolutionDetails || notes || 'Issue resolved by engineer.';
  }

  if (targetState === ALERT_STATES.CLOSED) {
    alert.closedBy = user._id;
    alert.closedAt = new Date();
  }

  alert.history.push({
    state: targetState,
    changedBy: user._id,
    changedByName: user.name,
    timestamp: new Date(),
    notes: notes || resolutionDetails || `State moved to ${targetState}`,
  });

  await alert.save();

  try {
    const io = getIO();
    if (io) {
      io.emit('alert:updated', alert);
    }
  } catch (err) {}

  return alert;
};

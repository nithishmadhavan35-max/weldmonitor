import { Machine } from '../models/Machine.js';
import { TelemetryReading } from '../models/TelemetryReading.js';
import { Alert } from '../models/Alert.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { DowntimeIncident } from '../models/DowntimeIncident.js';
import { ALERT_STATES, MACHINE_STATES } from '../config/constants.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getMachines = async (req, res, next) => {
  try {
    const { status, search, zone } = req.query;
    const filter = {};

    if (status) filter.state = status;
    if (zone) filter['location.zone'] = zone;
    if (search) {
      filter.$or = [
        { machineId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { station: { $regex: search, $options: 'i' } },
      ];
    }

    const machines = await Machine.find(filter).sort({ machineId: 1 });

    res.status(200).json({
      success: true,
      count: machines.length,
      machines,
    });
  } catch (error) {
    next(error);
  }
};

export const getMachineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const machine = await Machine.findOne({
      $or: [{ machineId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    // Fetch recent 20 telemetry readings
    const recentTelemetry = await TelemetryReading.find({ machineId: machine.machineId })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    // Fetch recent active or historical alerts
    const recentAlerts = await Alert.find({ machineId: machine.machineId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Fetch upcoming maintenance
    const maintenanceTasks = await MaintenanceTask.find({ machineId: machine.machineId })
      .sort({ scheduledDate: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      machine,
      recentTelemetry: recentTelemetry.reverse(),
      recentAlerts,
      maintenanceTasks,
    });
  } catch (error) {
    next(error);
  }
};

export const createMachine = async (req, res, next) => {
  try {
    const machine = await Machine.create(req.body);

    await logAuditEvent({
      actor: req.user,
      action: 'ADMIN_CREATED_MACHINE',
      targetType: 'Machine',
      targetId: machine.machineId,
    });

    res.status(201).json({ success: true, machine });
  } catch (error) {
    next(error);
  }
};

export const updateMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const machine = await Machine.findOneAndUpdate(
      { $or: [{ machineId: id.toUpperCase() }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'ADMIN_CONFIGURED_MACHINE',
      targetType: 'Machine',
      targetId: machine.machineId,
      metadata: req.body,
    });

    res.status(200).json({ success: true, machine });
  } catch (error) {
    next(error);
  }
};

export const getMachineTelemetry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    const query = {
      $or: [{ machineId: id.toUpperCase() }, { machine: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const readings = await TelemetryReading.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: readings.length,
      readings: readings.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardSummary = async (req, res, next) => {
  try {
    const machines = await Machine.find().lean();

    const machineCounts = {
      total: machines.length,
      running: machines.filter((m) => m.state === MACHINE_STATES.RUNNING).length,
      idle: machines.filter((m) => m.state === MACHINE_STATES.IDLE).length,
      stopped: machines.filter((m) => m.state === MACHINE_STATES.STOPPED).length,
      error: machines.filter((m) => m.state === MACHINE_STATES.ERROR).length,
    };

    // Calculate aggregated production & defect counts
    let totalWelds = 0;
    let totalDefects = 0;
    let totalTarget = 0;

    machines.forEach((m) => {
      totalWelds += m.latestTelemetry?.weldCount || 0;
      totalDefects += m.latestTelemetry?.defectCount || 0;
      totalTarget += m.productionTarget || 1200;
    });

    const overallDefectRate = totalWelds > 0 ? Number(((totalDefects / totalWelds) * 100).toFixed(2)) : 0;
    const overallTargetAchievement = totalTarget > 0 ? Number(((totalWelds / totalTarget) * 100).toFixed(1)) : 0;

    // Active alerts count (OPEN, ACKNOWLEDGED, INVESTIGATING)
    const activeAlerts = await Alert.find({
      state: { $in: [ALERT_STATES.OPEN, ALERT_STATES.ACKNOWLEDGED, ALERT_STATES.INVESTIGATING] },
    })
      .sort({ severity: 1, createdAt: -1 })
      .limit(10)
      .lean();

    // Upcoming maintenance tasks
    const upcomingMaintenance = await MaintenanceTask.find({
      status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // Total downtime in last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const downtimeIncidents = await DowntimeIncident.find({
      startTime: { $gte: yesterday },
    }).lean();

    const totalDowntimeMinutes = Math.round(
      downtimeIncidents.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) / 60
    );

    res.status(200).json({
      success: true,
      summary: {
        machineCounts,
        production: {
          totalWelds,
          totalTarget,
          overallTargetAchievement,
          overallDefectRate,
        },
        activeAlertsCount: activeAlerts.length,
        totalDowntimeMinutes,
        activeAlerts,
        upcomingMaintenance,
        lastDataFreshness: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

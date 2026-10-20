import { QualityRecord } from '../models/QualityRecord.js';
import { logQualityRecord, getQualityAnalytics } from '../services/qualityService.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getQualityRecords = async (req, res, next) => {
  try {
    const { machineId, startDate, endDate } = req.query;
    const analytics = await getQualityAnalytics({ machineId, startDate, endDate });

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    next(error);
  }
};

export const createQualityRecord = async (req, res, next) => {
  try {
    const { machineId, weldsInspected, successfulCount, defectiveCount, defectCategory, notes } = req.body;

    if (!machineId || weldsInspected === undefined || defectiveCount === undefined) {
      return res.status(400).json({ success: false, message: 'machineId, weldsInspected, and defectiveCount are required' });
    }

    const record = await logQualityRecord({
      machineId,
      weldsInspected,
      successfulCount: successfulCount ?? (weldsInspected - defectiveCount),
      defectiveCount,
      defectCategory,
      notes,
      recordedBy: req.user?._id,
      source: 'MANUAL_INSPECTION',
    });

    await logAuditEvent({
      actor: req.user,
      action: 'QUALITY_DEFECT_LOGGED',
      targetType: 'QualityRecord',
      targetId: record._id,
      metadata: { machineId, defectiveCount, defectCategory },
    });

    res.status(201).json({
      success: true,
      message: 'Quality inspection record saved',
      record,
    });
  } catch (error) {
    next(error);
  }
};

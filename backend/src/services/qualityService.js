import { QualityRecord } from '../models/QualityRecord.js';
import { Machine } from '../models/Machine.js';

export const logQualityRecord = async ({
  machineId,
  weldsInspected,
  successfulCount,
  defectiveCount,
  defectCategory = 'NONE',
  notes = '',
  recordedBy = null,
  source = 'AUTOMATIC',
}) => {
  const machine = await Machine.findOne({ machineId });
  if (!machine) {
    throw new Error(`Machine with ID ${machineId} not found`);
  }

  const inspected = Math.max(0, Number(weldsInspected) || 0);
  const successful = Math.max(0, Number(successfulCount) || 0);
  const defective = Math.max(0, Number(defectiveCount) || 0);

  const defectRate = inspected > 0 ? Number(((defective / inspected) * 100).toFixed(2)) : 0;

  const record = await QualityRecord.create({
    machine: machine._id,
    machineId,
    weldsInspected: inspected,
    successfulCount: successful,
    defectiveCount: defective,
    defectCategory: defective > 0 ? defectCategory : 'NONE',
    defectRate,
    notes,
    recordedBy,
    source,
  });

  // Update latest telemetry quality snapshot on machine
  machine.latestTelemetry.defectCount = (machine.latestTelemetry.defectCount || 0) + defective;
  machine.latestTelemetry.defectRate = defectRate;
  await machine.save();

  return record;
};

export const getQualityAnalytics = async ({ startDate, endDate, machineId }) => {
  const filter = {};
  if (machineId) filter.machineId = machineId;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const records = await QualityRecord.find(filter).sort({ timestamp: 1 });

  let totalInspected = 0;
  let totalSuccessful = 0;
  let totalDefective = 0;
  const defectsByCategory = {};

  for (const r of records) {
    totalInspected += r.weldsInspected;
    totalSuccessful += r.successfulCount;
    totalDefective += r.defectiveCount;

    if (r.defectCategory && r.defectCategory !== 'NONE') {
      defectsByCategory[r.defectCategory] = (defectsByCategory[r.defectCategory] || 0) + r.defectiveCount;
    }
  }

  const overallSuccessRate = totalInspected > 0 ? Number(((totalSuccessful / totalInspected) * 100).toFixed(2)) : 0;
  const overallDefectRate = totalInspected > 0 ? Number(((totalDefective / totalInspected) * 100).toFixed(2)) : 0;

  return {
    totalInspected,
    totalSuccessful,
    totalDefective,
    overallSuccessRate,
    overallDefectRate,
    defectsByCategory,
    records,
  };
};

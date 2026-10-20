import { Machine } from '../models/Machine.js';
import { TelemetryReading } from '../models/TelemetryReading.js';

export const getProductionSummary = async ({ timeRange = '24h' }) => {
  const machines = await Machine.find().lean();

  let totalWelds = 0;
  let totalTarget = 0;
  const machineBreakdown = [];

  for (const m of machines) {
    const welds = m.latestTelemetry?.weldCount || 0;
    const target = m.productionTarget || 1200;
    const achievementPercent = target > 0 ? Number(((welds / target) * 100).toFixed(1)) : 0;

    totalWelds += welds;
    totalTarget += target;

    machineBreakdown.push({
      machineId: m.machineId,
      name: m.name,
      station: m.station,
      state: m.state,
      welds,
      target,
      achievementPercent,
      defectRate: m.latestTelemetry?.defectRate || 0,
      healthScore: m.latestTelemetry?.healthScore || 100,
    });
  }

  const overallAchievement = totalTarget > 0 ? Number(((totalWelds / totalTarget) * 100).toFixed(1)) : 0;

  // Hourly production simulation data for charts
  const hourlyTrend = [];
  const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  let runningCount = Math.floor(totalWelds * 0.2);

  for (let i = 0; i < hours.length; i++) {
    const hourlyOutput = Math.floor(Math.random() * 200 + 150);
    runningCount += hourlyOutput;
    hourlyTrend.push({
      time: hours[i],
      actual: runningCount,
      target: Math.floor(((i + 1) / hours.length) * totalTarget),
      defectRate: Number((Math.random() * 2 + 1).toFixed(1)),
    });
  }

  return {
    totalWelds,
    totalTarget,
    overallAchievement,
    machineBreakdown,
    hourlyTrend,
  };
};

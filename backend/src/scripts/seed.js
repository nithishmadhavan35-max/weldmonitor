import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Machine } from '../models/Machine.js';
import { TelemetryReading } from '../models/TelemetryReading.js';
import { QualityRecord } from '../models/QualityRecord.js';
import { DowntimeIncident } from '../models/DowntimeIncident.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Alert } from '../models/Alert.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { ROLES, MACHINE_STATES, ALERT_SEVERITIES, ALERT_STATES, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from '../config/constants.js';

dotenv.config();

export const seedDatabase = async () => {
  console.log('🌱 Starting database seeding with realistic industrial data...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Machine.deleteMany({}),
    TelemetryReading.deleteMany({}),
    QualityRecord.deleteMany({}),
    DowntimeIncident.deleteMany({}),
    MaintenanceTask.deleteMany({}),
    Alert.deleteMany({}),
    AuditEvent.deleteMany({}),
  ]);

  console.log('🧹 Purged existing collections.');

  // 1. Seed Users for all 4 roles
  const users = await User.create([
    {
      name: 'Elena Rostova (System Admin)',
      email: 'admin@weldmonitor.io',
      googleId: 'google_oauth_admin_1001',
      role: ROLES.ADMIN,
      status: 'ACTIVE',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      name: 'Marcus Vance (Welding Operator)',
      email: 'operator@weldmonitor.io',
      googleId: 'google_oauth_operator_1002',
      role: ROLES.OPERATOR,
      status: 'ACTIVE',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      name: 'David Chen (Maintenance Lead)',
      email: 'maintenance@weldmonitor.io',
      googleId: 'google_oauth_maint_1003',
      role: ROLES.MAINTENANCE_ENGINEER,
      status: 'ACTIVE',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    {
      name: 'Sarah Sterling (Production Manager)',
      email: 'manager@weldmonitor.io',
      googleId: 'google_oauth_mgr_1004',
      role: ROLES.PRODUCTION_MANAGER,
      status: 'ACTIVE',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
  ]);

  const [adminUser, operatorUser, maintUser, managerUser] = users;
  console.log('👥 Seeded 4 default role demo users.');

  // 2. Seed 10 Robotic Welding Machines
  const machineConfigs = [
    {
      machineId: 'WM-101',
      name: 'KUKA CyberWeld Alpha',
      station: 'Station 1A - Front Subframe',
      type: '6-Axis Industrial MIG Robot',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone A - Heavy Fabrication', x: 140, y: 130 },
      productionTarget: 1400,
      temp: 232,
      volt: 24.4,
      curr: 198,
      welds: 940,
      defects: 12,
    },
    {
      machineId: 'WM-102',
      name: 'ABB IRB 1600 ArcMaster',
      station: 'Station 1B - Rear Axle Beam',
      type: 'Twin-Torch Arc Robotic Cell',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone A - Heavy Fabrication', x: 340, y: 130 },
      productionTarget: 1350,
      temp: 245,
      volt: 25.1,
      curr: 215,
      welds: 890,
      defects: 8,
    },
    {
      machineId: 'WM-103',
      name: 'Fanuc ArcMate 120iD',
      station: 'Station 2A - B-Pillar Reinforced',
      type: 'High-Precision CO2 Laser/MIG Hybrid',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone A - Heavy Fabrication', x: 540, y: 130 },
      productionTarget: 1200,
      temp: 228,
      volt: 23.8,
      curr: 185,
      welds: 1020,
      defects: 14,
    },
    {
      machineId: 'WM-104',
      name: 'Yaskawa Motoman MA2010',
      station: 'Station 2B - Floorpan Crossmember',
      type: 'Inverted Gantry MIG Robot',
      state: MACHINE_STATES.IDLE,
      location: { zone: 'Zone A - Heavy Fabrication', x: 740, y: 130 },
      productionTarget: 1100,
      temp: 72,
      volt: 0.6,
      curr: 0,
      welds: 780,
      defects: 6,
    },
    {
      machineId: 'WM-105',
      name: 'Panasonic Tawers WG III',
      station: 'Station 3A - Roof Rail Matrix',
      type: 'Ultra-Fast Spot & Seam Cell',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone B - Precision Assembly', x: 920, y: 130 },
      productionTarget: 1500,
      temp: 258,
      volt: 26.2,
      curr: 225,
      welds: 1280,
      defects: 19,
    },
    {
      machineId: 'WM-106',
      name: 'Comau Smart NJ4 110',
      station: 'Station 3B - Engine Cradle Mount',
      type: 'Heavy Spot Welding Arm',
      state: MACHINE_STATES.ERROR,
      location: { zone: 'Zone B - Precision Assembly', x: 140, y: 310 },
      productionTarget: 1150,
      temp: 295, // Overheated fault
      volt: 0,
      curr: 0,
      welds: 540,
      defects: 28,
      faults: [{ code: 'ERR_TORCH_OVERHEAT', message: 'Core cooling circuit pressure dropped', severity: 'CRITICAL' }],
    },
    {
      machineId: 'WM-107',
      name: 'Fronius TPS/i Robotic',
      station: 'Station 4A - Door Ring Beam',
      type: 'Cold Metal Transfer (CMT) Unit',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone B - Precision Assembly', x: 340, y: 310 },
      productionTarget: 1300,
      temp: 218,
      volt: 23.2,
      curr: 175,
      welds: 920,
      defects: 9,
    },
    {
      machineId: 'WM-108',
      name: 'KUKA KR 30 Jet Gantry',
      station: 'Station 4B - Battery Tray Enclosure',
      type: 'Automotive EV Aluminum Laser Cell',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone C - EV Battery Systems', x: 540, y: 310 },
      productionTarget: 1600,
      temp: 262,
      volt: 27.0,
      curr: 230,
      welds: 1140,
      defects: 16,
    },
    {
      machineId: 'WM-109',
      name: 'Fanuc CR-15iA Cobot',
      station: 'Station 5A - Exhaust Flange TIG',
      type: 'Collaborative Orbital TIG Welder',
      state: MACHINE_STATES.STOPPED,
      location: { zone: 'Zone C - EV Battery Systems', x: 740, y: 310 },
      productionTarget: 950,
      temp: 45,
      volt: 0,
      curr: 0,
      welds: 620,
      defects: 5,
    },
    {
      machineId: 'WM-110',
      name: 'Universal Robots UR10e Pro',
      station: 'Station 5B - Final Body Seal & Tack',
      type: 'Automated Micro-Plasma Finishing Arm',
      state: MACHINE_STATES.RUNNING,
      location: { zone: 'Zone C - EV Battery Systems', x: 920, y: 310 },
      productionTarget: 1250,
      temp: 215,
      volt: 22.8,
      curr: 168,
      welds: 860,
      defects: 7,
    },
  ];

  const machines = [];
  for (const cfg of machineConfigs) {
    const defectRate = cfg.welds > 0 ? Number(((cfg.defects / cfg.welds) * 100).toFixed(2)) : 0;
    const m = await Machine.create({
      machineId: cfg.machineId,
      name: cfg.name,
      station: cfg.station,
      type: cfg.type,
      state: cfg.state,
      location: cfg.location,
      productionTarget: cfg.productionTarget,
      alertThresholds: {
        maxTemperature: 280,
        minVoltage: 18,
        maxVoltage: 34,
        minCurrent: 120,
        maxCurrent: 280,
        maxDefectRate: 4.0,
      },
      maintenanceConfig: {
        intervalHours: 500,
        operatingHours: Math.floor(Math.random() * 350) + 120,
        lastMaintenanceDate: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      },
      latestTelemetry: {
        temperature: cfg.temp,
        voltage: cfg.volt,
        current: cfg.curr,
        weldCount: cfg.welds,
        defectCount: cfg.defects,
        defectRate,
        healthScore: cfg.state === MACHINE_STATES.ERROR ? 62 : 97,
        gasFlowRate: cfg.state === MACHINE_STATES.RUNNING ? 15.2 : 0,
        wireFeedSpeed: cfg.state === MACHINE_STATES.RUNNING ? 8.6 : 0,
        lastUpdated: new Date(),
      },
      activeFaults: cfg.faults || [],
      sourceType: 'SIMULATOR',
    });
    machines.push(m);
  }
  console.log(`🤖 Seeded ${machines.length} welding robots across factory zones.`);

  // 3. Seed historical telemetry readings
  const telemetryDocs = [];
  const now = Date.now();
  for (const m of machines) {
    // Generate readings over the last 2 hours (every 10 minutes)
    for (let i = 12; i >= 0; i--) {
      const time = new Date(now - i * 10 * 60 * 1000);
      const temp = m.state === MACHINE_STATES.ERROR ? 295 : 210 + Math.floor(Math.random() * 40);
      telemetryDocs.push({
        machine: m._id,
        machineId: m.machineId,
        timestamp: time,
        temperature: temp,
        voltage: m.state === MACHINE_STATES.RUNNING ? Number((24 + (Math.random() * 2 - 1)).toFixed(1)) : 0,
        current: m.state === MACHINE_STATES.RUNNING ? 180 + Math.floor(Math.random() * 30) : 0,
        state: m.state,
        weldCount: Math.max(0, m.latestTelemetry.weldCount - i * 15),
        qualityCounters: {
          successful: Math.max(0, m.latestTelemetry.weldCount - m.latestTelemetry.defectCount - i * 14),
          defective: Math.max(0, m.latestTelemetry.defectCount - (i > 6 ? 1 : 0)),
        },
        healthScore: m.latestTelemetry.healthScore,
        sourceType: 'SIMULATOR',
      });
    }
  }
  await TelemetryReading.insertMany(telemetryDocs);
  console.log(`📈 Seeded ${telemetryDocs.length} historical telemetry snapshots.`);

  // 4. Seed Quality records
  const qualityRecords = [
    {
      machine: machines[0]._id,
      machineId: 'WM-101',
      timestamp: new Date(now - 45 * 60 * 1000),
      weldsInspected: 100,
      successfulCount: 97,
      defectiveCount: 3,
      defectCategory: 'POROSITY',
      defectRate: 3.0,
      notes: 'Slight gas shielding turbulence caused localized porosity on bracket seam.',
      recordedBy: operatorUser._id,
      source: 'MANUAL_INSPECTION',
    },
    {
      machine: machines[1]._id,
      machineId: 'WM-102',
      timestamp: new Date(now - 90 * 60 * 1000),
      weldsInspected: 120,
      successfulCount: 119,
      defectiveCount: 1,
      defectCategory: 'SPATTER',
      defectRate: 0.83,
      notes: 'Surface spatter cleaned and approved.',
      recordedBy: operatorUser._id,
      source: 'AUTOMATIC',
    },
    {
      machine: machines[5]._id,
      machineId: 'WM-106',
      timestamp: new Date(now - 25 * 60 * 1000),
      weldsInspected: 80,
      successfulCount: 72,
      defectiveCount: 8,
      defectCategory: 'UNDERCUT',
      defectRate: 10.0,
      notes: 'Severe undercut due to torch temperature spike and feed hesitation.',
      recordedBy: operatorUser._id,
      source: 'MANUAL_INSPECTION',
    },
  ];
  await QualityRecord.insertMany(qualityRecords);
  console.log(`🔍 Seeded sample quality inspection records.`);

  // 5. Seed Downtime Incidents
  const downtimeIncidents = [
    {
      machine: machines[3]._id,
      machineId: 'WM-104',
      startTime: new Date(now - 120 * 60 * 1000),
      endTime: new Date(now - 95 * 60 * 1000),
      durationSeconds: 1500,
      reason: 'ELECTRODE_REPLACEMENT',
      source: 'MANUAL',
      notes: 'Scheduled electrode contact tip replacement and nozzle ream',
      recordedBy: operatorUser._id,
      status: 'RESOLVED',
    },
    {
      machine: machines[5]._id,
      machineId: 'WM-106',
      startTime: new Date(now - 30 * 60 * 1000),
      endTime: null,
      durationSeconds: 1800,
      reason: 'OVERHEATING',
      source: 'AUTOMATIC',
      notes: 'Active thermal cutoff triggered by core temp sensor',
      status: 'ACTIVE',
    },
  ];
  await DowntimeIncident.insertMany(downtimeIncidents);
  console.log(`⏱️ Seeded downtime incidents.`);

  // 6. Seed Maintenance Tasks
  const maintenanceTasks = [
    {
      machine: machines[5]._id,
      machineId: 'WM-106',
      title: 'Inspect Liquid Cooling Loop & Radiator',
      description: 'Check coolant level, flush clogged heat exchanger, and inspect solenoid valves.',
      priority: MAINTENANCE_PRIORITIES.CRITICAL,
      status: MAINTENANCE_STATUSES.IN_PROGRESS,
      scheduledDate: new Date(now - 2 * 60 * 60 * 1000),
      dueDate: new Date(now + 4 * 60 * 60 * 1000),
      assignedTo: maintUser._id,
      createdBy: adminUser._id,
      workPerformed: 'Disassembled pump casing; verified coolant flow restriction.',
    },
    {
      machine: machines[2]._id,
      machineId: 'WM-103',
      title: 'Wire Feeder Drive Roll Calibration',
      description: 'Clean grooved drive rollers, check tension spring pressure, calibrate feed speed meter.',
      priority: MAINTENANCE_PRIORITIES.MEDIUM,
      status: MAINTENANCE_STATUSES.SCHEDULED,
      scheduledDate: new Date(now + 24 * 60 * 60 * 1000),
      dueDate: new Date(now + 48 * 60 * 60 * 1000),
      assignedTo: maintUser._id,
      createdBy: managerUser._id,
    },
    {
      machine: machines[0]._id,
      machineId: 'WM-101',
      title: '500-Hour Preventive Robot Arm Lubrication',
      description: 'Replenish Molykote grease on Axis 1 through 6 harmonic drives.',
      priority: MAINTENANCE_PRIORITIES.HIGH,
      status: MAINTENANCE_STATUSES.COMPLETED,
      scheduledDate: new Date(now - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now - 4 * 24 * 60 * 60 * 1000),
      completionDate: new Date(now - 4 * 24 * 60 * 60 * 1000),
      assignedTo: maintUser._id,
      createdBy: adminUser._id,
      workPerformed: 'Full Axis 1-6 purge and grease replenishment completed with certified grease.',
    },
  ];
  await MaintenanceTask.insertMany(maintenanceTasks);
  console.log(`🛠️ Seeded maintenance schedules.`);

  // 7. Seed Sample Alerts across all 5 lifecycle states
  const alerts = [
    {
      machine: machines[5]._id,
      machineId: 'WM-106',
      severity: ALERT_SEVERITIES.CRITICAL,
      category: 'TEMPERATURE',
      message: 'Core torch temperature exceeded threshold: 295°C (Max Limit: 280°C)',
      source: 'AUTOMATIC',
      state: ALERT_STATES.OPEN,
      value: 295,
      threshold: 280,
      history: [
        {
          state: ALERT_STATES.OPEN,
          changedByName: 'System Automated Sensor',
          timestamp: new Date(now - 30 * 60 * 1000),
          notes: 'Thermal cutoff automatically stopped robot cell',
        },
      ],
    },
    {
      machine: machines[3]._id,
      machineId: 'WM-104',
      severity: ALERT_SEVERITIES.WARNING,
      category: 'MECHANICAL',
      message: 'Wire feed friction index elevated above 85%',
      source: 'AUTOMATIC',
      state: ALERT_STATES.INVESTIGATING,
      assignedTo: maintUser._id,
      assignedAt: new Date(now - 60 * 60 * 1000),
      investigationNotes: 'Inspecting wire liner for copper debris buildup.',
      history: [
        {
          state: ALERT_STATES.OPEN,
          changedByName: 'System Sensor',
          timestamp: new Date(now - 90 * 60 * 1000),
          notes: 'Motor current drag detected',
        },
        {
          state: ALERT_STATES.ACKNOWLEDGED,
          changedBy: operatorUser._id,
          changedByName: operatorUser.name,
          timestamp: new Date(now - 80 * 60 * 1000),
          notes: 'Acknowledged by operator',
        },
        {
          state: ALERT_STATES.INVESTIGATING,
          changedBy: maintUser._id,
          changedByName: maintUser.name,
          timestamp: new Date(now - 60 * 60 * 1000),
          notes: 'Assigned to David Chen for liner inspection',
        },
      ],
    },
    {
      machine: machines[1]._id,
      machineId: 'WM-102',
      severity: ALERT_SEVERITIES.INFO,
      category: 'MAINTENANCE_DUE',
      message: 'Upcoming scheduled servicing within 6 operational hours',
      source: 'AUTOMATIC',
      state: ALERT_STATES.ACKNOWLEDGED,
      acknowledgedBy: operatorUser._id,
      acknowledgedAt: new Date(now - 120 * 60 * 1000),
      history: [
        {
          state: ALERT_STATES.OPEN,
          changedByName: 'Maintenance Watchdog',
          timestamp: new Date(now - 130 * 60 * 1000),
          notes: 'Threshold reached',
        },
        {
          state: ALERT_STATES.ACKNOWLEDGED,
          changedBy: operatorUser._id,
          changedByName: operatorUser.name,
          timestamp: new Date(now - 120 * 60 * 1000),
          notes: 'Noted for shift change',
        },
      ],
    },
  ];
  await Alert.insertMany(alerts);
  console.log(`🚨 Seeded sample alerts in various lifecycle phases.`);

  console.log('✨ Database seeding complete successfully!');
};

// Direct script execution support
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err);
      process.exit(1);
    }
  })();
}

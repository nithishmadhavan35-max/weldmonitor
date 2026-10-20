import mongoose from 'mongoose';
import { MACHINE_STATES } from '../config/constants.js';

const machineSchema = new mongoose.Schema(
  {
    machineId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    station: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: '6-Axis Robotic Arc Welder',
    },
    state: {
      type: String,
      enum: Object.values(MACHINE_STATES),
      default: MACHINE_STATES.IDLE,
    },
    location: {
      zone: { type: String, default: 'Zone A' },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    productionTarget: {
      type: Number,
      default: 1200, // target welds per shift
    },
    alertThresholds: {
      maxTemperature: { type: Number, default: 280 }, // °C
      minVoltage: { type: Number, default: 18 },      // Volts
      maxVoltage: { type: Number, default: 34 },      // Volts
      minCurrent: { type: Number, default: 120 },     // Amperes
      maxCurrent: { type: Number, default: 280 },     // Amperes
      maxDefectRate: { type: Number, default: 4.0 },  // %
    },
    maintenanceConfig: {
      intervalHours: { type: Number, default: 500 },
      operatingHours: { type: Number, default: 0 },
      lastMaintenanceDate: { type: Date },
      nextMaintenanceDate: { type: Date },
    },
    latestTelemetry: {
      temperature: { type: Number, default: 25 },
      voltage: { type: Number, default: 0 },
      current: { type: Number, default: 0 },
      weldCount: { type: Number, default: 0 },
      defectCount: { type: Number, default: 0 },
      defectRate: { type: Number, default: 0 },
      healthScore: { type: Number, default: 100 },
      gasFlowRate: { type: Number, default: 15 }, // L/min
      wireFeedSpeed: { type: Number, default: 8.5 }, // m/min
      lastUpdated: { type: Date, default: Date.now },
    },
    activeFaults: [
      {
        code: String,
        message: String,
        severity: String,
        triggeredAt: { type: Date, default: Date.now },
      },
    ],
    sourceType: {
      type: String,
      enum: ['SIMULATOR', 'MQTT_GATEWAY', 'PLC_DIRECT'],
      default: 'SIMULATOR',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

machineSchema.index({ machineId: 1 });
machineSchema.index({ state: 1 });

export const Machine = mongoose.model('Machine', machineSchema);

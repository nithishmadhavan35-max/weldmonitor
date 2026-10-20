import mongoose from 'mongoose';
import { MACHINE_STATES } from '../config/constants.js';

const telemetryReadingSchema = new mongoose.Schema(
  {
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    machineId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    voltage: {
      type: Number,
      required: true,
    },
    current: {
      type: Number,
      required: true,
    },
    state: {
      type: String,
      enum: Object.values(MACHINE_STATES),
      required: true,
    },
    weldCount: {
      type: Number,
      default: 0,
    },
    qualityCounters: {
      successful: { type: Number, default: 0 },
      defective: { type: Number, default: 0 },
    },
    gasFlowRate: {
      type: Number,
      default: 15.0,
    },
    wireFeedSpeed: {
      type: Number,
      default: 8.5,
    },
    healthScore: {
      type: Number,
      default: 100,
    },
    sourceType: {
      type: String,
      default: 'SIMULATOR',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for time-series queries
telemetryReadingSchema.index({ machineId: 1, timestamp: -1 });

export const TelemetryReading = mongoose.model('TelemetryReading', telemetryReadingSchema);

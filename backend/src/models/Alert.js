import mongoose from 'mongoose';
import { ALERT_SEVERITIES, ALERT_STATES } from '../config/constants.js';

const alertHistorySchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: Object.values(ALERT_STATES),
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedByName: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema(
  {
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      index: true,
    },
    machineId: {
      type: String,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(ALERT_SEVERITIES),
      default: ALERT_SEVERITIES.WARNING,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'TEMPERATURE',
        'VOLTAGE',
        'CURRENT',
        'DEFECT_RATE',
        'MECHANICAL',
        'MAINTENANCE_DUE',
        'COMMUNICATION',
        'MANUAL_REPORT',
        'SYSTEM'
      ],
      default: 'MECHANICAL',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['AUTOMATIC', 'MANUAL'],
      default: 'AUTOMATIC',
    },
    state: {
      type: String,
      enum: Object.values(ALERT_STATES),
      default: ALERT_STATES.OPEN,
      index: true,
    },
    value: {
      type: Number, // Measured value that triggered the alert (e.g. 312°C)
    },
    threshold: {
      type: Number, // Threshold violated (e.g. 280°C)
    },
    history: [alertHistorySchema],
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
    },
    investigationNotes: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    resolutionDetails: {
      type: String,
      trim: true,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closedAt: {
      type: Date,
    },
    relatedMaintenanceTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceTask',
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ state: 1, severity: 1 });
alertSchema.index({ machineId: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);

import mongoose from 'mongoose';
import { DOWNTIME_REASONS } from '../config/constants.js';

const downtimeIncidentSchema = new mongoose.Schema(
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
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      index: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      enum: DOWNTIME_REASONS,
      default: 'OPERATOR_BREAK',
    },
    source: {
      type: String,
      enum: ['AUTOMATIC', 'MANUAL'],
      default: 'AUTOMATIC',
    },
    relatedAlert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

downtimeIncidentSchema.index({ machineId: 1, startTime: -1 });

export const DowntimeIncident = mongoose.model('DowntimeIncident', downtimeIncidentSchema);

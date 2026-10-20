import mongoose from 'mongoose';
import { DEFECT_CATEGORIES } from '../config/constants.js';

const qualityRecordSchema = new mongoose.Schema(
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
    weldsInspected: {
      type: Number,
      required: true,
      min: 0,
    },
    successfulCount: {
      type: Number,
      required: true,
      min: 0,
    },
    defectiveCount: {
      type: Number,
      required: true,
      min: 0,
    },
    defectCategory: {
      type: String,
      enum: [...DEFECT_CATEGORIES, 'NONE'],
      default: 'NONE',
    },
    defectRate: {
      type: Number, // percentage
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source: {
      type: String,
      enum: ['AUTOMATIC', 'MANUAL_INSPECTION'],
      default: 'AUTOMATIC',
    },
  },
  {
    timestamps: true,
  }
);

qualityRecordSchema.index({ machineId: 1, timestamp: -1 });

export const QualityRecord = mongoose.model('QualityRecord', qualityRecordSchema);

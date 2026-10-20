import mongoose from 'mongoose';
import { MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from '../config/constants.js';

const maintenanceTaskSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: Object.values(MAINTENANCE_PRIORITIES),
      default: MAINTENANCE_PRIORITIES.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(MAINTENANCE_STATUSES),
      default: MAINTENANCE_STATUSES.SCHEDULED,
      index: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completionDate: {
      type: Date,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    workPerformed: {
      type: String,
      trim: true,
    },
    serviceNotes: {
      type: String,
      trim: true,
    },
    partsReplaced: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
      },
    ],
    operatingHoursAtService: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

maintenanceTaskSchema.index({ machineId: 1, status: 1 });
maintenanceTaskSchema.index({ dueDate: 1 });

export const MaintenanceTask = mongoose.model('MaintenanceTask', maintenanceTaskSchema);

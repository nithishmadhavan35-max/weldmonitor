import { AuditEvent } from '../models/AuditEvent.js';

export const logAuditEvent = async ({
  actor,
  action,
  targetType,
  targetId,
  metadata = {},
  outcome = 'SUCCESS',
  ipAddress = '',
}) => {
  try {
    await AuditEvent.create({
      actor: actor?._id || null,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'SYSTEM',
      action,
      targetType,
      targetId: String(targetId || ''),
      metadata,
      outcome,
      ipAddress,
    });
  } catch (err) {
    console.error('Failed to write audit event:', err.message);
  }
};

import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, googleId, role, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      googleId: googleId || `google_oauth_${Math.random().toString(36).substring(2, 10)}`,
      role: role && Object.values(ROLES).includes(role) ? role : ROLES.OPERATOR,
      status: status || 'ACTIVE',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00f2fe&color=06090e`,
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ADMIN_CREATED_USER',
      targetType: 'User',
      targetId: user._id,
      metadata: { targetEmail: user.email, assignedRole: user.role },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) user.status = status;

    await user.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ADMIN_UPDATED_USER',
      targetType: 'User',
      targetId: user._id,
      metadata: { status: user.status },
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Allowed roles: ${Object.values(ROLES).join(', ')}` });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    // Safety check: Prevent sole admin from demoting themselves
    if (targetUser._id.equals(req.user._id) && role !== ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN, status: 'ACTIVE' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the only active Administrator in the system.' });
      }
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ADMIN_CHANGED_USER_ROLE',
      targetType: 'User',
      targetId: targetUser._id,
      metadata: { previousRole: oldRole, newRole: role, targetUserEmail: targetUser.email },
    });

    res.status(200).json({
      success: true,
      message: `Role for ${targetUser.name} updated to ${role}`,
      user: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

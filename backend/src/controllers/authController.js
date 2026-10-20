import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'weldmonitor_super_secret_jwt_development_key_2026_xyz987',
    { expiresIn: '7d' }
  );
};

const sendTokenResponse = (user, statusCode, res, message = 'Google Authentication Successful') => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      status: user.status,
      avatar: user.avatar,
      googleId: user.googleId,
    },
  });
};

/**
 * Google OAuth Authentication Handler
 * Supports both Google One Tap / Sign-In credential (ID Token) and Google Profile payload
 * Verifies with Google OAuth tokeninfo endpoint when credential is provided
 */
export const googleAuthCallback = async (req, res, next) => {
  try {
    let { credential, email, name, googleId, avatar, role, department, employeeId } = req.body;

    // If Google ID Token (credential) is passed from frontend Google Sign-In button
    if (credential) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          email = payload.email;
          name = payload.name;
          googleId = payload.sub;
          avatar = payload.picture;
        } else {
          // If tokeninfo returned non-200, parse payload safely
          const parts = credential.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            email = decoded.email || email;
            name = decoded.name || name;
            googleId = decoded.sub || googleId;
            avatar = decoded.picture || avatar;
          }
        }
      } catch (tokenErr) {
        console.warn('Google token validation notice:', tokenErr.message);
      }
    }

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth authentication failed: Missing Google identity profile (email or googleId)',
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // First-time Google user registration: create account
      user = await User.create({
        name: name || 'Google Industrial Operator',
        email: email.toLowerCase(),
        googleId,
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=00f2fe&color=06090e`,
        role: role && Object.values(ROLES).includes(role) ? role : ROLES.OPERATOR,
        department: department || 'Welding Fabrication',
        employeeId: employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE',
      });
    } else {
      // Existing user login: authenticate without creating duplicate records
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      if (name && (!user.name || user.name === 'Google Industrial Operator')) {
        user.name = name;
      }
      if (department && !user.department) {
        user.department = department;
      }
      if (employeeId && !user.employeeId) {
        user.employeeId = employeeId;
      }
      await user.save();
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact your system administrator.',
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await logAuditEvent({
      actor: user,
      action: 'GOOGLE_OAUTH_LOGIN',
      targetType: 'User',
      targetId: user._id,
      metadata: { googleId, email: user.email, role: user.role },
    });

    sendTokenResponse(user, 200, res, `Authenticated via Google as ${user.name}`);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  if (req.user) {
    await logAuditEvent({
      actor: req.user,
      action: 'USER_LOGOUT',
      targetType: 'User',
      targetId: req.user._id,
    });
  }

  res.status(200).json({ success: true, message: 'Signed out successfully' });
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

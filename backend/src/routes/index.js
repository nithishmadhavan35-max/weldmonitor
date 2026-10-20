import express from 'express';
import { ROLES } from '../config/constants.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

// Controllers
import * as authCtrl from '../controllers/authController.js';
import * as userCtrl from '../controllers/userController.js';
import * as machineCtrl from '../controllers/machineController.js';
import * as qualityCtrl from '../controllers/qualityController.js';
import * as prodCtrl from '../controllers/productionController.js';
import * as downtimeCtrl from '../controllers/downtimeController.js';
import * as maintCtrl from '../controllers/maintenanceController.js';
import * as alertCtrl from '../controllers/alertController.js';
import * as reportCtrl from '../controllers/reportController.js';
import * as simCtrl from '../controllers/simulationController.js';

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'WeldMonitor Industrial Backend',
    authProvider: 'Google OAuth 2.0',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// --- Google OAuth Authentication ---
router.post('/auth/google', authCtrl.googleAuthCallback);
router.post('/auth/logout', authCtrl.logout);
router.get('/auth/me', protect, authCtrl.getMe);

// --- User Management (Admin only) ---
router.get('/users', protect, authorizeRoles(ROLES.ADMIN), userCtrl.getUsers);
router.post('/users', protect, authorizeRoles(ROLES.ADMIN), userCtrl.createUser);
router.patch('/users/:id', protect, authorizeRoles(ROLES.ADMIN), userCtrl.updateUser);
router.patch('/users/:id/role', protect, authorizeRoles(ROLES.ADMIN), userCtrl.updateUserRole);

// --- Machines & Dashboard Summary ---
router.get('/dashboard/summary', machineCtrl.getDashboardSummary);
router.get('/machines', machineCtrl.getMachines);
router.get('/machines/:id', machineCtrl.getMachineById);
router.post('/machines', protect, authorizeRoles(ROLES.ADMIN), machineCtrl.createMachine);
router.patch('/machines/:id', protect, authorizeRoles(ROLES.ADMIN), machineCtrl.updateMachine);
router.get('/machines/:id/telemetry', machineCtrl.getMachineTelemetry);

// --- Quality Analytics ---
router.get('/quality', qualityCtrl.getQualityRecords);
router.post(
  '/quality',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER, ROLES.PRODUCTION_MANAGER),
  qualityCtrl.createQualityRecord
);

// --- Production Analytics ---
router.get('/production/summary', prodCtrl.getProduction);

// --- Downtime Tracking ---
router.get('/downtime', downtimeCtrl.getDowntime);
router.post(
  '/downtime',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  downtimeCtrl.createDowntimeIncident
);
router.patch(
  '/downtime/:id',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  downtimeCtrl.updateDowntimeIncident
);

// --- Maintenance Management ---
router.get('/maintenance', maintCtrl.getMaintenanceTasks);
router.get('/maintenance/:id', maintCtrl.getMaintenanceTaskById);
router.post(
  '/maintenance',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  maintCtrl.createTask
);
router.patch(
  '/maintenance/:id',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  maintCtrl.updateTask
);

// --- Alert & Fault Lifecycle ---
router.get('/alerts', alertCtrl.getAlerts);
router.get('/alerts/:id', alertCtrl.getAlertById);
router.post(
  '/alerts',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  alertCtrl.reportManualAlert
);
router.post(
  '/alerts/:id/acknowledge',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  alertCtrl.acknowledgeAlert
);
router.post(
  '/alerts/:id/assign',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  alertCtrl.assignAlert
);
router.post(
  '/alerts/:id/investigate',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  alertCtrl.investigateAlert
);
router.post(
  '/alerts/:id/resolve',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  alertCtrl.resolveAlert
);
router.post(
  '/alerts/:id/close',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.MAINTENANCE_ENGINEER),
  alertCtrl.closeAlert
);

// --- Reports & Exports (PDF, CSV, XLSX) ---
router.get(
  '/reports/:category',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.MAINTENANCE_ENGINEER),
  reportCtrl.getReport
);

// --- Simulation Controls ---
router.get('/simulation/status', simCtrl.getSimulationStatus);
router.post(
  '/simulation/start',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  simCtrl.startSimulation
);
router.post(
  '/simulation/pause',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  simCtrl.pauseSimulation
);
router.post(
  '/simulation/resume',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  simCtrl.resumeSimulation
);
router.post(
  '/simulation/reset',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  simCtrl.resetSimulation
);
router.post(
  '/simulation/machines/:id/fault',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  simCtrl.triggerFault
);
router.post(
  '/simulation/machines/:id/state',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  simCtrl.setMachineState
);
router.post(
  '/simulation/machines/:id/overheat',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  simCtrl.simulateOverheat
);
router.post(
  '/simulation/machines/:id/recover',
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.MAINTENANCE_ENGINEER),
  simCtrl.recoverMachine
);

export default router;

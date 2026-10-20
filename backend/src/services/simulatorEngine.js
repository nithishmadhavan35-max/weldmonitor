import { Machine } from '../models/Machine.js';
import { TelemetryReading } from '../models/TelemetryReading.js';
import { QualityRecord } from '../models/QualityRecord.js';
import { MACHINE_STATES, ALERT_SEVERITIES, DEFECT_CATEGORIES } from '../config/constants.js';
import { createAlert } from './alertService.js';
import { startDowntime, endDowntime } from './downtimeService.js';
import { getIO } from '../socket/index.js';

class SimulatorEngine {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.intervalMs = 5000; // 5-second interval
    this.forcedConditions = new Map(); // machineId -> { overheat: bool, forcedError: bool, etc. }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚡ Simulation engine is already running.');
      return;
    }
    this.isRunning = true;
    console.log(`🚀 Starting WeldMonitor Simulation Engine (${this.intervalMs / 1000}s interval)...`);
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    // Run immediate first tick
    this.tick();
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('⏸️ Simulation engine paused.');
  }

  resume() {
    if (!this.isRunning) {
      this.start();
    }
  }

  async reset() {
    this.forcedConditions.clear();
    console.log('🔄 Resetting all machines to normal operational baseline...');
    const machines = await Machine.find();
    for (const m of machines) {
      m.state = MACHINE_STATES.RUNNING;
      m.activeFaults = [];
      m.latestTelemetry.temperature = 225 + Math.floor(Math.random() * 20);
      m.latestTelemetry.voltage = Number((24.2 + (Math.random() * 2 - 1)).toFixed(1));
      m.latestTelemetry.current = Math.floor(185 + Math.random() * 30);
      m.latestTelemetry.healthScore = 98;
      await m.save();
      await endDowntime({ machineId: m.machineId, notes: 'System simulation reset' });
    }
  }

  async tick() {
    try {
      const machines = await Machine.find();
      if (!machines || machines.length === 0) return;

      const io = getIO();
      const telemetryBatch = [];

      for (const machine of machines) {
        const overrides = this.forcedConditions.get(machine.machineId) || {};
        let state = overrides.forcedState || machine.state;

        // Realistic telemetry variations based on machine state
        let temp = machine.latestTelemetry?.temperature || 220;
        let volt = machine.latestTelemetry?.voltage || 24;
        let curr = machine.latestTelemetry?.current || 190;
        let weldCount = machine.latestTelemetry?.weldCount || 0;
        let defectCount = machine.latestTelemetry?.defectCount || 0;
        let health = machine.latestTelemetry?.healthScore || 100;

        if (overrides.overheat) {
          temp = Math.min(340, temp + 12 + Math.random() * 5);
          state = MACHINE_STATES.ERROR;
        } else if (state === MACHINE_STATES.RUNNING) {
          // Bounded normal fluctuation
          temp = Math.max(190, Math.min(270, temp + (Math.random() * 6 - 3)));
          volt = Number((24 + (Math.random() * 2.4 - 1.2)).toFixed(1));
          curr = Math.round(195 + (Math.random() * 20 - 10));
          // Increment welds
          const newWelds = Math.floor(Math.random() * 2) + 1; // 1 or 2 welds every 5 seconds
          weldCount += newWelds;

          // Random rare defect (~2% probability)
          const isDefective = Math.random() < 0.035;
          if (isDefective) {
            defectCount += 1;
            const defectCat = DEFECT_CATEGORIES[Math.floor(Math.random() * DEFECT_CATEGORIES.length)];
            await QualityRecord.create({
              machine: machine._id,
              machineId: machine.machineId,
              weldsInspected: newWelds,
              successfulCount: newWelds - 1,
              defectiveCount: 1,
              defectCategory: defectCat,
              defectRate: Number(((1 / newWelds) * 100).toFixed(2)),
              notes: 'Defect caught by automated laser bead inspection',
              source: 'AUTOMATIC',
            });
          }
          health = Math.max(75, Math.min(100, health + (Math.random() * 0.4 - 0.2)));
        } else if (state === MACHINE_STATES.IDLE) {
          temp = Math.max(70, temp - 4);
          volt = Number((0.5 + Math.random() * 0.5).toFixed(1));
          curr = 0;
        } else {
          // STOPPED or ERROR
          temp = Math.max(40, temp - 6);
          volt = 0;
          curr = 0;
        }

        const defectRate = weldCount > 0 ? Number(((defectCount / weldCount) * 100).toFixed(2)) : 0;

        // Check threshold violations
        const thresholds = machine.alertThresholds || {};
        if (temp > (thresholds.maxTemperature || 280)) {
          await createAlert({
            machine: machine._id,
            machineId: machine.machineId,
            severity: ALERT_SEVERITIES.CRITICAL,
            category: 'TEMPERATURE',
            message: `Overheating Alert: Core torch temperature reached ${Math.round(temp)}°C (Limit: ${thresholds.maxTemperature}°C)`,
            source: 'AUTOMATIC',
            value: Math.round(temp),
            threshold: thresholds.maxTemperature,
          });
          state = MACHINE_STATES.ERROR;
          await startDowntime({
            machine: machine._id,
            machineId: machine.machineId,
            reason: 'OVERHEATING',
            source: 'AUTOMATIC',
            notes: `Auto shutoff: Core temperature reached ${Math.round(temp)}°C`,
          });
        }

        if (state === MACHINE_STATES.ERROR && machine.state !== MACHINE_STATES.ERROR) {
          await startDowntime({
            machine: machine._id,
            machineId: machine.machineId,
            reason: 'ROBOT_PATH_ERROR',
            source: 'AUTOMATIC',
            notes: 'Machine transitioned into ERROR state',
          });
        } else if (state === MACHINE_STATES.RUNNING && machine.state !== MACHINE_STATES.RUNNING) {
          await endDowntime({
            machineId: machine.machineId,
            notes: 'Machine restored to active RUNNING state',
          });
        }

        // Update machine document
        machine.state = state;
        machine.latestTelemetry = {
          temperature: Math.round(temp),
          voltage: volt,
          current: curr,
          weldCount,
          defectCount,
          defectRate,
          healthScore: Math.round(health),
          gasFlowRate: state === MACHINE_STATES.RUNNING ? Number((15 + (Math.random() * 2 - 1)).toFixed(1)) : 0,
          wireFeedSpeed: state === MACHINE_STATES.RUNNING ? Number((8.5 + (Math.random() * 1 - 0.5)).toFixed(1)) : 0,
          lastUpdated: new Date(),
        };
        machine.lastSeen = new Date();
        await machine.save();

        // Save persistent telemetry reading periodically
        const reading = await TelemetryReading.create({
          machine: machine._id,
          machineId: machine.machineId,
          timestamp: new Date(),
          temperature: Math.round(temp),
          voltage: volt,
          current: curr,
          state,
          weldCount,
          qualityCounters: { successful: weldCount - defectCount, defective: defectCount },
          healthScore: Math.round(health),
          sourceType: 'SIMULATOR',
        });

        telemetryBatch.push({
          machineId: machine.machineId,
          name: machine.name,
          station: machine.station,
          state,
          telemetry: machine.latestTelemetry,
          location: machine.location,
        });

        if (io) {
          io.to(`machine:${machine.machineId}`).emit('machine:telemetry', {
            machineId: machine.machineId,
            ...machine.latestTelemetry,
            state,
          });
        }
      }

      if (io) {
        io.emit('machines:batch_telemetry', telemetryBatch);
      }
    } catch (err) {
      console.error('Error in simulation engine tick:', err);
    }
  }

  // --- Authorized Manual Simulator Controls ---

  async triggerMachineFault(machineId, { code = 'ERR_SERVO_FAIL', message = 'Robotic arm servo tracking error' } = {}) {
    const machine = await Machine.findOne({ machineId });
    if (!machine) throw new Error(`Machine ${machineId} not found`);

    this.forcedConditions.set(machineId, { forcedState: MACHINE_STATES.ERROR });
    machine.state = MACHINE_STATES.ERROR;
    machine.activeFaults.push({
      code,
      message,
      severity: ALERT_SEVERITIES.CRITICAL,
      triggeredAt: new Date(),
    });
    await machine.save();

    await startDowntime({
      machine: machine._id,
      machineId,
      reason: 'ROBOT_PATH_ERROR',
      source: 'MANUAL',
      notes: `Manual simulation fault injected: ${message}`,
    });

    await createAlert({
      machine: machine._id,
      machineId,
      severity: ALERT_SEVERITIES.CRITICAL,
      category: 'MECHANICAL',
      message: `Simulated Fault: ${message} (${code})`,
      source: 'MANUAL',
    });

    const io = getIO();
    if (io) {
      io.emit('machine:status', { machineId, state: MACHINE_STATES.ERROR });
    }

    return machine;
  }

  async setMachineState(machineId, newState) {
    if (!Object.values(MACHINE_STATES).includes(newState)) {
      throw new Error(`Invalid state: ${newState}`);
    }

    const machine = await Machine.findOne({ machineId });
    if (!machine) throw new Error(`Machine ${machineId} not found`);

    const currOverrides = this.forcedConditions.get(machineId) || {};
    currOverrides.forcedState = newState;
    if (newState === MACHINE_STATES.RUNNING) {
      currOverrides.overheat = false;
    }
    this.forcedConditions.set(machineId, currOverrides);

    machine.state = newState;
    await machine.save();

    if (newState === MACHINE_STATES.STOPPED || newState === MACHINE_STATES.ERROR) {
      await startDowntime({
        machine: machine._id,
        machineId,
        reason: 'OPERATOR_BREAK',
        source: 'MANUAL',
        notes: `Simulated manual state change to ${newState}`,
      });
    } else if (newState === MACHINE_STATES.RUNNING) {
      await endDowntime({ machineId, notes: 'State manually changed back to RUNNING' });
    }

    const io = getIO();
    if (io) {
      io.emit('machine:status', { machineId, state: newState });
    }

    return machine;
  }

  async simulateOverheat(machineId) {
    const machine = await Machine.findOne({ machineId });
    if (!machine) throw new Error(`Machine ${machineId} not found`);

    const currOverrides = this.forcedConditions.get(machineId) || {};
    currOverrides.overheat = true;
    this.forcedConditions.set(machineId, currOverrides);

    machine.latestTelemetry.temperature = 318;
    await machine.save();

    await createAlert({
      machine: machine._id,
      machineId,
      severity: ALERT_SEVERITIES.CRITICAL,
      category: 'TEMPERATURE',
      message: `Emergency Overheating Event: Torch temperature surged to 318°C`,
      source: 'MANUAL',
      value: 318,
      threshold: machine.alertThresholds?.maxTemperature || 280,
    });

    const io = getIO();
    if (io) {
      io.emit('machine:telemetry', { machineId, ...machine.latestTelemetry, state: machine.state });
    }

    return machine;
  }

  async recoverMachine(machineId) {
    const machine = await Machine.findOne({ machineId });
    if (!machine) throw new Error(`Machine ${machineId} not found`);

    this.forcedConditions.delete(machineId);

    machine.state = MACHINE_STATES.RUNNING;
    machine.activeFaults = [];
    machine.latestTelemetry.temperature = 224;
    machine.latestTelemetry.voltage = 24.5;
    machine.latestTelemetry.current = 195;
    machine.latestTelemetry.healthScore = 96;
    await machine.save();

    await endDowntime({ machineId, notes: 'Machine recovery initiated through simulator controls' });

    const io = getIO();
    if (io) {
      io.emit('machine:status', { machineId, state: MACHINE_STATES.RUNNING });
      io.emit('machine:telemetry', { machineId, ...machine.latestTelemetry, state: MACHINE_STATES.RUNNING });
    }

    return machine;
  }
}

export const simulatorInstance = new SimulatorEngine();

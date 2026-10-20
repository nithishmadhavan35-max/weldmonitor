import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { Machine } from '../models/Machine.js';
import { QualityRecord } from '../models/QualityRecord.js';
import { DowntimeIncident } from '../models/DowntimeIncident.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { TelemetryReading } from '../models/TelemetryReading.js';

export const generateReportData = async (category, filters = {}) => {
  const { machineId, startDate, endDate } = filters;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const hasDate = Object.keys(dateFilter).length > 0;

  switch (category) {
    case 'production': {
      const query = {};
      if (machineId) query.machineId = machineId;
      const machines = await Machine.find(query).lean();

      return machines.map((m) => {
        const welds = m.latestTelemetry?.weldCount || 0;
        const target = m.productionTarget || 1200;
        const rate = target > 0 ? ((welds / target) * 100).toFixed(1) : '0';
        return {
          'Machine ID': m.machineId,
          Name: m.name,
          Station: m.station,
          State: m.state,
          'Total Welds Completed': welds,
          'Shift Target': target,
          'Target Achievement (%)': `${rate}%`,
          'Defect Rate (%)': `${m.latestTelemetry?.defectRate || 0}%`,
          'Health Score': `${m.latestTelemetry?.healthScore || 100}%`,
        };
      });
    }

    case 'quality': {
      const query = {};
      if (machineId) query.machineId = machineId;
      if (hasDate) query.timestamp = dateFilter;
      const records = await QualityRecord.find(query).sort({ timestamp: -1 }).limit(500).lean();

      return records.map((r) => ({
        Date: new Date(r.timestamp).toISOString().replace('T', ' ').slice(0, 19),
        'Machine ID': r.machineId,
        'Welds Inspected': r.weldsInspected,
        'Successful Welds': r.successfulCount,
        'Defective Welds': r.defectiveCount,
        'Defect Rate (%)': `${r.defectRate}%`,
        'Defect Category': r.defectCategory,
        Source: r.source,
        Notes: r.notes || '-',
      }));
    }

    case 'downtime': {
      const query = {};
      if (machineId) query.machineId = machineId;
      if (hasDate) query.startTime = dateFilter;
      const incidents = await DowntimeIncident.find(query).sort({ startTime: -1 }).limit(500).lean();

      return incidents.map((i) => ({
        'Incident ID': String(i._id).slice(-6).toUpperCase(),
        'Machine ID': i.machineId,
        'Start Time': new Date(i.startTime).toISOString().replace('T', ' ').slice(0, 19),
        'End Time': i.endTime ? new Date(i.endTime).toISOString().replace('T', ' ').slice(0, 19) : 'ACTIVE',
        'Duration (Min)': i.durationSeconds ? (i.durationSeconds / 60).toFixed(1) : 'In Progress',
        Reason: i.reason,
        Source: i.source,
        Status: i.status,
        Notes: i.notes || '-',
      }));
    }

    case 'maintenance': {
      const query = {};
      if (machineId) query.machineId = machineId;
      if (hasDate) query.scheduledDate = dateFilter;
      const tasks = await MaintenanceTask.find(query).sort({ scheduledDate: -1 }).limit(500).lean();

      return tasks.map((t) => ({
        'Task ID': String(t._id).slice(-6).toUpperCase(),
        'Machine ID': t.machineId,
        Title: t.title,
        Priority: t.priority,
        Status: t.status,
        'Scheduled Date': new Date(t.scheduledDate).toISOString().slice(0, 10),
        'Due Date': new Date(t.dueDate).toISOString().slice(0, 10),
        'Completion Date': t.completionDate ? new Date(t.completionDate).toISOString().slice(0, 10) : '-',
        'Operating Hours': t.operatingHoursAtService || 0,
        'Work Performed': t.workPerformed || '-',
      }));
    }

    case 'machine-performance':
    default: {
      const query = {};
      if (machineId) query.machineId = machineId;
      const machines = await Machine.find(query).lean();

      return machines.map((m) => ({
        'Machine ID': m.machineId,
        Station: m.station,
        Status: m.state,
        'Core Temp (°C)': m.latestTelemetry?.temperature || 0,
        'Voltage (V)': m.latestTelemetry?.voltage || 0,
        'Current (A)': m.latestTelemetry?.current || 0,
        'Gas Flow (L/min)': m.latestTelemetry?.gasFlowRate || 15,
        'Wire Feed (m/min)': m.latestTelemetry?.wireFeedSpeed || 8.5,
        'Weld Count': m.latestTelemetry?.weldCount || 0,
        'Defect Rate (%)': `${m.latestTelemetry?.defectRate || 0}%`,
        'Health Score (%)': `${m.latestTelemetry?.healthScore || 100}%`,
        'Operating Hours': m.maintenanceConfig?.operatingHours || 0,
      }));
    }
  }
};

/**
 * Generates formatted CSV string
 */
export const exportToCSV = (data) => {
  if (!data || data.length === 0) return 'No data available';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Generates Excel Workbook Buffer using XLSX
 */
export const exportToXLSX = (data, sheetName = 'Report') => {
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Message: 'No data available' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generates styled PDF buffer using PDFKit
 */
export const exportToPDF = (category, data, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Futuristic Industrial Header
      doc
        .rect(0, 0, doc.page.width, 60)
        .fill('#0a0f18');

      doc
        .fillColor('#00f2fe')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('WeldMonitor INDUSTRIAL REPORT', 40, 20);

      doc
        .fillColor('#94a3b8')
        .fontSize(10)
        .font('Helvetica')
        .text(`CATEGORY: ${category.toUpperCase()} | GENERATED: ${new Date().toISOString()}`, 40, 75);

      if (filters.machineId) {
        doc.text(`FILTER APPLIED - Machine ID: ${filters.machineId}`, 40, 90);
      }

      doc.moveDown(2);

      // Data summary & table
      if (!data || data.length === 0) {
        doc.fillColor('#64748b').fontSize(12).text('No records found matching specified filters.');
      } else {
        const headers = Object.keys(data[0]);
        const startY = doc.y + 10;
        let currentY = startY;

        // Table Header
        doc.rect(40, currentY, doc.page.width - 80, 22).fill('#1e293b');
        doc.fillColor('#00f2fe').fontSize(8).font('Helvetica-Bold');

        const colWidth = (doc.page.width - 80) / Math.min(headers.length, 6);
        headers.slice(0, 6).forEach((header, i) => {
          doc.text(header.slice(0, 16), 45 + i * colWidth, currentY + 6, { width: colWidth - 5, ellipsis: true });
        });

        currentY += 24;

        // Table Rows
        doc.font('Helvetica').fontSize(8);
        data.slice(0, 35).forEach((row, rowIndex) => {
          if (currentY > doc.page.height - 60) {
            doc.addPage();
            currentY = 40;
          }

          const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(40, currentY, doc.page.width - 80, 18).fill(bgColor);
          doc.fillColor('#334155');

          headers.slice(0, 6).forEach((header, i) => {
            const val = String(row[header] ?? '');
            doc.text(val.slice(0, 18), 45 + i * colWidth, currentY + 5, { width: colWidth - 5, ellipsis: true });
          });

          currentY += 18;
        });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(
          'WeldMonitor Real-time Robotic Welding Systems - Internal Confidential Report',
          40,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 80 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

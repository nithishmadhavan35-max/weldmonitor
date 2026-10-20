import { generateReportData, exportToCSV, exportToXLSX, exportToPDF } from '../services/reportService.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

export const getReport = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { format = 'json', machineId, startDate, endDate } = req.query;

    const validCategories = ['production', 'quality', 'downtime', 'maintenance', 'machine-performance'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const data = await generateReportData(category, { machineId, startDate, endDate });

    await logAuditEvent({
      actor: req.user,
      action: 'REPORT_EXPORTED',
      targetType: 'Report',
      targetId: category,
      metadata: { format, machineId, recordsExported: data.length },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `weldmonitor_${category}_report_${timestamp}`;

    if (format === 'csv') {
      const csv = exportToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.status(200).send(csv);
    }

    if (format === 'xlsx') {
      const buffer = exportToXLSX(data, category.slice(0, 30));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.status(200).send(buffer);
    }

    if (format === 'pdf') {
      const pdfBuffer = await exportToPDF(category, data, { machineId, startDate, endDate });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    // Default JSON response
    res.status(200).json({
      success: true,
      category,
      count: data.length,
      generatedAt: new Date(),
      data,
    });
  } catch (error) {
    next(error);
  }
};

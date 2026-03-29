import ExcelJS from 'exceljs';

/**
 * Generate an Excel workbook buffer from timesheet entries.
 * @param {Array} entries - Prisma timesheet entries with user, project, taskType included
 * @returns {Buffer} - xlsx buffer
 */
export const generateExcel = async (entries) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YorkLog';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Timesheet Report', {
    pageSetup: { fitToPage: true, orientation: 'landscape' },
  });

  // ── Header row styling ──────────────────────────────────────────────────────
  const NAVY = '0F2D4A';
  const TEAL = '0E7490';

  sheet.columns = [
    { header: 'Employee',    key: 'employee',    width: 22 },
    { header: 'Department',  key: 'department',  width: 22 },
    { header: 'Project',     key: 'project',     width: 26 },
    { header: 'Task Type',   key: 'taskType',    width: 24 },
    { header: 'Date',        key: 'date',        width: 14 },
    { header: 'Hours',       key: 'hours',       width: 10 },
    { header: 'Task Summary',key: 'taskDesc',    width: 30 },
    { header: 'Description', key: 'description', width: 40 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: TEAL } },
    };
  });
  headerRow.height = 24;

  // ── Data rows ───────────────────────────────────────────────────────────────
  entries.forEach((entry, i) => {
    const row = sheet.addRow({
      employee:    entry.user?.name || '',
      department:  entry.user?.department?.name || '',
      project:     entry.project?.name || '',
      taskType:    entry.taskType?.name || '',
      date:        entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '',
      hours:       entry.totalMinutes ? (entry.totalMinutes / 60).toFixed(2) : 0,
      taskDesc:    entry.taskDescription || '',
      description: entry.description || '',
    });

    // Alternate row background
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      });
    }

    row.eachCell(cell => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: 'E2E8F0' } } };
    });
  });

  // ── Total row ────────────────────────────────────────────────────────────────
  const totalMinutes = entries.reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
  const totalRow = sheet.addRow({
    employee: 'TOTAL',
    hours: (totalMinutes / 60).toFixed(2),
  });
  totalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
  });

  // ── Freeze panes ─────────────────────────────────────────────────────────────
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
};

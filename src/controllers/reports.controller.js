import { PrismaClient } from '@prisma/client';
import { generateExcel } from '../services/export.service.js';

const prisma = new PrismaClient();

const buildWhere = (req) => {
  const { startDate, endDate, userId, projectId, departmentId } = req.query;
  const where = {};

  // Managers see only their department
  if (req.user.role === 'dept_manager' && req.user.departmentId) {
    where.user = { departmentId: req.user.departmentId };
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  if (userId) where.userId = userId;
  if (projectId) where.projectId = projectId;
  if (departmentId) where.user = { ...(where.user || {}), departmentId };

  return where;
};

export const getSummary = async (req, res) => {
  const where = buildWhere(req);
  const result = await prisma.timesheetEntry.aggregate({
    where,
    _sum: { totalMinutes: true },
    _count: { id: true },
  });
  res.json({
    totalMinutes: result._sum.totalMinutes || 0,
    totalHours: ((result._sum.totalMinutes || 0) / 60).toFixed(2),
    entryCount: result._count.id,
  });
};

export const getByEmployee = async (req, res) => {
  const where = buildWhere(req);
  const rows = await prisma.timesheetEntry.groupBy({
    by: ['userId'],
    where,
    _sum: { totalMinutes: true },
    orderBy: { _sum: { totalMinutes: 'desc' } },
  });

  const userIds = rows.map(r => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, department: { select: { name: true } } },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const data = rows.map(r => ({
    user: userMap[r.userId],
    totalMinutes: r._sum.totalMinutes,
    totalHours: (r._sum.totalMinutes / 60).toFixed(2),
  }));
  res.json({ data });
};

export const getByProject = async (req, res) => {
  const where = buildWhere(req);
  const rows = await prisma.timesheetEntry.groupBy({
    by: ['projectId'],
    where,
    _sum: { totalMinutes: true },
    orderBy: { _sum: { totalMinutes: 'desc' } },
  });

  const projectIds = rows.map(r => r.projectId);
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const projMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const data = rows.map(r => ({
    project: projMap[r.projectId],
    totalMinutes: r._sum.totalMinutes,
    totalHours: (r._sum.totalMinutes / 60).toFixed(2),
  }));
  res.json({ data });
};

export const whoLoggedToday = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = { isActive: true };
  if (req.user.role === 'dept_manager' && req.user.departmentId) {
    where.departmentId = req.user.departmentId;
  }

  const allUsers = await prisma.user.findMany({
    where,
    select: { id: true, name: true, department: { select: { name: true } } },
  });

  const loggedToday = await prisma.timesheetEntry.findMany({
    where: { date: { gte: today }, user: where },
    select: { userId: true },
    distinct: ['userId'],
  });

  const loggedSet = new Set(loggedToday.map(e => e.userId));
  res.json({
    logged: allUsers.filter(u => loggedSet.has(u.id)),
    notLogged: allUsers.filter(u => !loggedSet.has(u.id)),
  });
};

export const exportReport = async (req, res) => {
  const where = buildWhere(req);
  const entries = await prisma.timesheetEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
    include: {
      user: { select: { name: true, department: { select: { name: true } } } },
      project: { select: { name: true } },
      taskType: { select: { name: true } },
    },
  });

  const buffer = await generateExcel(entries);
  const filename = `yorklog-report-${new Date().toISOString().slice(0,10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

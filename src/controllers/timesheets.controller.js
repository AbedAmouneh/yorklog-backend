import { z } from 'zod';
import prisma from '../lib/prisma.js';

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  totalMinutes: z.coerce.number().int().min(1).max(1440),
  projectId: z.string().uuid(),
  taskTypeId: z.string().uuid(),
  taskSummary: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const createEntry = async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = Object.values(parsed.error.flatten().fieldErrors).flat().join(', ')
      || parsed.error.flatten().formErrors.join(', ')
      || 'Invalid input.';
    return res.status(400).json({ error: messages });
  }

  const { date, totalMinutes, projectId, taskTypeId, taskSummary, description } = parsed.data;

  // Verify user is assigned to this project
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId: req.user.id } },
  });
  if (!assignment && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'You are not assigned to this project.' });
  }

  // Validate task type belongs to project
  const taskType = await prisma.taskType.findFirst({
    where: { id: taskTypeId, projectId },
  });
  if (!taskType) {
    return res.status(400).json({ error: 'Task type does not belong to this project.' });
  }

  // Check daily max hours for department
  if (req.user.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: req.user.departmentId },
      select: { maxDailyHours: true },
    });
    if (dept) {
      const maxMinutes = dept.maxDailyHours * 60;
      const existingToday = await prisma.timesheetEntry.aggregate({
        where: { userId: req.user.id, date: new Date(date) },
        _sum: { totalMinutes: true },
      });
      const alreadyLogged = existingToday._sum.totalMinutes || 0;
      if (alreadyLogged + totalMinutes > maxMinutes) {
        return res.status(400).json({
          error: `Exceeds daily max of ${dept.maxDailyHours}h for your department.`,
        });
      }
    }
  }

  const entry = await prisma.timesheetEntry.create({
    data: {
      date: new Date(date),
      totalMinutes,
      taskSummary,
      description,
      userId: req.user.id,
      projectId,
      taskTypeId,
    },
    include: {
      project: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ entry });
};

export const getMyEntries = async (req, res) => {
  const { month, year, projectId, page = 1, limit = 20 } = req.query;
  const where = { userId: req.user.id };

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    where.date = { gte: start, lte: end };
  }
  if (projectId) where.projectId = projectId;

  const [entries, total] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        project: { select: { id: true, name: true } },
        taskType: { select: { id: true, name: true } },
      },
    }),
    prisma.timesheetEntry.count({ where }),
  ]);

  res.json({ entries, total, page: Number(page), limit: Number(limit) });
};

export const getMyCalendar = async (req, res) => {
  const { year, month } = req.params;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const entries = await prisma.timesheetEntry.findMany({
    where: { userId: req.user.id, date: { gte: start, lte: end } },
    select: { date: true, totalMinutes: true },
    orderBy: { date: 'asc' },
  });

  // Group by day
  const byDay = {};
  for (const e of entries) {
    const day = e.date.getDate();
    byDay[day] = (byDay[day] || 0) + e.totalMinutes;
  }

  res.json({ year: Number(year), month: Number(month), days: byDay });
};

export const getTeamEntries = async (req, res) => {
  const { userId, projectId, startDate, endDate, page = 1, limit = 50 } = req.query;
  const where = {};

  // Managers can only see their own department unless super_admin
  if (req.user.role === 'dept_manager' && req.user.departmentId) {
    where.user = { departmentId: req.user.departmentId };
  }

  if (userId) where.userId = userId;
  if (projectId) where.projectId = projectId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const [entries, total] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        user: { select: { id: true, name: true, department: { select: { name: true } } } },
        project: { select: { id: true, name: true } },
        taskType: { select: { id: true, name: true } },
      },
    }),
    prisma.timesheetEntry.count({ where }),
  ]);

  res.json({ entries, total, page: Number(page), limit: Number(limit) });
};

export const getEntry = async (req, res) => {
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!entry) return res.status(404).json({ error: 'Entry not found.' });

  // Employees can only read their own
  if (req.user.role === 'employee' && entry.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  res.json({ entry });
};

export const deleteEntry = async (req, res) => {
  const entry = await prisma.timesheetEntry.findUnique({ where: { id: req.params.id } });
  if (!entry) return res.status(404).json({ error: 'Entry not found.' });

  await prisma.timesheetEntry.delete({ where: { id: req.params.id } });
  res.json({ message: 'Entry deleted.' });
};

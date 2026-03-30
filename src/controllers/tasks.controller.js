import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { createNotification } from './notifications.controller.js';

const ROLE_LEVELS = { employee: 1, hr_finance: 2, dept_manager: 3, org_admin: 4, super_admin: 5 };
const isManager = (role) => ROLE_LEVELS[role] >= ROLE_LEVELS.dept_manager;

// ── GET /tasks/my  ─────────────────────────────────────────────────────────────
// Returns all tasks assigned to the current user (with optional status filter)
export const getMyTasks = async (req, res) => {
  const { status, month, year } = req.query;
  const where = { assignedToId: req.user.id };
  if (status) where.status = status;

  // Filter by month/year for calendar view
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0); // last day
    where.OR = [
      { dueDate: { gte: start, lte: end } },
      { dueDate: null }, // include tasks with no due date
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ tasks });
};

// ── GET /tasks  ────────────────────────────────────────────────────────────────
// Managers: get all tasks (optionally filtered by project / assignee)
export const getAllTasks = async (req, res) => {
  const { projectId, assignedToId, status } = req.query;
  const where = {};
  if (projectId) where.projectId = projectId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (status) where.status = status;

  // dept_manager scoped to their department's employees
  if (req.user.role === 'dept_manager' && req.user.departmentId) {
    const teamMembers = await prisma.user.findMany({
      where: { departmentId: req.user.departmentId, isActive: true },
      select: { id: true },
    });
    where.assignedToId = { in: teamMembers.map((u) => u.id) };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ tasks });
};

// ── POST /tasks  ───────────────────────────────────────────────────────────────
// Create a task. Managers assign to others; employees create for themselves.
export const createTask = async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    projectId: z.string().uuid(),
    taskTypeId: z.string().uuid().nullable().optional(),
    assignedToId: z.string().uuid().optional(), // managers can set this
    dueDate: z.string().datetime({ offset: true }).nullable().optional()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
    estimatedHours: z.coerce.number().min(0).max(999).nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { assignedToId, dueDate, ...rest } = parsed.data;

  // Employees can only assign tasks to themselves
  const finalAssigneeId = isManager(req.user.role) && assignedToId
    ? assignedToId
    : req.user.id;

  // Validate that assignee is on the project
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId: rest.projectId, userId: finalAssigneeId } },
  });
  if (!assignment) {
    return res.status(400).json({ error: 'Assignee is not assigned to this project.' });
  }

  const task = await prisma.task.create({
    data: {
      ...rest,
      assignedToId: finalAssigneeId,
      createdById: req.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      project: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  // Notify assignee if someone else created the task
  if (finalAssigneeId !== req.user.id) {
    await createNotification(finalAssigneeId, {
      type: 'task_assigned',
      title: `New task: "${task.title}"`,
      body: `You have been assigned a new task on ${task.project.name}.`,
      relatedId: task.id,
    });
  }

  res.status(201).json({ task });
};

// ── PATCH /tasks/:id  ──────────────────────────────────────────────────────────
// Update task metadata (title, description, dueDate, etc.) — NOT for completing
export const updateTask = async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).nullable().optional(),
    taskTypeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    estimatedHours: z.coerce.number().min(0).max(999).nullable().optional(),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  // Only assignee or manager can update
  if (task.assignedToId !== req.user.id && !isManager(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised to update this task.' });
  }

  const { dueDate, ...rest } = parsed.data;
  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
    },
  });
  res.json({ task: updated });
};

// ── POST /tasks/:id/complete  ──────────────────────────────────────────────────
// Mark task as done + log the hours in one action
export const completeTask = async (req, res) => {
  const schema = z.object({
    hours: z.coerce.number().min(0.25).max(24),
    description: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // defaults to today
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (task.assignedToId !== req.user.id && !isManager(req.user.role)) {
    return res.status(403).json({ error: 'Not authorised to complete this task.' });
  }

  const entryDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const totalMinutes = Math.round(parsed.data.hours * 60);

  // Run task update + time entry creation atomically
  const [updatedTask, entry] = await prisma.$transaction([
    prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'done', completedAt: new Date() },
    }),
    prisma.timesheetEntry.create({
      data: {
        userId: req.user.id,
        projectId: task.projectId,
        taskTypeId: task.taskTypeId ?? null,
        taskId: task.id,
        date: entryDate,
        totalMinutes,
        taskSummary: task.title,
        description: parsed.data.description ?? null,
        status: 'approved',
      },
    }),
  ]);

  res.json({ task: updatedTask, entry });
};

// ── DELETE /tasks/:id  ─────────────────────────────────────────────────────────
export const deleteTask = async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  if (!isManager(req.user.role) && task.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised to delete this task.' });
  }

  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: 'Task deleted.' });
};

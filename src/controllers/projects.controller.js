import { z } from 'zod';
import { createNotification } from './notifications.controller.js';
import prisma from '../lib/prisma.js';

export const getMyProjects = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: {
      status: 'active',
      assignments: { some: { userId: req.user.id } },
    },
    include: {
      taskTypes: { select: { id: true, name: true, isQuickAccess: true }, orderBy: { name: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ projects });
};

export const getAllProjects = async (req, res) => {
  const { status } = req.query;
  const projects = await prisma.project.findMany({
    where: status ? { status } : {},
    include: {
      taskTypes: { select: { id: true, name: true, isQuickAccess: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { entries: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ projects });
};

export const createProject = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const project = await prisma.project.create({
    data: { ...parsed.data, createdById: req.user.id },
  });
  res.status(201).json({ project });
};

export const updateProject = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    status: z.enum(['active', 'archived']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ project });
};

export const assignEmployees = async (req, res) => {
  const { userIds } = req.body; // array of user IDs
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds must be a non-empty array.' });
  }

  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  // Team leaders can only assign employees from their own department
  if (req.user.role === 'dept_manager') {
    if (!req.user.departmentId) {
      return res.status(403).json({ error: 'You are not assigned to a department.' });
    }
    const teamMembers = await prisma.user.findMany({
      where: { departmentId: req.user.departmentId, isActive: true },
      select: { id: true },
    });
    const teamMemberIds = new Set(teamMembers.map((u) => u.id));
    const outsiders = userIds.filter((id) => !teamMemberIds.has(id));
    if (outsiders.length > 0) {
      return res.status(403).json({ error: 'You can only assign employees from your own team.' });
    }
  }

  // Upsert assignments
  await Promise.all(
    userIds.map(userId =>
      prisma.projectAssignment.upsert({
        where: { projectId_userId: { projectId: project.id, userId } },
        create: { projectId: project.id, userId },
        update: {},
      })
    )
  );

  // Notify newly assigned employees
  await Promise.all(
    userIds.map(userId =>
      createNotification(userId, {
        type: 'project_assigned',
        title: `Assigned to "${project.name}"`,
        body: `You were added to project "${project.name}".`,
        relatedId: project.id,
      })
    )
  );

  res.json({ message: `${userIds.length} user(s) assigned to project.` });
};

export const getProjectTasks = async (req, res) => {
  // Verify user is assigned (unless admin)
  if (req.user.role !== 'super_admin') {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: req.user.id } },
    });
    if (!assignment) return res.status(403).json({ error: 'Not assigned to this project.' });
  }

  const tasks = await prisma.taskType.findMany({
    where: { projectId: req.params.id },
    orderBy: [{ isQuickAccess: 'desc' }, { name: 'asc' }],
  });
  res.json({ tasks });
};

export const createTask = async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    isQuickAccess: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.taskType.create({
    data: { projectId: req.params.id, ...parsed.data },
  });
  res.status(201).json({ task });
};

export const updateTask = async (req, res) => {
  const task = await prisma.taskType.update({
    where: { id: req.params.taskId },
    data: req.body,
  });
  res.json({ task });
};

export const deleteTask = async (req, res) => {
  await prisma.taskType.delete({ where: { id: req.params.taskId } });
  res.json({ message: 'Task type deleted.' });
};

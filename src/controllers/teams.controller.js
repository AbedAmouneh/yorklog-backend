import { z } from 'zod';
import prisma from '../lib/prisma.js';

/**
 * POST /teams
 * Creates a new team (department) with an optional manager and optional initial members.
 */
export const createTeam = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    maxDailyHours: z.coerce.number().min(1).max(24).optional(),
    headUserId: z.string().uuid().nullable().optional(),
    memberIds: z.array(z.string().uuid()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const messages = Object.values(parsed.error.flatten().fieldErrors).flat().join(', ');
    return res.status(400).json({ error: messages || 'Invalid input.' });
  }

  const { name, maxDailyHours, headUserId, memberIds } = parsed.data;

  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing) return res.status(409).json({ error: 'A team with that name already exists.' });

  if (headUserId) {
    const manager = await prisma.user.findUnique({ where: { id: headUserId } });
    if (!manager || manager.role !== 'dept_manager') {
      return res.status(400).json({ error: 'Selected Team Leader must have the Team Leader role.' });
    }
  }

  const dept = await prisma.department.create({
    data: {
      name,
      maxDailyHours: maxDailyHours ?? 8,
      headUserId: headUserId ?? null,
    },
    include: {
      headUser: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
  });

  // Bulk-assign selected members to the new team
  if (memberIds && memberIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: memberIds }, isActive: true },
      data: { departmentId: dept.id },
    });
  }

  res.status(201).json({ department: dept });
};

/**
 * GET /teams
 * Returns all departments with their assigned manager (headUser) and active members.
 * Also returns unassigned active users.
 */
export const getTeams = async (req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      headUser: { select: { id: true, name: true, email: true, role: true } },
      users: {
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const unassigned = await prisma.user.findMany({
    where: { isActive: true, departmentId: null },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });

  res.json({ departments, unassigned });
};

/**
 * GET /teams/managers
 * Returns all active dept_manager users (for populating the manager dropdown).
 */
export const getManagers = async (req, res) => {
  const managers = await prisma.user.findMany({
    where: { isActive: true, role: 'dept_manager' },
    select: { id: true, name: true, email: true, departmentId: true },
    orderBy: { name: 'asc' },
  });
  res.json({ managers });
};

/**
 * PATCH /teams/:deptId/manager
 * Assigns (or clears) the manager for a department.
 * Body: { managerId: string | null }
 */
export const setDepartmentManager = async (req, res) => {
  const { managerId } = req.body;

  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || !manager.isActive) {
      return res.status(400).json({ error: 'User not found or inactive.' });
    }
    if (manager.role !== 'dept_manager') {
      return res.status(400).json({ error: 'Selected user must have the Team Leader role.' });
    }
  }

  const dept = await prisma.department.update({
    where: { id: req.params.deptId },
    data: { headUserId: managerId ?? null },
    include: { headUser: { select: { id: true, name: true } } },
  });
  res.json({ department: dept });
};

/**
 * PATCH /teams/members/:userId
 * Moves a user to a different department (or unassigns them).
 * Body: { departmentId: string | null }
 */
export const moveMember = async (req, res) => {
  const { departmentId } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user || !user.isActive) {
    return res.status(404).json({ error: 'User not found or inactive.' });
  }

  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) return res.status(400).json({ error: 'Department not found.' });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.userId },
    data: { departmentId: departmentId ?? null },
    select: { id: true, name: true, departmentId: true },
  });
  res.json({ user: updated });
};

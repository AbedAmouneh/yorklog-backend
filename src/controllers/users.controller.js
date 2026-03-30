import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

export const getAllUsers = async (req, res) => {
  const { departmentId, role, isActive = 'true' } = req.query;
  const where = { isActive: isActive === 'true' };
  if (role) where.role = role;

  // Team leaders (dept_manager) can only see members of their own department
  if (req.user.role === 'dept_manager') {
    if (!req.user.departmentId) return res.json({ users: [] });
    where.departmentId = req.user.departmentId;
  } else if (departmentId) {
    where.departmentId = departmentId;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, role: true, isActive: true, notifyEmail: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
  res.json({ users });
};

export const createUser = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['employee', 'dept_manager', 'hr_finance', 'org_admin', 'super_admin']).default('employee'),
    departmentId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email: rest.email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'Email already in use.' });

  const user = await prisma.user.create({
    data: { ...rest, email: rest.email.toLowerCase(), passwordHash },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
  res.status(201).json({ user });
};

export const updateUser = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['employee', 'dept_manager', 'hr_finance', 'org_admin', 'super_admin']).optional(),
    departmentId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, isActive: true, departmentId: true },
  });
  res.json({ user });
};

export const deactivateUser = async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'User deactivated.' });
};

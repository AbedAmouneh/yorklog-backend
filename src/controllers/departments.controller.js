import { z } from 'zod';
import prisma from '../lib/prisma.js';

export const getAllDepartments = async (req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      headUser: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ departments });
};

export const createDepartment = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    maxDailyHours: z.coerce.number().min(1).max(24).default(8),
    headUserId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const dept = await prisma.department.create({
    data: {
      name: parsed.data.name,
      maxDailyHours: parsed.data.maxDailyHours,
      headUserId: parsed.data.headUserId ?? null,
    },
    include: { headUser: { select: { id: true, name: true } } },
  });
  res.status(201).json({ department: dept });
};

export const updateDepartment = async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100).optional(),
    maxDailyHours: z.coerce.number().min(1).max(24).optional(),
    headUserId: z.string().uuid().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, maxDailyHours, headUserId } = parsed.data;
  const data = {};
  if (name !== undefined) data.name = name;
  if (maxDailyHours !== undefined) data.maxDailyHours = maxDailyHours;
  if (headUserId !== undefined) data.headUserId = headUserId;

  const dept = await prisma.department.update({
    where: { id: req.params.id },
    data,
    include: { headUser: { select: { id: true, name: true } } },
  });
  res.json({ department: dept });
};

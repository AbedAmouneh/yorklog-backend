import { z } from 'zod';
import { createNotification } from './notifications.controller.js';
import prisma from '../lib/prisma.js';

const editSchema = z.object({
  hours: z.number().int().min(0).max(23).optional(),
  minutes: z.number().int().min(0).max(59).optional(),
  taskDescription: z.string().max(255).optional(),
  description: z.string().max(300).optional(),
  projectId: z.string().uuid().optional(),
  taskTypeId: z.string().uuid().optional(),
});

export const submitEditRequest = async (req, res) => {
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id: req.params.entryId },
    include: { project: true, taskType: true },
  });

  if (!entry) return res.status(404).json({ error: 'Entry not found.' });
  if (entry.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  if (entry.status === 'pending_edit') {
    return res.status(400).json({ error: 'An edit request is already pending for this entry.' });
  }

  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Build new data with totalMinutes if hours/minutes changed
  const newData = { ...parsed.data };
  if (newData.hours !== undefined || newData.minutes !== undefined) {
    const h = newData.hours ?? Math.floor(entry.totalMinutes / 60);
    const m = newData.minutes ?? entry.totalMinutes % 60;
    newData.totalMinutes = h * 60 + m;
    delete newData.hours;
    delete newData.minutes;
  }

  // Snapshot original
  const originalData = {
    totalMinutes: entry.totalMinutes,
    taskDescription: entry.taskDescription,
    description: entry.description,
    projectId: entry.projectId,
    taskTypeId: entry.taskTypeId,
  };

  const [editRequest] = await prisma.$transaction([
    prisma.editRequest.create({
      data: {
        entryId: entry.id,
        requestedById: req.user.id,
        originalData,
        newData,
      },
    }),
    prisma.timesheetEntry.update({
      where: { id: entry.id },
      data: { status: 'pending_edit' },
    }),
  ]);

  // Notify department manager
  if (req.user.departmentId) {
    const manager = await prisma.user.findFirst({
      where: {
        role: { in: ['dept_manager', 'super_admin'] },
        departmentId: req.user.departmentId,
      },
    });
    if (manager) {
      await createNotification(manager.id, {
        type: 'edit_submitted',
        title: `Edit request from ${req.user.name}`,
        body: `${req.user.name} requested an edit on their ${new Date(entry.date).toDateString()} entry.`,
        relatedId: editRequest.id,
      });
    }
  }

  res.status(201).json({ editRequest });
};

export const getTeamEditRequests = async (req, res) => {
  const { status = 'pending' } = req.query;
  const where = { status };

  if (req.user.role === 'dept_manager' && req.user.departmentId) {
    where.requestedBy = { departmentId: req.user.departmentId };
  }

  const requests = await prisma.editRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      requestedBy: { select: { id: true, name: true } },
      entry: {
        include: {
          project: { select: { name: true } },
          taskType: { select: { name: true } },
        },
      },
    },
  });

  res.json({ requests });
};

export const getMyEditRequests = async (req, res) => {
  const requests = await prisma.editRequest.findMany({
    where: { requestedById: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      entry: {
        include: { project: { select: { name: true } } },
      },
    },
  });
  res.json({ requests });
};

export const approveEditRequest = async (req, res) => {
  const request = await prisma.editRequest.findUnique({
    where: { id: req.params.id },
    include: { entry: true, requestedBy: true },
  });
  if (!request) return res.status(404).json({ error: 'Edit request not found.' });
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request is no longer pending.' });
  }

  await prisma.$transaction([
    prisma.timesheetEntry.update({
      where: { id: request.entryId },
      data: { ...request.newData, status: 'approved' },
    }),
    prisma.editRequest.update({
      where: { id: request.id },
      data: { status: 'approved', reviewedById: req.user.id, reviewedAt: new Date() },
    }),
  ]);

  await createNotification(request.requestedById, {
    type: 'edit_approved',
    title: 'Edit request approved ✓',
    body: `Your edit for entry on ${new Date(request.entry.date).toDateString()} was approved.`,
    relatedId: request.id,
  });

  res.json({ message: 'Edit approved and applied.' });
};

export const rejectEditRequest = async (req, res) => {
  const { reason } = req.body;
  const request = await prisma.editRequest.findUnique({
    where: { id: req.params.id },
    include: { entry: true },
  });
  if (!request) return res.status(404).json({ error: 'Edit request not found.' });
  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request is no longer pending.' });
  }

  await prisma.$transaction([
    prisma.timesheetEntry.update({
      where: { id: request.entryId },
      data: { status: 'submitted' },
    }),
    prisma.editRequest.update({
      where: { id: request.id },
      data: {
        status: 'rejected',
        rejectionReason: reason || null,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    }),
  ]);

  await createNotification(request.requestedById, {
    type: 'edit_rejected',
    title: 'Edit request rejected',
    body: `Your edit was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    relatedId: request.id,
  });

  res.json({ message: 'Edit request rejected.' });
};

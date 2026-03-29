import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Internal helper — call from other controllers */
export const createNotification = async (userId, { type, title, body, relatedId }) => {
  return prisma.notification.create({
    data: { userId, type, title, body, relatedId: relatedId || null },
  });
};

export const getNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = notifications.filter(n => !n.isRead).length;
  res.json({ notifications, unreadCount });
};

export const markAsRead = async (req, res) => {
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.userId !== req.user.id) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ message: 'Marked as read.' });
};

export const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All notifications marked as read.' });
};

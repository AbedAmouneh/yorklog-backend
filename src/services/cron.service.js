import cron from 'node-cron';
import { sendDailyReminder } from './email.service.js';
import { createNotification } from '../controllers/notifications.controller.js';
import prisma from '../lib/prisma.js';

/**
 * Daily reminder job.
 *
 * Default: 14:00 UTC = 17:00 Beirut (UTC+3), Mon–Fri
 * Override via REMINDER_CRON env variable.
 */
export const startCronJobs = () => {
  const cronExpr = process.env.REMINDER_CRON || '0 14 * * 1-5';

  cron.schedule(cronExpr, async () => {
    console.log(`[cron] Running daily reminder job — ${new Date().toISOString()}`);
    try {
      await runDailyReminder();
    } catch (err) {
      console.error('[cron] Daily reminder failed:', err.message);
    }
  });

  console.log(`[cron] Daily reminder scheduled: ${cronExpr}`);
};

const runDailyReminder = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active employees
  const employees = await prisma.user.findMany({
    where: { isActive: true, role: 'employee' },
    select: { id: true, name: true, email: true, notifyEmail: true },
  });

  // Get who already logged today
  const loggedToday = await prisma.timesheetEntry.findMany({
    where: { date: { gte: today } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const loggedSet = new Set(loggedToday.map(e => e.userId));

  // Notify those who haven't
  const toRemind = employees.filter(e => !loggedSet.has(e.id));
  console.log(`[cron] Reminding ${toRemind.length} of ${employees.length} employees.`);

  for (const employee of toRemind) {
    // Always create in-app notification
    await createNotification(employee.id, {
      type: 'daily_reminder',
      title: "Don't forget to log your hours!",
      body: "You haven't logged any hours for today yet.",
    });

    // Email if opted in
    if (employee.notifyEmail) {
      try {
        await sendDailyReminder({ to: employee.email, name: employee.name });
      } catch (e) {
        console.error(`[cron] Email failed for ${employee.email}:`, e.message);
      }
    }
  }
};

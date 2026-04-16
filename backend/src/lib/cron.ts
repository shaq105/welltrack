import cron from 'node-cron';
import prisma from './prisma';
import { sendDailyReminderEmail } from './email';

/**
 * Runs every hour on the hour. Finds users with daily reminders enabled
 * whose reminderTime matches the current UTC hour, and who have not yet
 * logged anything today — then sends them a reminder email.
 */
export function startCronJobs(): void {
  cron.schedule('0 * * * *', async () => {
    const nowUtc = new Date();
    const currentHour = nowUtc.getUTCHours().toString().padStart(2, '0');
    const currentMinute = '00';
    const currentTime = `${currentHour}:${currentMinute}`;

    const todayStart = new Date(nowUtc);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(nowUtc);
    todayEnd.setUTCHours(23, 59, 59, 999);

    try {
      // Find users whose reminder time matches the current hour
      const candidates = await prisma.user.findMany({
        where: {
          reminderEnabled: true,
          reminderTime: currentTime,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      });

      if (candidates.length === 0) return;

      // Filter to users who haven't logged anything today
      const sendPromises = candidates.map(async (user) => {
        const [symptomCount, moodCount, medCount, habitCount] = await Promise.all([
          prisma.symptomLog.count({ where: { userId: user.id, loggedAt: { gte: todayStart, lte: todayEnd } } }),
          prisma.moodLog.count({ where: { userId: user.id, loggedAt: { gte: todayStart, lte: todayEnd } } }),
          prisma.medicationLog.count({ where: { userId: user.id, loggedAt: { gte: todayStart, lte: todayEnd } } }),
          prisma.habitLog.count({ where: { userId: user.id, loggedAt: { gte: todayStart, lte: todayEnd } } }),
        ]);

        const hasLoggedToday = symptomCount + moodCount + medCount + habitCount > 0;
        if (!hasLoggedToday) {
          await sendDailyReminderEmail(user.email, user.displayName);
          console.log(`[cron] Sent reminder to ${user.email}`);
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (err) {
      console.error('[cron] Daily reminder job error:', err);
    }
  });

  console.log('[cron] Daily reminder job scheduled');
}

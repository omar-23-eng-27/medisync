const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // User summary
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, points: true, rating: true,
        ratingCount: true, specialization: true, referralCode: true,
      },
    });

    // Weekly points earned (past 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyTxs = await prisma.pointTransaction.findMany({
      where: { userId, createdAt: { gte: weekStart } },
      select: { points: true },
    });
    const weeklyPoints = weeklyTxs.reduce((sum, tx) => sum + tx.points, 0);

    // Points earned today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTxs = await prisma.pointTransaction.findMany({
      where: { userId, createdAt: { gte: todayStart } },
      select: { points: true },
    });
    const todayPoints = todayTxs.reduce((sum, tx) => sum + tx.points, 0);

    // Global rank (by total points)
    const usersAhead = await prisma.user.count({
      where: { points: { gt: user.points } },
    });
    const globalRank = usersAhead + 1;

    // Next upcoming shift
    const nextClaim = await prisma.shiftClaim.findFirst({
      where: {
        userId,
        status: { in: ['claimed', 'confirmed'] },
        shift: { startTime: { gte: new Date() } },
      },
      orderBy: { shift: { startTime: 'asc' } },
      include: {
        shift: {
          include: { facility: { select: { name: true, address: true, city: true } } },
        },
      },
    });

    // Confirmed upcoming shifts (all, for the shifts count)
    const upcomingCount = await prisma.shiftClaim.count({
      where: {
        userId,
        status: { in: ['claimed', 'confirmed'] },
        shift: { startTime: { gte: new Date() } },
      },
    });

    // Recent activity (last 5 point transactions)
    const recentActivity = await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Team members at next shift's facility (others with confirmed claim at same facility today)
    let teamMembers = [];
    if (nextClaim) {
      const sameShiftClaims = await prisma.shiftClaim.findMany({
        where: {
          shiftId: nextClaim.shiftId,
          userId: { not: userId },
          status: { in: ['claimed', 'confirmed', 'active'] },
        },
        include: { user: { select: { id: true, name: true } } },
        take: 5,
      });
      teamMembers = sameShiftClaims.map((c) => c.user);
    }

    return res.json({
      user,
      stats: {
        weeklyPoints,
        todayPoints,
        globalRank,
        totalPoints: user.points,
        upcomingShifts: upcomingCount,
        weeklyGoal: 3500,
      },
      nextShift: nextClaim
        ? {
            claimId: nextClaim.id,
            shiftId: nextClaim.shiftId,
            status: nextClaim.status,
            clockInAt: nextClaim.clockInAt,
            facility: nextClaim.shift.facility,
            title: nextClaim.shift.title,
            startTime: nextClaim.shift.startTime,
            endTime: nextClaim.shift.endTime,
            hourlyRate: nextClaim.shift.hourlyRate,
            distance: nextClaim.shift.distance,
          }
        : null,
      teamMembers,
      recentActivity: recentActivity.map((tx) => ({
        id: tx.id,
        points: tx.points,
        reason: tx.reason,
        meta: tx.meta,
        createdAt: tx.createdAt,
      })),
    });
  } catch (err) {
    console.error('[dashboard]', err);
    return res.status(500).json({ error: 'Could not load dashboard' });
  }
});

module.exports = router;

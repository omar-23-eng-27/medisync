const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { sendProfileUpdated } = require('../lib/mailer');

const router = express.Router();

// GET /api/profile  — full profile with earnings + credentials
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, name: true, role: true,
        specialization: true, yearsExperience: true, bio: true,
        points: true, rating: true, ratingCount: true,
        referralCode: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Credentials
    const credentials = await prisma.credential.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    // MTD earnings (completed shifts this calendar month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const completedThisMonth = await prisma.shiftClaim.findMany({
      where: {
        userId: req.userId,
        status: 'completed',
        clockOutAt: { gte: monthStart },
      },
      include: { shift: { select: { hourlyRate: true } } },
    });

    const mtdEarnings = completedThisMonth.reduce((sum, c) => {
      return sum + (c.hoursWorked || 0) * c.shift.hourlyRate;
    }, 0);

    // Referral bonus earnings (approved referrals × $500)
    const completedReferrals = await prisma.referral.count({
      where: { referrerId: req.userId, status: 'completed', pointsAwarded: true },
    });
    const referralEarnings = completedReferrals * 500;

    // Next payout date (15th of next month)
    const nextPayout = new Date();
    if (nextPayout.getDate() >= 15) {
      nextPayout.setMonth(nextPayout.getMonth() + 1);
    }
    nextPayout.setDate(15);

    // Leaderboard rank
    const usersAhead = await prisma.user.count({
      where: { points: { gt: user.points } },
    });

    return res.json({
      user,
      credentials: credentials.map((c) => ({
        id: c.id,
        type: c.type,
        label: c.label,
        status: c.status,
        expiryDate: c.expiryDate,
      })),
      earnings: {
        mtd: Math.round(mtdEarnings * 100) / 100,
        referralBonus: referralEarnings,
        nextPayoutDate: nextPayout.toISOString().slice(0, 10),
      },
      rank: usersAhead + 1,
    });
  } catch (err) {
    console.error('[profile/GET]', err);
    return res.status(500).json({ error: 'Could not load profile' });
  }
});

// PUT /api/profile  — update basic profile fields
router.put('/', authenticate, async (req, res) => {
  const { name, specialization, yearsExperience, bio } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name ? { name } : {}),
        ...(specialization !== undefined ? { specialization } : {}),
        ...(yearsExperience !== undefined ? { yearsExperience: parseInt(yearsExperience) } : {}),
        ...(bio !== undefined ? { bio } : {}),
      },
      select: {
        id: true, email: true, name: true, specialization: true,
        yearsExperience: true, bio: true,
      },
    });

    sendProfileUpdated({ toEmail: updated.email, toName: updated.name })
      .catch(err => console.error('[mailer] profile updated email failed:', err));
    return res.json({ user: updated });
  } catch (err) {
    console.error('[profile/PUT]', err);
    return res.status(500).json({ error: 'Could not update profile' });
  }
});

// GET /api/profile/leaderboard  — top 10 caregivers by points
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const leaders = await prisma.user.findMany({
      where: { role: 'caregiver' },
      orderBy: { points: 'desc' },
      take: 10,
      select: {
        id: true, name: true, points: true,
        specialization: true, rating: true,
      },
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { points: true },
    });
    const myRank = (await prisma.user.count({
      where: { points: { gt: currentUser.points } },
    })) + 1;

    return res.json({
      leaderboard: leaders.map((u, i) => ({ rank: i + 1, ...u })),
      myRank,
    });
  } catch (err) {
    console.error('[profile/leaderboard]', err);
    return res.status(500).json({ error: 'Could not load leaderboard' });
  }
});

// POST /api/profile/credentials  — upload a new credential (metadata only)
router.post('/credentials', authenticate, async (req, res) => {
  const { type, label, expiryDate } = req.body;

  if (!type || !label) {
    return res.status(400).json({ error: 'type and label are required' });
  }

  try {
    const credential = await prisma.credential.create({
      data: {
        userId: req.userId,
        type,
        label,
        status: 'active',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    return res.status(201).json({ credential });
  } catch (err) {
    console.error('[profile/credentials]', err);
    return res.status(500).json({ error: 'Could not add credential' });
  }
});

module.exports = router;

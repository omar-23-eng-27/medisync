const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { sendReferralInvite } = require('../lib/mailer');

const router = express.Router();

const REFERRAL_POINTS = 5000;

// GET /api/referrals  — list referrals made by the current user + wallet stats
router.get('/', authenticate, async (req, res) => {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { points: true, referralCode: true },
    });

    // Redeemable value: 100 pts = $1
    const redeemableUsd = (user.points / 100).toFixed(2);

    // Count completed referrals
    const completedCount = referrals.filter((r) => r.status === 'completed').length;
    const pendingCount = referrals.filter((r) => r.status === 'pending').length;

    return res.json({
      referrals: referrals.map((r) => ({
        id: r.id,
        refereeName: r.refereeName,
        refereeEmail: r.refereeEmail,
        refereeSpecialization: r.refereeSpecialization,
        status: r.status,
        pointsAwarded: r.pointsAwarded,
        potentialPoints: REFERRAL_POINTS,
        createdAt: r.createdAt,
      })),
      stats: {
        totalPoints: user.points,
        redeemableUsd: parseFloat(redeemableUsd),
        completedReferrals: completedCount,
        pendingReferrals: pendingCount,
        referralCode: user.referralCode,
        nextTierPoints: 15000,
      },
    });
  } catch (err) {
    console.error('[referrals/GET]', err);
    return res.status(500).json({ error: 'Could not load referrals' });
  }
});

// POST /api/referrals  — submit a new referral
router.post('/', authenticate, async (req, res) => {
  const { name, email, specialization } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // Can't refer yourself
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, name: true, referralCode: true },
    });
    if (currentUser.email === email) {
      return res.status(400).json({ error: "You can't refer yourself" });
    }

    // Check for duplicate referral
    const existing = await prisma.referral.findUnique({
      where: { referrerId_refereeEmail: { referrerId: req.userId, refereeEmail: email } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already referred this person' });
    }

    // Check if that person is already a user
    const alreadyUser = await prisma.user.findUnique({ where: { email } });

    const referral = await prisma.referral.create({
      data: {
        referrerId: req.userId,
        refereeEmail: email,
        refereeName: name,
        refereeSpecialization: specialization || null,
        refereeId: alreadyUser?.id || null,
        status: alreadyUser ? 'verified' : 'pending',
      },
    });

    sendReferralInvite({
      toEmail: email,
      toName: name,
      fromName: currentUser.name || 'A MediSync caregiver',
      referralCode: currentUser.referralCode,
    }).catch(err => console.error('[mailer] referral invite failed:', err));

    return res.status(201).json({
      message: 'Referral submitted successfully',
      referral: {
        id: referral.id,
        refereeName: referral.refereeName,
        refereeEmail: referral.refereeEmail,
        status: referral.status,
        potentialPoints: REFERRAL_POINTS,
        createdAt: referral.createdAt,
      },
    });
  } catch (err) {
    console.error('[referrals/POST]', err);
    return res.status(500).json({ error: 'Could not submit referral' });
  }
});

// POST /api/referrals/redeem  — redeem points for cash (stub)
router.post('/redeem', authenticate, async (req, res) => {
  const { points } = req.body;

  if (!points || points < 2500) {
    return res.status(400).json({ error: 'Minimum redemption is 2,500 points ($25.00)' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { points: true },
    });

    if (user.points < points) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    const cashValue = (points / 100).toFixed(2);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: { points: { decrement: points } },
      }),
      prisma.pointTransaction.create({
        data: {
          userId: req.userId,
          points: -points,
          reason: 'redemption',
          meta: { cashValue: parseFloat(cashValue) },
        },
      }),
    ]);

    return res.json({
      message: `Successfully redeemed ${points} points for $${cashValue}`,
      pointsRedeemed: points,
      cashValue: parseFloat(cashValue),
    });
  } catch (err) {
    console.error('[referrals/redeem]', err);
    return res.status(500).json({ error: 'Could not process redemption' });
  }
});

module.exports = router;

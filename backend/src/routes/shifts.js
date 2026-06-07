const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/shifts/upcoming  — user's confirmed/claimed shifts
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const claims = await prisma.shiftClaim.findMany({
      where: {
        userId: req.userId,
        status: { in: ['claimed', 'confirmed', 'active'] },
      },
      orderBy: { shift: { startTime: 'asc' } },
      include: {
        shift: {
          include: { facility: true },
        },
      },
    });

    return res.json({
      shifts: claims.map((c) => ({
        claimId: c.id,
        shiftId: c.shift.id,
        status: c.status,
        clockInAt: c.clockInAt,
        title: c.shift.title,
        careType: c.shift.careType,
        startTime: c.shift.startTime,
        endTime: c.shift.endTime,
        hourlyRate: c.shift.hourlyRate,
        bonusAmount: c.shift.bonusAmount,
        distance: c.shift.distance,
        facility: c.shift.facility,
      })),
    });
  } catch (err) {
    console.error('[shifts/upcoming]', err);
    return res.status(500).json({ error: 'Could not load upcoming shifts' });
  }
});

// GET /api/shifts/marketplace  — open shifts not already claimed by this user
router.get('/marketplace', authenticate, async (req, res) => {
  try {
    const { careType, maxDistance, minPay, sort = 'startTime' } = req.query;

    // IDs of shifts already claimed by this user
    const myClaims = await prisma.shiftClaim.findMany({
      where: { userId: req.userId },
      select: { shiftId: true },
    });
    const myShiftIds = myClaims.map((c) => c.shiftId);

    const where = {
      status: 'open',
      startTime: { gte: new Date() },
      id: { notIn: myShiftIds },
      ...(careType ? { careType } : {}),
      ...(maxDistance ? { distance: { lte: parseFloat(maxDistance) } } : {}),
      ...(minPay ? { hourlyRate: { gte: parseFloat(minPay) } } : {}),
    };

    const orderBy =
      sort === 'payRate'
        ? { hourlyRate: 'desc' }
        : sort === 'distance'
        ? { distance: 'asc' }
        : { startTime: 'asc' };

    const shifts = await prisma.shift.findMany({
      where,
      orderBy,
      take: 20,
      include: { facility: true },
    });

    return res.json({
      shifts: shifts.map((s) => ({
        id: s.id,
        title: s.title,
        careType: s.careType,
        description: s.description,
        startTime: s.startTime,
        endTime: s.endTime,
        hourlyRate: s.hourlyRate,
        bonusAmount: s.bonusAmount,
        distance: s.distance,
        totalSlots: s.totalSlots,
        facility: s.facility,
      })),
    });
  } catch (err) {
    console.error('[shifts/marketplace]', err);
    return res.status(500).json({ error: 'Could not load shift marketplace' });
  }
});

// POST /api/shifts/:id/claim
router.post('/:id/claim', authenticate, async (req, res) => {
  const { id: shiftId } = req.params;

  try {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    if (shift.status !== 'open') {
      return res.status(409).json({ error: 'This shift is no longer available' });
    }

    const alreadyClaimed = await prisma.shiftClaim.findUnique({
      where: { shiftId_userId: { shiftId, userId: req.userId } },
    });
    if (alreadyClaimed) {
      return res.status(409).json({ error: 'You have already claimed this shift' });
    }

    const claim = await prisma.shiftClaim.create({
      data: {
        shiftId,
        userId: req.userId,
        status: 'claimed',
      },
      include: { shift: { include: { facility: true } } },
    });

    // If totalSlots reached, mark shift filled
    const claimCount = await prisma.shiftClaim.count({
      where: { shiftId, status: { not: 'cancelled' } },
    });
    if (claimCount >= shift.totalSlots) {
      await prisma.shift.update({ where: { id: shiftId }, data: { status: 'filled' } });
    }

    return res.status(201).json({
      message: 'Shift claimed successfully',
      claim: {
        claimId: claim.id,
        status: claim.status,
        shift: claim.shift,
      },
    });
  } catch (err) {
    console.error('[shifts/claim]', err);
    return res.status(500).json({ error: 'Could not claim shift' });
  }
});

// POST /api/shifts/:id/clock-in
router.post('/:id/clock-in', authenticate, async (req, res) => {
  const { id: shiftId } = req.params;

  try {
    const claim = await prisma.shiftClaim.findUnique({
      where: { shiftId_userId: { shiftId, userId: req.userId } },
    });
    if (!claim) return res.status(404).json({ error: 'No claim found for this shift' });
    if (claim.clockInAt) return res.status(409).json({ error: 'Already clocked in' });

    const updated = await prisma.shiftClaim.update({
      where: { id: claim.id },
      data: { clockInAt: new Date(), status: 'active' },
    });

    return res.json({ message: 'Clocked in successfully', clockInAt: updated.clockInAt });
  } catch (err) {
    console.error('[shifts/clock-in]', err);
    return res.status(500).json({ error: 'Could not clock in' });
  }
});

// POST /api/shifts/:id/clock-out
router.post('/:id/clock-out', authenticate, async (req, res) => {
  const { id: shiftId } = req.params;

  try {
    const claim = await prisma.shiftClaim.findUnique({
      where: { shiftId_userId: { shiftId, userId: req.userId } },
      include: { shift: true },
    });
    if (!claim) return res.status(404).json({ error: 'No active claim found' });
    if (!claim.clockInAt) return res.status(400).json({ error: 'Not clocked in yet' });
    if (claim.clockOutAt) return res.status(409).json({ error: 'Already clocked out' });

    const now = new Date();
    const msWorked = now - new Date(claim.clockInAt);
    const hoursWorked = Math.round((msWorked / 3_600_000) * 10) / 10;
    const pointsEarned = Math.round(hoursWorked * 100); // 100 pts per hour

    await prisma.$transaction([
      prisma.shiftClaim.update({
        where: { id: claim.id },
        data: {
          clockOutAt: now,
          status: 'completed',
          hoursWorked,
          pointsEarned,
        },
      }),
      prisma.user.update({
        where: { id: req.userId },
        data: { points: { increment: pointsEarned } },
      }),
      prisma.pointTransaction.create({
        data: {
          userId: req.userId,
          points: pointsEarned,
          reason: 'shift-completed',
          shiftId,
          meta: { title: claim.shift.title, hoursWorked },
        },
      }),
      prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'completed' },
      }),
    ]);

    return res.json({
      message: 'Clocked out successfully',
      hoursWorked,
      pointsEarned,
      clockOutAt: now,
    });
  } catch (err) {
    console.error('[shifts/clock-out]', err);
    return res.status(500).json({ error: 'Could not clock out' });
  }
});

module.exports = router;

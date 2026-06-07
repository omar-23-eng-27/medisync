const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { sendClaimApproved, sendClaimRejected, sendShiftCancelled } = require('../lib/mailer');

const router = express.Router();

// Middleware — must be a facility_manager with a facilityId
function requireFacilityManager(req, res, next) {
  if (req.userRole !== 'facility_manager') {
    return res.status(403).json({ error: 'Facility manager access required' });
  }
  if (!req.userFacilityId) {
    return res.status(403).json({ error: 'No facility linked to this account' });
  }
  next();
}

// ── GET /api/facility/me  — current manager's facility info ──────────────────
router.get('/me', authenticate, requireFacilityManager, async (req, res) => {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: req.userFacilityId },
    });
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    return res.json({ facility });
  } catch (err) {
    console.error('[facility/me]', err);
    return res.status(500).json({ error: 'Could not load facility' });
  }
});

// ── GET /api/facility/shifts  — all shifts for this facility ─────────────────
router.get('/shifts', authenticate, requireFacilityManager, async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { facilityId: req.userFacilityId },
      include: {
        _count: { select: { claims: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return res.json({
      shifts: shifts.map(s => ({
        id: s.id,
        title: s.title,
        careType: s.careType,
        startTime: s.startTime,
        endTime: s.endTime,
        hourlyRate: s.hourlyRate,
        bonusAmount: s.bonusAmount,
        totalSlots: s.totalSlots,
        status: s.status,
        claimCount: s._count.claims,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('[facility/shifts GET]', err);
    return res.status(500).json({ error: 'Could not load shifts' });
  }
});

// ── POST /api/facility/shifts  — post a new shift ────────────────────────────
router.post('/shifts', authenticate, requireFacilityManager, async (req, res) => {
  const { title, careType, description, startTime, endTime, hourlyRate, bonusAmount, totalSlots } = req.body;

  if (!title || !careType || !startTime || !endTime || !hourlyRate) {
    return res.status(400).json({ error: 'title, careType, startTime, endTime, hourlyRate are required' });
  }
  if (new Date(endTime) <= new Date(startTime)) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  try {
    const shift = await prisma.shift.create({
      data: {
        facilityId: req.userFacilityId,
        title,
        careType,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        hourlyRate: parseFloat(hourlyRate),
        bonusAmount: parseFloat(bonusAmount || 0),
        totalSlots: parseInt(totalSlots || 1),
        status: 'open',
      },
    });
    return res.status(201).json({ shift });
  } catch (err) {
    console.error('[facility/shifts POST]', err);
    return res.status(500).json({ error: 'Could not create shift' });
  }
});

// ── DELETE /api/facility/shifts/:id  — cancel a shift ───────────────────────
router.delete('/shifts/:id', authenticate, requireFacilityManager, async (req, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { id: req.params.id, facilityId: req.userFacilityId },
    });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    if (!['open', 'filled'].includes(shift.status)) return res.status(400).json({ error: 'Only open or filled shifts can be cancelled' });

    // Fetch affected caregivers before cancelling
    const affectedClaims = await prisma.shiftClaim.findMany({
      where: { shiftId: req.params.id, status: { in: ['claimed', 'confirmed'] } },
      include: { user: { select: { email: true, name: true } } },
    });

    const facility = await prisma.facility.findUnique({ where: { id: req.userFacilityId } });

    await prisma.$transaction([
      prisma.shiftClaim.updateMany({
        where: { shiftId: req.params.id, status: { in: ['claimed', 'confirmed'] } },
        data: { status: 'cancelled' },
      }),
      prisma.shift.update({
        where: { id: req.params.id },
        data: { status: 'cancelled' },
      }),
    ]);

    // Send cancellation emails (non-blocking)
    for (const c of affectedClaims) {
      sendShiftCancelled({
        toEmail: c.user.email,
        toName: c.user.name,
        shiftTitle: shift.title,
        startTime: shift.startTime,
        facilityName: facility?.name || 'the facility',
      }).catch(err => console.error('[mailer] cancel email failed:', err));
    }

    return res.json({ message: 'Shift cancelled' });
  } catch (err) {
    console.error('[facility/shifts DELETE]', err);
    return res.status(500).json({ error: 'Could not cancel shift' });
  }
});

// ── GET /api/facility/shifts/:id/claims  — who claimed a shift ───────────────
router.get('/shifts/:id/claims', authenticate, requireFacilityManager, async (req, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { id: req.params.id, facilityId: req.userFacilityId },
    });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    const claims = await prisma.shiftClaim.findMany({
      where: { shiftId: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, specialization: true, rating: true, ratingCount: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      shift: { id: shift.id, title: shift.title, startTime: shift.startTime, endTime: shift.endTime },
      claims: claims.map(c => ({
        claimId: c.id,
        status: c.status,
        createdAt: c.createdAt,
        caregiver: c.user,
      })),
    });
  } catch (err) {
    console.error('[facility/claims GET]', err);
    return res.status(500).json({ error: 'Could not load claims' });
  }
});

// ── PUT /api/facility/shifts/:id/claims/:claimId  — approve or reject ────────
router.put('/shifts/:id/claims/:claimId', authenticate, requireFacilityManager, async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or reject' });
  }

  try {
    const shift = await prisma.shift.findFirst({
      where: { id: req.params.id, facilityId: req.userFacilityId },
    });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    const claim = await prisma.shiftClaim.findFirst({
      where: { id: req.params.claimId, shiftId: req.params.id },
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const newStatus = action === 'approve' ? 'confirmed' : 'cancelled';
    const updated = await prisma.shiftClaim.update({
      where: { id: req.params.claimId },
      data: { status: newStatus },
      include: { user: true },
    });

    const facility = await prisma.facility.findUnique({ where: { id: req.userFacilityId } });
    if (action === 'approve') {
      sendClaimApproved({
        toEmail: updated.user.email,
        toName: updated.user.name,
        shiftTitle: shift.title,
        startTime: shift.startTime,
        facilityName: facility?.name || 'the facility',
      }).catch(err => console.error('[mailer] approve email failed:', err));
    } else {
      sendClaimRejected({
        toEmail: updated.user.email,
        toName: updated.user.name,
        shiftTitle: shift.title,
        facilityName: facility?.name || 'the facility',
      }).catch(err => console.error('[mailer] reject email failed:', err));
    }

    return res.json({ claim: updated, message: action === 'approve' ? 'Caregiver confirmed' : 'Claim rejected' });
  } catch (err) {
    console.error('[facility/claims PUT]', err);
    return res.status(500).json({ error: 'Could not update claim' });
  }
});

module.exports = router;

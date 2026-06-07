const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/admin/stats
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers, totalCaregivers, totalManagers,
      totalFacilities, totalShifts, openShifts,
      totalClaims, completedClaims, totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'caregiver' } }),
      prisma.user.count({ where: { role: 'facility_manager' } }),
      prisma.facility.count(),
      prisma.shift.count(),
      prisma.shift.count({ where: { status: 'open' } }),
      prisma.shiftClaim.count(),
      prisma.shiftClaim.count({ where: { status: 'completed' } }),
      prisma.message.count(),
    ]);

    return res.json({
      users: { total: totalUsers, caregivers: totalCaregivers, managers: totalManagers },
      facilities: totalFacilities,
      shifts: { total: totalShifts, open: openShifts },
      claims: { total: totalClaims, completed: completedClaims },
      messages: totalMessages,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return res.status(500).json({ error: 'Could not load stats' });
  }
});

// GET /api/admin/users?role=caregiver&page=1
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const { role, page = 1 } = req.query;
  const take = 20;
  const skip = (parseInt(page) - 1) * take;

  try {
    const where = role ? { role } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          specialization: true, points: true, rating: true,
          ratingCount: true, createdAt: true, facilityId: true,
          _count: { select: { shiftClaims: true, referralsGiven: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users: users.map(u => ({
        ...u,
        shiftCount: u._count.shiftClaims,
        referralCount: u._count.referralsGiven,
        _count: undefined,
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('[admin/users]', err);
    return res.status(500).json({ error: 'Could not load users' });
  }
});

// GET /api/admin/shifts?status=open&page=1
router.get('/shifts', authenticate, requireAdmin, async (req, res) => {
  const { status, page = 1 } = req.query;
  const take = 20;
  const skip = (parseInt(page) - 1) * take;

  try {
    const where = status ? { status } : {};
    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: {
          facility: { select: { name: true, city: true } },
          _count: { select: { claims: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.shift.count({ where }),
    ]);

    return res.json({
      shifts: shifts.map(s => ({
        id: s.id,
        title: s.title,
        careType: s.careType,
        status: s.status,
        startTime: s.startTime,
        endTime: s.endTime,
        hourlyRate: s.hourlyRate,
        facilityName: s.facility.name,
        facilityCity: s.facility.city,
        claimCount: s._count.claims,
        createdAt: s.createdAt,
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('[admin/shifts]', err);
    return res.status(500).json({ error: 'Could not load shifts' });
  }
});

// GET /api/admin/facilities
router.get('/facilities', authenticate, requireAdmin, async (req, res) => {
  try {
    const facilities = await prisma.facility.findMany({
      include: {
        _count: { select: { shifts: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({
      facilities: facilities.map(f => ({
        id: f.id, name: f.name, address: f.address,
        city: f.city, type: f.type, rating: f.rating,
        shiftCount: f._count.shifts,
      })),
    });
  } catch (err) {
    console.error('[admin/facilities]', err);
    return res.status(500).json({ error: 'Could not load facilities' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['caregiver', 'facility_manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return res.json({ user });
  } catch (err) {
    console.error('[admin/users/role]', err);
    return res.status(500).json({ error: 'Could not update role' });
  }
});

module.exports = router;

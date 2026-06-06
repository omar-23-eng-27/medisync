const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function generateReferralCode(name) {
  const slug = name.split(' ')[0].toUpperCase().slice(0, 6);
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${slug}${rand}`;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, specialization, referralCode } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const code = generateReferralCode(name);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        specialization: specialization || null,
        referralCode: code,
      },
    });

    // Award signup bonus points
    await prisma.pointTransaction.create({
      data: {
        userId: user.id,
        points: 500,
        reason: 'signup-bonus',
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: 500 } },
    });

    // Link referral if a code was provided
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (referrer) {
        await prisma.referral.updateMany({
          where: { referrerId: referrer.id, refereeEmail: email },
          data: { refereeId: user.id, status: 'verified' },
        });
      }
    }

    const token = signToken(user);
    return res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
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
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Could not fetch user' });
  }
});

module.exports = router;

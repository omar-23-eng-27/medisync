const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Facilities ──────────────────────────────────────────────────────────
  const mercy = await prisma.facility.upsert({
    where: { id: 'facility-mercy-general' },
    update: {},
    create: {
      id: 'facility-mercy-general',
      name: 'Mercy General Hospital',
      address: '1200 Medical Center Dr',
      city: 'Broadway Business District',
      lat: 40.7580,
      lng: -73.9855,
      rating: 4.8,
      type: 'hospital',
    },
  });

  const cedar = await prisma.facility.upsert({
    where: { id: 'facility-cedar-haven' },
    update: {},
    create: {
      id: 'facility-cedar-haven',
      name: 'Cedar Haven Assisted Living',
      address: '450 Cedar Street',
      city: 'Broadway Business District',
      lat: 40.7620,
      lng: -73.9822,
      rating: 4.6,
      type: 'assisted-living',
    },
  });

  const oakwood = await prisma.facility.upsert({
    where: { id: 'facility-oakwood' },
    update: {},
    create: {
      id: 'facility-oakwood',
      name: 'Oakwood Heights Care Center',
      address: '88 Oakwood Avenue',
      city: 'Oakwood Heights',
      lat: 40.7540,
      lng: -73.9900,
      rating: 4.5,
      type: 'assisted-living',
    },
  });

  const downtown = await prisma.facility.upsert({
    where: { id: 'facility-downtown-medical' },
    update: {},
    create: {
      id: 'facility-downtown-medical',
      name: 'Downtown Medical Associates',
      address: '221 Downtown Blvd',
      city: 'Downtown Medical',
      lat: 40.7490,
      lng: -73.9870,
      rating: 4.7,
      type: 'hospital',
    },
  });

  console.log('✓ Facilities created');

  // ── Demo caregiver user ─────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@medisync.dev' },
    update: {},
    create: {
      id: 'user-sarah-jenkins',
      email: 'sarah@medisync.dev',
      password: hashedPassword,
      name: 'Sarah Jenkins',
      role: 'caregiver',
      specialization: 'Critical Care',
      yearsExperience: 8,
      bio: 'Senior Critical Care Nurse with 8 years of experience across ICU and step-down units.',
      points: 2840,
      rating: 4.9,
      ratingCount: 47,
      referralCode: 'SARAH500',
    },
  });

  // Secondary demo user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@medisync.dev' },
    update: {},
    create: {
      id: 'user-admin',
      email: 'admin@medisync.dev',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      specialization: null,
      points: 0,
      rating: 0,
      ratingCount: 0,
      referralCode: 'ADMIN000',
    },
  });

  console.log('✓ Users created');
  console.log('  Demo caregiver: sarah@medisync.dev / Password123!');

  // ── Credentials for Sarah ───────────────────────────────────────────────
  const credentialData = [
    {
      id: 'cred-rn-license',
      userId: sarah.id,
      type: 'rn-license',
      label: 'RN State License',
      status: 'active',
      expiryDate: new Date('2025-12-31'),
    },
    {
      id: 'cred-acls',
      userId: sarah.id,
      type: 'acls',
      label: 'ACLS Certification',
      status: 'active',
      expiryDate: new Date('2026-06-01'),
    },
    {
      id: 'cred-bls',
      userId: sarah.id,
      type: 'bls',
      label: 'BLS Update Required',
      status: 'expiring',
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
    {
      id: 'cred-background',
      userId: sarah.id,
      type: 'background-check',
      label: 'Background Check',
      status: 'active',
      expiryDate: null,
    },
    {
      id: 'cred-tb',
      userId: sarah.id,
      type: 'tb-test',
      label: 'TB Test',
      status: 'active',
      expiryDate: new Date('2025-09-01'),
    },
  ];

  for (const cred of credentialData) {
    await prisma.credential.upsert({
      where: { id: cred.id },
      update: {},
      create: cred,
    });
  }

  console.log('✓ Credentials created');

  // ── Shifts ──────────────────────────────────────────────────────────────
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const saturday = new Date(now);
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));

  const shiftData = [
    // Today's shift for Sarah (cedar haven)
    {
      id: 'shift-cedar-today',
      facilityId: cedar.id,
      title: 'Evening Care Shift',
      careType: 'general',
      description: 'Evening care and medication management for assisted living residents.',
      startTime: new Date(new Date().setHours(14, 0, 0, 0)),
      endTime: new Date(new Date().setHours(22, 0, 0, 0)),
      hourlyRate: 32,
      bonusAmount: 0,
      distance: 2.4,
      totalSlots: 1,
      status: 'open',
    },
    // Upcoming shift for Sarah (Mercy General)
    {
      id: 'shift-mercy-friday',
      facilityId: mercy.id,
      title: 'ICU Critical Care',
      careType: 'critical-care',
      description: 'Critical care support in the ICU ward.',
      startTime: (() => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); d.setHours(7, 0, 0, 0); return d; })(),
      endTime: (() => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); d.setHours(19, 0, 0, 0); return d; })(),
      hourlyRate: 38,
      bonusAmount: 50,
      distance: 3.1,
      totalSlots: 2,
      status: 'open',
    },
    // Open marketplace shifts
    {
      id: 'shift-oakwood-tomorrow-am',
      facilityId: oakwood.id,
      title: 'Morning Wellness Check',
      careType: 'geriatric',
      description: 'Morning rounds and wellness assessments for geriatric residents.',
      startTime: new Date(new Date(tomorrow).setHours(7, 0, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
      hourlyRate: 32,
      bonusAmount: 10,
      distance: 2.4,
      totalSlots: 1,
      status: 'open',
    },
    {
      id: 'shift-downtown-dayafter',
      facilityId: downtown.id,
      title: 'Full-Day Private Duty',
      careType: 'post-op',
      description: 'Post-operative care and monitoring for recovery patients.',
      startTime: new Date(new Date(dayAfter).setHours(9, 0, 0, 0)),
      endTime: new Date(new Date(dayAfter).setHours(17, 0, 0, 0)),
      hourlyRate: 28,
      bonusAmount: 0,
      distance: 5.1,
      totalSlots: 1,
      status: 'open',
    },
    {
      id: 'shift-mercy-saturday',
      facilityId: mercy.id,
      title: 'Weekend ICU Support',
      careType: 'critical-care',
      description: 'Weekend critical care coverage in the ICU.',
      startTime: new Date(new Date(saturday).setHours(6, 0, 0, 0)),
      endTime: new Date(new Date(saturday).setHours(18, 0, 0, 0)),
      hourlyRate: 35,
      bonusAmount: 0,
      distance: 1.8,
      totalSlots: 3,
      status: 'open',
    },
    {
      id: 'shift-oakwood-monday',
      facilityId: oakwood.id,
      title: 'Home Companion Care',
      careType: 'home-health',
      description: 'Compassionate home health aide services for elderly patient.',
      startTime: (() => { const d = new Date(); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7 || 7)); d.setHours(10, 0, 0, 0); return d; })(),
      endTime: (() => { const d = new Date(); d.setDate(d.getDate() + ((1 - d.getDay() + 7) % 7 || 7)); d.setHours(16, 0, 0, 0); return d; })(),
      hourlyRate: 30,
      bonusAmount: 0,
      distance: 3.2,
      totalSlots: 1,
      status: 'open',
    },
    {
      id: 'shift-cedar-post-op',
      facilityId: cedar.id,
      title: 'Post-Op Support',
      careType: 'post-op',
      description: 'Post-operative care and support for recovery patients.',
      startTime: new Date(new Date().setHours(14, 30, 0, 0)),
      endTime: new Date(new Date().setHours(18, 30, 0, 0)),
      hourlyRate: 30,
      bonusAmount: 0,
      distance: 2.4,
      totalSlots: 1,
      status: 'open',
    },
  ];

  for (const shift of shiftData) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: shift,
    });
  }

  console.log('✓ Shifts created');

  // ── Claim shifts for Sarah ──────────────────────────────────────────────
  await prisma.shiftClaim.upsert({
    where: { shiftId_userId: { shiftId: 'shift-cedar-today', userId: sarah.id } },
    update: {},
    create: {
      id: 'claim-sarah-cedar-today',
      shiftId: 'shift-cedar-today',
      userId: sarah.id,
      status: 'confirmed',
    },
  });

  await prisma.shiftClaim.upsert({
    where: { shiftId_userId: { shiftId: 'shift-cedar-post-op', userId: sarah.id } },
    update: {},
    create: {
      id: 'claim-sarah-cedar-postop',
      shiftId: 'shift-cedar-post-op',
      userId: sarah.id,
      status: 'confirmed',
    },
  });

  await prisma.shiftClaim.upsert({
    where: { shiftId_userId: { shiftId: 'shift-mercy-friday', userId: sarah.id } },
    update: {},
    create: {
      id: 'claim-sarah-mercy-friday',
      shiftId: 'shift-mercy-friday',
      userId: sarah.id,
      status: 'confirmed',
    },
  });

  console.log('✓ Shift claims created');

  // ── Referrals ───────────────────────────────────────────────────────────
  const referralData = [
    {
      id: 'referral-jameson',
      referrerId: sarah.id,
      refereeEmail: 'jameson.doherty@hospital.com',
      refereeName: 'Jameson Doherty',
      status: 'pending',
      pointsAwarded: false,
    },
    {
      id: 'referral-amara',
      referrerId: sarah.id,
      refereeEmail: 'amara.ling@clinic.com',
      refereeName: 'Amara Ling',
      status: 'verified',
      pointsAwarded: false,
    },
    {
      id: 'referral-marcus',
      referrerId: sarah.id,
      refereeEmail: 'marcus.thorne@care.com',
      refereeName: 'Marcus Thorne',
      status: 'completed',
      pointsAwarded: true,
    },
    {
      id: 'referral-rowan',
      referrerId: sarah.id,
      refereeEmail: 'rowan.kim@medcenter.com',
      refereeName: 'Rowan Kim',
      status: 'completed',
      pointsAwarded: true,
    },
  ];

  for (const ref of referralData) {
    await prisma.referral.upsert({
      where: { id: ref.id },
      update: {},
      create: ref,
    });
  }

  console.log('✓ Referrals created');

  // ── Point transactions ──────────────────────────────────────────────────
  const txData = [
    {
      id: 'tx-signup',
      userId: sarah.id,
      points: 500,
      reason: 'signup-bonus',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'tx-shift-1',
      userId: sarah.id,
      points: 320,
      reason: 'shift-completed',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'tx-rating-1',
      userId: sarah.id,
      points: 150,
      reason: 'rating-bonus',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'tx-referral-marcus',
      userId: sarah.id,
      points: 5000,
      reason: 'referral-bonus',
      meta: { refereeName: 'Marcus Thorne' },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'tx-referral-rowan',
      userId: sarah.id,
      points: 5000,
      reason: 'referral-bonus',
      meta: { refereeName: 'Rowan Kim' },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'tx-shift-today',
      userId: sarah.id,
      points: 450,
      reason: 'shift-completed',
      createdAt: new Date(),
    },
  ];

  for (const tx of txData) {
    await prisma.pointTransaction.upsert({
      where: { id: tx.id },
      update: {},
      create: tx,
    });
  }

  console.log('✓ Point transactions created');
  console.log('\n✅ Seed complete!');
  console.log('\nDemo login:');
  console.log('  Email:    sarah@medisync.dev');
  console.log('  Password: Password123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

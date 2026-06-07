const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { sendNewMessage } = require('../lib/mailer');

const router = express.Router();

// GET /api/messages  — list all conversations for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: req.userId }, { receiverId: req.userId }],
      },
      include: {
        sender:   { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group into conversations keyed by the other party's userId
    const convMap = {};
    for (const msg of messages) {
      const isMe = msg.senderId === req.userId;
      const otherId = isMe ? msg.receiverId : msg.senderId;
      const other   = isMe ? msg.receiver  : msg.sender;

      if (!convMap[otherId]) {
        convMap[otherId] = {
          userId: otherId,
          name: other.name,
          role: other.role,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        };
      }
      if (!isMe && !msg.read) convMap[otherId].unreadCount++;
    }

    return res.json({ conversations: Object.values(convMap) });
  } catch (err) {
    console.error('[messages/GET]', err);
    return res.status(500).json({ error: 'Could not load conversations' });
  }
});

// GET /api/messages/:userId  — full thread with one user
router.get('/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  try {
    const other = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!other) return res.status(404).json({ error: 'User not found' });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: userId },
          { senderId: userId, receiverId: req.userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: { senderId: userId, receiverId: req.userId, read: false },
      data: { read: true },
    });

    return res.json({ other, messages });
  } catch (err) {
    console.error('[messages/thread GET]', err);
    return res.status(500).json({ error: 'Could not load messages' });
  }
});

// POST /api/messages/:userId  — send a message
router.post('/:userId', authenticate, async (req, res) => {
  const { userId: receiverId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, email: true },
    });
    if (!receiver) return res.status(404).json({ error: 'Recipient not found' });

    const sender = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true },
    });

    const message = await prisma.message.create({
      data: { senderId: req.userId, receiverId, content: content.trim() },
    });

    // Email notification (non-blocking)
    sendNewMessage({
      toEmail: receiver.email,
      toName: receiver.name,
      fromName: sender.name,
      preview: content.trim().slice(0, 120),
    }).catch(err => console.error('[mailer] new message email failed:', err));

    return res.status(201).json({ message });
  } catch (err) {
    console.error('[messages/POST]', err);
    return res.status(500).json({ error: 'Could not send message' });
  }
});

module.exports = router;

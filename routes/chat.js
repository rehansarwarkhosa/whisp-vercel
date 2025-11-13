import express from 'express';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { isAuthenticated, isApproved } from '../middleware/auth.js';

const router = express.Router();

// Chat page
router.get('/chat', isAuthenticated, isApproved, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.session.userId },
      isAdmin: false,
      status: 'approved'
    }).select('username lastSeen');

    res.render('chat', {
      currentUser: {
        id: req.session.userId,
        username: req.session.username
      },
      users
    });
  } catch (error) {
    console.error('Chat page error:', error);
    res.status(500).send('Server error');
  }
});

// Get chat history
router.get('/chat/history/:userId', isAuthenticated, isApproved, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { from: req.session.userId, to: req.params.userId },
        { from: req.params.userId, to: req.session.userId }
      ]
    })
      .sort({ timestamp: 1 })
      .limit(100)
      .populate('from', 'username')
      .populate('to', 'username');

    res.json(messages);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

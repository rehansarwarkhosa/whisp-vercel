import express from 'express';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { isAuthenticated, isApproved } from '../middleware/auth.js';

const router = express.Router();

// Chat page
router.get('/chat', isAuthenticated, isApproved, async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId);
    const users = await User.find({
      _id: { $ne: req.session.userId },
      isAdmin: false,
      status: 'approved'
    }).select('username lastSeen');

    res.render('chat', {
      currentUser: {
        id: req.session.userId,
        username: req.session.username,
        isAdmin: currentUser.isAdmin
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
    const currentUser = await User.findById(req.session.userId);

    const messages = await Message.find({
      $or: [
        { from: req.session.userId, to: req.params.userId },
        { from: req.params.userId, to: req.session.userId }
      ]
    })
      .sort({ timestamp: 1 })
      .limit(100)
      .populate('from', 'username')
      .populate('to', 'username')
      .populate('deletedBy', 'username');

    // If not admin, filter out deleted messages
    const filteredMessages = currentUser.isAdmin
      ? messages
      : messages.map(msg => {
          if (msg.deleted) {
            return {
              ...msg.toObject(),
              message: '[Message deleted]'
            };
          }
          return msg;
        });

    res.json(filteredMessages);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete message (soft delete)
router.post('/chat/message/:messageId/delete', isAuthenticated, isApproved, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only allow sender to delete their own message
    if (message.from.toString() !== req.session.userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    message.deleted = true;
    message.deletedBy = req.session.userId;
    message.deletedAt = new Date();
    await message.save();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore message (admin only)
router.post('/chat/message/:messageId/restore', isAuthenticated, isApproved, async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId);

    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.deleted = false;
    message.deletedBy = null;
    message.deletedAt = null;
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('from', 'username')
      .populate('to', 'username');

    res.json({ success: true, message: 'Message restored', data: populatedMessage });
  } catch (error) {
    console.error('Restore message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

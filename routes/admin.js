import express from 'express';
import User from '../models/User.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Admin dashboard
router.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).sort({ createdAt: -1 });
    const totalUsers = users.length;
    const pendingUsers = users.filter(u => u.status === 'pending').length;

    res.render('admin', {
      users,
      totalUsers,
      pendingUsers,
      adminUsername: req.session.username
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send('Server error');
  }
});

// Approve user
router.post('/admin/approve/:userId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { status: 'approved' });
    res.redirect('/admin');
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).send('Server error');
  }
});

// Delete user
router.post('/admin/delete/:userId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.redirect('/admin');
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).send('Server error');
  }
});

// Reset password
router.post('/admin/reset-password/:userId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).send('Password must be at least 6 characters');
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.redirect('/admin');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).send('Server error');
  }
});

export default router;

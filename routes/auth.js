import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { redirectIfAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
  const error = req.query.error;
  let errorMessage = '';

  if (error === 'pending') {
    errorMessage = 'Your signup is pending admin approval';
  } else if (error === 'invalid') {
    errorMessage = 'Invalid username or password';
  }

  res.render('login', { error: errorMessage });
});

// Login handler
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.redirect('/login?error=invalid');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.redirect('/login?error=invalid');
    }

    if (user.status === 'pending') {
      return res.redirect('/login?error=pending');
    }

    if (user.status === 'rejected') {
      return res.redirect('/login?error=invalid');
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.isAdmin = user.isAdmin;
    req.session.status = user.status;

    if (user.isAdmin) {
      return res.redirect('/admin');
    }

    res.redirect('/chat');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login?error=invalid');
  }
});

// Signup page
router.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.render('signup', { error: '', success: '' });
});

// Signup handler
router.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.render('signup', { error: 'All fields are required', success: '' });
    }

    if (password !== confirmPassword) {
      return res.render('signup', { error: 'Passwords do not match', success: '' });
    }

    if (password.length < 6) {
      return res.render('signup', { error: 'Password must be at least 6 characters', success: '' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });

    if (existingUser) {
      return res.render('signup', { error: 'Username already exists', success: '' });
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password: password,
      status: 'pending'
    });

    await newUser.save();

    res.render('signup', {
      error: '',
      success: 'Account created successfully! Please wait for admin approval.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', { error: 'An error occurred. Please try again.', success: '' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

export default router;

const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// Valid 60-char bcrypt hash for timing attack protection (cost 10, value "dummy")
const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    // Basic presence check
    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    }

    // Fetch ONLY the fields needed — lean() for raw JS object (2× faster)
    const user = await User
      .findOne({ username })
      .select('+password username role fullName')
      .lean({ virtuals: false });

    if (!user) {
      // Run a dummy compare so timing is identical whether user exists or not
      const bcrypt = require('bcryptjs');
      await bcrypt.compare(password, DUMMY_HASH).catch(() => {});
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    // Password stored as hash — compare directly
    const bcrypt   = require('bcryptjs');
    const isMatch  = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    // Sign minimal payload — no sensitive fields
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return only what the frontend needs
    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName },
    });

  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', require('../middleware/auth'), (req, res) => res.json(req.user));

module.exports = router;

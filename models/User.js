const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const COST = 10;  // bcrypt cost 10 = ~100ms (cost 12 = ~400ms — too slow for login)

const UserSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, lowercase: true,
    minlength: 2, maxlength: 64,
    index: true,   // fast lookup on every login
  },
  password: {
    type: String, required: true,
    select: false, // excluded from all queries by default — use .select('+password') or .select('password') to include
  },
  fullName: { type: String, required: true, trim: true, maxlength: 128 },
  role:     { type: String, enum: ['admin','editor','viewer'], default: 'viewer' },
}, { timestamps: true, versionKey: false });

// Hash password before save (only when modified)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, COST);
    next();
  } catch (err) { next(err); }
});

// Instance method for safe comparison
UserSchema.methods.comparePassword = async function (plain) {
  if (!plain || !this.password) return false;
  return bcrypt.compare(String(plain).trim(), this.password).catch(() => false);
};

module.exports = mongoose.model('User', UserSchema);
